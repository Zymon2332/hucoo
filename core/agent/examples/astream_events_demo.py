"""astream_events(v2) 生产级流式示例。

演示如何把 LangChain 的 ``on_*`` 事件映射成**稳定的业务事件契约**，覆盖：

- 文本增量（message）与推理（thinking，reasoning_content）
- 工具调用（tool_call，来自模型输出，便于审批）与工具结果（tool_result）
- 领域阶段（step，通过 ``adispatch_custom_event``）
- 用量统计（usage）、人工中断（interrupt）、错误（error）、结束（done）
- trace_id 贯穿（``RuntimeContext`` + ``config["metadata"]``）
- node 作用域过滤与去重（不把 ``on_chain_stream`` 的正文重复下发）

生产要点：
- 对外只暴露本文件的 ``AgentEvent`` 契约，**永不透出 ``on_*`` 事件名**；
- ``version="v2"`` 钉死（v3 仍是实验性 API）；
- ``tool_call`` 取自模型输出（``on_chat_model_end``），发生在工具执行**之前**，
  因此 HITL 审批界面能拿到待审批的调用；
- 事件映射是纯函数 ``map_event``，便于单测。

本文件**自包含、离线可跑**（内置脚本化 Fake 模型），不依赖项目内模块。
接真实模型见 ``build_agent`` 里的注释。

运行：
    uv run python examples/astream_events_demo.py
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any, Literal
from uuid import uuid4

from langchain.agents import create_agent
from langchain.agents.middleware import AgentMiddleware, HumanInTheLoopMiddleware
from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, AIMessageChunk
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult
from langchain_core.tools import tool
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command
from pydantic import BaseModel, ConfigDict, Field

# --------------------------------------------------------------------------- #
# 1) 业务事件契约（对前端稳定，永不暴露 on_* 事件名）
# --------------------------------------------------------------------------- #

EventName = Literal[
    "meta",
    "message",
    "thinking",
    "tool_call",
    "tool_result",
    "step",
    "usage",
    "interrupt",
    "error",
    "done",
]


class AgentEvent(BaseModel):
    """下发给客户端的一条 SSE 事件。"""

    event: EventName
    trace_id: str = ""
    content: str = ""
    name: str | None = None
    tool_call_id: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)


# --------------------------------------------------------------------------- #
# 2) RuntimeContext：单次运行的只读依赖（trace_id 贯穿全链路）
# --------------------------------------------------------------------------- #


class RuntimeContext(BaseModel):
    user_id: str
    trace_id: str


# --------------------------------------------------------------------------- #
# 3) 领域阶段中间件
#     注意：astream_events 下 ``get_stream_writer()`` 不会出现，
#     必须用 ``adispatch_custom_event`` 才能产生 ``on_custom_event``。
# --------------------------------------------------------------------------- #


class PhaseMiddleware(AgentMiddleware):
    """在模型调用前广播一个领域阶段事件。"""

    async def abefore_model(self, state: Any, runtime: Any) -> None:
        await adispatch_custom_event(
            "phase",
            {"phase": "model_start", "user_id": runtime.context.user_id},
        )
        return None


# --------------------------------------------------------------------------- #
# 4) 工具
# --------------------------------------------------------------------------- #


@tool
def get_weather(city: str) -> str:
    """Get the weather for a city."""
    return f"{city}: sunny, 25C"


def _ai_chunk(**fields: Any) -> AIMessageChunk:
    """构造 ``AIMessageChunk``。

    集中此处的目的：pydantic 动态生成 ``__init__``，部分类型检查器会误报
    "Unexpected argument"，用一个 ``**fields`` 包装即可隔离这种噪声。
    """
    return AIMessageChunk(**fields)


# --------------------------------------------------------------------------- #
# 5) 脚本化 Fake 模型（离线演示用；真实环境替换为 init_chat_model）
# --------------------------------------------------------------------------- #


class ScriptedChatModel(BaseChatModel):
    """第一轮返回工具调用；第二轮返回 reasoning + 正文。"""

    model_config = ConfigDict(arbitrary_types_allowed=True)
    calls: int = 0

    @property
    def _llm_type(self) -> str:
        return "scripted"

    def bind_tools(self, tools: Any, **kwargs: Any) -> "ScriptedChatModel":
        return self

    def _generate(
        self, messages: Any, stop: Any = None, run_manager: Any = None, **kwargs: Any
    ) -> ChatResult:
        return ChatResult(
            generations=[ChatGeneration(message=AIMessage(content="fallback"))]
        )

    def _stream(
        self, messages: Any, stop: Any = None, run_manager: Any = None, **kwargs: Any
    ):
        self.calls += 1
        if self.calls == 1:
            yield ChatGenerationChunk(
                message=_ai_chunk(
                    content="",
                    tool_call_chunks=[
                        {
                            "name": "get_weather",
                            "args": '{"city": "Beijing"}',
                            "id": "call_1",
                            "index": 0,
                        }
                    ],
                )
            )
            return
        # 第二轮：先出 reasoning，再逐字出正文，最后带 usage。
        yield ChatGenerationChunk(
            message=_ai_chunk(
                content="",
                additional_kwargs={
                    "reasoning_content": "I should call the weather tool."
                },
            )
        )
        for token in ["Beijing ", "is ", "sunny, ", "25C."]:
            yield ChatGenerationChunk(message=_ai_chunk(content=token))
        yield ChatGenerationChunk(
            message=_ai_chunk(
                content="",
                usage_metadata={
                    "input_tokens": 20,
                    "output_tokens": 8,
                    "total_tokens": 28,
                },
            )
        )


# --------------------------------------------------------------------------- #
# 6) 组装 agent
# --------------------------------------------------------------------------- #


def build_agent(*, hitl: bool = False):
    """构建 agent。

    接真实模型：
        from langchain.chat_models import init_chat_model
        model = init_chat_model(
            "deepseek:deepseek-chat",
            api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url="https://api.deepseek.com",
        )
    """
    model = ScriptedChatModel()
    middleware: list[AgentMiddleware] = [PhaseMiddleware()]
    if hitl:
        # 工具执行前请求人工审批；``True`` 表示允许 approve/edit/reject。
        middleware.append(
            HumanInTheLoopMiddleware(interrupt_on={"get_weather": True})
        )
    return create_agent(
        model=model,
        tools=[get_weather],
        middleware=middleware,
        context_schema=RuntimeContext,
        checkpointer=InMemorySaver(),
    )


# --------------------------------------------------------------------------- #
# 7) 事件映射：LangChain StreamEvent -> list[AgentEvent]
#    纯函数，便于单测；端点只负责消费。
# --------------------------------------------------------------------------- #


def _text_of(content: object) -> str:
    """把消息 content 规整为纯文本（兼容 str 与内容块列表）。"""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and isinstance(block.get("text"), str):
                parts.append(block["text"])
        return "".join(parts)
    return ""


def map_event(ev: dict[str, Any], trace_id: str) -> list[AgentEvent]:
    """把一个 LangChain ``StreamEvent`` 映射为零或多条业务事件。"""
    kind = ev["event"]
    name = ev.get("name")
    node = (ev.get("metadata") or {}).get("langgraph_node")
    data = ev.get("data") or {}

    # 只处理主图 model 节点产生的模型事件，避免子图/内部 LLM 串台。
    if kind.startswith("on_chat_model") and node not in ("model", None):
        return []

    if kind == "on_chat_model_stream" and node == "model":
        chunk = data.get("chunk")
        events: list[AgentEvent] = []
        reasoning = (getattr(chunk, "additional_kwargs", {}) or {}).get(
            "reasoning_content"
        )
        if isinstance(reasoning, str) and reasoning:
            events.append(
                AgentEvent(event="thinking", content=reasoning, trace_id=trace_id)
            )
        text = _text_of(getattr(chunk, "content", ""))
        if text:
            events.append(
                AgentEvent(event="message", content=text, trace_id=trace_id)
            )
        return events

    if kind == "on_chat_model_end" and node == "model":
        output = data.get("output")
        events = []
        # 工具调用取自模型输出：发生在工具执行之前，HITL 审批据此展示。
        for tc in getattr(output, "tool_calls", None) or []:
            events.append(
                AgentEvent(
                    event="tool_call",
                    name=tc.get("name"),
                    tool_call_id=tc.get("id"),
                    data={"args": tc.get("args")},
                    trace_id=trace_id,
                )
            )
        usage = getattr(output, "usage_metadata", None)
        if isinstance(usage, dict) and usage:
            events.append(
                AgentEvent(event="usage", data=dict(usage), trace_id=trace_id)
            )
        return events

    if kind == "on_tool_end":
        output = data.get("output")
        return [
            AgentEvent(
                event="tool_result",
                name=name,
                tool_call_id=getattr(output, "tool_call_id", None),
                content=_text_of(getattr(output, "content", "")),
                trace_id=trace_id,
            )
        ]

    if kind == "on_custom_event":
        return [
            AgentEvent(
                event="step", name=name, data=dict(data or {}), trace_id=trace_id
            )
        ]

    # 中断只出现在 on_chain_stream 的状态块里，不在 messages 里。
    if (
        kind == "on_chain_stream"
        and isinstance(data.get("chunk"), dict)
        and "__interrupt__" in data["chunk"]
    ):
        items = data["chunk"]["__interrupt__"]
        if not items:  # 静态 interrupt_before/after：无载荷
            return [AgentEvent(event="interrupt", name=name, trace_id=trace_id)]
        return [
            AgentEvent(
                event="interrupt",
                name=name,
                data={
                    "value": getattr(item, "value", None),
                    "id": getattr(item, "id", None),
                },
                trace_id=trace_id,
            )
            for item in items
        ]

    if kind.endswith("_error"):
        return [
            AgentEvent(
                event="error", content=str(data.get("error")), trace_id=trace_id
            )
        ]

    return []


# --------------------------------------------------------------------------- #
# 8) 生产级流式生成器
# --------------------------------------------------------------------------- #


async def stream_events(
    agent: Any,
    agent_input: Any,
    *,
    config: dict[str, Any],
    context: RuntimeContext,
    trace_id: str,
) -> AsyncIterator[AgentEvent]:
    """把 agent 执行流转换为业务事件流。

    要点：
    - 先发 ``meta`` 回传 trace_id，便于前端/网关关联；
    - ``version="v2"`` 钉死（v3 仍为实验性）；
    - 顶层异常转成 ``error`` 事件，避免连接被裸异常打断；
    - 正常结束发 ``done``。
    """
    yield AgentEvent(
        event="meta", trace_id=trace_id, data={"user_id": context.user_id}
    )
    try:
        async for ev in agent.astream_events(
            agent_input,
            config=config,
            context=context,
            version="v2",
        ):
            for mapped in map_event(ev, trace_id):
                yield mapped
    except Exception as exc:  # noqa: BLE001
        yield AgentEvent(event="error", content=str(exc), trace_id=trace_id)
        return
    yield AgentEvent(event="done", trace_id=trace_id)


# --------------------------------------------------------------------------- #
# 9) 运行示例
# --------------------------------------------------------------------------- #


async def run_turn(
    agent: Any,
    query: str | None,
    thread_id: str,
    trace_id: str,
    *,
    resume: Any = None,
) -> None:
    config = {
        "configurable": {"thread_id": thread_id},
        "metadata": {"trace_id": trace_id},
    }
    context = RuntimeContext(user_id="u-1", trace_id=trace_id)
    payload = (
        resume
        if resume is not None
        else {"messages": [{"role": "user", "content": query}]}
    )
    async for event in stream_events(
        agent, payload, config=config, context=context, trace_id=trace_id
    ):
        if event.data:
            detail = f"{event.name or ''} {event.data}".strip()
        else:
            detail = event.content or event.name or ""
        print(f"  [{event.event:<11}] {detail}")


async def main() -> None:
    print(
        "========== 普通一轮：thinking → message → tool_call → tool_result → "
        "message → usage → done =========="
    )
    await run_turn(build_agent(), "北京天气如何？", "thread-1", uuid4().hex)

    print("\n========== HITL：interrupt（待审批）→ 恢复 ==========")
    agent = build_agent(hitl=True)
    thread_id, trace_id = "thread-2", uuid4().hex
    print("--- 第一次运行（应在工具执行前中断）---")
    await run_turn(agent, "北京天气如何？", thread_id, trace_id)
    print("--- 人工批准后恢复 ---")
    await run_turn(
        agent,
        None,
        thread_id,
        trace_id,
        resume=Command(resume={"decisions": [{"type": "approve"}]}),
    )


if __name__ == "__main__":
    asyncio.run(main())

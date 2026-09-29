"""astream_events(v3) 生产级流式示例（实验性 API）。

与 ``astream_events_demo.py``（v2）产出**同一套业务事件契约**，但底层换成
v3 的"内容块协议 + 投影"模型：

- ``run = await agent.astream_events(input, config=..., context=..., version="v3")``
  返回 ``AsyncGraphRunStream``，**由消费方拉取驱动**（无后台线程）。
- ``run.messages``：每个模型调用一个 ``AsyncChatModelStream``，其原始事件是
  内容块协议（``content-block-delta`` 带 ``text-delta`` / ``reasoning-delta``），
  reasoning 与正文**原生分离**。
- ``run.tool_calls``：每个工具调用一个 ``ToolCallStream``（``.tool_name`` /
  ``.input`` / ``.output`` / ``.error`` / ``.completed``）。
- ``run.custom``：领域阶段（需在 ``create_agent(transformers=[CustomTransformer])`
  注册；用 ``get_stream_writer()`` 发送——注意与 v2 的 ``adispatch_custom_event`` 不同）。
- ``await run.interrupted()`` / ``await run.interrupts()``：HITL 中断。

生产要点：
- 三个投影必须**并发消费**（用一个 ``asyncio.Queue`` 做 fan-in），否则
  ``tool_calls`` / ``custom`` 不会在运行中被订阅，事件会丢失；
- 对外只暴露本文件的 ``AgentEvent`` 契约，永不透出协议内部事件名；
- v3 仍标注 **experimental（``LangChainBetaWarning``）**，API 可能变化。

本文件**自包含、离线可跑**（内置脚本化 Fake 模型），不依赖项目内模块。

运行：
    uv run python examples/astream_events_v3_demo.py
"""

from __future__ import annotations

import asyncio
import contextlib
import warnings
from collections.abc import AsyncIterator
from typing import Any, Literal
from uuid import uuid4

from langchain.agents import create_agent
from langchain.agents.middleware import AgentMiddleware, HumanInTheLoopMiddleware
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, AIMessageChunk
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult
from langchain_core.tools import tool
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.config import get_stream_writer
from langgraph.stream import CustomTransformer
from langgraph.types import Command
from pydantic import BaseModel, ConfigDict, Field

# --------------------------------------------------------------------------- #
# 1) 业务事件契约（与 v2 示例一致）
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


class RuntimeContext(BaseModel):
    user_id: str
    trace_id: str


# --------------------------------------------------------------------------- #
# 2) 领域阶段中间件
#     v3 用 ``get_stream_writer()`` 发送，经 ``CustomTransformer`` 暴露为 run.custom。
# --------------------------------------------------------------------------- #


class PhaseMiddleware(AgentMiddleware):
    def before_model(self, state: Any, runtime: Any) -> None:
        get_stream_writer()(
            {"phase": "model_start", "user_id": runtime.context.user_id}
        )
        return None


# --------------------------------------------------------------------------- #
# 3) 工具
# --------------------------------------------------------------------------- #


@tool
def get_weather(city: str) -> str:
    """Get the weather for a city."""
    return f"{city}: sunny, 25C"


# --------------------------------------------------------------------------- #
# 4) 脚本化 Fake 模型（离线演示用；真实环境替换为 init_chat_model）
# --------------------------------------------------------------------------- #


def _ai_chunk(**fields: Any) -> AIMessageChunk:
    """构造 ``AIMessageChunk``（隔离 pydantic 动态 __init__ 的类型提示噪声）。"""
    return AIMessageChunk(**fields)


class ScriptedChatModel(BaseChatModel):
    """第一轮返回工具调用；第二轮返回 reasoning + 正文 + usage。"""

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
# 5) 组装 agent（v3 需要注册 CustomTransformer 才有 run.custom）
# --------------------------------------------------------------------------- #


def build_agent(*, hitl: bool = False):
    middleware: list[AgentMiddleware] = [PhaseMiddleware()]
    if hitl:
        middleware.append(
            HumanInTheLoopMiddleware(interrupt_on={"get_weather": True})
        )
    return create_agent(
        model=ScriptedChatModel(),
        tools=[get_weather],
        middleware=middleware,
        context_schema=RuntimeContext,
        checkpointer=InMemorySaver(),
        transformers=[CustomTransformer],  # 暴露 run.custom
    )


# --------------------------------------------------------------------------- #
# 6) 事件映射（内容块协议 -> 业务事件）
# --------------------------------------------------------------------------- #


def _text_of(content: object) -> str:
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


def map_message_event(
    ev: dict[str, Any], node: str | None, trace_id: str
) -> list[AgentEvent]:
    """把 ``run.messages`` 的一条内容块事件映射为业务事件。"""
    if node != "model":
        return []
    kind = ev.get("event")

    if kind == "content-block-delta":
        delta = ev.get("delta") or {}
        dtype = delta.get("type")
        if dtype == "text-delta":
            text = delta.get("text")
            if isinstance(text, str) and text:
                return [AgentEvent(event="message", content=text, trace_id=trace_id)]
        elif dtype == "reasoning-delta":
            reasoning = delta.get("reasoning")
            if isinstance(reasoning, str) and reasoning:
                return [
                    AgentEvent(event="thinking", content=reasoning, trace_id=trace_id)
                ]
        return []

    if kind == "content-block-finish":
        content = ev.get("content") or {}
        # 模型提出的工具调用（执行之前）——HITL 审批据此展示。
        if isinstance(content, dict) and content.get("type") == "tool_call":
            return [
                AgentEvent(
                    event="tool_call",
                    name=content.get("name"),
                    tool_call_id=content.get("id"),
                    data={"args": content.get("args")},
                    trace_id=trace_id,
                )
            ]
        return []

    if kind == "message-finish":
        usage = ev.get("usage")
        if isinstance(usage, dict) and usage:
            return [AgentEvent(event="usage", data=dict(usage), trace_id=trace_id)]
        return []

    if kind == "error":
        return [
            AgentEvent(event="error", content=str(ev.get("message")), trace_id=trace_id)
        ]

    return []


# --------------------------------------------------------------------------- #
# 7) 生产级流式生成器：三路投影并发消费 + 队列 fan-in
# --------------------------------------------------------------------------- #


async def stream_events(
    agent: Any,
    agent_input: Any,
    *,
    config: dict[str, Any],
    context: RuntimeContext,
    trace_id: str,
) -> AsyncIterator[AgentEvent]:
    run = await agent.astream_events(
        agent_input,
        config=config,
        context=context,
        version="v3",
    )
    queue: asyncio.Queue[AgentEvent | None] = asyncio.Queue()

    async def consume_messages() -> None:
        async for stream in run.messages:
            async for ev in stream:
                for mapped in map_message_event(ev, stream.node, trace_id):
                    await queue.put(mapped)

    async def consume_tools() -> None:
        # 注意：``tool_call``（模型提出的调用）由 ``run.messages`` 的
        # ``content-block-finish`` 产出，因此这里只负责工具**结果**。
        async for tool_stream in run.tool_calls:
            # 非流式工具通常无 delta，drain 只为等待终止事件。
            async for _delta in tool_stream.output_deltas:
                pass
            if tool_stream.error:
                await queue.put(
                    AgentEvent(
                        event="error", content=str(tool_stream.error), trace_id=trace_id
                    )
                )
            else:
                await queue.put(
                    AgentEvent(
                        event="tool_result",
                        name=tool_stream.tool_name,
                        tool_call_id=tool_stream.tool_call_id,
                        content=_text_of(getattr(tool_stream.output, "content", None)),
                        trace_id=trace_id,
                    )
                )

    async def consume_custom() -> None:
        async for payload in run.custom:
            data = dict(payload) if isinstance(payload, dict) else {"value": payload}
            await queue.put(AgentEvent(event="step", data=data, trace_id=trace_id))

    async def drive() -> None:
        # 三路投影必须并发消费，否则 tool_calls / custom 会在运行中漏事件。
        results = await asyncio.gather(
            consume_messages(),
            consume_tools(),
            consume_custom(),
            return_exceptions=True,
        )
        for result in results:
            if isinstance(result, Exception):
                await queue.put(
                    AgentEvent(event="error", content=str(result), trace_id=trace_id)
                )
        await queue.put(None)

    driver = asyncio.create_task(drive())

    yield AgentEvent(
        event="meta", trace_id=trace_id, data={"user_id": context.user_id}
    )
    try:
        while True:
            item = await queue.get()
            if item is None:
                break
            yield item

        if await run.interrupted():
            for intr in await run.interrupts():
                yield AgentEvent(
                    event="interrupt",
                    data={"value": intr.value, "id": intr.id},
                    trace_id=trace_id,
                )
    except Exception as exc:  # noqa: BLE001
        yield AgentEvent(event="error", content=str(exc), trace_id=trace_id)
        with contextlib.suppress(Exception):
            await run.abort()
        return
    finally:
        if not driver.done():
            driver.cancel()
            with contextlib.suppress(Exception):
                await driver

    yield AgentEvent(event="done", trace_id=trace_id)


# --------------------------------------------------------------------------- #
# 8) 运行示例
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
    # v3 目前会发 LangChainBetaWarning（实验性），演示时静默。
    warnings.filterwarnings("ignore", message=".*v3 streaming protocol.*")

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

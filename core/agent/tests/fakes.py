"""离线脚本化模型：不依赖任何真实 provider，用于流式编排测试。"""

from __future__ import annotations

from typing import Any

from langchain.agents import create_agent
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, AIMessageChunk
from langchain_core.outputs import ChatGeneration, ChatGenerationChunk, ChatResult
from langchain_core.tools import tool
from langgraph.checkpoint.memory import InMemorySaver
from pydantic import ConfigDict

from service.agent_service import RuntimeContext


@tool
def get_weather(city: str) -> str:
    """Get the weather for a city."""
    return f"{city}: sunny, 25C"


def _ai_chunk(**fields: Any) -> AIMessageChunk:
    return AIMessageChunk(**fields)


class ScriptedChatModel(BaseChatModel):
    """第一轮返回工具调用；第二轮返回 reasoning + 正文 + usage。"""

    model_config = ConfigDict(arbitrary_types_allowed=True)
    calls: int = 0
    finish_reason: str = "stop"

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
                    "input_token_details": {"cache_read": 5},
                    "output_token_details": {"reasoning": 3},
                },
                response_metadata={
                    "finish_reason": self.finish_reason,
                    "model_name": "scripted",
                },
            )
        )


def build_scripted_agent(*, finish_reason: str = "stop"):
    return create_agent(
        model=ScriptedChatModel(finish_reason=finish_reason),
        tools=[get_weather],
        context_schema=RuntimeContext,
        checkpointer=InMemorySaver(),
    )


class SplitToolCallModel(BaseChatModel):
    """工具调用**分片**流式：首片带 id+name，后续片只带 args 片段。

    模拟 OpenAI/Anthropic 的真实分片行为，用于验证 ``tool.args`` 的
    index 归属与 ``tool_call_id`` 粘性。
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)
    calls: int = 0

    @property
    def _llm_type(self) -> str:
        return "split-tool-call"

    def bind_tools(self, tools: Any, **kwargs: Any) -> "SplitToolCallModel":
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
            # 首片：id + name
            yield ChatGenerationChunk(
                message=_ai_chunk(
                    content="",
                    tool_call_chunks=[
                        {"name": "get_weather", "args": "", "id": "call_split", "index": 0}
                    ],
                )
            )
            # 后续片：只有 args 片段，id/name 均为 None
            yield ChatGenerationChunk(
                message=_ai_chunk(
                    content="",
                    tool_call_chunks=[
                        {"name": None, "args": '{"city"', "id": None, "index": 0}
                    ],
                )
            )
            yield ChatGenerationChunk(
                message=_ai_chunk(
                    content="",
                    tool_call_chunks=[
                        {"name": None, "args": ': "Beijing"}', "id": None, "index": 0}
                    ],
                )
            )
            return
        yield ChatGenerationChunk(message=_ai_chunk(content="done"))


def build_split_tool_agent():
    return create_agent(
        model=SplitToolCallModel(),
        tools=[get_weather],
        context_schema=RuntimeContext,
        checkpointer=InMemorySaver(),
    )


class FailingModel(BaseChatModel):
    """模型直接抛错，用于测试 ``run.error`` 的可观测字段。"""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    @property
    def _llm_type(self) -> str:
        return "failing"

    def bind_tools(self, tools: Any, **kwargs: Any) -> "FailingModel":
        return self

    def _generate(
        self, messages: Any, stop: Any = None, run_manager: Any = None, **kwargs: Any
    ) -> ChatResult:
        # 不覆写 `_stream`：`_should_stream` 因此走 `_generate`，直接抛错。
        raise TimeoutError("upstream timeout")


def build_failing_agent():
    return create_agent(
        model=FailingModel(),
        tools=[get_weather],
        context_schema=RuntimeContext,
        checkpointer=InMemorySaver(),
    )


class ReasoningEveryCallModel(BaseChatModel):
    """每次模型调用都先 reasoning；第一次附带工具调用，产生两段独立思考。"""

    model_config = ConfigDict(arbitrary_types_allowed=True)
    calls: int = 0

    @property
    def _llm_type(self) -> str:
        return "reasoning-every-call"

    def bind_tools(self, tools: Any, **kwargs: Any) -> "ReasoningEveryCallModel":
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
        yield ChatGenerationChunk(
            message=_ai_chunk(
                content="",
                additional_kwargs={"reasoning_content": f"thinking-{self.calls}"},
            )
        )
        if self.calls == 1:
            yield ChatGenerationChunk(
                message=_ai_chunk(
                    content="",
                    tool_call_chunks=[
                        {
                            "name": "get_weather",
                            "args": '{"city": "Beijing"}',
                            "id": "call_r",
                            "index": 0,
                        }
                    ],
                )
            )
            return
        yield ChatGenerationChunk(message=_ai_chunk(content="done"))


def build_reasoning_every_call_agent():
    return create_agent(
        model=ReasoningEveryCallModel(),
        tools=[get_weather],
        context_schema=RuntimeContext,
        checkpointer=InMemorySaver(),
    )


class TextThenToolModel(BaseChatModel):
    """同一消息内先 text 后 tool_call，用于验证 text.end 早于 tool.start。"""

    model_config = ConfigDict(arbitrary_types_allowed=True)
    calls: int = 0

    @property
    def _llm_type(self) -> str:
        return "text-then-tool"

    def bind_tools(self, tools: Any, **kwargs: Any) -> "TextThenToolModel":
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
            yield ChatGenerationChunk(message=_ai_chunk(content="Let me check "))
            yield ChatGenerationChunk(message=_ai_chunk(content="the weather. "))
            yield ChatGenerationChunk(
                message=_ai_chunk(
                    content="",
                    tool_call_chunks=[
                        {
                            "name": "get_weather",
                            "args": '{"city": "Beijing"}',
                            "id": "call_tt",
                            "index": 0,
                        }
                    ],
                )
            )
            return
        yield ChatGenerationChunk(message=_ai_chunk(content="done"))


def build_text_then_tool_agent():
    return create_agent(
        model=TextThenToolModel(),
        tools=[get_weather],
        context_schema=RuntimeContext,
        checkpointer=InMemorySaver(),
    )

"""会话消息列表的领域模型与组装。

把 checkpointer 里持久化的 ``messages`` 通道（LangChain 消息）组装成**面向聊天**、
**按轮聚合**的消息列表：

- ``HumanMessage`` 原样输出（``SystemMessage`` 属系统提示词，不下发前端）；
- 一个用户提问后、下一个用户消息之前的 ``AIMessage`` / ``ToolMessage`` 合并进
  同一条 ``assistant`` 消息：reasoning 累加、文本累加、tool_calls 收集，并把
  ``ToolMessage`` 的结果按 ``tool_call_id`` 归并到对应 tool_call。

纯领域模型，不依赖任何传输层。
"""

from __future__ import annotations

from typing import Any, Literal

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    ToolMessage,
)
from pydantic import BaseModel, Field

from harness.message_utils import text_of


class ToolCall(BaseModel):
    """一次工具调用及其结果。"""

    id: str | None = Field(default=None, description="工具调用 id")
    name: str | None = Field(default=None, description="工具名")
    args: dict[str, Any] | None = Field(default=None, description="调用参数")
    result: str | None = Field(default=None, description="工具返回结果")
    is_error: bool = Field(default=False, description="工具是否报错")


class ChatMessage(BaseModel):
    """会话消息列表中的单条消息。"""

    role: Literal["user", "assistant"] = Field(description="对话角色")
    id: str | None = Field(default=None, description="消息 id（若存在）")
    content: str = Field(default="", description="消息正文")
    reasoning: str | None = Field(default=None, description="思考内容（仅 assistant）")
    tool_calls: list[ToolCall] | None = Field(
        default=None, description="工具调用（仅 assistant）"
    )


def _reasoning_of(message: BaseMessage) -> str:
    """从消息里取思考内容（DeepSeek 式 ``additional_kwargs.reasoning_content``）。"""
    extra = getattr(message, "additional_kwargs", None) or {}
    value = extra.get("reasoning_content")
    return value if isinstance(value, str) else ""


def assemble_chat_messages(messages: list[BaseMessage]) -> list[ChatMessage]:
    """把原始消息通道组装为按轮聚合的会话消息列表。"""
    result: list[ChatMessage] = []
    current: ChatMessage | None = None

    def flush() -> None:
        nonlocal current
        if current is None:
            return
        if not current.reasoning:
            current.reasoning = None
        if not current.tool_calls:
            current.tool_calls = None
        result.append(current)
        current = None

    for message in messages:
        if isinstance(message, HumanMessage):
            flush()
            result.append(
                ChatMessage(role="user", id=message.id, content=text_of(message.content))
            )
        elif isinstance(message, AIMessage):
            if current is None:
                current = ChatMessage(role="assistant", id=message.id)
            reasoning = _reasoning_of(message)
            if reasoning:
                current.reasoning = (
                    f"{current.reasoning}\n{reasoning}"
                    if current.reasoning
                    else reasoning
                )
            text = text_of(message.content)
            if text:
                current.content = f"{current.content}{text}"
            for call in getattr(message, "tool_calls", None) or []:
                current.tool_calls = current.tool_calls or []
                current.tool_calls.append(
                    ToolCall(
                        id=call.get("id"),
                        name=call.get("name"),
                        args=call.get("args"),
                    )
                )
        elif isinstance(message, ToolMessage):
            if current is None:
                current = ChatMessage(role="assistant")
            tool_call_id = getattr(message, "tool_call_id", None)
            is_error = getattr(message, "status", None) == "error"
            matched = next(
                (
                    call
                    for call in current.tool_calls or []
                    if call.id == tool_call_id
                ),
                None,
            )
            if matched is not None:
                matched.result = text_of(message.content)
                matched.is_error = is_error
            else:
                current.tool_calls = current.tool_calls or []
                current.tool_calls.append(
                    ToolCall(
                        id=tool_call_id,
                        name=getattr(message, "name", None),
                        result=text_of(message.content),
                        is_error=is_error,
                    )
                )

    flush()
    return result

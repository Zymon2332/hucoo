"""Agent 流式对话的领域事件契约（M2：run / step / 内容块三层）。

- ``run``：整轮 agent 执行（整个 loop）。``run.start`` … ``run.finish``。
- ``step``：loop 的一次迭代 = 一次模型调用 + 它触发的工具执行。
- 内容块：``reasoning`` / ``text`` / ``tool``，是 step 内部**扁平并列**的块，
  按到达顺序排列（参考 Vercel AI SDK / AG-UI 的块生命周期模型）。

设计文档：``docs/plans/2026-09-23-agent-sse-event-contract-design.md``。

- 顶层判别联合，``type`` 为判别字段（点分 ``<domain>.<action>``）。
- 公共信封字段：``v`` / ``run_id`` / ``seq`` / ``ts``。
- 纯 pydantic，**不依赖任何传输层**（如 fastapi）；SSE 编码见
  ``harness.streaming.sse.to_sse``。
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field


class BaseEvent(BaseModel):
    """所有领域事件的公共信封。"""

    type: str
    """事件类型，点分 ``<domain>.<action>``；子类收窄为 ``Literal``。"""
    v: Literal[1] = 1
    """schema 版本。"""
    run_id: str
    """单次流式运行的唯一 id。"""
    seq: int
    """单调整数序号，同时用作 SSE ``id:``（预留断点续传）。"""
    ts: int
    """事件时间戳，epoch 毫秒。"""


ModelFinishReason = Literal[
    "stop", "length", "tool_calls", "content_filter", "refusal", "error", "other"
]
"""模型（step 级）停止原因，已跨 provider 归一化。"""

RunFinishReason = Literal["stop", "interrupted", "error", "cancelled"]
"""整个 agent 轮次（run 级）的结束原因。"""


# --------------------------------------------------------------------------- #
# Run 生命周期
# --------------------------------------------------------------------------- #


class RunStart(BaseEvent):
    type: Literal["run.start"] = "run.start"
    thread_id: str
    model: str


class RunFinish(BaseEvent):
    type: Literal["run.finish"] = "run.finish"
    finish_reason: RunFinishReason
    usage: dict[str, int] | None = None
    """整轮汇总用量（各 step 用量之和，含 token 细分）。"""
    duration_ms: int | None = None
    """整轮耗时（毫秒）。"""


class RunError(BaseEvent):
    type: Literal["run.error"] = "run.error"
    code: str
    message: str
    retryable: bool = False
    details: dict[str, Any] = Field(default_factory=dict)


# --------------------------------------------------------------------------- #
# Step：loop 的一次迭代（一次模型调用 + 其工具执行）
# --------------------------------------------------------------------------- #


class StepStart(BaseEvent):
    type: Literal["step.start"] = "step.start"
    message_id: str
    """该 step 对应模型调用的消息 id。"""


class StepEnd(BaseEvent):
    type: Literal["step.end"] = "step.end"
    message_id: str
    finish_reason: ModelFinishReason | None = None
    """该次模型调用的归一化停止原因。"""
    raw_finish_reason: str | None = None
    """provider 原始停止原因（保真，供观测）。"""
    duration_ms: int | None = None
    """该 step 整个迭代耗时（含工具执行）。"""
    usage: dict[str, int] | None = None
    """该次模型调用的 token 用量（含细分）。"""


# --------------------------------------------------------------------------- #
# Reasoning 块
# --------------------------------------------------------------------------- #


class ReasoningStart(BaseEvent):
    type: Literal["reasoning.start"] = "reasoning.start"
    message_id: str


class ReasoningDelta(BaseEvent):
    type: Literal["reasoning.delta"] = "reasoning.delta"
    message_id: str
    delta: str


class ReasoningEnd(BaseEvent):
    type: Literal["reasoning.end"] = "reasoning.end"
    message_id: str
    duration_ms: int | None = None


# --------------------------------------------------------------------------- #
# Text 块
# --------------------------------------------------------------------------- #


class TextStart(BaseEvent):
    type: Literal["text.start"] = "text.start"
    message_id: str


class TextDelta(BaseEvent):
    type: Literal["text.delta"] = "text.delta"
    message_id: str
    delta: str


class TextEnd(BaseEvent):
    type: Literal["text.end"] = "text.end"
    message_id: str
    duration_ms: int | None = None


# --------------------------------------------------------------------------- #
# Tool 块
# --------------------------------------------------------------------------- #


class ToolStart(BaseEvent):
    type: Literal["tool.start"] = "tool.start"
    tool_call_id: str
    name: str
    message_id: str | None = None


class ToolArgs(BaseEvent):
    type: Literal["tool.args"] = "tool.args"
    tool_call_id: str
    delta: str


class ToolEnd(BaseEvent):
    type: Literal["tool.end"] = "tool.end"
    tool_call_id: str
    args: dict[str, Any] | None = None


class ToolResult(BaseEvent):
    type: Literal["tool.result"] = "tool.result"
    tool_call_id: str
    name: str
    content: str
    is_error: bool = False
    duration_ms: int | None = None


# --------------------------------------------------------------------------- #
# 控制 / 元信息
# --------------------------------------------------------------------------- #


class State(BaseEvent):
    type: Literal["state"] = "state"
    patch: dict[str, Any] = Field(default_factory=dict)


class Interrupt(BaseEvent):
    type: Literal["interrupt"] = "interrupt"
    id: str
    value: Any = None


class Custom(BaseEvent):
    type: Literal["custom"] = "custom"
    name: str
    data: dict[str, Any] = Field(default_factory=dict)


AgentEvent = Annotated[
    RunStart
    | RunFinish
    | RunError
    | StepStart
    | StepEnd
    | ReasoningStart
    | ReasoningDelta
    | ReasoningEnd
    | TextStart
    | TextDelta
    | TextEnd
    | ToolStart
    | ToolArgs
    | ToolEnd
    | ToolResult
    | State
    | Interrupt
    | Custom,
    Field(discriminator="type"),
]

"""把 LangGraph v3 流投影映射为领域事件（M2：run / step / 内容块）。

v3 的设计初衷是**消费类型化投影**，而不是解析内部协议事件：
``message.text`` / ``message.reasoning``（``AsyncTextProjection``，既可
``async for`` 拿增量、也可 ``await`` 拿全文）、``message.tool_calls``
（``AsyncProjection``，``async for`` 拿 ``ToolCallChunk`` 增量、``await`` 拿
最终 ``list[ToolCall]``）、``message.output``（``await`` 拿组装好的 ``AIMessage``）。
本模块只依赖这些公开投影，**永不透出协议内部事件名**。

事件模型：
- ``run`` = 整轮 agent 执行；``step`` = loop 的一次迭代（一次模型调用 + 其工具执行）；
  内容块（reasoning / text / tool）是 step 内**扁平并列**的块，按到达顺序排列。
- ``step.end`` 采用**延迟闭合**：处理 message N 时暂存，等 message N+1 出现（此时 N
  的工具已执行、``tool.result`` 已发）再发 ``step.end(N)``；``run.messages`` 耗尽时发
  最后一个 ``step.end``。这样无需跨消费者等待，也天然处理 HITL 中断。

两路投影（``run.messages`` / ``run.tool_calls``）必须并发消费，用一个
``asyncio.Queue`` 做 fan-in，否则运行中的事件会漏。v3 仍为实验性 API。
"""

from __future__ import annotations

import asyncio
import contextlib
import time
import uuid
from collections.abc import AsyncIterator
from typing import TYPE_CHECKING, Any

from harness.domain.agent_event import (
    BaseEvent,
    Interrupt,
    ReasoningDelta,
    ReasoningEnd,
    ReasoningStart,
    RunError,
    RunFinish,
    RunStart,
    StepEnd,
    StepStart,
    TextDelta,
    TextEnd,
    TextStart,
    ToolArgs,
    ToolEnd,
    ToolResult,
    ToolStart,
)
from harness.streaming.sse import EventFactory

if TYPE_CHECKING:
    from service.agent_service import RuntimeContext

_USAGE_KEYS = {"input_tokens", "output_tokens", "total_tokens"}

_FINISH_REASON_MAP: dict[str, str] = {
    # stop
    "stop": "stop",
    "end_turn": "stop",
    "complete": "stop",
    "stop_sequence": "stop",
    # length
    "length": "length",
    "max_tokens": "length",
    "model_length": "length",
    # tool calls
    "tool_calls": "tool_calls",
    "tool_use": "tool_calls",
    "tool_call": "tool_calls",
    "function_call": "tool_calls",
    # content filter / safety
    "content_filter": "content_filter",
    "safety": "content_filter",
    "recitation": "content_filter",
    "blocklist": "content_filter",
    "prohibited_content": "content_filter",
    "spii": "content_filter",
    "image_safety": "content_filter",
    "language": "content_filter",
    "error_toxic": "content_filter",
    # refusal
    "refusal": "refusal",
    # provider error
    "error": "error",
    "error_limit": "error",
    "malformed_function_call": "error",
    "unexpected_tool_call": "error",
    "insufficient_system_resource": "error",
    # other / unknown
    "other": "other",
    "finish_reason_unspecified": "other",
}

_RETRYABLE_HINTS = (
    "timeout",
    "timed out",
    "rate",
    "connection",
    "temporarily",
    "overloaded",
    "unavailable",
)

def _text_of(content: object) -> str:
    """把消息块 content 规整为纯文本。"""
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


def _arg_delta(prev: str, current: str) -> str:
    """快照差分：v3 的 ``ToolCallChunk.args`` 是累积值，取相对上一片的新增部分。

    若 ``current`` 不是 ``prev`` 的延续（极少见的纯片段语义），按片段整体返回。
    """
    return current[len(prev):] if current.startswith(prev) else current


def _usage_of(output: object) -> dict[str, int] | None:
    """从组装后的 ``AIMessage`` 提取 token 用量（含缓存/推理细分）。"""
    usage = getattr(output, "usage_metadata", None)
    if not isinstance(usage, dict):
        return None
    picked: dict[str, int] = {
        k: v for k, v in usage.items() if k in _USAGE_KEYS and isinstance(v, int)
    }
    input_details = usage.get("input_token_details")
    if isinstance(input_details, dict) and isinstance(
        input_details.get("cache_read"), int
    ):
        picked["cached_tokens"] = input_details["cache_read"]
    output_details = usage.get("output_token_details")
    if isinstance(output_details, dict) and isinstance(
        output_details.get("reasoning"), int
    ):
        picked["reasoning_tokens"] = output_details["reasoning"]
    return picked or None


def _normalize_finish_reason(raw: str | None) -> str | None:
    """把各 provider 的停止原因归一化为 ``ModelFinishReason``。"""
    if not raw:
        return None
    return _FINISH_REASON_MAP.get(raw.strip().lower(), "other")


def _extract_finish_reason(output: object) -> tuple[str | None, str | None]:
    """从组装后的 ``AIMessage`` 取 (归一化原因, 原始原因)。"""
    meta = getattr(output, "response_metadata", None)
    if not isinstance(meta, dict):
        return None, None
    raw = meta.get("finish_reason") or meta.get("stop_reason")
    if not isinstance(raw, str) or not raw:
        return None, None
    return _normalize_finish_reason(raw), raw


def _is_retryable(exc: BaseException) -> bool:
    """启发式判断异常是否可重试（超时/限流/连接类）。"""
    text = f"{type(exc).__name__} {exc}".lower()
    return any(hint in text for hint in _RETRYABLE_HINTS)


async def stream_agent_events(
    agent: Any,
    agent_input: Any,
    *,
    config: dict[str, Any],
    context: "RuntimeContext",
    model: str = "",
    run_id: str | None = None,
) -> AsyncIterator[BaseEvent]:
    """运行 agent 并把 v3 流投影映射为领域事件序列。

    终止语义：有且仅有一个 ``run.finish`` / ``run.error`` / ``interrupt``。
    """
    factory = EventFactory(run_id or uuid.uuid4().hex)
    thread_id = str(config.get("configurable", {}).get("thread_id", ""))

    run = await agent.astream_events(
        agent_input, config=config, context=context, version="v3"
    )
    queue: asyncio.Queue[BaseEvent | None] = asyncio.Queue()
    terminal_sent = False
    run_started_at = time.monotonic()
    usage_totals: dict[str, int] = {}
    # step 内「当前打开的内容块」状态（同一时刻至多一个）。
    block: dict[str, Any] = {"kind": None, "started_at": 0.0}
    # 延迟闭合的 step.end 数据：(message_id, finish_reason, raw_finish_reason, usage, started_at)
    pending: tuple[str, str | None, str | None, dict[str, int] | None, float] | None = (
        None
    )

    async def _open_block(kind: str, message_id: str) -> None:
        """打开内容块；若当前块类型不同，先闭合旧块。"""
        if block["kind"] == kind:
            return
        await _close_block(message_id)
        block["kind"] = kind
        block["started_at"] = time.monotonic()
        if kind == "reasoning":
            await queue.put(factory.emit(ReasoningStart, message_id=message_id))
        else:
            await queue.put(factory.emit(TextStart, message_id=message_id))

    async def _close_block(message_id: str) -> None:
        """闭合当前内容块（若打开）。"""
        kind = block["kind"]
        if kind is None:
            return
        duration_ms = int((time.monotonic() - block["started_at"]) * 1000)
        block["kind"] = None
        if kind == "reasoning":
            await queue.put(
                factory.emit(ReasoningEnd, message_id=message_id, duration_ms=duration_ms)
            )
        else:
            await queue.put(
                factory.emit(TextEnd, message_id=message_id, duration_ms=duration_ms)
            )

    async def _emit_step_end(
        data: tuple[str, str | None, str | None, dict[str, int] | None, float],
    ) -> None:
        message_id, finish_reason, raw_finish_reason, usage, started_at = data
        await queue.put(
            factory.emit(
                StepEnd,
                message_id=message_id,
                finish_reason=finish_reason,
                raw_finish_reason=raw_finish_reason,
                usage=usage,
                duration_ms=int((time.monotonic() - started_at) * 1000),
            )
        )

    async def _drain_text(message: Any, message_id: str) -> None:
        async for delta in message.text:
            if delta:
                await _open_block("text", message_id)
                await queue.put(
                    factory.emit(TextDelta, message_id=message_id, delta=delta)
                )

    async def _drain_reasoning(message: Any, message_id: str) -> None:
        async for delta in message.reasoning:
            if delta:
                await _open_block("reasoning", message_id)
                await queue.put(
                    factory.emit(ReasoningDelta, message_id=message_id, delta=delta)
                )

    async def _drain_tool_calls(message: Any, message_id: str) -> None:
        # compat bridge 对 tool_call_chunk 发的是**累积快照**（见
        # ``_compat_bridge.py`` 中 ``delta_source = current if is_block_delta``）：
        # 每片都带粘性 id/name + 累积 args，故按 id 去重发 start，按 index 做 args 差分。
        seen: set[str] = set()
        prev_args: dict[Any, str] = {}
        async for chunk in message.tool_calls:
            idx = chunk.get("index", 0)
            tcid = str(chunk.get("id") or "")
            if tcid and tcid not in seen:
                seen.add(tcid)
                # 工具块开始前，闭合正在进行的 reasoning/text 块。
                await _close_block(message_id)
                await queue.put(
                    factory.emit(
                        ToolStart,
                        tool_call_id=tcid,
                        name=str(chunk.get("name") or ""),
                        message_id=message_id,
                    )
                )
            args = chunk.get("args") or ""
            delta = _arg_delta(prev_args.get(idx, ""), args)
            prev_args[idx] = args
            if delta and tcid:
                await queue.put(
                    factory.emit(ToolArgs, tool_call_id=tcid, delta=delta)
                )
        for tc in await message.tool_calls:
            await queue.put(
                factory.emit(
                    ToolEnd, tool_call_id=str(tc.get("id")), args=tc.get("args")
                )
            )

    async def consume_messages() -> None:
        nonlocal pending
        async for message in run.messages:
            message_id = str(getattr(message, "message_id", None) or uuid.uuid4().hex)
            # 上一个 step 的工具此时已执行完（tool.result 已发），可以闭合 step。
            if pending is not None:
                await _emit_step_end(pending)
                pending = None
            started_at = time.monotonic()
            await queue.put(factory.emit(StepStart, message_id=message_id))
            # 三个投影并发消费，保留 reasoning/text/tool 的真实到达顺序。
            drains = [
                asyncio.ensure_future(_drain_text(message, message_id)),
                asyncio.ensure_future(_drain_reasoning(message, message_id)),
                asyncio.ensure_future(_drain_tool_calls(message, message_id)),
            ]
            try:
                await asyncio.gather(*drains)
            except BaseException:
                for task in drains:
                    task.cancel()
                raise
            await _close_block(message_id)
            output = await message.output
            usage = _usage_of(output)
            if usage is not None:
                for key, value in usage.items():
                    usage_totals[key] = usage_totals.get(key, 0) + value
            finish_reason, raw_finish_reason = _extract_finish_reason(output)
            pending = (
                message_id,
                finish_reason,
                raw_finish_reason,
                usage,
                started_at,
            )
        if pending is not None:
            await _emit_step_end(pending)
            pending = None

    async def consume_tools() -> None:
        async for tool_stream in run.tool_calls:
            started_at = time.monotonic()
            # drain 输出增量直到终止事件，此时 output/error 才就绪。
            async for _delta in tool_stream.output_deltas:
                pass
            duration_ms = int((time.monotonic() - started_at) * 1000)
            if tool_stream.error:
                await queue.put(
                    factory.emit(
                        ToolResult,
                        tool_call_id=str(tool_stream.tool_call_id),
                        name=str(tool_stream.tool_name),
                        content=str(tool_stream.error),
                        is_error=True,
                        duration_ms=duration_ms,
                    )
                )
            else:
                await queue.put(
                    factory.emit(
                        ToolResult,
                        tool_call_id=str(tool_stream.tool_call_id),
                        name=str(tool_stream.tool_name),
                        content=_text_of(getattr(tool_stream.output, "content", None)),
                        duration_ms=duration_ms,
                    )
                )

    # 注：``custom`` 事件需在 agent 上注册 ``CustomTransformer`` 才会出现在
    # ``run.extensions["custom"]``；当前 ``create_lead_agent`` 未注册，故暂不消费。

    async def drive() -> None:
        nonlocal terminal_sent
        coros = [consume_messages(), consume_tools()]
        results = await asyncio.gather(*coros, return_exceptions=True)
        # 同一底层错误会同时反映到 messages / tool_calls 两路，故只报第一个异常，
        # 避免出现多条 run.error（终止事件必须唯一）。
        for result in results:
            if isinstance(result, Exception):
                await queue.put(
                    factory.emit(
                        RunError,
                        code="internal",
                        message=str(result),
                        retryable=_is_retryable(result),
                        details={"error_type": type(result).__name__},
                    )
                )
                terminal_sent = True
                break
        await queue.put(None)

    driver = asyncio.create_task(drive())

    yield factory.emit(RunStart, thread_id=thread_id, model=model)
    try:
        while True:
            item = await queue.get()
            if item is None:
                break
            yield item

        if terminal_sent:
            return

        if await run.interrupted():
            for intr in await run.interrupts():
                yield factory.emit(
                    Interrupt, id=str(getattr(intr, "id", "")), value=intr.value
                )
            return

        yield factory.emit(
            RunFinish,
            finish_reason="stop",
            usage=usage_totals or None,
            duration_ms=int((time.monotonic() - run_started_at) * 1000),
        )
    except Exception as exc:  # noqa: BLE001
        if not terminal_sent:
            yield factory.emit(
                RunError,
                code="internal",
                message=str(exc),
                retryable=_is_retryable(exc),
                details={"error_type": type(exc).__name__},
            )
        with contextlib.suppress(Exception):
            await run.abort()
    finally:
        if not driver.done():
            driver.cancel()
            with contextlib.suppress(Exception):
                await driver

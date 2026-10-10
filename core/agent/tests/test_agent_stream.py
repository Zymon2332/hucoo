import json
from typing import Any

from harness.streaming.agent_stream import (
    _arg_delta,
    _normalize_finish_reason,
    stream_agent_events,
)
from service.agent_service import RuntimeContext
from tests.fakes import (
    build_failing_agent,
    build_reasoning_every_call_agent,
    build_scripted_agent,
    build_split_tool_agent,
    build_text_then_tool_agent,
)

TERMINAL = {"run.finish", "run.error", "interrupt"}


async def _run(agent: Any, thread: str) -> list[Any]:
    return [
        ev
        async for ev in stream_agent_events(
            agent,
            {"messages": [{"role": "user", "content": "北京天气?"}]},
            config={"configurable": {"thread_id": thread}, "metadata": {"trace_id": "x"}},
            context=RuntimeContext(user_id="u", trace_id="x"),
            model="test",
        )
    ]


async def _collect() -> list[Any]:
    return await _run(build_scripted_agent(), "t1")


async def _collect_split() -> list[Any]:
    return await _run(build_split_tool_agent(), "t2")


async def _collect_reasoning() -> list[Any]:
    return await _run(build_reasoning_every_call_agent(), "t3")


def _types(events: list[Any]) -> list[str]:
    return [e.type for e in events]


# --------------------------------------------------------------------------- #
# 单元：纯函数
# --------------------------------------------------------------------------- #


def test_arg_delta_from_growing_snapshots():
    assert _arg_delta("", '{"city"') == '{"city"'
    assert _arg_delta('{"city"', '{"city": "Beijing"}') == ': "Beijing"}'
    assert _arg_delta("", '{"city": "Beijing"}') == '{"city": "Beijing"}'
    assert _arg_delta('{"city"', "other") == "other"


def test_normalize_finish_reason():
    assert _normalize_finish_reason("end_turn") == "stop"
    assert _normalize_finish_reason("MAX_TOKENS") == "length"
    assert _normalize_finish_reason("tool_use") == "tool_calls"
    assert _normalize_finish_reason("SAFETY") == "content_filter"
    assert _normalize_finish_reason("refusal") == "refusal"
    assert _normalize_finish_reason("weird") == "other"
    assert _normalize_finish_reason(None) is None


# --------------------------------------------------------------------------- #
# run 生命周期 / 终止
# --------------------------------------------------------------------------- #


async def test_run_lifecycle_and_content():
    events = await _collect()
    types = _types(events)

    assert types[0] == "run.start"
    assert "text.delta" in types
    assert "tool.start" in types
    assert "tool.result" in types
    assert types[-1] == "run.finish"


async def test_exactly_one_terminal_event():
    events = await _collect()
    assert sum(t in TERMINAL for t in _types(events)) == 1


async def test_seq_is_monotonic_and_unique():
    events = await _collect()
    seqs = [e.seq for e in events]
    assert seqs == sorted(seqs)
    assert len(set(seqs)) == len(seqs)


async def test_tool_result_is_not_error_for_success():
    events = await _collect()
    results = [e for e in events if e.type == "tool.result"]
    assert results
    assert all(e.is_error is False for e in results)


# --------------------------------------------------------------------------- #
# step
# --------------------------------------------------------------------------- #


async def test_step_start_end_symmetric():
    events = await _collect_reasoning()
    types = _types(events)
    assert types.count("step.start") == 2
    assert types.count("step.end") == 2
    # 每个 step.start 的 message_id 都能在 step.end 找到
    starts = {e.message_id for e in events if e.type == "step.start"}
    ends = {e.message_id for e in events if e.type == "step.end"}
    assert starts == ends


async def test_step_end_fields():
    events = await _collect()
    ends = [e for e in events if e.type == "step.end"]
    assert ends
    final = ends[-1]
    assert final.finish_reason == "stop"
    assert final.raw_finish_reason == "stop"
    assert final.usage is not None
    assert final.usage["total_tokens"] == 28


async def test_step_end_finish_reason_length():
    events = await _run(build_scripted_agent(finish_reason="length"), "tl")
    ends = [e for e in events if e.type == "step.end"]
    assert ends[-1].finish_reason == "length"
    assert ends[-1].raw_finish_reason == "length"


async def test_tool_result_before_step_end():
    events = await _collect()
    types = _types(events)
    # 工具执行结果应在同一 step 的 step.end 之前（step.end 延迟到下一 step 才发）
    assert types.index("tool.result") < types.index("step.end")


async def test_durations_present():
    events = await _collect()
    for e in events:
        if e.type in {"text.end", "reasoning.end", "tool.result", "step.end", "run.finish"}:
            assert e.duration_ms is not None
            assert e.duration_ms >= 0


async def test_run_finish_usage_aggregate_with_breakdown():
    events = await _collect()
    steps = [e for e in events if e.type == "step.end"]
    run_finish = next(e for e in events if e.type == "run.finish")
    assert run_finish.usage is not None
    assert run_finish.usage["total_tokens"] == sum(
        (s.usage or {}).get("total_tokens", 0) for s in steps
    )
    assert run_finish.usage.get("cached_tokens") == 5
    assert run_finish.usage.get("reasoning_tokens") == 3


# --------------------------------------------------------------------------- #
# 内容块顺序（M2）
# --------------------------------------------------------------------------- #


async def test_reasoning_end_before_text_start():
    events = await _collect()
    types = _types(events)
    assert types.index("reasoning.end") < types.index("text.start")


async def test_text_end_before_tool_start():
    events = await _run(build_text_then_tool_agent(), "tt")
    types = _types(events)
    assert "text.end" in types
    assert "tool.start" in types
    assert types.index("text.end") < types.index("tool.start")


async def test_reasoning_independent_per_step():
    events = await _collect_reasoning()
    types = _types(events)
    assert types.count("reasoning.start") == 2
    assert types.count("reasoning.end") == 2
    # step1：reasoning 在 tool.start 前闭合
    assert types.index("reasoning.end") < types.index("tool.start")
    # 每个 reasoning.end 都带耗时
    assert all(e.duration_ms is not None for e in events if e.type == "reasoning.end")


async def test_no_reasoning_brackets_when_absent():
    events = await _collect_split()
    types = _types(events)
    assert "reasoning.start" not in types
    assert "reasoning.end" not in types


# --------------------------------------------------------------------------- #
# 工具参数（累积快照 + 粘性 id）
# --------------------------------------------------------------------------- #


async def test_tool_args_streamed_with_sticky_tool_call_id():
    events = await _collect_split()
    types = _types(events)

    assert "tool.start" in types
    assert "tool.args" in types
    assert "tool.end" in types
    assert types.index("tool.start") < types.index("tool.args")

    args_events = [e for e in events if e.type == "tool.args"]
    assert all(e.tool_call_id == "call_split" for e in args_events)
    assert json.loads("".join(e.delta for e in args_events)) == {"city": "Beijing"}


async def test_tool_end_carries_parsed_args():
    events = await _collect_split()
    ends = [e for e in events if e.type == "tool.end"]
    assert ends
    assert ends[0].args == {"city": "Beijing"}


# --------------------------------------------------------------------------- #
# 错误
# --------------------------------------------------------------------------- #


async def test_run_error_observability_fields():
    events = await _run(build_failing_agent(), "tf")
    types = _types(events)
    assert types.count("run.error") == 1
    assert "run.finish" not in types
    err = next(e for e in events if e.type == "run.error")
    assert err.details.get("error_type")

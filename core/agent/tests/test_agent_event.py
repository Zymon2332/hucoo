import pytest
from pydantic import TypeAdapter, ValidationError

from harness.domain.agent_event import (
    AgentEvent,
    RunError,
    RunFinish,
    RunStart,
    StepStart,
    TextDelta,
    ToolResult,
)


def test_text_delta_defaults_type_and_v():
    ev = TextDelta(run_id="r1", seq=1, ts=123, message_id="m1", delta="hi")
    assert ev.type == "text.delta"
    assert ev.v == 1


def test_union_discriminates_by_type():
    ta = TypeAdapter(AgentEvent)
    ev = ta.validate_python(
        {
            "v": 1,
            "run_id": "r",
            "seq": 1,
            "ts": 1,
            "type": "run.start",
            "thread_id": "t",
            "model": "gpt",
        }
    )
    assert isinstance(ev, RunStart)


def test_tool_result_defaults_is_error_false():
    ev = ToolResult(
        run_id="r", seq=2, ts=1, tool_call_id="c1", name="get_weather", content="sunny"
    )
    assert ev.is_error is False


def test_run_error_fields():
    ev = RunError(run_id="r", seq=3, ts=1, code="internal", message="boom")
    assert ev.type == "run.error"
    assert ev.retryable is False


def test_step_start_has_no_index():
    ev = StepStart(run_id="r", seq=1, ts=1, message_id="m")
    assert ev.type == "step.start"
    assert not hasattr(ev, "index")


def test_run_finish_reason_is_run_level_only():
    RunFinish(run_id="r", seq=1, ts=1, finish_reason="interrupted")
    with pytest.raises(ValidationError):
        RunFinish(run_id="r", seq=1, ts=1, finish_reason="tool_calls")  # type: ignore[arg-type]

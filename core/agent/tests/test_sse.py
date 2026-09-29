import json

from harness.domain.agent_event import TextDelta
from harness.streaming.sse import EventFactory, to_sse


def test_to_sse_maps_event_id_and_data():
    ev = TextDelta(run_id="r", seq=7, ts=1, message_id="m", delta="hi")
    sse = to_sse(ev)
    assert sse.event == "text.delta"
    assert sse.id == "7"
    assert sse.data is ev


def test_to_sse_data_serializes_type_and_envelope():
    ev = TextDelta(run_id="r", seq=7, ts=1, message_id="m", delta="hi")
    payload = json.loads(to_sse(ev).data.model_dump_json())
    assert payload == {
        "v": 1,
        "run_id": "r",
        "seq": 7,
        "ts": 1,
        "type": "text.delta",
        "message_id": "m",
        "delta": "hi",
    }


def test_factory_seq_is_monotonic_and_ts_set():
    f = EventFactory(run_id="r")
    a = f.emit(TextDelta, message_id="m", delta="a")
    b = f.emit(TextDelta, message_id="m", delta="b")
    assert (a.seq, b.seq) == (1, 2)
    assert a.run_id == "r"
    assert a.ts > 0

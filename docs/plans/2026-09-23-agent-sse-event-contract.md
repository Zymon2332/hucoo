# Agent SSE 事件契约 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把 Agent 流式对话改造成「领域事件 -> `ServerSentEvent`」两层结构，输出点分命名、判别联合的生产级 SSE 契约。

**Architecture:** 领域层定义 pydantic 判别联合事件；`harness/streaming/` 负责把 LangGraph v3 流映射为领域事件并编码为 `ServerSentEvent`；控制器只做编排。

**Tech Stack:** Python 3.14 · FastAPI 0.141(`fastapi.sse`) · LangChain 1.4 / LangGraph 1.2 (v3 streaming) · pydantic v2 · pytest。

**Design:** `docs/plans/2026-09-23-agent-sse-event-contract-design.md`

---

## Task 1: 测试脚手架与 dev 依赖

**Files:**
- Modify: `core/agent/pyproject.toml`
- Create: `core/agent/tests/__init__.py`
- Create: `core/agent/pytest.ini` (或 pyproject `[tool.pytest.ini_options]`)

**Step 1:** 在 `pyproject.toml` 增加 dev 依赖并配置 asyncio：

```toml
[dependency-groups]
dev = [
    "pytest>=8.3",
    "pytest-asyncio>=0.24",
    "httpx>=0.28",
]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

**Step 2:** `uv sync`，确认 `uv run pytest --collect-only` 可执行（0 tests）。

**Step 3:** Commit。

---

## Task 2: 领域事件模型

**Files:**
- Modify: `core/agent/harness/domain/agent_event.py`
- Create: `core/agent/tests/test_agent_event.py`

**Step 1: 写失败测试**

```python
from harness.domain.agent_event import MessageDelta, AgentEvent
from pydantic import TypeAdapter

def test_message_delta_defaults_type_and_v():
    ev = MessageDelta(run_id="r1", seq=1, ts=123, message_id="m1", delta="hi")
    assert ev.type == "message.delta"
    assert ev.v == 1

def test_union_discriminates_by_type():
    ta = TypeAdapter(AgentEvent)
    ev = ta.validate_python({"v": 1, "run_id": "r", "seq": 1, "ts": 1,
                             "type": "run.start", "thread_id": "t", "model": "gpt"})
    assert ev.__class__.__name__ == "RunStart"
```

**Step 2:** `uv run pytest tests/test_agent_event.py -v` → FAIL（ImportError）。

**Step 3: 实现** `BaseEvent` + 各子类 + `AgentEvent` 联合（字段见设计文档第 5 节）。

**Step 4:** 测试通过。

**Step 5:** Commit。

---

## Task 3: SSE 编码器与事件工厂

**Files:**
- Create: `core/agent/harness/streaming/__init__.py`
- Create: `core/agent/harness/streaming/sse.py`
- Create: `core/agent/tests/test_sse.py`

**Step 1: 写失败测试**

```python
from harness.domain.agent_event import MessageDelta
from harness.streaming.sse import EventFactory, to_sse

def test_to_sse_maps_event_id_and_data():
    ev = MessageDelta(run_id="r", seq=7, ts=1, message_id="m", delta="hi")
    sse = to_sse(ev)
    assert sse.event == "message.delta"
    assert sse.id == "7"
    assert sse.data is ev

def test_factory_seq_is_monotonic_and_ts_set():
    f = EventFactory(run_id="r")
    a = f.emit(MessageDelta, message_id="m", delta="a")
    b = f.emit(MessageDelta, message_id="m", delta="b")
    assert (a.seq, b.seq) == (1, 2)
    assert a.run_id == "r" and a.ts > 0
```

**Step 2:** FAIL。

**Step 3: 实现**

```python
import itertools, time
from fastapi.sse import ServerSentEvent
from harness.domain.agent_event import BaseEvent

def to_sse(event: BaseEvent) -> ServerSentEvent:
    return ServerSentEvent(event=event.type, data=event, id=str(event.seq))

class EventFactory:
    def __init__(self, run_id: str) -> None:
        self.run_id = run_id
        self._seq = itertools.count(1)
    def emit[E: BaseEvent](self, cls: type[E], **fields) -> E:
        return cls(run_id=self.run_id, seq=next(self._seq),
                   ts=int(time.time() * 1000), **fields)
```

**Step 4:** 测试通过。

**Step 5:** Commit。

---

## Task 4: v3 流 -> 领域事件编排

**Files:**
- Create: `core/agent/harness/streaming/agent_stream.py`
- Create: `core/agent/tests/test_agent_stream.py`

以 `examples/astream_events_v3_demo.py::stream_events` 为蓝本，把 `AgentEvent` 换成新领域事件 + `EventFactory`。

**Step 1: 写失败测试**（复用 demo 的 `ScriptedChatModel` 思路，脚本化模型离线跑）

```python
# tests/fakes.py 提供 ScriptedChatModel / build_scripted_agent
from harness.streaming.agent_stream import stream_agent_events

async def test_emits_run_start_and_finish_and_message():
    agent = build_scripted_agent()
    events = [e async for e in stream_agent_events(
        agent, {"messages": [{"role": "user", "content": "hi"}]},
        config={"configurable": {"thread_id": "t"}},
        context=RuntimeContext(user_id="u", trace_id="x"))]
    types = [e.type for e in events]
    assert types[0] == "run.start"
    assert types[-1] == "run.finish"
    assert "message.delta" in types
    assert types.count("run.finish") == 1
```

**Step 2:** FAIL。

**Step 3: 实现** `stream_agent_events`（**投影驱动**，不解析内部协议事件）：

- `run = await agent.astream_events(input, config=config, context=context, version="v3")`
- 队列 `asyncio.Queue[BaseEvent | None]`，三路并发消费（messages / tool_calls / custom 若存在），`gather(..., return_exceptions=True)` 后异常 -> `run.error`。
- messages：`async for message in run.messages`，发 `message.start`；**并发** `gather` 消费三个公开投影：
  - `message.text` -> `message.delta`
  - `message.reasoning` -> `reasoning.delta`
  - `message.tool_calls` -> `tool.start` / `tool.args` / `tool.end`（`ToolCallChunk` 是**累积快照**，用 `_arg_delta` 差分得增量；按 `index` 维护粘性 `tool_call_id`）
  - `await message.output` 取 `usage_metadata` -> `usage`；结束发 `message.end`。
- tool_calls（执行结果）：`async for tc in run.tool_calls`，drain `output_deltas` 后 -> `tool.result`（error -> `is_error=True`）。
- 首帧 `run.start`，尾帧 `run.finish`；`await run.interrupted()` 为真时发 `interrupt` 并 return。
- `finally` 取消 driver 并 `await run.abort()`。

**关键点**：只依赖公开投影（`message.text` / `.reasoning` / `.tool_calls` / `.output`），不匹配 `content-block-*` 等内部事件名。

**Step 4:** 测试通过。

**Step 5:** Commit。

---

## Task 5: 控制器瘦身

**Files:**
- Modify: `core/agent/controller/api.py`

**Step 1:** 重写 `stream_chat`：

```python
factory = EventFactory(run_id=uuid.uuid4().hex)
async for ev in stream_agent_events(agent, _normalize_input(payload.input),
                                    config=config, context=RuntimeContext(...)):
    yield to_sse(ev)
```

- 删除 `[DONE]`、`"error:"` 前缀、内联 `ServerSentEvent(...)`、未使用的 `consume_tool_calls`。
- 返回类型保持 `AsyncIterator[ServerSentEvent]`。
- 顶部 docstring 更新为「领域事件 -> to_sse」。

**Step 2:** `uv run python -c "import controller.api"` 无导入错误。

**Step 3:** 若可运行：`uv run main.py` + `curl -N -X POST localhost:2000/agent/v1/chat/stream -H 'content-type: application/json' -d '{...}'` 人工核对 wire 格式（`event:` / `data:` / `id:`）。

**Step 4:** Commit。

---

## Task 6: 回归与收尾

**Step 1:** `uv run pytest -v` 全绿。
**Step 2:** `uv run python -c "import main"` 无错误。
**Step 3:** Commit。

---

## Task 7: 可观测性增强（已完成）

**Files:** `harness/domain/agent_event.py`、`harness/streaming/agent_stream.py`、`tests/*`、设计文档。

**契约变更：**
- 删 `MessageStart.index`、`Usage.step`（死字段）。
- `MessageEnd` 增 `finish_reason`(归一化) / `raw_finish_reason` / `duration_ms`。
- `RunFinish` 的 `finish_reason` 收窄为 `stop | interrupted | error | cancelled`；`usage` 填整轮汇总；增 `duration_ms`。
- `Usage` 增 `cached_tokens` / `reasoning_tokens`。
- `ToolResult` 增 `duration_ms`。
- `RunError.details` 填 `error_type`；`retryable` 启发式。
- `reasoning.start/end` 惰性发出（有推理才发）；`ReasoningEnd.duration_ms` 为**每条 message 独立思考**的耗时（不同模型调用相互独立）。
- `state` / `custom` 保留类定义，暂不发出。

**实现：**
- `_normalize_finish_reason`（provider 值 → 归一化枚举）+ `_extract_finish_reason`（从 `output.response_metadata` 取 `finish_reason`/`stop_reason`）。
- `_usage_of` 扩展取 `input_token_details.cache_read` / `output_token_details.reasoning`。
- `consume_messages` 记录耗时、汇总用量；`consume_tools` 记录工具耗时；`stream_agent_events` 记录整轮耗时并在 `run.finish` 汇总。
- `_is_retryable`：类名/消息含 timeout/rate/connection 等 → True。
- 错误路径：`drive` **只报第一个异常**——同一底层错误会同时反映到 `run.messages` 与 `run.tool_calls` 两路，否则会产生多条 `run.error`（终止事件必须唯一）。

**测试：** finish_reason 归一化+原始值、`length` 用例、`duration_ms` 非空、`run.finish.usage` 汇总与细分、reasoning 括号顺序与缺省、`run.error` 的 `details.error_type`/`retryable`、`_normalize_finish_reason`/`_is_retryable` 单测、契约（`RunFinish` 拒绝 message 级值、`MessageStart` 无 index）。

---

## Task 8: M2 契约重构（run / step / 内容块）（已完成）

**Files:** `harness/domain/agent_event.py`、`harness/streaming/agent_stream.py`、`tests/*`、设计文档。

**契约变更：**
- 新增三层语义：`run`（整 loop）/ `step`（一次模型调用 + 其工具执行）/ 内容块（扁平并列）。
- 新增 `step.start {message_id}` / `step.end {message_id, finish_reason, raw_finish_reason, duration_ms, usage}`。
- `message.start/delta/end` → **改名** `text.start/delta/end`（`text.end` 带 `duration_ms`）。
- 删除独立 `usage` 事件（per-step 用量并入 `step.end.usage`；`run.finish.usage` 为整轮汇总）。
- `reasoning.*` / `tool.*` 保留；`reasoning.end` 带 `duration_ms`。

**实现：**
- step 内「当前打开内容块」状态机：类型切换即闭合；`tool.start/args` 前闭合 text/reasoning。
- **`step.end` 延迟闭合**：message N 暂存，等 message N+1（此时 N 的工具已执行、`tool.result` 已发）
  再发 `step.end(N)`；`run.messages` 耗尽时发最后一个。无需跨消费者等待，天然处理 HITL 中断。
- `drive` 只报第一个异常，避免重复 `run.error`。

**测试：** 重写 `test_agent_stream.py`（step 对称、块顺序、`tool.result` 早于 `step.end`、
`step.end`/`run.finish` 用量、reasoning 独立成段、工具参数粘性 id/差分、错误路径）；更新
`test_agent_event.py`/`test_sse.py`。3.14 与 3.11 全量通过。

---

## 风险与备注

- LangGraph v3 为实验性 API；实现只依赖公开投影（`message.text` / `.reasoning` / `.tool_calls` / `.output`、`run.tool_calls`），不解析内部协议事件名。
- `ToolCallChunk.args` 是**累积快照**（compat bridge `delta_source = current if is_block_delta`），用 `_arg_delta` 差分；每片都带粘性 `id`/`name`。
- `state` / `custom` 尚未发出：`custom` 需在 agent 注册 `CustomTransformer` 并消费 `run.extensions["custom"]`；`state` 需消费 `run.values`。二者为后续工作。
- `finish_reason` 依赖 provider 是否在 `response_metadata` 提供；缺失时为 `None`。
- 本阶段不实现 `Last-Event-ID` 续传；`seq` / `id` 已预留。

# Agent 流式对话 · SSE 事件契约设计（M2）

- 日期：2026-09-23
- 目标目录：`core/agent`
- 状态：已评审通过，进入实现
- 端点：`POST /agent/v1/chat/stream`

## 1. 目标

为 Agent 流式对话定义一份**生产级、可扩展、渲染直观**的 SSE 事件契约，并把
「领域事件」与「SSE 传输对象」分层，使前端可基于 `fetch` + `ReadableStream` 稳定消费。

## 2. 三层语义（M2）

- **run**：整轮 agent 执行（整个 loop）。`run.start` … `run.finish`。
- **step**：loop 的一次迭代 = **一次模型调用 + 它触发的工具执行**。`step.start` … `step.end`。
- **内容块**：`reasoning` / `text` / `tool`，是 step 内部**扁平并列**的块，按到达顺序排列
  （参考 Vercel AI SDK / AG-UI 的块生命周期模型）。

内容块不再嵌套在「message」里；`message_id` 作为字段保留在每个块事件上，用于分组与观测。

## 3. 分层架构

```
harness/domain/agent_event.py   领域事件：判别联合，纯 pydantic，不 import fastapi
harness/streaming/sse.py        编码器：唯一 import ServerSentEvent 的地方
harness/streaming/agent_stream.py 编排：消费 v3 投影 -> 领域事件（fan-in 队列）
controller/api.py               控制器：async for ev: yield to_sse(ev)
```

## 4. 传输层约定

- `POST /agent/v1/chat/stream` → `text/event-stream; charset=utf-8`。
- 每条事件：`event: <type>`、`data: <JSON>`、`id: <seq>`。
- **SSE 的 `event:` 行 = JSON 里的 `type`**（冗余但最兼容）。
- 心跳：SSE 注释行（FastAPI 自动发送），不产生业务事件。
- **终止语义**：有且仅有一个终止事件（`run.finish` / `run.error` / `interrupt`）。
- **不使用** `data: [DONE]` 哨兵。
- **续传**：本阶段不实现服务端缓冲；`id: <seq>` 与 `seq` 已预留。

## 5. 命名约定

点分 `<domain>.<action>`（如 `step.start`、`text.delta`、`tool.result`）：
命名空间清晰、扩展无冲突、前端可 `type.split(".")[0]` 粗分派。

## 6. 事件清单

公共信封：`v`(Literal[1])、`run_id`、`seq`(单调整数, =SSE id)、`ts`(epoch ms)。

| type | 时机 | 专有字段 |
|---|---|---|
| `run.start` | 流开始，仅一次 | `thread_id`, `model` |
| `run.finish` | 终止 | `finish_reason`(run 级), `usage?`(整轮汇总), `duration_ms` |
| `run.error` | 终止 | `code`, `message`, `retryable`, `details`(含 `error_type`) |
| `step.start` | loop 一次迭代开始 | `message_id` |
| `step.end` | 该迭代结束（含工具执行后） | `message_id`, `finish_reason?`(归一化), `raw_finish_reason?`, `duration_ms`, `usage?`(该次模型调用) |
| `reasoning.start` | 推理块开始（惰性） | `message_id` |
| `reasoning.delta` | 推理增量 | `message_id`, `delta` |
| `reasoning.end` | 推理块结束 | `message_id`, `duration_ms` |
| `text.start` | 正文块开始（惰性） | `message_id` |
| `text.delta` | 正文增量 | `message_id`, `delta` |
| `text.end` | 正文块结束 | `message_id`, `duration_ms` |
| `tool.start` | 模型提出调用（执行前） | `tool_call_id`, `name`, `message_id` |
| `tool.args` | 工具参数增量（原始 JSON 片段） | `tool_call_id`, `delta` |
| `tool.end` | 参数生成完毕（≠执行完成） | `tool_call_id`, `args?`(解析后) |
| `tool.result` | 工具执行完成 | `tool_call_id`, `name`, `content`, `is_error`, `duration_ms` |
| `state` | 状态快照/增量（**待接入**） | `patch` |
| `interrupt` | HITL 待审批（终止） | `id`, `value` |
| `custom` | 扩展逃生舱（**待接入**） | `name`, `data` |

## 7. 顺序示例（含工具调用的一轮）

```
run.start
step.start                (m1)
  reasoning.start → reasoning.delta* → reasoning.end
  text.start → text.delta* → text.end
  tool.start → tool.args* → tool.end
  tool.result
step.end                  (m1: finish_reason, usage, duration_ms)
step.start                (m2)
  reasoning.start → reasoning.delta* → reasoning.end
  text.start → text.delta* → text.end
step.end                  (m2)
run.finish                (整轮 usage 汇总)
```

- 内容块内部有序；块与块之间按到达顺序（reasoning 通常在 text/tool 前）。
- `tool.result` 在**同一 step 的 `step.end` 之前**（step.end 延迟到下一 step 才发）。
- `message_id` 在块事件上保留，用于把块关联回同一次模型调用。

## 8. 语义约定

1. **终止唯一**：`run.finish` / `run.error` / `interrupt` 三选一；前端据此 `reader.cancel()`。
2. **工具失败 ≠ 致命错误**：工具异常发 `tool.result{is_error:true}`（非终止）；
   仅 run 级失败发终止的 `run.error`。
3. **`finish_reason` 分两级**：
   - step 级（`step.end`，模型为何停止）：归一化 `stop | length | tool_calls | content_filter | refusal | error | other` + 原始值 `raw_finish_reason`。
   - run 级（`run.finish`，整轮为何结束）：`stop | interrupted | error | cancelled`。
4. **`error.code`**：命名空间字符串（如 `model.rate_limit`、`internal`），配 `retryable`。
5. **思考（reasoning）粒度**：每个 step（一次模型调用）一个独立思考块，`reasoning.end.duration_ms`
   为该次调用的思考跨度；块在首个非 reasoning 事件（text/tool）前闭合。

## 8.1 finish_reason 归一化与渲染

读取顺序：`output.response_metadata["finish_reason"]` → `["stop_reason"]`，大小写不敏感。

| 归一化 | 命中原始值 |
|---|---|
| `stop` | stop, end_turn, STOP, COMPLETE, stop_sequence |
| `length` | length, max_tokens, MAX_TOKENS, model_length |
| `tool_calls` | tool_calls, tool_use, TOOL_CALL, function_call |
| `content_filter` | content_filter, SAFETY, RECITATION, BLOCKLIST, PROHIBITED_CONTENT, SPII, IMAGE_SAFETY, LANGUAGE |
| `refusal` | refusal |
| `error` | error, ERROR, ERROR_LIMIT, MALFORMED_FUNCTION_CALL, UNEXPECTED_TOOL_CALL, insufficient_system_resource |
| `other` | OTHER, FINISH_REASON_UNSPECIFIED, 未知值 |

**渲染原则**：后端只给枚举，前端本地化文案；只渲染「异常/需提示」的原因。

- step 级：`length`→「回答被截断」；`content_filter`→「内容被安全策略拦截」；`refusal`→「模型拒绝回答」；
  `error`→错误提示（与 `run.error` 去重）；`stop`/`tool_calls`/`other`/`None`→不渲染。
- run 级：`stop`→正常；`cancelled`→「已停止」；`interrupted`→走 `interrupt` 审批 UI；`error`→错误横幅。
- 观测面板（折叠）：`raw_finish_reason`、`model`、`duration_ms`、`usage`（含 `cached_tokens`/`reasoning_tokens`）。
- `tool.end` 仅表示**参数生成完毕**，工具执行中的状态区间是 `tool.end → tool.result`。

## 9. 编码与工厂

```python
def to_sse(event: BaseEvent) -> ServerSentEvent:
    return ServerSentEvent(event=event.type, data=event, id=str(event.seq))
```

- `data=event` 直接传 Pydantic 实例，routing 走 `model_dump_json()`，无需手写 `json.dumps`。
- `EventFactory` 持有 `run_id` 与 `itertools.count`，集中分配 `seq`/`ts`。

## 10. 编排（v3 投影 → 领域事件）

- 只消费公开投影：`message.text` / `.reasoning` / `.tool_calls` / `.output`、`run.tool_calls`。
- 两路投影并发消费，`asyncio.Queue` fan-in。
- step 内维护「当前打开内容块」状态机：类型切换即闭合旧块；`tool.start/args` 前闭合 text/reasoning。
- **`step.end` 延迟闭合**：处理 message N 时暂存，等 message N+1 出现（此时 N 的工具已执行）再发
  `step.end(N)`；`run.messages` 耗尽时发最后一个。无需跨消费者等待，天然处理 HITL 中断。
- 错误：只报第一个异常（同一底层错误会同时反映到两路投影），保证终止事件唯一。

## 11. 前端消费要点（fetch + ReadableStream）

- 按 `\n\n` 切事件块，逐行解析 `event:` / `data:` / `id:`，忽略注释行。
- 按 `step`（`step.start`…`step.end`）分组；step 内按 `text` / `reasoning` / `tool` 块 + 到达顺序渲染。
- 文本/推理增量按 `message_id` 聚合；工具按 `tool_call_id` 关联 `tool.args`→`tool.end`→`tool.result`。
- 收到终止事件后 `reader.cancel()`；断连由前端自行重连（未来可带 `Last-Event-ID`）。
- 未知 `type` 忽略（向前兼容）。

## 12. 验证

- 纯函数单测：`to_sse`、`EventFactory`、`_normalize_finish_reason`、`_is_retryable`、`_arg_delta`。
- 编排测试（离线脚本模型）：run/step 生命周期、块顺序、终止唯一、`tool.result` 早于 `step.end`、
  `step.end`/`run.finish` 用量、错误路径。
- 3.14 与 3.11 全量通过。

## 13. 风险

- LangGraph v3 为实验性 API；只依赖公开投影，不解析内部事件名。
- `ToolCallChunk.args` 是**累积快照**，用 `_arg_delta` 差分；每片都带粘性 `id`/`name`。
- `finish_reason` 依赖 provider 是否在 `response_metadata` 提供；缺失时为 `None`。
- 单次调用内交错思考（如 Anthropic interleaved-thinking beta）不在当前范围。
- `state` / `custom` 尚未发出（后续接入 `run.values` / `CustomTransformer`）。

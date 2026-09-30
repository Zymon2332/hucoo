import type { AgentEvent } from "@hucoo/streaming";

const RUN_ID = "run_demo_1";
const THREAD_ID = "t_demo_1";

let seq = 0;
let artifactVersion = 0;
const ts = 0;

function ev<T extends { type: AgentEvent["type"] }>(partial: T): AgentEvent {
  seq += 1;
  return { v: 1, run_id: RUN_ID, seq, ts, ...partial } as unknown as AgentEvent;
}

const MARKDOWN = `# 季度营收分析

根据当前季度的运行数据，**整体呈现增长态势**。

## 关键发现

- 活跃 Agent 数环比 **+12.4%**
- 平均单次推理成本 **-8.1%**
- 工具调用成功率 **99.2%**

## 建议

1. 将高频场景固化为模板
2. 对长上下文任务启用缓存
3. 监控 \`length\` 截断比例

\`\`\`sql
select date_trunc('month', created_at) as m, count(*)
from ap_run
group by 1 order by 1 desc;
\`\`\`
`;

export function basicRunEvents(echo?: string): AgentEvent[] {
  seq = 0;
  artifactVersion += 1;
  const artifactContent = `${MARKDOWN}\n_（第 ${artifactVersion} 次生成）_\n`;
  const events: AgentEvent[] = [
    ev({ type: "run.start", thread_id: THREAD_ID, model: "deepseek-v4.1" }),

    ev({ type: "step.start", message_id: "m1" }),
    ev({ type: "reasoning.start", message_id: "m1" }),
    ev({ type: "reasoning.delta", message_id: "m1", delta: "用户想了解本季度营收" }),
    ev({ type: "reasoning.delta", message_id: "m1", delta: "，我需要先查询数据库。" }),
    ev({ type: "reasoning.end", message_id: "m1", duration_ms: 820 }),
    ev({ type: "text.start", message_id: "m1" }),
    ...(echo
      ? [ev({ type: "text.delta", message_id: "m1", delta: `${echo}\n\n` })]
      : []),
    ev({ type: "text.delta", message_id: "m1", delta: "我先查询本季度的运行数据，" }),
    ev({ type: "text.delta", message_id: "m1", delta: "然后为你生成分析报告。" }),
    ev({ type: "text.end", message_id: "m1", duration_ms: 300 }),
    ev({ type: "tool.start", tool_call_id: "c1", name: "query_metrics", message_id: "m1" }),
    ev({ type: "tool.args", tool_call_id: "c1", delta: '{"range":' }),
    ev({ type: "tool.args", tool_call_id: "c1", delta: '"quarter"}' }),
    ev({ type: "tool.end", tool_call_id: "c1", args: { range: "quarter" } }),
    ev({
      type: "tool.result",
      tool_call_id: "c1",
      name: "query_metrics",
      content: "runs=24050, delta=+12.4%",
      is_error: false,
      duration_ms: 1450,
    }),
    ev({
      type: "step.end",
      message_id: "m1",
      finish_reason: "tool_calls",
      raw_finish_reason: "tool_use",
      duration_ms: 2570,
      usage: { input_tokens: 1180, output_tokens: 96, reasoning_tokens: 240 },
    }),

    ev({ type: "step.start", message_id: "m2" }),
    ev({ type: "reasoning.start", message_id: "m2" }),
    ev({ type: "reasoning.delta", message_id: "m2", delta: "数据已拿到，撰写报告并形成产物。" }),
    ev({ type: "reasoning.end", message_id: "m2", duration_ms: 510 }),
    ev({ type: "text.start", message_id: "m2" }),
    ev({ type: "text.delta", message_id: "m2", delta: "已为你生成《季度营收分析》文档。" }),
    ev({ type: "text.end", message_id: "m2", duration_ms: 220 }),
    ev({
      type: "custom",
      name: "artifact",
      data: {
        id: "art_1",
        kind: "markdown",
        title: "季度营收分析",
        content: artifactContent,
      },
    }),
    ev({
      type: "step.end",
      message_id: "m2",
      finish_reason: "stop",
      raw_finish_reason: "stop",
      duration_ms: 1250,
      usage: { input_tokens: 1420, output_tokens: 480, reasoning_tokens: 160 },
    }),

    ev({
      type: "run.finish",
      finish_reason: "stop",
      duration_ms: 5820,
      usage: { input_tokens: 2600, output_tokens: 576, reasoning_tokens: 400, cached_tokens: 320 },
    }),
  ];
  return events;
}

export function resumeRunEvents(): AgentEvent[] {
  seq = 0;
  return [
    ev({ type: "run.start", thread_id: THREAD_ID, model: "deepseek-v4.1" }),
    ev({ type: "step.start", message_id: "m1" }),
    ev({ type: "text.start", message_id: "m1" }),
    ev({
      type: "text.delta",
      message_id: "m1",
      delta: "已按你的决定继续处理，任务已完成。",
    }),
    ev({ type: "text.end", message_id: "m1", duration_ms: 180 }),
    ev({
      type: "step.end",
      message_id: "m1",
      finish_reason: "stop",
      raw_finish_reason: "stop",
      duration_ms: 420,
      usage: { input_tokens: 120, output_tokens: 24 },
    }),
    ev({
      type: "run.finish",
      finish_reason: "stop",
      duration_ms: 640,
      usage: { input_tokens: 120, output_tokens: 24 },
    }),
  ];
}

export function toSse(events: AgentEvent[]): string {
  return events
    .map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\nid: ${e.seq}\n\n`)
    .join("");
}

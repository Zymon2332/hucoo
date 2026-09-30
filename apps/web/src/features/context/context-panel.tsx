import type { RunState, RunStatus } from "@hucoo/streaming";

const STATUS_LABEL: Record<RunStatus, string> = {
  idle: "未开始",
  streaming: "生成中",
  finished: "已完成",
  error: "出错",
  interrupted: "待确认",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-section-label">
        {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium tabular-nums">{value}</span>
    </div>
  );
}

function fmt(value: number | undefined): string {
  return value === undefined ? "—" : value.toLocaleString();
}

export function ContextPanel({ run }: { run: RunState }) {
  const tools = run.steps
    .flatMap((step) => step.blocks)
    .filter((block) => block.kind === "tool");

  const hasRun = run.status !== "idle";

  return (
    <div className="space-y-5 p-4">
      <Section title="运行">
        <Row label="模型" value={run.model ?? "—"} />
        <Row label="状态" value={STATUS_LABEL[run.status]} />
        <Row
          label="耗时"
          value={run.durationMs !== undefined ? `${run.durationMs}ms` : "—"}
        />
        <Row label="步骤" value={run.steps.length} />
      </Section>

      <Section title="用量（Token）">
        <Row label="输入" value={fmt(run.usage?.input_tokens)} />
        <Row label="输出" value={fmt(run.usage?.output_tokens)} />
        <Row label="推理" value={fmt(run.usage?.reasoning_tokens)} />
        <Row label="缓存命中" value={fmt(run.usage?.cached_tokens)} />
      </Section>

      <Section title={`工具调用（${tools.length}）`}>
        {tools.length === 0 ? (
          <p className="text-xs text-muted-foreground">暂无工具调用</p>
        ) : (
          tools.map((tool, i) =>
            tool.kind === "tool" ? (
              <div
                key={`${tool.id}-${i}`}
                className="flex items-center justify-between gap-2 rounded-[10px] border border-border px-2.5 py-1.5 text-xs"
              >
                <span className="truncate font-medium">{tool.name}</span>
                <span
                  className={
                    tool.isError
                      ? "shrink-0 text-destructive"
                      : "shrink-0 text-muted-foreground"
                  }
                >
                  {tool.isError ? "失败" : tool.durationMs ? `${tool.durationMs}ms` : "完成"}
                </span>
              </div>
            ) : null,
          )
        )}
      </Section>

      {!hasRun && (
        <p className="rounded-[10px] border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
          发起一次对话后，这里会显示模型、用量与工具调用。
        </p>
      )}
    </div>
  );
}

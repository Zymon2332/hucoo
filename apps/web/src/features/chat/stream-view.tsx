import { motion } from "motion/react";
import { Robot, WarningCircle } from "@phosphor-icons/react";
import type { ContentBlock, RunState } from "@hucoo/streaming";
import { MarkdownRenderer } from "@/features/artifact/renderers/markdown-renderer";
import { ReasoningBlock } from "./reasoning-block";
import { ToolTimeline } from "./tool-timeline";
import { InterruptCard } from "./interrupt-card";
import { finishReasonNotice } from "./finish-reason";

function BlockView({ block }: { block: ContentBlock }) {
  if (block.kind === "reasoning") {
    return (
      <ReasoningBlock
        text={block.text}
        durationMs={block.durationMs}
        streaming={block.status === "streaming"}
      />
    );
  }
  if (block.kind === "tool") return <ToolTimeline block={block} />;
  return <MarkdownRenderer content={block.text} />;
}

const SUGGESTIONS = [
  "分析本季度营收并生成报告",
  "总结最近的告警并给出处理建议",
  "把这份数据整理成表格",
];

function EmptyState({ onSuggestion }: { onSuggestion?: (text: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center pt-16 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
        <Robot size={24} weight="fill" />
      </div>
      <h2 className="mt-4 text-xl font-semibold tracking-tight">
        开始你的 Agent 任务
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        统一入口，多场景。描述目标，Agent 会思考、调用工具并产出产物。
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggestion?.(s)}
            className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StreamView({
  run,
  onSuggestion,
  onInterruptResolve,
  onRetry,
}: {
  run: RunState;
  onSuggestion?: (text: string) => void;
  onInterruptResolve?: (approved: boolean) => void;
  onRetry?: () => void;
}) {
  if (run.status === "idle") return <EmptyState onSuggestion={onSuggestion} />;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {run.steps.map((step, i) => {
        const notice = finishReasonNotice(step.finishReason);
        return (
          <motion.div
            key={`${step.messageId}-${i}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-2"
          >
            {step.blocks.map((block, j) => (
              <BlockView key={`${block.id}-${j}`} block={block} />
            ))}
            {notice && (
              <p className="flex items-center gap-1.5 text-xs text-warning">
                <WarningCircle size={13} />
                {notice}
              </p>
            )}
          </motion.div>
        );
      })}

      {run.status === "streaming" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          正在生成…
        </div>
      )}

      {run.status === "error" && run.error && (
        <div className="flex items-center gap-3 rounded-[10px] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <span>
            {run.error.message}（{run.error.code}）
            {run.error.retryable && (
              <span className="ml-1 opacity-80">· 可重试</span>
            )}
          </span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="ml-auto shrink-0 rounded-[8px] border border-destructive/40 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-destructive/10"
            >
              重试
            </button>
          )}
        </div>
      )}

      {run.interrupt && (
        <InterruptCard
          value={run.interrupt.value}
          onResolve={(approved) => onInterruptResolve?.(approved)}
        />
      )}
    </div>
  );
}

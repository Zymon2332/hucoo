import { create } from "zustand";
import type { ArtifactKind } from "@/features/artifact/artifact-types";

export type InboxItemKind = "draft" | "result" | "suggestion";

export interface InboxSeed {
  title: string;
  assistantText: string;
  artifact?: {
    id: string;
    kind: ArtifactKind;
    title: string;
    content: string;
  };
}

export interface InboxItem {
  id: string;
  title: string;
  source: string;
  kind: InboxItemKind;
  confidence: number;
  scenarioId?: string;
  seed: InboxSeed;
}

const INITIAL: InboxItem[] = [
  {
    id: "i1",
    title: "《周报》草稿已生成，待你确认",
    source: "周报助理",
    kind: "draft",
    confidence: 0.92,
    scenarioId: "s3",
    seed: {
      title: "周报草稿",
      assistantText:
        "本周概览\n\n- 完成 Agent 工作台 v1\n- 上线产物版本与审阅\n- 下周计划：接入真实模型",
    },
  },
  {
    id: "i2",
    title: "检测到 3 条异常告警，建议归类为 P2",
    source: "监控 Agent",
    kind: "suggestion",
    confidence: 0.71,
    scenarioId: "s2",
    seed: {
      title: "告警归类建议",
      assistantText: "已将 3 条告警归类为 P2，并给出处理优先级建议。",
    },
  },
  {
    id: "i3",
    title: "季度营收分析已完成",
    source: "数据分析",
    kind: "result",
    confidence: 0.88,
    scenarioId: "s2",
    seed: {
      title: "季度营收分析",
      assistantText: "季度营收分析已完成，详见右侧产物。",
      artifact: {
        id: "inbox_art_1",
        kind: "markdown",
        title: "季度营收分析",
        content:
          "# 季度营收分析\n\n- 活跃 Agent 数环比 **+12.4%**\n- 平均推理成本 **-8.1%**\n",
      },
    },
  },
];

let simulated = 0;

interface InboxStore {
  items: InboxItem[];
  consume: (id: string) => InboxItem | undefined;
  dismiss: (id: string) => void;
  simulate: () => void;
}

export const useInboxStore = create<InboxStore>((set, get) => ({
  items: INITIAL,
  consume: (id) => {
    const item = get().items.find((i) => i.id === id);
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    return item;
  },
  dismiss: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  simulate: () =>
    set((s) => {
      simulated += 1;
      const item: InboxItem = {
        id: `sim-${simulated}`,
        title: `Agent 主动生成了一份草稿 #${simulated}`,
        source: "周报助理",
        kind: "draft",
        confidence: 0.8,
        scenarioId: "s3",
        seed: {
          title: `草稿 #${simulated}`,
          assistantText: `这是第 ${simulated} 份由后台 Agent 主动生成的草稿，请确认。`,
        },
      };
      return { items: [item, ...s.items] };
    }),
}));

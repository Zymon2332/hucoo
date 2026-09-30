import {
  BookOpen,
  ChartLineUp,
  Code,
  FlowArrow,
  Headset,
  PencilSimple,
  type Icon,
} from "@phosphor-icons/react";

export interface Scenario {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: Icon;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "s1",
    name: "知识问答",
    category: "Knowledge",
    description: "基于企业知识库检索并回答，附带引用来源与置信度。",
    icon: BookOpen,
  },
  {
    id: "s2",
    name: "数据分析",
    category: "Analytics",
    description: "连接指标与数据仓库，生成报表、图表与结论。",
    icon: ChartLineUp,
  },
  {
    id: "s3",
    name: "内容创作",
    category: "Writing",
    description: "撰写文档、周报、方案初稿，并在产物中直接编辑。",
    icon: PencilSimple,
  },
  {
    id: "s4",
    name: "流程助理",
    category: "Automation",
    description: "跨系统执行任务：建工单、发通知、跑审批流转。",
    icon: FlowArrow,
  },
  {
    id: "s5",
    name: "代码助手",
    category: "Engineering",
    description: "读懂仓库、生成补丁、解释实现并给出评审建议。",
    icon: Code,
  },
  {
    id: "s6",
    name: "客服助手",
    category: "Support",
    description: "接入工单与会话，自动分诊、草拟回复并升级。",
    icon: Headset,
  },
];

# Hucoo Agent 工作台 · 用户端设计（v1）

- 日期：2026-09-29
- 目标目录：`apps/web`（pnpm workspace 多包）
- 状态：设计已评审通过，进入实现计划
- 关联：`core/agent`（流式 SSE 服务）、`backend/`（管理端 REST）

## 1. 产品定位

企业内员工工作台：**统一入口，承载多场景**（知识问答 / 数据分析 / 内容创作 / 任务执行）。

它是 "Agent OS" 的第一阶段愿景，四个正交方向（Artifact-first 产物、Mission Control 画布、
主动式 Agent、⌘K 命令中心）共享同一状态模型，v1 先落地 **Artifact-first + 命令中心 + 三栏骨架 +
待处理收件箱**，画布与后台主动 Agent 作为后续能力层。

- 用户端负责「用」，管理端负责「管」。
- 消费管理端已有的 `AgentTemplate`（场景/市场）与身份/租户/配额体系。

## 2. 技术栈

| 关注点 | 选型 |
|---|---|
| 工程 | pnpm workspace：`apps/web` + `packages/ui` + `packages/sdk` + `packages/streaming` |
| 构建 | Vite + React 19 + TypeScript |
| 路由 | TanStack Router（文件式、全类型安全） |
| 样式/组件 | Tailwind v4 + shadcn/ui |
| 服务端状态 | TanStack Query |
| 客户端/流状态 | Zustand（`runReducer` 折叠 SSE 事件） |
| 动画 | `motion`（克制微交互）；GSAP 留给 2.0 画布 |
| 长列表 | `@tanstack/react-virtual` |
| 开发 Mock | MSW（模拟 REST + SSE） |
| 测试 | Vitest + Testing Library；Playwright（后续） |
| 鉴权/接入 | JWT（identity 模块），经 gateway `:8080`；Agent 流对接 `core/agent` |

## 3. 设计系统（对齐截图 `Agentic UI`）

浅色卡片式、绿色品牌、暖灰画布。

| 令牌 | 浅色值 | 用途 |
|---|---|---|
| `--background` | `#F0F0EE` | 应用画布（暖浅灰） |
| `--card` | `#FFFFFF` | 卡片 / 面板 / 侧栏 |
| `--border` | `#E8E8E6` | 卡片描边、分隔线 |
| `--foreground` | `#171717` | 主文本、大数字 |
| `--muted-foreground` | `#8A8A85` | 次级文本、图标 |
| `--section-label` | `#A3A39E` · 11px · `tracking-wide` · 大写 | 侧栏分组标题 |
| `--primary` | `#15803D`（按钮深绿） | 主按钮、激活态 |
| `--brand` / `--chart-1` | `#16A34A` / `#22C55E` | 品牌点、迷你柱状、面积图、进度条 |
| `--warning` / `--danger` | `#F59E0B` / `#DC2626` | Paused 标签 / 负向趋势 |
| `--radius` | 卡片 `16px` / 控件 `10px` / 标签 `9999px` | 圆角体系 |
| `--shadow-card` | `0 1px 2px rgba(0,0,0,.04), 0 1px 3px rgba(0,0,0,.06)` | 极轻投影 |

- **排版**：Inter / Geist，标题 semibold，数字 `tabular-nums`。
- **主题**：亮/暗双主题，默认跟随系统；深色版由同一绿色体系推导。
- **组件特征**：状态胶囊（`Live` 浅绿底/深绿字、`Paused` 浅琥珀底）；带圆点拖柄的进度条；
  渐变收尾的面积图；带 `⌘K` 徽标的搜索框；面包屑 + 图标按钮 + 头像顶栏；行内复选框可排序表格；
  侧栏底部用户卡；激活项为白色描边 pill。
- **图标**：Phosphor（`@phosphor-icons/react`），线性风格统一。

## 4. 信息架构（路由）

```
/                工作台首页 Launchpad（统计卡 + 场景快捷入口 + 待处理 + 最近会话）
/t/:threadId     对话 ⇄ 产物 双表面（核心页）
/artifacts/:id   产物视图（Markdown / 代码 / 表格 / 看板 / HTML，含版本历史）
/inbox           待处理（v1 占位数据，打通结构）
/agents          场景目录（消费 AgentTemplate：市场 / 我的）
/projects/:id    项目工作区
```

左侧导航**以场景/Agent 为一级**，用分组标题组织：`工作区`（首页 / 收件箱）、`场景`（各 Agent）、
`项目`、`设置`。

## 5. 布局（主流三栏 shell）

- **左栏**：可折叠、分组式导航（见上）。
- **中栏**：默认对话流；产物生成时**自动展开可拖拽分屏**（左对话 / 右产物），可拖到底或收起。
  这是 Artifact-first 的落点。
- **右栏**：上下文抽屉（引用来源、工具调用、模型/用量）+ **待处理收件箱**。
- **⌘K 命令面板**：全局 overlay，动词化命令（`/总结此对话`、`用 X Agent 重跑`、`新建产物`）。
- **响应式**：桌面优先（≥1280）；窄屏仅收起侧栏，不做移动端。

## 6. 统一状态模型

```
Workspace → Thread → Run → Step → Block(reasoning|text|tool)
                                  ↘ Artifact → ArtifactRevision
InboxItem（指向某个 Run/Artifact）
```

`packages/streaming` 提供 SSE 解析器；`runReducer` 消费事件序列并归一化到 Zustand store。
未来的画布（B）与后台代理（C）复用同一 store，只替换 renderer。

SSE 契约严格对齐 `core/agent`：`run.*` / `step.*` / `reasoning.*` / `text.*` / `tool.*` /
`state` / `interrupt` / `custom`。终止唯一（`run.finish` / `run.error` / `interrupt`）。

## 7. v1 范围

**做**：
- pnpm workspace + 脚手架 + 绿色设计系统 tokens + 三栏 shell
- 流式对话渲染（reasoning 折叠 / tool 时间线 / interrupt 审批卡 / finish_reason 本地化）
- Artifact 双表面：Markdown / 代码 / 表格 / HTML 渲染器 + 版本历史 + diff 接受/拒绝
- ⌘K 命令面板 + Composer（`@` 选 Agent、`/` 选工具、附件）
- 右栏上下文抽屉 + 收件箱（占位）
- 场景目录（AgentTemplate，Mock-first）、Launchpad、项目页
- 鉴权壳 + 路由守卫（JWT）、`packages/sdk` 经 gateway 的 API 客户端
- MSW 开发 Mock

**不做（2.0）**：无限画布、真实后台主动 Agent（依赖事件源）、桌面端、协作/在线状态。

## 8. 风险

1. 后端目前只有**管理端** API，用户端接口需 Mock-first，后续逐一对齐。
2. Agent 流式连接的鉴权方式（SSE + JWT / 短期 token）需与后端确认。
3. Artifact 持久化模型后端尚无实体，v1 先本地 + IndexedDB。

## 9. 测试策略

- `packages/streaming`：SSE 解析器单测（分块、注释行、未知 type 忽略）。
- `runReducer`：状态机单测（run/step 生命周期、块顺序、终止唯一、工具失败非致命）。
- 关键交互 RTL；Artifact diff 接受/拒绝；⌘K。
- 后续 Playwright 端到端。

## 10. 实现顺序

1. 工程脚手架（pnpm workspace、Vite、Tailwind v4、shadcn、Lint、Vitest、主题 tokens）
2. 三栏 shell + 分组侧栏 + 路由骨架（TanStack Router）
3. 流式内核（SSE 解析器 + `runReducer` + MSW + 对话渲染）
4. 产物表面（分屏联动、四种渲染器、版本历史、diff、IndexedDB）
5. ⌘K 命令面板 + Composer
6. 右栏上下文抽屉 + 收件箱
7. 场景目录 + Launchpad + 项目页
8. 鉴权与接入（JWT、守卫、sdk、Mock→真实）
9. 打磨（motion 微交互、无障碍、测试）

# Agent 平台管理控制台（前端 Mock 演示）

面向 **Agent 平台管理端** 的后台控制台前端。只做管理侧：租户、组织、用户、权限、审批、模型治理、工具与 MCP、Agent 模板与市场、项目与沙箱、用量计费、安全审计、监控告警、集成、运营、实验、系统设置。

**不包含**用户端聊天界面、真实 API、数据库或鉴权后端；所有数据为 `src/lib/mock-data` 下的静态演示数据。

## 技术栈

Next.js 15（App Router）· React 19 · TypeScript strict · Tailwind CSS 4 · shadcn/ui 风格组件（Radix UI）· TanStack Table · TanStack Query · Zustand · React Hook Form + Zod · Recharts · Lucide React · next-themes · Sonner · date-fns · Framer Motion · ESLint + Prettier

## 快速开始

```bash
npm install       # 安装依赖
npm run dev       # 启动开发服务器（默认 http://localhost:3000，/ 会重定向到 /dashboard）
```

其他命令：

```bash
npm run build       # 生产构建（含类型检查与 ESLint）
npm run start       # 启动生产服务
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run format      # Prettier 格式化
```

环境要求：Node.js 20+（本机验证版本 Node 21 / npm 10）。首次构建需要访问 Google Fonts 下载 Space Grotesk 与 DM Sans（已配置 `display: swap` 与系统字体兜底）。

## 目录结构

```
src/
├── app/
│   ├── (admin)/              # 管理端路由组，统一套用 AdminLayout
│   │   ├── dashboard/        # 总览
│   │   ├── tenants/          # 租户列表 / [id] 详情
│   │   ├── organizations/
│   │   ├── users/            # 列表 / [id] 详情
│   │   ├── sso/ roles/ permissions/ approvals/
│   │   ├── models/{platform,custom,providers,keys,validation,routing,calls}/
│   │   ├── tools/ mcp/
│   │   ├── agents/{templates,market}/
│   │   ├── projects/ workspaces/ sandboxes/
│   │   ├── usage/ billing/ costs/
│   │   ├── audit/ security/ compliance/
│   │   ├── monitoring/ alerts/
│   │   ├── integrations/ operations/ experiments/ settings/
│   │   └── layout.tsx        # AdminLayout
│   ├── globals.css           # Tailwind 4 主题令牌（亮/暗色）
│   ├── layout.tsx            # 根布局：字体、Provider、Toaster
│   ├── not-found.tsx
│   └── page.tsx              # 重定向到 /dashboard
├── components/
│   ├── layout/               # AdminLayout、Sidebar、Topbar、Breadcrumbs、CommandPalette、ThemeToggle、UserMenu、NotificationMenu
│   ├── common/               # PageHeader、StatCard、DataTable、FilterBar、DetailSheet、ConfirmDialog、RowActions、StatusBadge、ChartCard、Pagination、SearchInput、EmptyState
│   ├── organizations/        # 组织架构工作区：左树（虚拟滚动 / 懒加载 / 键盘导航）+ 右详情 + 顶部面包屑与搜索
│   ├── charts/               # Recharts 封装：AreaTrendChart、MultiLineChart、BarDistributionChart、DonutChart、SparkLine
│   ├── providers/            # TanStack Query + next-themes + Toaster + Tooltip
│   └── ui/                   # shadcn/ui 风格基础组件（button/badge/card/dialog/sheet/table/form/…）
├── config/nav.ts             # 13 个分组的侧边栏导航配置
├── hooks/                    # use-mock-query、use-virtual-rows（窗口化虚拟滚动）、use-delayed-flag（延迟骨架屏）
├── lib/
│   ├── mock-data/            # 全部静态数据（14 个业务域文件，含 org-members.ts 成员花名册、model-calls.ts 调用明细）
│   ├── mock-api.ts           # 本地分页/筛选/删除模拟
│   ├── org-tree.ts           # 组织树索引：父子树映射、深度、含下级统计、搜索命中、可见行展开
│   ├── permissions.ts        # 组织操作权限模型（身份 × 能力，含受限原因文案）
│   ├── org-activity.ts       # 组织操作记录（种子历史 + 会话内实时追加）
│   ├── labels.ts status.ts   # 枚举中文文案与状态色映射
│   └── utils.ts              # cn 与数字/日期格式化
├── store/ui-store.ts         # Zustand：侧边栏折叠、命令面板、移动端抽屉
└── types/                    # 领域类型（identity/models/capability/finops/ops/common）
```

## 路由清单（38 条）

`/dashboard` `/tenants` `/tenants/[id]` `/organizations` `/users` `/users/[id]` `/sso` `/roles` `/permissions` `/approvals` `/models/platform` `/models/custom` `/models/providers` `/models/keys` `/models/validation` `/models/routing` `/models/calls` `/tools` `/mcp` `/agents/templates` `/agents/market` `/projects` `/workspaces` `/sandboxes` `/usage` `/billing` `/costs` `/audit` `/security` `/compliance` `/monitoring` `/alerts` `/integrations` `/operations` `/experiments` `/settings`

## 交互约定

- 侧边栏可折叠（`⌘K` 打开命令面板；移动端为抽屉导航）
- 主题支持亮色 / 暗色 / 跟随系统（`next-themes`）
- 所有列表页支持搜索、排序、分页、列显隐；需要时支持行选择与批量操作
- 创建 / 编辑使用 React Hook Form + Zod 校验，仅写入页面本地状态
- 删除、禁用、回滚、作废等破坏性操作均有确认框
- 每个操作都有 Sonner Toast 反馈
- 数据密集、紧凑排布，数字统一使用等宽 `num` 样式
- 表单栅格里的 `FormItem` 固定使用 `grid content-start`：同行更高的字段（带 `FormDescription` 或校验提示）不会把相邻字段的标签行一起撑高、把控件挤下去，两列控件始终保持同一顶边

### 组织架构：左树定位 + 右详情管理

`/organizations` 是一个两级工作区，选中项与标签页写入 URL（`?org=<id>&tab=<overview|members|children|governance>`），可直接分享或刷新还原。

- **顶部**：层级面包屑（超过 4 级自动折叠中间层级，可展开跳转）、组织搜索（`/` 聚焦、`Esc` 清空、命中项高亮并自动展开路径）、权限视角切换、紧凑统计
- **左树**：可展开 / 折叠 / 展开全部，子节点首次展开时才「拉取」（`use-delayed-flag` 保证近实时操作不闪骨架屏）；固定行高窗口化虚拟滚动，506 个节点只渲染可视区约 35 行；`role="tree"` + `aria-activedescendant` 方向键导航、首字母快速定位
- **右详情**：概览（内联编辑负责人与描述，带脏状态与校验）、成员（按标签页懒加载 + 虚拟滚动，`aria-rowcount` / `aria-rowindex` 支持大列表语义）、下级组织（点击下钻）、操作与权限（身份能力矩阵 + 操作记录时间线）
- **权限与反馈**：4 种身份视角控制新建 / 编辑 / 归档 / 恢复 / 删除 / 成员管理的可用性，禁用按钮用 `title` 说明所需身份；归档支持 Toast「撤销」，删除有二次确认，所有操作写入操作记录并通过 `aria-live` 播报

### 模型调用记录：用户维度的模型使用追溯

`/models/calls` 面向「谁、在什么时候、用哪个模型、花了多少」的排障与治理诉求，数据来自 `lib/mock-data/model-calls.ts` 的 260 条确定性明细（覆盖近 30 天，按租户 / 用户 / 平台模型与自定义模型交叉生成）。

- **概览**：调用总量、成功率、平均延迟、失败与阻断、Token 消耗、调用成本六张卡片，均与「上一个等长窗口」对比得出环比
- **筛选**：租户、用户、模型、供应商、状态（成功 / 失败 / 超时 / 限流 / 安全阻断）、调用入口（Agent / 调试台 / OpenAPI / 工作流 / 批量任务）与时间范围（24 小时 / 7 天 / 30 天）组合过滤
- **调用明细**：趋势面积图（成功与失败分列）+ 明细表；失败与阻断行整行标红，支持行选择批量导出、加入排查清单，行内可复制 Request ID 或查看调用链
- **按用户**：按用户聚合调用量、成功率、Token、成本、平均延迟、常用模型与 12 段调用趋势，并提供 TOP 10 用户柱状图；行点击进入该用户的「模型使用记录」抽屉，可继续下钻到单次调用
- **按模型**：模型调用量与 Token 分布柱状图 + 聚合表，含成功率、平均延迟、成本与降级调用次数
- **失败与限流**：状态分布环形图、错误码分布图、错误码明细（次数 / 占比 / 受影响用户 / 最近发生）与受影响用户排行
- **单次调用详情**：抽屉展示调用结果与错误信息、归属（用户 / 租户 / 组织 / 项目 / Agent / 凭据 / 客户端 IP / UA）、模型与路由（实际模型、供应商、区域、路由策略、是否降级、原始请求模型）、性能与用量（总延迟、首字延迟、入 / 出 / 缓存 Token、工具调用、流式、重试、成本）以及安全策略命中与 Request / Trace ID
- **导出与归档**：导出使用 RHF + Zod 表单（范围、格式 CSV / JSONL / Parquet、仅失败调用、是否包含请求响应摘要）；归档、批量操作与复制均有 Toast 反馈

## 视觉规范

设计系统由 `ui-ux-pro-max` 技能生成后按「紧凑专业后台」收敛：

- 主色 `#6D28D9`（暗色 `#8B5CF6`），强调色青 `#0891B2` 用于图表
- 标题字体 Space Grotesk，正文字体 DM Sans（中文回退 PingFang SC / Microsoft YaHei）
- 状态色统一：成功绿、警告黄、错误红、处理中紫、禁用灰
- 表格行高紧凑（`h-8` 表头 / `py-2` 单元格），卡片阴影极轻
- 图表统一使用 `--chart-1…7` 令牌，自动适配暗色

## 已知限制

- 数据为静态演示数据，刷新后所有本地修改会重置
- 无后端、无鉴权、无持久化；`not-found` 与登录态均为演示占位
- 密钥明文在任何页面都不会展示，仅展示前缀与指纹
- 组织演示数据由种子 + 确定性生成器拼出约 506 个节点（最深 6 层），因此出现同名的部门（如多个「安全合规部」）属于同一层级下的真实情况，节点编码 `ORG-*` 唯一
- 组织成员花名册按组织 ID 确定性生成，单个组织最多 240 条，真实用户数据只挂在 16 个锚点组织上

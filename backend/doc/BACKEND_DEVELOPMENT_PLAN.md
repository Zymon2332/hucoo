# 管理端后端开发计划

## 1. 计划目标

根据前端 35 个管理页面及其接口草案，将当前后端骨架逐步建设为可供管理端使用的控制平面、治理平面和运营平面。

本计划遵循以下原则：

- 先冻结公共接口契约，再并行开发业务模块。
- 以租户隔离、权限校验、审计记录为所有写接口的默认能力。
- 复用现有 DDD 模块结构、MyBatis-Plus、Flyway 和 Mock/持久化双实现模式。
- 每个业务域同时交付接口、数据库迁移、权限点、审计事件、OpenAPI 文档和测试。
- 异步验证、扫描、导出、备份等操作统一使用任务状态模型。

### 执行状态

- [x] 修复 Maven 聚合中的重复模块声明。
- [x] 完成基线编译：`./mvnw -q -DskipTests compile`。
- [x] 完成分页 JSON 契约：`items/total/page/pageSize/pages`。
- [x] 增加分页契约测试。
- [x] 统一分页请求字段为 `page/pageSize/keyword`。
- [x] 增加组织、角色、权限、用户角色关联和审批基础表（V2）。
- [x] 通过全量测试：`./mvnw -q test`。
- [x] 通过 V1/V2 PostgreSQL 16 迁移冒烟校验。
- [x] 完成 H2/MySQL 到 PostgreSQL 的运行时、分页方言、Testcontainers 和 Docker Compose 切换。
- [x] 通过 DBX 创建 `hucoo_agent_platform` 数据库并执行 V1/V2 迁移，核验 18 张业务表的表注释和公共时间字段。
- [x] 完成组织基础 CRUD 接口：`/api/admin/v1/organizations`。
- [x] 完成角色基础 CRUD 接口：`/api/admin/v1/roles`。
- [x] 完成权限定义 CRUD 和基础角色权限矩阵接口：`/api/admin/v1/permissions`。
- [x] 完成审批列表、步骤详情、通过、拒绝和撤回接口：`/api/admin/v1/approvals`。
- [x] 增加租户概览和用户概览接口：`/api/admin/v1/tenants/{id}/overview`、`/api/admin/v1/users/{id}/overview`。
- [x] 增加数据库权限解析、请求租户上下文、实体 `tenant_id` 自动填充和清理。
- [x] 增加基于 `@RequirePermission` 的统一审计切面，记录操作者、租户、动作、客户端 IP 和 Trace ID。
- [x] 为身份、模型、MCP、Agent、项目、计费、审计、安全、监控和集成写接口增加权限点。
- [x] 增加正式领域路由别名、PATCH 更新接口和统一异步任务查询接口：`/api/admin/v1/jobs/{jobId}`。
- [x] 增加 V3 治理/运行环境/计费/安全/运营、V4 异步任务、V5 验证明细、V6 完整领域、V7 异步租约和 V8 表级注释迁移；DBX 已执行并核验 84 张业务表、84 张表注释、1039 条表/字段注释。
- [x] 完成字符串 ID、时间、金额和百分比序列化规范。
- [x] 完成统一错误码、幂等键和异步任务契约。
- [x] 完成接口版本、状态码、错误码和数据库迁移命名规范。
- [x] 完成租户、角色、权限、审批完整接口闭环（概览、数据库权限解析、请求租户上下文、跨租户写入拒绝、权限缓存失效和审计链路测试均已通过）。
- [x] 完成模型供应商、自定义模型、BYOK 引用、密钥轮换/撤销和路由规则的 MyBatis-Plus 持久化 CRUD；生产 profile 使用数据库服务，默认 profile 保留 Mock。
- [x] 完成运营公告、工单、工单消息、优惠券、实验状态和平台设置的数据库查询/状态更新服务；生产 profile 使用 V6 表，默认 profile 保留 Mock。
- [x] 增加工具目录 `GET/POST/PATCH/DELETE /api/admin/v1/mcp-servers/tools`，生产 profile 使用 `ap_tool_definition` 持久化，默认 profile 保留 Mock。
- [x] 增加 V7 异步任务执行租约、实例标识、执行尝试次数和过期租约恢复；重复创建/更新按租户和 jobId 幂等处理。

## 2. 当前基线

### 2.1 前端现状

- 前端包含 35 个管理页面，当前使用 `src/lib/mock-data` 和本地状态，没有真实后端调用。
- 页面覆盖总览、租户、身份权限、模型治理、工具 MCP、Agent、项目环境、财务、安全审计、监控和运营集成。
- 前端列表契约为 `items/total/page/pageSize`，详情和操作接口分别使用单对象和操作结果。

### 2.2 后端现状

- 已有 11 个业务模块，分别提供单实体 CRUD、Mock 实现和 MyBatis-Plus 持久化实现。
- V1 迁移脚本目前只有 11 张基础表：租户、用户、模型、MCP、Agent、项目工作区、用量、审计、安全策略、告警规则和集成应用。
- 当前默认 profile 使用 Mock 和 PostgreSQL；生产 profile 启用 PostgreSQL、Flyway 和持久化实现。
- `hucoo-module/pom.xml` 的重复模块声明已修复，当前基线编译和全量测试通过。

### 2.3 现有接口差异

| 项目 | 当前后端 | 前端接口草案 | 处理方式 |
|---|---|---|---|
| API 前缀 | `/api/admin/v1` | `/api/v1` | 保留后端前缀，前端统一配置 baseURL |
| 分页字段 | `records/pageNum/pageSize/pages` | `items/page/pageSize/total` | 第一阶段统一 JSON 契约 |
| ID 类型 | `Long` | `string` | DTO 序列化为字符串 |
| 修改方法 | `PUT` | `PATCH` | 新接口使用 PATCH，旧接口保留兼容期 |
| 路由命名 | `/models`、`/mcp-servers`、`/audit-logs` | `/models/platform`、`/mcp/servers`、`/audit/logs` | 建立正式路由，旧路径按需兼容 |
| 异步操作 | 未统一 | 验证、扫描、导出、备份等 | 增加 `jobId/requestId` 和任务查询接口 |

## 3. 第一阶段：公共契约和工程基线

预计 1～2 个工作日。

### 任务

1. [x] 删除 `hucoo-module/pom.xml` 中重复的 `hucoo-module-tool-mcp` 模块声明。
2. [x] 完成 Maven 编译基线，记录可复现的启动命令。
3. [x] 确认统一响应结构：

   ```json
   {
     "code": 200,
     "message": "success",
     "data": {},
     "traceId": "trace_xxx",
     "timestamp": 0
   }
   ```

4. [x] 将分页响应统一为 `items/total/page/pageSize/pages`。
5. [x] 统一基础查询参数：`page`、`pageSize`、`keyword`；排序和领域筛选待各模块补齐。
6. [x] 统一 ISO 8601 时间、字符串 ID、金额和百分比格式。
7. [x] 增加 OpenAPI 错误响应、幂等键和异步任务响应约定。
8. [x] 建立接口版本、状态码、错误码和数据库迁移命名规范。

### 交付物

- 编译通过的父工程。
- 公共 DTO、错误码和 OpenAPI 示例。
- 前后端可共同使用的接口契约文档。
- 契约测试模板。

## 4. 第二阶段：租户、身份和权限闭环

预计 1 个工作周。

### 页面和接口

- `/tenants`、`/tenants/{id}/overview`
- `/organizations`
- `/users`、`/users/{id}/overview`
- `/roles`、`/permissions`
- `/approvals`
- `/sso`、服务账号、API Key
- `/dashboard/overview` 的基础租户和权限指标

### 核心数据表

- `organization`、`organization_member`
- `role`、`permission`、`user_role`、`role_permission`
- `approval`、`approval_step`
- `sso_config`、`service_account`、`api_key`
- `tenant_feature_flag`、`tenant_quota`

### 验收标准

- 用户、角色、权限支持多对多关系。
- 所有查询按租户隔离，系统租户可执行平台级查询。
- 权限矩阵和权限模拟接口返回允许项、拒绝项和限制项。
- API Key 明文只在创建时返回一次，轮换和撤销均写入审计日志。
- 审批支持待审、通过、拒绝、撤回和审批步骤详情。

## 5. 第三阶段：模型治理

详细的数据模型、状态流转、路由边界和中文建表注释规范见：[模型与供应商治理设计](MODEL_GOVERNANCE_DESIGN.md)。

本次配置管理代码、接口示例、保险箱配置与尚待完成的运行时切换见：[实现与接入说明](MODEL_GOVERNANCE_IMPLEMENTATION.md)。

预计 1～2 个工作周。

### 页面和接口

- `/models/platform`
- `/models/custom`
- `/models/providers`
- `/models/keys`
- `/models/validation`
- `/models/routing`

### 核心数据表

- `model_provider`、`model_capability`、`model_price`
- `custom_model_registration`
- `model_key`、`model_key_rotation`
- `model_validation_run`、`model_validation_check`
- `routing_rule`、`provider_route`

### 实现重点

- [x] 完成正式模型治理路由别名：`/models/platform`、`/models/custom`、`/models/providers`、`/models/keys`、`/models/validation`、`/models/routing`。
- [x] 完成模型治理基础表迁移：`V3__governance_billing_operations_schema.sql`。
- [x] 模型验证基础执行器已覆盖连通性、流式、超时、并发、工具调用、JSON 模式、Token usage、上下文长度和多模态九项检查，返回单项结果、进度、失败原因并支持取消/重试。
- [x] V6 补齐模型能力、价格、密钥轮换和供应商路由表；密钥字段仅保存 Vault/KMS 引用和指纹。
- [x] 模型供应商、自定义模型、密钥、路由规则已提供生产持久化列表、创建、更新、删除、轮换和撤销接口。

- BYOK 密钥使用 Vault/KMS 引用保存，数据库不保存明文。
- 模型验证支持连通性、流式、超时、并发、工具调用、JSON 模式、Token usage、上下文长度和多模态检查。
- [x] 验证任务异步执行，支持进度、单项结果、失败原因和重试。
- 路由规则支持主模型、备用模型、优先级、降级条件和费用归属。
- 平台模型、自定义模型和本地模型使用明确的可见性与审批状态。

## 6. 第四阶段：工具、MCP 和 Agent

预计 1～2 个工作周。

### 页面和接口

- `/tools`
- `/mcp/servers`
- `/agents/templates`
- `/agents/market`

### 核心数据表

- `tool`、`tool_version`、`tool_review`
- `command_policy`、`network_policy`
- `mcp_server_tool`、`mcp_server_review`
- `agent_template`、`agent_version`
- `market_listing`、`market_review`、`market_report`

### 验收标准

- [x] 完成正式路由别名：`/tools`、`/mcp/servers`、`/agents/templates`、`/agents/market` 对应的基础列表入口。
- [x] 完成工具策略、MCP 审核、Agent 版本和市场基础表迁移（V3）。
- [x] MCP 健康检查、Agent 发布/回滚/市场审核操作已接入异步任务和权限审计；V6 补齐工具版本、审核、MCP 工具绑定和市场举报表。
- [x] 工具版本、MCP 审核、Agent 版本和市场记录已通过 `/api/admin/v1/domain/{resource}` 提供白名单生产 CRUD；工具目录正式路由为 `/api/admin/v1/mcp-servers/tools`，Agent 模板和市场保留 `/api/admin/v1/agents/templates`、`/api/admin/v1/agents/market`。

- 工具创建支持 JSON Schema、风险等级和是否需要审批。
- MCP 注册支持传输协议、认证方式、域名白名单、私网 CIDR 拦截和健康检查。
- Agent 模板支持版本发布、灰度、回滚、模型策略、工具白名单和知识库引用。
- 市场上架、审核、推荐位和举报均有状态流转及审计记录。

## 7. 第五阶段：项目和运行环境

预计 1 个工作周。

### 页面和接口

- `/projects`
- `/workspaces`
- `/sandboxes`

### 核心数据表

- `project`、`project_member`、`project_policy`
- `workspace`、`workspace_resource`
- `sandbox`、`sandbox_image`、`image_scan`、`image_vulnerability`
- `environment_variable`、`sensitive_file_policy`

### 实现重点

- [x] 增加 `/projects/workspaces`、`/projects/sandboxes` 基础列表入口。
- [x] 完成项目策略、工作区资源、沙箱和镜像扫描基础表迁移（V3）。
- [x] 沙箱扫描和重建已接入统一任务执行器，返回风险等级、漏洞数量、合规状态和重建进度。
- [x] 增加工作区启动、停止、回收任务入口；V6 补齐项目、成员、工作区、镜像、环境变量和敏感文件策略表。
- [x] 项目、成员、项目策略、工作区、工作区资源、沙箱、沙箱镜像、环境变量和敏感文件策略已通过领域目录服务及 `/api/admin/v1/projects/*` 正式别名提供生产 CRUD；所有 SQL 自动追加当前租户条件。

- 将当前 `ap_project_workspace` 拆分为项目和工作区两个聚合。
- 沙箱启动、停止、回收、批量回收、扫描和重建统一进入任务系统。
- 资源配额、并发限制、空闲回收、出网策略和敏感文件保护必须按租户/项目生效。
- 镜像扫描结果保存风险等级、漏洞数量、合规基线和扫描时间。

## 8. 第六阶段：用量、账单和成本

预计 1～2 个工作周。

### 页面和接口

- `/usage`
- `/billing`
- `/costs`

### 核心数据表

- `usage_record`、`usage_summary`
- `billing_plan`、`invoice`、`invoice_item`
- `cost_center`、`cost_allocation`
- `budget_alert`、`cost_simulation`

### 验收标准

- [x] 增加 `/billing/usage-records/records` 正式用量列表入口。
- [x] 完成用量汇总、套餐、发票、成本中心和预算告警基础表迁移（V3）。
- [x] 用量报表任务已执行明细汇总、费用拆分和结果生成，并支持取消/重试。
- [x] 增加成本模拟异步入口；V6 补齐发票明细、成本分摊和成本模拟表。
- [x] 套餐、发票、成本中心、预算告警和成本分摊已通过领域目录服务及 `/api/admin/v1/billing/*` 正式别名提供生产 CRUD；发票支持 `issue/pay/void` 状态流转，金额字段沿用 PostgreSQL NUMERIC 定义。

- 用量支持租户、项目、模型、Agent、工具和时间范围筛选。
- 平台模型费用、自定义模型费用、BYOK 管理费和 fallback 费用可区分。
- 发票支持开具、支付、作废和套餐价格调整。
- 成本模拟返回总成本、平台费、BYOK 费用和模型拆分。
- 报表生成和历史明细清理使用异步任务并保留操作审计。

## 9. 第七阶段：审计、安全、合规和监控

预计 1～2 个工作周。

### 页面和接口

- `/audit`
- `/security`
- `/compliance`
- `/monitoring`
- `/alerts`

### 核心数据表

- `audit_log`、`audit_export_job`
- `dlp_rule`、`content_filter_rule`
- `kms_key`、`ip_allowlist`
- `data_retention_policy`
- `compliance_item`、`compliance_evidence`
- `alert`、`alert_rule`、`notification_channel`、`alert_silence`
- `backup_job`

### 实现重点

- [x] 增加 `/audit/logs`、`/security-policies/dlp-rules`、`/alert-rules/rules` 和 `/alert-rules/alerts` 正式列表入口。
- [x] 完成 DLP、内容过滤、IP 白名单、留存、合规、告警和通知渠道基础表迁移（V3）。
- [x] 审计导出和监控备份已接入统一任务执行器，返回导出统计、校验结果和任务进度。
- [x] 增加安全策略测试、告警确认/恢复/静默操作；V6 补齐审计导出、KMS、合规证据、告警静默和备份表。
- [x] DLP、内容过滤、IP 白名单、留存、合规证据和通知渠道已通过领域目录服务及 `/api/admin/v1/security/*` 正式别名提供生产 CRUD；告警确认/恢复会持久化到 `ap_alert`，静默状态保留专用操作入口。

- 审计日志覆盖操作者、租户、资源、动作、结果、客户端 IP、Trace ID 和数据范围。
- DLP、内容审核、IP 白名单、数据留存和水印策略支持启停、版本和生效范围。
- 监控指标、服务状态、日志、Trace、SLA 和备份状态统一使用只读查询接口。
- 告警支持触发、确认、恢复、静默、通知渠道和通知失败重试。

## 10. 第八阶段：集成、运营、实验和设置

预计 1 个工作周。

### 页面和接口

- `/integrations`、`/webhooks`
- `/operations`
- `/experiments`
- `/settings`

### 模块建议

- 新增 `hucoo-module-operations`：公告、工单、优惠券、市场运营、实验和发布记录。
- 新增 `hucoo-module-platform-config`：系统设置、License、节点信息和配置版本。
- `hucoo-module-integration` 继续负责 Git、IM、CI/CD、OAuth 和 Webhook 连接。

### 验收标准

- [x] 增加 `/integrations/connections`、`/integrations/webhooks` 正式列表入口。
- [x] 完成公告、实验、平台设置和 Webhook 基础表迁移（V3）。
- [x] 增加 Webhook 重放、运营公告/工单/优惠券、实验启停回滚和平台设置更新/恢复默认入口；V6 补齐事件投递、运营和设置历史表。
- [x] 运营公告/工单/优惠券、实验状态和平台设置读取/更新已接入生产持久化服务；操作入口继续通过统一异步任务执行并保留权限审计。
- [x] Webhook 事件和投递记录已通过领域目录服务及 `/api/admin/v1/webhooks/events|deliveries` 正式别名提供生产 CRUD；重放会持久化 `RETRYING` 状态、重试次数和下次重试时间。Git/IM/CI/CD/OAuth 连接沿用集成应用 CRUD 和探活接口。

- OAuth 连接支持连接、断开、重新授权和凭证失效处理。
- Webhook 支持事件订阅、签名、重试、失败记录和手动重放。
- 实验支持 feature flag、A/B、灰度、影子流量、启停和回滚。
- 系统设置支持按分组读取、单项更新、恢复默认和配置版本审计。

## 11. 公共技术任务

这些任务贯穿所有阶段：

- [x] 完善 `CurrentTenantContext` 的请求入口和请求完成清理；异步任务执行器支持任务上下文的进度、结果和取消检查。
- [x] 为每个已交付写接口增加 `@RequirePermission` 权限点和审计事件。
- 将跨模块聚合改为 Facade 契约、领域事件或只读查询模型，禁止直接依赖其他业务模块数据库。
- 统一枚举、状态机、错误码和字段字典，避免前端依赖魔法数字。
- 增加 Redis 缓存、幂等控制、限流、熔断和外部连接超时配置。
- [x] 对模型验证、镜像扫描、报表、导出、备份建立统一任务查询接口、虚拟线程执行器、进度/结果/失败/取消/重试状态模型。
- [x] 将统一任务执行器状态持久化同步到 `ap_async_job`，按任务租户恢复上下文并写入结果、重试和取消状态。
- [x] 补齐跨实例任务恢复和任务执行器幂等接管：持久化监听器使用实例租约、过期租约回收、版本条件更新和租户/jobId 唯一约束；同一任务的重复事件不会重复插入。

## 12. 测试和交付门禁

每个阶段完成前必须满足：

1. `./mvnw clean install` 通过。
2. Mapper、Converter、Application Service 单元测试通过。
3. Testcontainers PostgreSQL 验证迁移脚本、逻辑删除、乐观锁、分页和租户隔离。
4. OpenAPI 契约测试覆盖正常响应、参数校验、权限拒绝和资源不存在。
5. 写操作均能查询到对应审计日志。
6. 前端页面替换 Mock 后完成列表、详情、创建、修改、删除和异常状态联调。
7. 生产 profile 验证 Nacos、PostgreSQL、Redis、Flyway、Actuator 和 Prometheus。

## 13. 里程碑和工期

以 1 名后端开发为基准，预计 8～10 个工作周；2 名开发并行时，完成公共契约和权限基础后可压缩到约 5～7 个工作周，实际时间取决于 Vault、消息队列、沙箱运行器、监控平台和第三方 OAuth 是否已具备。

| 里程碑 | 完成条件 |
|---|---|
| M0 工程可编译 | Maven 聚合修复，基础测试通过 |
| M1 管理基础可用 | 租户、用户、角色、权限、审批和审计闭环 |
| M2 模型治理可用 | 模型注册、密钥、验证、路由可用 |
| M3 资源治理可用 | 工具、MCP、Agent、项目、沙箱可用 |
| M4 财务与安全可用 | 用量、账单、成本、DLP、合规、告警可用 |
| M5 前端全量联调 | 35 个页面移除 Mock，契约测试和生产配置通过 |

## 14. 首个开发迭代

建议第一迭代只做以下内容：

1. [x] 修复重复 Maven 模块并完成基线编译。
2. [x] 冻结响应、分页、ID、时间和错误码契约。
3. [x] 增加组织、角色、权限、用户角色关联和审批基础表。
4. [x] 补齐租户详情、用户详情、数据库权限解析和请求租户上下文；组织、角色、权限、审批基础接口已完成。
5. [x] 开启跨租户拒绝、权限缓存失效测试；审计切面和审计表写入已完成。
6. [x] 用 Testcontainers 完成 PostgreSQL 迁移和第一组接口集成测试。

当前迭代已交付基础接口、正式路由、权限点、租户上下文、异步任务契约和 V3/V4/V5/V6 数据库结构；跨租户拒绝、权限缓存失效和全链路审计测试均已通过，第一迭代闭环已完成。

## 15. 本次执行记录

- 编译：`./mvnw -q -DskipTests compile` 和 `./mvnw -q clean install` 通过。
- 测试：`./mvnw -q test`、`./mvnw -q clean install`、工具、身份、监控和 Admin 模块测试均通过；`hucoo-commons-dto` 异步任务测试覆盖虚拟线程、结果、失败重试和协作取消；异步持久化监听器测试覆盖租户、任务类型、终态、重试和取消字段映射；安全模块测试覆盖跨租户拒绝、权限解析、缓存命中/失效和请求清理；MockMvc、审批状态、幂等和 OpenAPI 契约无回归。
- 数据库：DBX 执行 V3/V4/V5/V6/V7/V8 成功；PostgreSQL 数据库共 84 张 `ap_*` 业务表，84 张表注释，1039 条表/字段注释；V6 新增 33 张领域表及 7 个索引，V7 新增异步租约字段和 1 个租约索引，V8 补齐全部业务表级注释。领域目录覆盖的 23 张表全部包含 `tenant_id`、`version`、`deleted`、非空默认时间字段。
- 公共字段：84 张业务表均包含非空 `created_at`、`updated_at`，默认值为 `CURRENT_TIMESTAMP`，并包含 `tenant_id`、`version`、`deleted`；DBX 核验公共字段异常数为 0。
- DBX 核验：表注释缺失数为 0，字段注释缺失数为 0；新增领域表公共字段和约束全部通过核验。
- 说明：异步业务已具备真实的检查步骤、结构化结果、进度、失败、取消和重试；持久化开启时由监听器同步写入 `ap_async_job`，按租户恢复上下文，并使用 V7 租约/乐观锁完成过期接管和幂等更新；模型检查明细和镜像漏洞明细表已建立并完成注释核验。

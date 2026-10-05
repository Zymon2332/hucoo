# 管理端接口清单

> 本文件由 `doc/openapi.json` 生成，请勿手工编辑；变更接口后先跑 `./scripts/export-openapi.sh` 再提交。

接口总数 **274**，路径 **184** 条，资源分组 **34** 个。
所有路径前缀为 `/api/admin/v1`，响应统一为 `Result<T>` 信封（见 [API_CONTRACT.md](API_CONTRACT.md)）。

## Agent 模板

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/agents` | 分页查询Agent 模板 |
| `POST` | `/api/admin/v1/agents` | 创建Agent 模板 |
| `GET` | `/api/admin/v1/agents/market` | Agent 市场列表 |
| `POST` | `/api/admin/v1/agents/market/{id}/submit` | 提交 Agent 市场审核 |
| `GET` | `/api/admin/v1/agents/templates` | Agent 模板正式列表 |
| `POST` | `/api/admin/v1/agents/templates/{id}/publish` | 异步发布 Agent 版本 |
| `POST` | `/api/admin/v1/agents/templates/{id}/rollback` | 异步回滚 Agent 版本 |
| `DELETE` | `/api/admin/v1/agents/{id}` | 删除Agent 模板 |
| `GET` | `/api/admin/v1/agents/{id}` | 查询Agent 模板 详情 |
| `PATCH` | `/api/admin/v1/agents/{id}` |  |
| `PUT` | `/api/admin/v1/agents/{id}` | 更新Agent 模板 |

## MCP 工具

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/mcp-servers` | 分页查询MCP 工具 |
| `POST` | `/api/admin/v1/mcp-servers` | 创建MCP 工具 |
| `GET` | `/api/admin/v1/mcp-servers/servers` | 正式 MCP Server 列表 |
| `POST` | `/api/admin/v1/mcp-servers/servers/{id}/health` | 异步检查 MCP Server 健康状态 |
| `GET` | `/api/admin/v1/mcp-servers/tools` | 工具目录列表 |
| `POST` | `/api/admin/v1/mcp-servers/tools` |  |
| `DELETE` | `/api/admin/v1/mcp-servers/tools/{id}` |  |
| `GET` | `/api/admin/v1/mcp-servers/tools/{id}` |  |
| `PATCH` | `/api/admin/v1/mcp-servers/tools/{id}` |  |
| `PUT` | `/api/admin/v1/mcp-servers/tools/{id}` |  |
| `DELETE` | `/api/admin/v1/mcp-servers/{id}` | 删除MCP 工具 |
| `GET` | `/api/admin/v1/mcp-servers/{id}` | 查询MCP 工具 详情 |
| `PATCH` | `/api/admin/v1/mcp-servers/{id}` |  |
| `PUT` | `/api/admin/v1/mcp-servers/{id}` | 更新MCP 工具 |

## Webhook 事件

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/webhooks/deliveries` |  |
| `GET` | `/api/admin/v1/webhooks/events` |  |
| `POST` | `/api/admin/v1/webhooks/events/{id}/replay` |  |

## 安全合规资源

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/admin/v1/security/alert-silences/{id}/activate` |  |
| `POST` | `/api/admin/v1/security/alerts/{id}/{action}` |  |
| `GET` | `/api/admin/v1/security/compliance-evidence` |  |
| `GET` | `/api/admin/v1/security/content-filters` |  |
| `GET` | `/api/admin/v1/security/dlp-rules` |  |
| `GET` | `/api/admin/v1/security/ip-allowlist` |  |
| `GET` | `/api/admin/v1/security/notification-channels` |  |
| `GET` | `/api/admin/v1/security/retention` |  |

## 安全策略

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/security-policies` | 分页查询安全策略 |
| `POST` | `/api/admin/v1/security-policies` | 创建安全策略 |
| `GET` | `/api/admin/v1/security-policies/content-filters` | DLP 和安全策略列表 |
| `GET` | `/api/admin/v1/security-policies/dlp-rules` | DLP 和安全策略列表 |
| `GET` | `/api/admin/v1/security-policies/ip-allowlist` | DLP 和安全策略列表 |
| `GET` | `/api/admin/v1/security-policies/retention` | DLP 和安全策略列表 |
| `DELETE` | `/api/admin/v1/security-policies/{id}` | 删除安全策略 |
| `GET` | `/api/admin/v1/security-policies/{id}` | 查询安全策略 详情 |
| `PATCH` | `/api/admin/v1/security-policies/{id}` |  |
| `PUT` | `/api/admin/v1/security-policies/{id}` | 更新安全策略 |
| `POST` | `/api/admin/v1/security-policies/{id}/test` | 异步测试安全策略 |

## 实验与发布

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/experiments` | 实验列表 |
| `POST` | `/api/admin/v1/experiments/{id}/rollback` | 异步回滚实验 |
| `POST` | `/api/admin/v1/experiments/{id}/start` | 异步启动实验 |
| `POST` | `/api/admin/v1/experiments/{id}/stop` | 异步停止实验 |

## 审批管理

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/approvals` | 分页查询审批申请 |
| `GET` | `/api/admin/v1/approvals/{id}` | 查询审批详情和步骤 |
| `POST` | `/api/admin/v1/approvals/{id}/approve` | 通过审批 |
| `POST` | `/api/admin/v1/approvals/{id}/reject` | 拒绝审批 |
| `POST` | `/api/admin/v1/approvals/{id}/withdraw` | 撤回审批 |

## 审计日志

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/audit-logs` | 分页查询审计日志 |
| `POST` | `/api/admin/v1/audit-logs/export` | 异步导出审计日志 |
| `GET` | `/api/admin/v1/audit-logs/logs` | 正式审计日志列表 |
| `GET` | `/api/admin/v1/audit-logs/statistics` | 审计日志 统计信息 |
| `GET` | `/api/admin/v1/audit-logs/{id}` | 查询审计日志 详情 |

## 平台设置

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/settings/license` | 查询 License |
| `GET` | `/api/admin/v1/settings/nodes` | 查询节点信息 |
| `GET` | `/api/admin/v1/settings/{group}` | 按分组读取平台设置 |
| `PATCH` | `/api/admin/v1/settings/{group}/{key}` | 异步更新平台设置 |
| `POST` | `/api/admin/v1/settings/{group}/{key}/restore` | 异步恢复默认设置 |

## 异步任务

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/jobs/{jobId}` | 查询异步任务 |
| `POST` | `/api/admin/v1/jobs/{jobId}/cancel` | 取消异步任务 |
| `POST` | `/api/admin/v1/jobs/{jobId}/retry` | 重试异步任务 |

## 文件上传

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/admin/v1/files/uploads` | 上传文件（multipart/form-data，服务端代理） |

## 文件下载

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/files/download/{token}` | 分享链接下载（匿名，token 即凭证） |
| `GET` | `/api/admin/v1/files/{id}/content` | 下载文件 |

## 文件管理

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/files` | 分页查询文件 |
| `GET` | `/api/admin/v1/files/storage/capabilities` | 当前存储驱动能力（前端据此决定是否展示直传） |
| `DELETE` | `/api/admin/v1/files/{id}` | 移入回收站 |
| `GET` | `/api/admin/v1/files/{id}` | 查询文件详情 |
| `PATCH` | `/api/admin/v1/files/{id}` | 更新文件属性（重命名 / 可见性 / 业务绑定） |
| `POST` | `/api/admin/v1/files/{id}/restore` | 回收站还原 |
| `GET` | `/api/admin/v1/files/{id}/url` | 获取下载地址（S3 为预签名直链，本地为后端签名代理地址） |

## 权限管理

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/permissions` | 分页查询权限 |
| `POST` | `/api/admin/v1/permissions` | 创建权限 |
| `GET` | `/api/admin/v1/permissions/matrix` | 查询角色权限矩阵 |
| `PATCH` | `/api/admin/v1/permissions/roles/{roleId}/permissions/{permissionId}` | 更新角色权限关系 |
| `DELETE` | `/api/admin/v1/permissions/{id}` | 删除权限 |
| `GET` | `/api/admin/v1/permissions/{id}` | 查询权限详情 |
| `PATCH` | `/api/admin/v1/permissions/{id}` |  |
| `PUT` | `/api/admin/v1/permissions/{id}` | 更新权限 |

## 模型治理

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/models` | 分页查询模型治理 |
| `POST` | `/api/admin/v1/models` | 创建模型治理 |
| `DELETE` | `/api/admin/v1/models/channels/{id}` | 删除供应商渠道 |
| `PATCH` | `/api/admin/v1/models/channels/{id}` | 更新供应商渠道完整配置 |
| `PUT` | `/api/admin/v1/models/channels/{id}` | 更新供应商渠道 |
| `GET` | `/api/admin/v1/models/custom` | 自定义模型列表 |
| `POST` | `/api/admin/v1/models/custom` | 注册自定义模型 |
| `DELETE` | `/api/admin/v1/models/custom/{id}` |  |
| `PATCH` | `/api/admin/v1/models/custom/{id}` |  |
| `PUT` | `/api/admin/v1/models/custom/{id}` |  |
| `GET` | `/api/admin/v1/models/keys` | 模型密钥列表 |
| `POST` | `/api/admin/v1/models/keys` | 注册模型密钥 |
| `POST` | `/api/admin/v1/models/keys/{id}/revoke` | 撤销模型密钥 |
| `POST` | `/api/admin/v1/models/keys/{id}/rotate` | 轮换模型密钥 |
| `GET` | `/api/admin/v1/models/platform` | 平台模型列表 |
| `GET` | `/api/admin/v1/models/providers` | 模型供应商列表 |
| `POST` | `/api/admin/v1/models/providers` | 创建模型供应商 |
| `DELETE` | `/api/admin/v1/models/providers/{id}` |  |
| `PATCH` | `/api/admin/v1/models/providers/{id}` |  |
| `PUT` | `/api/admin/v1/models/providers/{id}` |  |
| `GET` | `/api/admin/v1/models/providers/{providerId}/channels` | 供应商渠道列表 |
| `POST` | `/api/admin/v1/models/providers/{providerId}/channels` | 创建供应商渠道 |
| `GET` | `/api/admin/v1/models/routing` | 模型路由规则列表 |
| `POST` | `/api/admin/v1/models/routing` | 创建模型路由规则 |
| `DELETE` | `/api/admin/v1/models/routing/{id}` |  |
| `PATCH` | `/api/admin/v1/models/routing/{id}` |  |
| `PUT` | `/api/admin/v1/models/routing/{id}` |  |
| `GET` | `/api/admin/v1/models/validation` | 平台模型列表 |
| `DELETE` | `/api/admin/v1/models/{id}` | 删除模型治理 |
| `GET` | `/api/admin/v1/models/{id}` | 查询模型治理 详情 |
| `PATCH` | `/api/admin/v1/models/{id}` |  |
| `PUT` | `/api/admin/v1/models/{id}` | 更新模型治理 |
| `POST` | `/api/admin/v1/models/{id}/validation` | 异步验证模型 |

## 模型目录与渠道配置

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/model-catalog/bindings/{bindingId}/prices` | 查询模型阶梯价格列表 |
| `POST` | `/api/admin/v1/model-catalog/bindings/{bindingId}/prices` | 创建模型阶梯价格 |
| `DELETE` | `/api/admin/v1/model-catalog/bindings/{id}` | 删除模型渠道映射 |
| `PUT` | `/api/admin/v1/model-catalog/bindings/{id}` | 更新模型渠道映射并重新进入审核状态 |
| `GET` | `/api/admin/v1/model-catalog/channels/{channelId}/credentials` | 查询渠道凭证脱敏信息 |
| `POST` | `/api/admin/v1/model-catalog/channels/{channelId}/credentials` | 加密登记渠道凭证 |
| `POST` | `/api/admin/v1/model-catalog/credentials/{id}/revoke` | 撤销渠道凭证 |
| `POST` | `/api/admin/v1/model-catalog/credentials/{id}/rotate` | 轮换渠道凭证并记录轮换历史 |
| `DELETE` | `/api/admin/v1/model-catalog/grants/{id}` | 删除模型可见性授权 |
| `GET` | `/api/admin/v1/model-catalog/models` | 分页查询逻辑模型 |
| `POST` | `/api/admin/v1/model-catalog/models` | 创建逻辑模型 |
| `DELETE` | `/api/admin/v1/model-catalog/models/{id}` | 删除逻辑模型 |
| `GET` | `/api/admin/v1/model-catalog/models/{id}` | 查询逻辑模型详情 |
| `PUT` | `/api/admin/v1/model-catalog/models/{id}` | 更新逻辑模型并重置发布状态 |
| `GET` | `/api/admin/v1/model-catalog/models/{modelId}/grants` | 查询模型可见性授权列表 |
| `POST` | `/api/admin/v1/model-catalog/models/{modelId}/grants` | 创建模型可见性授权 |
| `GET` | `/api/admin/v1/model-catalog/models/{modelId}/versions` | 查询模型版本列表 |
| `POST` | `/api/admin/v1/model-catalog/models/{modelId}/versions` | 创建模型版本 |
| `DELETE` | `/api/admin/v1/model-catalog/prices/{id}` | 删除模型阶梯价格 |
| `DELETE` | `/api/admin/v1/model-catalog/versions/{id}` | 删除模型版本 |
| `PUT` | `/api/admin/v1/model-catalog/versions/{id}` | 更新模型版本并重新进入审核状态 |
| `GET` | `/api/admin/v1/model-catalog/versions/{versionId}/bindings` | 查询模型渠道映射列表 |
| `POST` | `/api/admin/v1/model-catalog/versions/{versionId}/bindings` | 创建模型渠道映射 |
| `GET` | `/api/admin/v1/model-catalog/versions/{versionId}/capabilities` | 查询模型版本能力声明 |
| `PUT` | `/api/admin/v1/model-catalog/versions/{versionId}/capabilities` | 设置模型版本能力并重置版本发布状态 |
| `POST` | `/api/admin/v1/model-catalog/{resource}/{id}/approve` | 审核发布模型配置 |

## 模型路由配置

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/model-catalog/models/{modelId}/route-policies` | 查询逻辑模型的路由策略 |
| `POST` | `/api/admin/v1/model-catalog/models/{modelId}/route-policies` | 创建逻辑模型的路由策略 |
| `DELETE` | `/api/admin/v1/model-catalog/route-policies/{id}` | 删除模型路由策略 |
| `GET` | `/api/admin/v1/model-catalog/route-policies/{policyId}/targets` | 查询策略的渠道路由目标 |
| `POST` | `/api/admin/v1/model-catalog/route-policies/{policyId}/targets` | 添加策略的渠道路由目标 |
| `DELETE` | `/api/admin/v1/model-catalog/route-targets/{id}` | 删除渠道路由目标 |

## 模型运行时

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/model/v1/chat/completions` | 执行模型对话 |

## 模型运行时管理

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/models/accounts` | 查询模型账户 |
| `POST` | `/api/admin/v1/models/accounts` | 创建模型账户 |
| `DELETE` | `/api/admin/v1/models/accounts/{id}` |  |
| `POST` | `/api/admin/v1/models/accounts/{id}/balance` | 更新账户余额 |
| `POST` | `/api/admin/v1/models/accounts/{id}/circuit-reset` | 重置账户熔断 |
| `POST` | `/api/admin/v1/models/accounts/{id}/revoke` | 撤销账户密钥 |
| `POST` | `/api/admin/v1/models/accounts/{id}/rotate` | 轮换账户密钥 |
| `POST` | `/api/admin/v1/models/accounts/{id}/status/{status}` | 更新账户状态 |
| `GET` | `/api/admin/v1/models/pools/{model}/preview` | 预览模型路由池 |

## 用户身份

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/users` | 分页查询用户身份 |
| `POST` | `/api/admin/v1/users` | 创建用户身份 |
| `DELETE` | `/api/admin/v1/users/{id}` | 删除用户身份 |
| `GET` | `/api/admin/v1/users/{id}` | 查询用户身份 详情 |
| `PATCH` | `/api/admin/v1/users/{id}` |  |
| `PUT` | `/api/admin/v1/users/{id}` | 更新用户身份 |
| `GET` | `/api/admin/v1/users/{id}/overview` | 查询用户概览 |

## 监控任务

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/admin/v1/monitoring/backup` | 异步执行备份 |

## 监控告警

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/alert-rules` | 分页查询监控告警 |
| `POST` | `/api/admin/v1/alert-rules` | 创建监控告警 |
| `GET` | `/api/admin/v1/alert-rules/alerts` | 告警规则正式列表 |
| `POST` | `/api/admin/v1/alert-rules/alerts/{id}/acknowledge` | 确认告警 |
| `POST` | `/api/admin/v1/alert-rules/alerts/{id}/resolve` | 恢复告警 |
| `GET` | `/api/admin/v1/alert-rules/rules` | 告警规则正式列表 |
| `POST` | `/api/admin/v1/alert-rules/rules/{id}/silence` | 静默告警规则 |
| `DELETE` | `/api/admin/v1/alert-rules/{id}` | 删除监控告警 |
| `GET` | `/api/admin/v1/alert-rules/{id}` | 查询监控告警 详情 |
| `PATCH` | `/api/admin/v1/alert-rules/{id}` |  |
| `PUT` | `/api/admin/v1/alert-rules/{id}` | 更新监控告警 |

## 租户管理

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/tenants` | 分页查询租户管理 |
| `POST` | `/api/admin/v1/tenants` | 创建租户管理 |
| `GET` | `/api/admin/v1/tenants/statistics` | 租户管理 统计信息 |
| `DELETE` | `/api/admin/v1/tenants/{id}` | 删除租户管理 |
| `GET` | `/api/admin/v1/tenants/{id}` | 查询租户管理 详情 |
| `PATCH` | `/api/admin/v1/tenants/{id}` |  |
| `PUT` | `/api/admin/v1/tenants/{id}` | 更新租户管理 |
| `GET` | `/api/admin/v1/tenants/{id}/overview` | 查询租户概览 |

## 组织架构

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/organizations` | 分页查询组织 |
| `POST` | `/api/admin/v1/organizations` | 创建组织 |
| `DELETE` | `/api/admin/v1/organizations/{id}` | 删除组织 |
| `GET` | `/api/admin/v1/organizations/{id}` | 查询组织详情 |
| `PATCH` | `/api/admin/v1/organizations/{id}` |  |
| `PUT` | `/api/admin/v1/organizations/{id}` | 更新组织 |

## 统一认证

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/admin/v1/auth/admin/users/{userId}/activate` | 管理员激活用户并加入租户 |
| `POST` | `/api/admin/v1/auth/login` | 登录 |
| `POST` | `/api/admin/v1/auth/logout` | 退出当前会话 |
| `GET` | `/api/admin/v1/auth/me` | 当前用户 |
| `GET` | `/api/admin/v1/auth/oauth/{provider}/authorize` | 获取第三方登录授权地址 |
| `POST` | `/api/admin/v1/auth/oauth/{provider}/callback` | 处理第三方登录回调 |
| `GET` | `/api/admin/v1/auth/providers` | 查询可用认证方式 |
| `POST` | `/api/admin/v1/auth/refresh` | 刷新访问令牌 |
| `POST` | `/api/admin/v1/auth/register` | 注册待激活账号 |
| `GET` | `/api/admin/v1/auth/sessions` | 查询当前用户会话 |
| `DELETE` | `/api/admin/v1/auth/sessions/{sessionId}` | 撤销当前用户的指定会话 |
| `POST` | `/api/admin/v1/auth/verification-codes` | 发送验证码 |

## 角色管理

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/roles` | 分页查询角色 |
| `POST` | `/api/admin/v1/roles` | 创建角色 |
| `DELETE` | `/api/admin/v1/roles/{id}` | 删除角色 |
| `GET` | `/api/admin/v1/roles/{id}` | 查询角色详情 |
| `PATCH` | `/api/admin/v1/roles/{id}` |  |
| `PUT` | `/api/admin/v1/roles/{id}` | 更新角色 |

## 计费用量

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/billing/usage-records` | 分页查询计费用量 |
| `POST` | `/api/admin/v1/billing/usage-records` | 创建计费用量 |
| `POST` | `/api/admin/v1/billing/usage-records/costs/simulate` | 异步模拟成本 |
| `GET` | `/api/admin/v1/billing/usage-records/records` | 用量统计列表 |
| `POST` | `/api/admin/v1/billing/usage-records/reports` | 异步生成用量报表 |
| `DELETE` | `/api/admin/v1/billing/usage-records/{id}` | 删除计费用量 |
| `GET` | `/api/admin/v1/billing/usage-records/{id}` | 查询计费用量 详情 |
| `PATCH` | `/api/admin/v1/billing/usage-records/{id}` |  |
| `PUT` | `/api/admin/v1/billing/usage-records/{id}` | 更新计费用量 |

## 账单资源

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/billing/budget-alerts` |  |
| `GET` | `/api/admin/v1/billing/cost-allocations` |  |
| `GET` | `/api/admin/v1/billing/cost-centers` |  |
| `GET` | `/api/admin/v1/billing/invoices` |  |
| `POST` | `/api/admin/v1/billing/invoices/{id}/{action}` |  |
| `GET` | `/api/admin/v1/billing/plans` |  |
| `PATCH` | `/api/admin/v1/billing/plans/{id}` |  |

## 运营管理

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/operations/announcements` | 公告列表 |
| `POST` | `/api/admin/v1/operations/announcements/{id}/publish` | 异步发布公告 |
| `GET` | `/api/admin/v1/operations/coupons` | 优惠券列表 |
| `POST` | `/api/admin/v1/operations/coupons/{id}/activate` | 异步启用优惠券 |
| `GET` | `/api/admin/v1/operations/tickets` | 工单列表 |
| `POST` | `/api/admin/v1/operations/tickets/{id}/messages` | 异步发送工单消息 |

## 集成应用

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/integrations` | 分页查询集成应用 |
| `POST` | `/api/admin/v1/integrations` | 创建集成应用 |
| `GET` | `/api/admin/v1/integrations/connections` | 集成连接正式列表 |
| `GET` | `/api/admin/v1/integrations/webhooks` | 集成连接正式列表 |
| `POST` | `/api/admin/v1/integrations/webhooks/{id}/replay` | 异步重放 Webhook 事件 |
| `DELETE` | `/api/admin/v1/integrations/{id}` | 删除集成应用 |
| `GET` | `/api/admin/v1/integrations/{id}` | 查询集成应用 详情 |
| `PATCH` | `/api/admin/v1/integrations/{id}` |  |
| `PUT` | `/api/admin/v1/integrations/{id}` | 更新集成应用 |

## 集成探针

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/integrations/probe/git/repos/{owner}/{repo}` | 探活 Git Provider（演示 OpenFeign + Resilience4j 降级） |

## 项目工作区

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/projects` | 分页查询项目工作区 |
| `POST` | `/api/admin/v1/projects` | 创建项目工作区 |
| `GET` | `/api/admin/v1/projects/sandboxes` | 沙箱列表 |
| `POST` | `/api/admin/v1/projects/sandboxes/{id}/rebuild` | 异步重建沙箱 |
| `POST` | `/api/admin/v1/projects/sandboxes/{id}/scan` | 异步扫描沙箱镜像 |
| `GET` | `/api/admin/v1/projects/workspaces` | 工作区列表 |
| `POST` | `/api/admin/v1/projects/workspaces/{id}/reclaim` | 异步回收工作区 |
| `POST` | `/api/admin/v1/projects/workspaces/{id}/start` | 异步启动工作区 |
| `POST` | `/api/admin/v1/projects/workspaces/{id}/stop` | 异步停止工作区 |
| `DELETE` | `/api/admin/v1/projects/{id}` | 删除项目工作区 |
| `GET` | `/api/admin/v1/projects/{id}` | 查询项目工作区 详情 |
| `PATCH` | `/api/admin/v1/projects/{id}` |  |
| `PUT` | `/api/admin/v1/projects/{id}` | 更新项目工作区 |

## 项目资源

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/projects/environment-variables` |  |
| `GET` | `/api/admin/v1/projects/members` |  |
| `GET` | `/api/admin/v1/projects/policies` |  |
| `GET` | `/api/admin/v1/projects/resources` |  |
| `POST` | `/api/admin/v1/projects/resources` |  |
| `DELETE` | `/api/admin/v1/projects/resources/{id}` |  |
| `PATCH` | `/api/admin/v1/projects/resources/{id}` |  |
| `GET` | `/api/admin/v1/projects/sandbox-images` |  |
| `GET` | `/api/admin/v1/projects/sensitive-file-policies` |  |
| `GET` | `/api/admin/v1/projects/workspace-resources` |  |

## 领域资源

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/admin/v1/domain/{resource}` | 分页查询领域资源 |
| `POST` | `/api/admin/v1/domain/{resource}` |  |
| `DELETE` | `/api/admin/v1/domain/{resource}/{id}` |  |
| `GET` | `/api/admin/v1/domain/{resource}/{id}` |  |
| `PATCH` | `/api/admin/v1/domain/{resource}/{id}` |  |
| `POST` | `/api/admin/v1/domain/{resource}/{id}/{action}` |  |

# 字典与通用配置

业务实现位于 `hucoo-module/hucoo-module-common`，包名为 `dev.hucoo.common`，由 Admin 组件扫描加载。模块依赖通用组件，不依赖其他业务模块。`DictionaryFacade` 和 `SystemConfigFacade` 是读取生效内容的 API 契约，使用可信当前租户上下文。

## 数据归属与接口

所有路径使用 `/api/admin/v1` 前缀，响应为 `Result<T>`。管理查询返回原始记录；生效查询合并平台默认及当前租户记录。

| 路径 | 方法与用途 |
| --- | --- |
| `/dictionary-types` | GET 分页；POST 创建类型 |
| `/dictionary-types/{id}` | GET 详情；PUT 更新/启停；DELETE 删除本作用域类型及项 |
| `/dictionary-types/{typeId}/items` | GET 分页；POST 创建项 |
| `/dictionary-types/{typeId}/items/{itemId}` | GET 详情；PUT 更新/启停/排序；DELETE 删除项 |
| `/dictionaries/{code}/options` | GET 生效选项，按排序值、项值排序 |
| `/configs` | GET 分页；POST 创建配置 |
| `/configs/{id}` | GET 详情；PUT 更新/启停；DELETE 删除配置 |
| `/configs/effective/{key}` | GET 生效配置，缺失或禁用返回 404 |
| `/configs/effective` | GET 生效配置列表，可按 `group` 筛选 |

管理接口支持查询参数 `scope=TENANT|PLATFORM`，默认 `TENANT`。PLATFORM 数据属于系统租户 `000000`。分页支持 `page`、`pageSize`、`keyword`、`enabled`；配置分页另支持 `group`。请求体中的字段不包含 `tenantId`，归属由服务端上下文取得。

类型和字典项均含 `enabled`（默认 true）、`remarks`；类型另含 `code`、`name`，项另含 `label`、`value`、`sortOrder`（默认 0）。DTO 包含字符串 ID、作用域 `scope`、记录来源 `source`、时间和 `version`；项的 `typeId` 同样为字符串。

PUT 使用完整请求体并必须提交当前 `version`；DELETE 必须携带 `?version=<当前版本>`。版本过期返回 409；编码、项值、配置键和值类型创建后不可修改。重复有效编码/项值/配置键返回 409，逻辑删除后允许重新创建。

## 覆盖规则

- 租户可以创建平台没有的类型、项和配置键。
- 字典类型按编码匹配，名称和状态采用租户记录优先；生效类型禁用时选项为空。
- 字典项按“类型编码＋项值”合并；租户标签、排序和状态覆盖同值平台项，其余平台项保留。写入租户项前，必须创建本租户同编码类型。
- 配置按键采用租户记录优先；覆盖平台配置必须保持相同值类型。
- 禁用租户记录屏蔽相应平台值；删除租户覆盖后恢复继承。管理查询仍可查看禁用内容。
- 删除平台类型只删除平台项，租户类型及项保留。
- 配置先按键合并，再按分组筛选，避免租户改分组后旧分组仍返回平台值。

## 配置值

创建示例：

```json
{
  "key": "tasks.max-concurrency",
  "name": "任务并发上限",
  "group": "tasks",
  "valueType": "NUMBER",
  "value": 8,
  "enabled": true
}
```

`STRING` 使用 JSON 字符串，`NUMBER` 使用有限 JSON 数字，`BOOLEAN` 使用布尔值，`JSON` 使用对象或数组。禁止值类型不匹配、null 或 JSON 类型下的标量；返回值保留原 JSON 类型。首版不用于密钥存储，不提供发布、缓存或变更历史。

## 权限与审计

接口要求 `dictionary:read/create/update/delete` 或 `config:read/create/update/delete`。平台写入额外要求 `dictionary:platform:manage` 或 `config:platform:manage`，以及系统租户身份和系统租户上下文；租户用户即使持有同名权限也不能写平台记录。系统管理员切换至普通租户后，应切回系统上下文再管理平台默认。

权限沿用现有身份模块的权限登记与角色授权机制，新增功能不会自动扩大已有角色权限。Admin 现有操作审计自动记录 POST、PUT、DELETE，包含操作者、租户、动作和结果。

## 持久化与迁移

`agent-platform.persistence.enabled=false` 使用内存仓储，true 使用 PostgreSQL/MyBatis-Plus；共用服务中的校验和合并规则。新增 `V16__common_dictionary_config_schema.sql` 创建三张表及有效记录唯一索引，保留租户隔离、乐观锁和逻辑删除。平台读取和计数使用固定系统租户的专用 Mapper 方法，不修改全局租户排除表。

旧 `/settings/**` 接口（含 License 和节点）及专用实现已删除；历史表和数据保留，不自动迁移。

## 验证

```bash
./mvnw -pl hucoo-module/hucoo-module-common -am test -Dtest=MemoryCommonTests,PostgresCommonTests,CommonSecurityWebTests -Dsurefire.failIfNoSpecifiedTests=false
./mvnw clean install
./scripts/export-openapi.sh
```

内存与 PostgreSQL 执行相同的行为测试。PostgreSQL 测试需要 Docker，无 Docker 时跳过；另有 Admin 集成测试验证完整 Flyway 历史及新接口接入。

# PublicModelCatalogController 联调数据

2026-10-07 已将 `public-model-catalog-seed.sql` 写入指定 PostgreSQL 数据库 `hucoo_agent_platform`。共新增 162 条记录，包含 2 个供应商、13 个模型、14 个版本，以及授权、渠道、能力、验证和路由配置；全部归属系统租户 `000000`，编码前缀为 `catalog-test-`。未修改原有业务记录。

## 请求方式

使用 admin 或 winboo 的正常登录令牌；二者当前均属于租户 `000000`。应用需连接上述数据库，并启用 `agent-platform.persistence.enabled=true`；dev 配置已启用数据库模式。

```bash
curl --get 'http://localhost:8081/api/v1/model-catalog' \
  --data-urlencode 'projectId=7001007' \
  --header "Authorization: Bearer $TOKEN"
```

不传 `projectId` 即查询当前用户及租户可见目录。`7001007` 仅作为项目授权测试范围，未创建项目记录；当前接口不校验项目归属。未登录应返回未授权，`projectId=0` 或负数应被参数校验拒绝。

## 预期结果

以下只统计本次新增的 `catalog-test-*` 模型，响应可能同时包含原有可用模型。表中省略该编码前缀。

| 登录用户 | projectId | 测试模型数 | 测试模型编码 |
| --- | --- | --- | --- |
| admin | 不传 | 4 | alpha-chat、beta-embedding、tenant-chat、user-chat |
| admin | 7001007 | 5 | alpha-chat、beta-embedding、project-chat、tenant-chat、user-chat |
| winboo | 不传 | 3 | alpha-chat、beta-embedding、tenant-chat |
| winboo | 7001007 | 4 | alpha-chat、beta-embedding、project-chat、tenant-chat |
| admin | 7001008 | 4 | alpha-chat、beta-embedding、tenant-chat、user-chat |

按实际渠道供应商分组：`catalog-test-alpha` 包含 alpha-chat、project-chat；`catalog-test-beta` 包含 beta-embedding、tenant-chat、user-chat。每组按模型编码排序。alpha-chat 有两个已发布版本，应只返回 v2（上下文长度 32768），重复渠道不造成重复模型；不支持的 AUDIO_INPUT 能力不应返回。

以下模型应隐藏：denied（显式 DENY，即使存在 USER ALLOW）、expired-grant（授权过期）、draft（草稿）、failed-validation（验证失败）、missing-credential（缺少凭证）、expired-credential（凭证过期）、disabled-route（路由关闭）、private-model（用户自定义模型）。

`public-model-catalog-response.json` 是 admin + 项目 7001007 的示例目录内容，仅保留测试供应商；真实 HTTP 响应外层有统一 `Result` 包装。`catalogVersion` 来自当时完整快照，后续配置变化时可能不同。

## 验证与清理

已使用实际 MyBatis 仓储、租户拦截器、目录服务及转换器读取远程数据库，以上五个场景均通过；同时验证分组、去重、v2 选择及目录版本稳定性。这是数据库与应用服务验证，HTTP 请求需在应用运行后执行。

清理时在同一数据库执行 `public-model-catalog-cleanup.sql`，仅删除本次明确列出的测试记录 ID。清理脚本已在事务中试执行并回滚，162 条测试记录保留。种子脚本遇到相同 ID 会拒绝写入；需要重建时先清理再导入。

测试渠道使用 `.invalid` 地址，验证通过状态为人工构造，不代表真实供应商连通性；这些模型仅用于目录接口测试，不能用于实际模型调用。脚本中不保存数据库密码或真实 API Key。

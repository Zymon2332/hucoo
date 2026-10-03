# 管理端公共接口契约

## JSON 序列化

- 所有资源主键字段 `id` 使用字符串，避免 JavaScript 精度丢失。
- `createdAt`、`updatedAt` 及其他时间字段使用 ISO 8601 字符串，例如 `2026-10-02T17:30:45`。
- 金额字段使用 JSON 数字，保持十进制表示，不使用科学计数法；金额单位通过同级 `currency` 字段声明。
- 百分比字段使用 `0` 到 `100` 的 JSON 数字，不带 `%` 后缀；字段名使用 `*Percent` 或在接口说明中明确单位。
- 分页字段 `page`、`pageSize`、`pages`、`total` 使用 JSON 数字。

## 统一响应

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "traceId": "trace_xxx",
  "timestamp": 1790933445000
}
```

## 分页响应

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 20,
  "pages": 0
}
```

## 错误响应与状态码

错误仍使用统一响应结构，`data` 为 `null`，`code` 使用平台错误码或 HTTP 状态码。公共 HTTP 状态码约定为 `400`、`401`、`403`、`404`、`409`、`429`、`500` 和 `503`。

```json
{
  "code": 400001,
  "message": "幂等键与原请求不匹配",
  "data": null,
  "traceId": "trace_xxx",
  "timestamp": 1790933445000
}
```

错误码按模块分段：平台 `400xxx`，租户 `100xxx`，身份 `110xxx`，模型 `120xxx`，工具 `130xxx`，Agent `140xxx`，项目 `150xxx`，计费 `160xxx`，审计 `170xxx`，安全 `180xxx`，监控 `190xxx`，集成 `200xxx`。

## 幂等键

- `POST`、`PUT`、`PATCH`、`DELETE` 写接口可携带 `Idempotency-Key` 请求头。
- 同一租户、方法、路径和幂等键在十分钟窗口内复用成功响应。
- 首次请求的 `X-Trace-Id`、响应体和状态码作为重放结果；失败请求不会写入幂等缓存。

## 异步任务

耗时操作返回 `Result<AsyncJobDTO>`，其中 `jobId`、`requestId` 为字符串，`status` 为 `PENDING`、`RUNNING`、`SUCCEEDED`、`FAILED` 或 `CANCELLED`，`progress` 为 `0` 到 `100` 的整数百分比。

任务查询统一使用 `GET /api/admin/v1/jobs/{jobId}`，任务结果和失败原因通过 `message` 返回，创建和更新时间使用 ISO 8601 字符串。

## 版本与迁移

- 管理端接口前缀固定为 `/api/admin/v1`；不兼容变更升级版本号。
- 成功使用 `200`，创建使用 `201`（如接口需要区分），异步创建使用 `202`；参数、认证、权限、资源、冲突分别使用 `400`、`401`、`403`、`404`、`409`。
- Flyway 文件使用 `V<主版本>__<snake_case_description>.sql`，每个版本只新增一个迁移文件；已使用 `V1__init_schema.sql`、`V2__identity_access_schema.sql`。

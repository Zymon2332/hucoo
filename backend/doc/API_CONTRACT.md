# 管理端公共接口契约

## JSON 序列化

- 所有资源主键字段 `id` 以及各类 `*Id` 关联字段（`userId`、`ownerId`、`applicantId` 等）使用字符串，
  避免 JavaScript 精度丢失。雪花 ID 为 19 位长整型，超过 `Number.MAX_SAFE_INTEGER`。
- 实现上需同时声明两个注解，缺一不可：
  - `@JsonSerialize(using = ToStringSerializer.class)` —— 决定运行时实际序列化；
  - `@Schema(type = "string")` —— 决定 springdoc 生成的契约类型。
  springdoc 不解析 `@JsonSerialize`，只写前者会导致契约声明为 integer 而运行时返回字符串。
  `BaseDTO.id` 已统一处理，继承它的实体 DTO 无需重复声明；自带 `*Id` 字段的 DTO 需逐个声明。
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

错误码按模块分段：平台 `400xxx`，租户 `100xxx`，身份 `110xxx`，模型 `120xxx`，工具 `130xxx`，Agent `140xxx`，项目 `150xxx`，计费 `160xxx`，审计 `170xxx`，安全 `180xxx`，监控 `190xxx`，集成 `200xxx`，审批 `210xxx`，文件 `220xxx`，基础设施组件 `300xxx`（对象存储等）。

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

## OpenAPI 契约与前后端对接

### 契约来源

- 运行时端点 `GET /v3/api-docs`，Swagger UI 为 `/swagger-ui.html`（`agent-platform.swagger.enabled=true` 时启用）。
- 版本化产物 `doc/openapi.json`，由脚本重新生成：

  ```bash
  cd backend && ./scripts/export-openapi.sh
  ```

  脚本通过 `OpenApiContractExportTests` 在 `test` profile 下导出（关闭 Nacos 与安全拦截、Mock 持久化），无需外部依赖。
  `doc/openapi.json` 可提交并可在 `git diff` 中审阅接口变更，前端据此生成类型即可，不需要人工同步字段。

当前基线：OpenAPI `3.1.0`，188 条路径 / 287 个操作 / 228 个 schema。

### 二进制下载

文件下载接口（`GET /api/admin/v1/files/{id}/content`、`GET /api/admin/v1/files/download/{token}`）
返回原始字节流，**不是** `Result<T>` 信封，因此：

- 控制器方法返回类型必须是 `Resource`（`void` / `String` / `byte[]` 同样会跳过响应包装）；
  写成 `ResponseEntity<Resource>` 会被 `ResponseWrapper` 包成 `Result`，导致文件损坏。
- 文件名通过 `Content-Disposition` 返回，已在 CORS 的 `exposedHeaders` 中暴露，前端可直接读取。
- 失败时仍返回统一 `Result` 信封与对应 HTTP 状态（例如 `220011` 状态不允许下载）。
契约内容与运行中的服务 `GET /v3/api-docs` 经过逐路径与逐 schema 比对，保持一致。

### 前端消费要点

- 所有响应都是 `Result<T>` 信封，业务数据在 `data`，不要直接读取顶层字段；`code === 200` 才是成功。
- 分页统一为 `data: { items, total, page, pageSize, pages }`，请求参数为 `page`（从 1 开始）与 `pageSize`。
- 认证：`POST /api/admin/v1/auth/login` 获取令牌，后续请求携带 `Authorization: Bearer <accessToken>`；
  令牌失效用 `POST /api/admin/v1/auth/refresh` 刷新，当前用户用 `GET /api/admin/v1/auth/me`。
- 错误响应保留业务错误码在 `code`，HTTP 状态码表达语义（`401` 凭证无效、`403` 无权限、`404` 资源不存在、
  `409` 冲突、`429` 过于频繁），前端可同时依据二者分流处理。
- `agent-platform.security.enabled=false`（dev 默认）时后端不做鉴权拦截，前端联调不受阻，但不要据此判断线上行为。
- 写接口可携带 `Idempotency-Key` 请求头做幂等重放。
- 耗时操作返回 `Result<AsyncJobDTO>`，用 `GET /api/admin/v1/jobs/{jobId}` 轮询。

### 本地联调

| 项目 | 值 |
| --- | --- |
| 管理端后端 | `http://localhost:8081` |
| Swagger UI | `http://localhost:8081/swagger-ui.html` |
| 健康检查 | `http://localhost:8081/actuator/health` |
| 契约 | `http://localhost:8081/v3/api-docs` |

CORS 由 `hucoo-component-web` 的 `WebMvcConfig` 统一放开（`allowedOriginPatterns("*")`），
预检放行 `content-type`、`authorization`、`idempotency-key` 等请求头并暴露 `X-Trace-Id`，前端本地端口无需额外配置。

本地联调使用 `test` profile 即可零外部依赖启动：

```bash
cd backend
./mvnw -pl hucoo-server/hucoo-application-admin spring-boot:run -Dspring-boot.run.profiles=test
```

### Mock 模式内置账号

`agent-platform.persistence.enabled=false` 时由 `MockAuthenticationApplicationService` 提供认证能力，
用于本地联调，账号保存在内存中、重启即失效：

| 账号 | 密码 | 说明 |
| --- | --- | --- |
| `admin` | `Admin@12345` | 平台管理员，令牌带 `permissions: ["*"]`，可访问全部接口 |
| `operator` | `Admin@12345` | 运营人员，权限同 `admin` |

- 注册接口在 Mock 模式下注册即激活，无需管理员审批，可直接登录。
- Mock 只实现了 `PASSWORD` 方式；`SMS`、`EMAIL`、`WECHAT`、`QQ` 会返回 `110005 认证方式未启用`，
  `GET /api/admin/v1/auth/providers` 会如实反映。
- `POST /api/admin/v1/auth/verification-codes` 返回 `110005`，Mock 未实现验证码发送。

### 已知边界

- 契约中包含一个非管理端前缀的端点 `POST /api/model/v1/chat/completions`（标签“模型运行时”），属于用户端模型调用入口，由 `hucoo-application-admin` 通过 `hucoo-module-model-runtime` 一并暴露。
- `hucoo-module-model-runtime` 未列入 `AdminApplication.scanBasePackages`，其组件经 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 注册。
- `dev` profile 下 `agent-platform.security.enabled=false`，该端点无鉴权拦截。
- **经网关访问会 404**：`hucoo-gateway-server` 同时配置了 `Path=/api/admin/**` 与全局 `StripPrefix=2`，
  会把 `/api/admin/v1/auth/login` 改写成 `/v1/auth/login` 再转发，而管理端只注册了 `/api/admin/v1/**`。
  本地联调请直连 `http://localhost:8081`；若要走网关，需要调整该路由的前缀剥离层数。

## 字典与通用配置

字典、配置接口及平台默认与租户覆盖规则见 [COMMON_MODULE.md](COMMON_MODULE.md)。PUT 与 DELETE 必须提供当前 `version`；所有旧 `/settings/**` 路由已移除，历史数据保留。

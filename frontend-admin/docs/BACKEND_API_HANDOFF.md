# 后端接口对接说明（frontend-admin）

> 面向 `frontend-admin`。后端契约源：`backend/doc/openapi.json`，与运行中服务的 `/v3/api-docs` 逐路径、逐 schema 比对一致。

## 1. 连接信息

| 项目       | 值                                      |
| ---------- | --------------------------------------- |
| Base URL   | `http://localhost:8081`                 |
| swagger UI | `http://localhost:8081/swagger-ui.html` |
| 契约 JSON  | `http://localhost:8081/v3/api-docs`     |
| 状态检查   | `http://localhost:8081/actuator/health` |

启动后端（零外部依赖，不需要 PostgreSQL / Redis / Nacos）：

```bash
cd backend
./mvnw -pl hucoo-server/hucoo-application-admin spring-boot:run -Dspring-boot.run.profiles=test
```

**不要走网关 8080**：`hucoo-gateway-server` 同时配置了 `Path=/api/admin/**` 与全局 `StripPrefix=2`，
会把 `/api/admin/v1/auth/login` 改写成 `/v1/auth/login` 再转发，管理端只注册了 `/api/admin/v1/**`，结果是 404。
本地联调直连 8081。

CORS 已放开，预检放行 `content-type`、`authorization`、`idempotency-key`，并暴露 `X-Trace-Id`，前端无需代理。

建议在 `frontend-admin/.env.local` 添加：

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8081
```

## 2. 响应信封：所有接口都要先拆一层

**每个**响应都是 `Result<T>`，业务数据在 `data`，不要直接读顶层字段。判断成功用 `code === 200`。

```jsonc
{
  "code": 200, // 200 才是成功
  "message": "success",
  "data": {}, // ← 业务数据在这里
  "traceId": "8395b83fdfe24560",
  "timestamp": 1791096714438,
  "success": true,
}
```

分页接口的 `data` 统一为（注意有 `pages`，你们现在的 `Paginated<T>` 缺这个字段）：

```jsonc
{ "items": [], "total": 3, "page": 1, "pageSize": 2, "pages": 2 }
```

请求参数：`page` 从 **1** 开始，`pageSize` 默认 10、上限 500。

错误响应同样保留信封，`data` 为 `null`，HTTP 状态码表达语义，业务错误码在 `code`：

```jsonc
// HTTP 401
{
  "code": 110004,
  "message": "账号或凭证错误",
  "data": null,
  "traceId": "3e361f78785e41a5",
  "timestamp": 1791096714657,
  "success": false,
}
```

| HTTP | 含义                | 典型 `code`                                      |
| ---- | ------------------- | ------------------------------------------------ |
| 400  | 参数不合法          | `400`、`400001` 幂等键冲突以外的校验失败         |
| 401  | 凭证无效 / 未认证   | `110004`、`110009`、`110010`、`110007`、`110003` |
| 403  | 无权限 / 账号不可用 | `403`、`100002`、`110002`、`110006`、`140002`    |
| 404  | 资源不存在          | `404`、`100001`、`120001`、`130001`、`140001` 等 |
| 409  | 冲突                | `409`、`400001`、`210002`                        |
| 429  | 过于频繁            | `429`、`110008`                                  |

## 3. 鉴权流程

```bash
# 登录
curl -X POST http://localhost:8081/api/admin/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"method":"PASSWORD","identifier":"admin","credential":"Admin@12345","clientId":"ADMIN_CONSOLE"}'
```

登录响应（真实抓取，节选）：

```jsonc
{
  "code": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImxvY2FsLXYxIn0...",
    "tokenType": "Bearer",
    "expiresIn": 1200,
    "refreshToken": "9ff34706a0fe4041b0d4f6705660aa37",
    "refreshTokenExpiresAt": "2026-11-03T14:51:54.430525",
    "userId": 365028209467300453,
    "username": "admin",
    "tenantId": "000000",
    "availableTenantIds": ["000000"],
  },
}
```

| 接口                                              | 用途                                        |
| ------------------------------------------------- | ------------------------------------------- |
| `POST /api/admin/v1/auth/login`                   | 登录，返回令牌                              |
| `POST /api/admin/v1/auth/refresh`                 | 刷新，**refreshToken 会轮换，旧的立即失效** |
| `GET /api/admin/v1/auth/me`                       | 当前用户                                    |
| `GET /api/admin/v1/auth/sessions`                 | 当前会话列表                                |
| `DELETE /api/admin/v1/auth/sessions/{sessionId}`  | 撤销指定会话                                |
| `POST /api/admin/v1/auth/logout?refreshToken=...` | 退出                                        |
| `POST /api/admin/v1/auth/register`                | 注册（Mock 模式下注册即激活，可直接登录）   |
| `GET /api/admin/v1/auth/providers`                | 可用认证方式                                |

后续请求携带 `Authorization: Bearer <accessToken>`，多租户切换用 `X-Tenant-Id` 请求头。

### 本地内置账号

后端 `test` profile 下 `persistence.enabled=false`，认证由内存 Mock 提供：

| 账号       | 密码          | 说明                                        |
| ---------- | ------------- | ------------------------------------------- |
| `admin`    | `Admin@12345` | 令牌带 `permissions: ["*"]`，可访问全部接口 |
| `operator` | `Admin@12345` | 同上                                        |

- 只支持 `PASSWORD` 方式，`SMS`/`EMAIL`/`WECHAT`/`QQ` 会返回 `110005 认证方式未启用`，`/auth/providers` 会如实返回 `enabled: false`。
- `POST /api/admin/v1/auth/verification-codes` 返回 `110005`，Mock 未实现验证码。
- **注册账号使用注册时设置的密码**：`POST /auth/register` 会保存 `password`（PBKDF2 哈希，与真实实现同一个 `PasswordHasher`），注册后可直接用该密码登录；`admin` / `operator` 这两个内置账号没有密码记录，仍使用统一演示密码 `Admin@12345`。
- 数据存内存，重启后端即失效（令牌、注册的账号都会丢）。

## 4. 客户端代码（已在 frontend-admin 落地）

下表是本文建议的落地位置；相比示例代码，实际实现补上了令牌刷新、401 自动重试、会话持久化与路由守卫。

| 关注点                 | 文件                                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 环境变量               | `src/lib/env.ts`（`NEXT_PUBLIC_API_BASE_URL`，默认 `http://localhost:8081`）                                                                   |
| 信封 / 分页 / 错误类型 | `src/types/api.ts`（`ApiEnvelope`、`ApiPage`、`ApiError`、错误码兜底文案）                                                                     |
| 请求客户端             | `src/lib/api-client.ts`（拆信封、注入令牌与 `X-Tenant-Id`、401 刷新重试、网络异常归一）                                                        |
| 认证接口               | `src/lib/api/auth.ts`、`src/types/auth.ts`                                                                                                     |
| 会话状态               | `src/lib/auth/session.ts`（zustand + localStorage/sessionStorage、刷新单飞、JWT 载荷解析）                                                     |
| 登录 / 注册表单        | `src/components/auth/login-form.tsx`、`register-form.tsx`                                                                                      |
| 路由守卫               | `src/components/auth/require-auth.tsx`（挂在 `src/app/(admin)/layout.tsx`）                                                                    |
| 租户接口               | `src/lib/api/tenants.ts`、`src/types/tenant.ts`                                                                                                |
| 租户查询 / 变更        | `src/hooks/use-tenants.ts`（Query + Mutation）、`src/hooks/use-tenant-actions.ts`（启停 / 批量）                                               |
| 租户页面               | `src/app/(admin)/tenants/page.tsx`、`src/app/(admin)/tenants/[id]/page.tsx`、`src/components/tenants/**`                                       |
| 表格服务端分页         | `src/components/common/data-table.tsx` 新增 `total` / `page` / `onPageChange` / `searchValue` / `onSearchChange`（不传则维持原有本地分页行为） |

下面是原始建议示例（4.1 ~ 4.4），保留作为约定说明；落地版本在此基础上扩展了刷新与会话管理。

### 4.1 环境变量

```ts
// src/lib/env.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081";
```

### 4.2 类型（放在 `src/types/api.ts`）

```ts
export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  traceId?: string;
  timestamp: number;
  success?: boolean;
}

/** 与后端 PageResult<T> 对齐，注意有 pages */
export interface ApiPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

/** 后端业务错误，携带 code 与 traceId 便于排查 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: number,
    message: string,
    readonly traceId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
```

### 4.3 请求客户端（放在 `src/lib/api-client.ts`）

```ts
import { API_BASE_URL } from "@/lib/env";
import { ApiError, type ApiEnvelope } from "@/types/api";

let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

/** 拆信封：成功返回 data，失败抛 ApiError */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, idempotencyKey, signal } = options;

  const url = new URL(path, API_BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  // 204 之类的空响应直接放过，其余按信封解析
  const text = await response.text();
  const envelope = text ? (JSON.parse(text) as ApiEnvelope<T>) : undefined;

  if (!response.ok || (envelope && envelope.code !== 200)) {
    throw new ApiError(
      response.status,
      envelope?.code ?? response.status,
      envelope?.message ?? response.statusText,
      envelope?.traceId,
    );
  }
  return envelope!.data;
}
```

### 4.4 TanStack Query 用法

你们已有 `use-mock-query.ts`，接真实接口时按同样签名替换查询函数即可，key 约定建议 `["tenants", { page, pageSize }]` 这种「资源 + 参数」结构：

```ts
export function useTenants(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["tenants", { page, pageSize }],
    queryFn: () =>
      apiRequest<ApiPage<Tenant>>("/api/admin/v1/tenants", {
        query: { page, pageSize },
      }),
  });
}
```

写操作建议带 `Idempotency-Key`（同租户 + 方法 + 路径 + 幂等键，十分钟窗口内复用首次成功响应）：

```ts
export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OrganizationCreateRequest) =>
      apiRequest<Organization>("/api/admin/v1/organizations", {
        method: "POST",
        body: payload,
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organizations"] }),
  });
}
```

耗时操作返回 `Result<AsyncJobDTO>`，用 `GET /api/admin/v1/jobs/{jobId}` 轮询，`progress` 是 `0-100` 整数，`status` 为 `PENDING|RUNNING|SUCCEEDED|FAILED|CANCELLED`。

## 5. 真实请求 / 响应样例

分页列表（`GET /api/admin/v1/tenants?page=1&pageSize=2`，实抓）：

```jsonc
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "365028209303721024", // 字符串
        "tenantCode": "TENANT_CODE-003",
        "tenantName": "示例数据3",
        "contactEmail": "demo3@agent.io",
        "planCode": "PLAN_CODE-003",
        "status": 3, // 数字枚举
        "expireAt": "2026-10-01T14:51:46.994301",
        "createdAt": "2026-10-01T14:51:46.994303",
        "updatedAt": "2026-10-01T14:51:46.994305",
      },
    ],
    "total": 3,
    "page": 1,
    "pageSize": 2,
    "pages": 2,
  },
  "traceId": "49ca14c4bf93491c",
  "timestamp": 1791096918222,
  "success": true,
}
```

时间字段是 ISO 8601 **不带时区**的字符串（`LocalDateTime` 直接 `toString()`），前端按本地时间解析即可，不要当 UTC 处理。

## 6. ID 字段：统一按 `string` 建模（已确认）

后端所有主键与 `*Id` 字段**都返回 JSON 字符串**，前端直接用 `string` 建模即可，无需额外处理。

背景：雪花算法 ID 是 19 位长整型，例如 `365033750934137614`，**超过 `Number.MAX_SAFE_INTEGER`（9007199254740991）**。
若按数字解析，`JSON.parse` 会静默丢精度，而这类 ID 通常要拼进后续请求路径（如 `/users/{id}`），出错后极难定位。
后端已统一修正：

- 继承 `BaseDTO` 的实体 DTO，`id` 由基类统一序列化为字符串；
- 独立 DTO 的 `id`、`userId`、`ownerId`、`applicantId` 等 42 个字段逐个补了注解；
- 契约与运行时经逐字段核对，**124 个 ID 字段全部为 `string`**。

实测响应：

```jsonc
{ "userId": "365033750934137614", "tenantId": "000000" }   // 都是字符串
{ "id": "365033751202570851" }                              // 分页项同样
```

因此：

- ✅ 可以直接 `id` 相等比较、拼 URL、作为 Map/Query key
- ❌ 不要 `Number(id)`、`parseInt(id)` 或做算术运算
- ❌ 不要给这些字段声明 `number` 类型

对应的类型定义：

```ts
export type ID = string; // 你们 src/types/common.ts 里已经是 string，无需改动
```

## 7. 怎么从契约生成类型（可选）

契约是标准 OpenAPI 3.1，可用 `openapi-typescript` 生成类型，避免手写 DTO：

```bash
cd frontend-admin
npm i -D openapi-typescript
npx openapi-typescript ../backend/doc/openapi.json -o src/types/generated/api.d.ts
```

后端接口变更后重新生成契约并同步：

```bash
cd backend && ./scripts/export-openapi.sh
```

`backend/doc/ENDPOINTS.md` 是所有接口的分组清单（29 个分组、227 个操作），可当索引用。

## 8. 登录 / 注册实现现状

### 已实现（真实接口，不再模拟）

| 能力         | 说明                                                                               |
| ------------ | ---------------------------------------------------------------------------------- |
| 账号密码登录 | `POST /auth/login`（`method: PASSWORD`），失败展示后端 `message` 与 `traceId`      |
| 注册         | `POST /auth/register` → 注册成功后自动登录；若后端返回未激活则回落到登录页         |
| 记住我       | 勾选写 `localStorage`，不勾选只写 `sessionStorage`（键 `hucoo.admin.session`）     |
| 令牌刷新     | 访问令牌过期前 30s 自动刷新；请求遇 401 刷新一次后重放，失败则回到登录页           |
| 路由守卫     | `/(admin)/**` 未登录跳 `/login?next=<原路径>`；登录后回跳（只接受站内相对路径）    |
| 退出登录     | 先清本地会话，再尽力 `POST /auth/logout` 撤销 refreshToken                         |
| 用户信息     | 登录后 `GET /auth/me` 补全姓名；`user-menu` 展示真实账号，租户取 JWT 的 `tenantId` |
| 认证方式探测 | `GET /auth/providers` 决定手机号登录、第三方登录按钮是否可用（未启用即禁用并说明） |

### 尚未接入

- 短信 / 邮箱验证码登录、扫码登录（后端无接口，页面已如实说明而不是假成功）
- OAuth 完整回调链（只调用了 `GET /auth/oauth/{provider}/authorize`，未处理 `callback` 与 `state` 校验）
- 会话管理页（`GET /auth/sessions`、`DELETE /auth/sessions/{id}` 已在 `authApi` 里，但暂无界面）
- `/(admin)` 下目前只有**租户管理**接了真实接口（见 §9），其余业务页面仍使用 `src/lib/mock-data/**`

### 联调提示

- 默认打 `http://localhost:8081`；如需切换，复制 `.env.example` 为 `.env.local` 改 `NEXT_PUBLIC_API_BASE_URL`。
- 若 8081 上跑的是未包含「注册密码校验」修复的旧进程，注册后用自己的密码登录会返回 `110004`，重启后端即可（`cd backend && ./mvnw -pl hucoo-server/hucoo-application-admin spring-boot:run -Dspring-boot.run.profiles=test`）。

## 9. 租户管理实现现状

### 9.1 接口清单（`/api/admin/v1/tenants`）

| 方法        | 路径                     | 说明                                                                   | 权限注解        |
| ----------- | ------------------------ | ---------------------------------------------------------------------- | --------------- |
| GET         | `/tenants`               | 分页，参数 `page`（从 1）、`pageSize`（≤500）、`keyword`               | 无              |
| GET         | `/tenants/{id}`          | 详情；不存在返回 404 `Tenant(xxx) 不存在`                              | 无              |
| GET         | `/tenants/{id}/overview` | 概览：`tenant` + `userCount` / `activeUserCount` / `organizationCount` | 无              |
| GET         | `/tenants/statistics`    | 统计；**当前只返回 `total`**                                           | 无              |
| POST        | `/tenants`               | 创建                                                                   | `tenant:create` |
| PUT / PATCH | `/tenants/{id}`          | 更新（两者等价）                                                       | `tenant:update` |
| DELETE      | `/tenants/{id}`          | 逻辑删除，返回 `true`                                                  | `tenant:delete` |

请求体（创建与更新共用，`tenantCode` / `tenantName` / `planCode` 为 `@NotBlank`）：

```jsonc
{
  "tenantCode": "ACME-001",
  "tenantName": "云启科技",
  "planCode": "team",
  "contactEmail": "owner@example.com",
  "status": 1, // 1 启用，0 停用
  "expireAt": "2029-03-15T10:30:00", // 无时区，别带 Z
}
```

### 9.2 实测行为与坑（dev / 真实 PostgreSQL，逐条抓包确认）

1. **`keyword` 只匹配 `tenant_code`**：`TenantRepositoryImpl.page` 里是 `like(Tenant::getTenantCode, keyword)`。按租户名称、邮箱搜索一律返回 0 条，页面上已注明。
2. **`tenant_code` 没有唯一约束**：同编码可以重复创建（实测返回 200），前端不做「已存在」判断。
3. **`PUT` / `PATCH` 都是整体替换**，不是部分更新：只传 `tenantName` 会因 `tenantCode` / `planCode` 为空直接 400。前端所有更新（含启停、批量）都用完整请求体。
4. **写接口的响应体会把未传的可选字段回显成 `null`，但 DB 里没被清空**：
   - `PATCH` 只传必填字段后，响应里 `contactEmail` / `expireAt` 是 `null`，重新 `GET` 却还是原值（MyBatis-Plus 的 `updateById` 跳过 null）。
   - 因此**不要拿写响应当权威数据**：前端 mutations 统一 `invalidateQueries(["tenants"])` 重新拉取。
5. **清空字段的语义不一致**：`contactEmail: ""` 会真的写成空串（可清空）；`expireAt: ""` 等于不修改（无法清空到期时间）。表单已分别注明。
6. **`updatedAt` 不会因更新而变化**（请求里没有该字段 → 跳过），页面展示的更新时间实际等于创建时间。
7. **`statistics` 只返回 `{"total": n}`**，没有按状态/套餐的聚合，也没有成员数与成本。
8. **`overview` 的计数按 `ap_tenant.tenant_id` 隔离列统计**，不是按主键：新建租户的 `tenant_id` 默认 `'000000'`，所以任何 `tenant_id='000000'` 的租户都会看到同一份平台级计数。
9. `Idempotency-Key` 生效：同一键重复 `POST` 复用首次响应（实测第二次返回同一个 `id`）。
10. 写接口的 400 会把字段错误拼在 `message` 里（如 `planCode: planCode 不能为空`），前端直接展示后端 `message`。

### 9.3 已接入的页面能力

| 页面元素                                       | 数据来源                                                              |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| 列表分页 / 按编码搜索                          | `GET /tenants`（服务端分页，`DataTable` 走 manual 模式）              |
| 租户名称、编码、套餐、状态、到期时间、联系邮箱 | 列表 / 详情 DTO                                                       |
| 新建、编辑、复制、启停、批量暂停、删除         | `POST` / `PUT` / `DELETE`（复制 = 以 `-COPY` 后缀再创建一条）         |
| 详情页成员数 / 活跃成员 / 组织数量             | `GET /tenants/{id}/overview`                                          |
| 导出（列表）、导出 JSON（详情）                | 前端导出已取到的数据；**后端没有导出接口**                            |
| 详情页 404 / 列表错误提示                      | `ApiError.status` + 后端 `message` + `traceId`                        |
| 状态推导                                       | `status=0` → 已暂停；`status=1` 且 `expireAt` 过期 → 已过期；否则正常 |

### 9.4 待后端补齐的字段（页面元素已保留，用 `—` 占位并注明原因）

列表页与详情页的元素**没有按接口字段做删减**，缺数据的位置统一渲染 `—`（悬停显示原因）。需要后端补的字段：

| 页面位置                                                                                           | 需要的后端字段 / 接口                                                                       | 现状                                                         |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 列表「区域」列、新建/编辑表单「区域」、详情页描述                                                  | `ap_tenant.region`（或 `region_code`）                                                      | 表里没有该列                                                 |
| 列表「负责人」列、详情「负责人」、表单「负责人」                                                   | `owner_name`（现在只有 `contact_email`）                                                    | 缺字段                                                       |
| 列表「成员」列、详情「席位使用」、表单「席位数量」                                                 | `seats`；列表 DTO 里也希望直接带 `userCount`（现在只能一租户一次 overview）                 | 缺字段                                                       |
| 列表「月调用量」「月成本」、详情「月调用量」「月 Token」「月成本」、统计卡「覆盖成员」「月度成本」 | 用量 / 计费聚合（`monthlyCalls`、`monthlyTokens`、`monthlyCost`、`userCount` 汇总）         | 无接口                                                       |
| 统计卡「试用中」、表单状态下拉的试用中/开通中                                                      | 更细的 `status` 枚举（或独立字段）                                                          | 现在只有 1 启用 / 0 停用                                     |
| 列表「租户开关」、详情「租户级功能开关」、新建/编辑表单 4 个开关                                   | `allow_custom_models` / `allow_byok` / `allow_local_models` / `allow_shared_models`         | 缺字段                                                       |
| 详情「SSO」                                                                                        | `sso_enabled`                                                                               | 缺字段                                                       |
| 详情「项目数」「月调用量」「月 Token」「月成本」统计卡                                             | 同上的聚合字段                                                                              | 无接口                                                       |
| 详情「配额」Tab（`配额明细` 5 个维度 + 进度条）                                                    | `GET /tenants/{id}/quota`：Token / 调用次数 / 存储 / 并发 / 成本                            | 无接口                                                       |
| 详情「概览」Tab 的调用趋势与模型分布图                                                             | `GET /tenants/{id}/usage?range=30d`（时序 + 模型维度）                                      | 无接口                                                       |
| 详情「成员」「项目」「模型策略」「审计」Tab                                                        | 各模块按 `tenantId` 过滤的列表接口（`users` / `projects` / `models/custom` / `audit-logs`） | 无接口                                                       |
| 列表「导出租户数据」按钮                                                                           | 服务端导出（当前只导出前端已取到的当前页）                                                  | 无接口                                                       |
| 批量操作「通知续费」按钮                                                                           | `POST /tenants/{id}/renewal-notice`                                                         | 无接口（点击时如实提示未发送）                               |
| 列表筛选「套餐」「状态」「区域」                                                                   | `TenantQueryRequest` 增加 `planCode` / `status` / `region` 参数                             | 现在只有 `page`/`pageSize`/`keyword`，筛选只在当前分页内生效 |
| 统计卡趋势（`delta`）                                                                              | 需要后端给出环比数据                                                                        | 已去掉虚假环比数字                                           |

> 补齐后前端只需要在 `tenantApi` 里加字段、把 `MissingValue` 换成真实值即可，页面结构不用再动。

### 9.5 本轮验证方式

- **接口链路**：用 Node 自定义 loader 直接加载 `src` 下的真实模块（`lib/api/tenants.ts`、`lib/tenants.ts`、`types/tenant.ts`）打真实后端，覆盖统计 / 分页 / 创建（含缺口字段不入库）/ 编码搜索 / 名称搜索不命中 / 详情 / 概览 / 详情→表单→请求体往返 / 停用与改名落库 / 整体替换不丢字段 / 删除 / 删除后 404 / 状态推导，共 27 项断言。
- **页面元素**：用 React SSR + 预填 react-query 缓存渲染真实的两个页面组件，断言原有统计卡、筛选栏、表头、操作区、Tab、图表卡、配额维度、功能开关等元素仍在，共 19 项断言。
- 另有 `tsc --noEmit`、`eslint`、`prettier --check`、`next build` 全绿。

> 这套脚本目前是本地临时脚本，没有进仓库。需要的话可以固化成 `npm run smoke:tenants`，避免回归。

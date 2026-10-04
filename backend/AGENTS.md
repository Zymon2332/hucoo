# Agent 平台管理端 — 后端开发指南

本文件是 AI 编程助手的后端项目级指令。生成代码时，必须严格遵守以下约定。  
本文件只覆盖后端部分，不包含前端。

## 一、项目定位

这是一个 Agent 平台的管理端后端，不是用户聊天端、不是代码编辑器、不是 Agent 运行工作台。

管理端后端是平台的控制平面 + 治理平面 + 运营平面，核心职责：

- 管人：租户、组织、用户、角色、权限、审批
- 管 Agent：模板、版本、市场、策略限制
- 管模型：平台模型、用户自定义模型、BYOK、路由、验证
- 管工具：工具目录、MCP Server、网络策略、供应链安全
- 管数据：知识库、项目策略、敏感文件保护
- 管环境：沙箱、镜像、资源配额、出网策略
- 管任务：用量、配额、计费、成本中心
- 管安全：审计、DLP、合规、告警
- 管运营：市场、公告、实验、灰度、商业化

用户端负责“用”，管理端负责“管”。

## 二、技术栈

- JDK 21（启用虚拟线程）
- Spring Boot 4.0.8
- Spring Cloud 2025.1.x（Oakwood）
- Spring Cloud Alibaba 2025.1.0.0
- Nacos Server 3.1.1（服务发现 + 配置中心）
- Maven 3.9.x（Maven Wrapper）
- Spring Cloud Gateway（WebFlux 模式）
- Spring Cloud OpenFeign
- Spring Cloud CircuitBreaker（Resilience4j）
- MyBatis-Plus 3.5.16+（mybatis-plus-spring-boot4-starter）
- HikariCP
- Flyway（预留）
- Spring Boot Actuator
- Micrometer + Prometheus
- SpringDoc OpenAPI 3
- Lombok
- MapStruct
- JUnit 5 + Testcontainers
- Logback + SLF4J

## 三、项目结构（Maven 多模块）

```text
hucoo-agent-platform/
├── pom.xml                         # 根 Maven 聚合与依赖管理
├── mvnw / mvnw.cmd / .mvn/         # Maven Wrapper
├── docker-compose.yml
├── hucoo-dependencies-bom/          # 统一依赖版本管理
├── hucoo-common/
│   ├── hucoo-commons-api/
│   ├── hucoo-commons-dto/
│   ├── hucoo-commons-util/
│   └── hucoo-commons-exception/
├── hucoo-component/
│   ├── hucoo-component-web/
│   ├── hucoo-component-security/
│   ├── hucoo-component-cache/
│   ├── hucoo-component-database/
│   ├── hucoo-component-observability/
│   ├── hucoo-component-storage/
│   └── hucoo-component-test/
├── hucoo-module/
│   ├── hucoo-module-tenant/
│   ├── hucoo-module-identity/
│   ├── hucoo-module-model-governance/
│   ├── hucoo-module-tool-mcp/
│   ├── hucoo-module-agent/
│   ├── hucoo-module-project/
│   ├── hucoo-module-billing/
│   ├── hucoo-module-audit/
│   ├── hucoo-module-security/
│   ├── hucoo-module-monitoring/
│   ├── hucoo-module-integration/
│   └── hucoo-module-file/
└── hucoo-server/
    ├── hucoo-application-admin/     # 管理端应用启动器
    └── hucoo-gateway-server/        # WebFlux 网关
```

依赖流向：

```text
hucoo-application-admin → hucoo-module-* → hucoo-component-* → hucoo-commons-*
hucoo-gateway-server → hucoo-commons-*
```

`hucoo-dependencies-bom` 只负责统一版本管理，不参与业务代码依赖。禁止反向依赖，禁止跨业务模块直接依赖。

各模块职责：

- `hucoo-commons-api`：通用接口定义、常量、枚举、错误码、基础接口
- `hucoo-commons-dto`：通用 DTO、BaseDTO、PageResult、统一响应 Result
- `hucoo-commons-util`：工具类：JSON、日期、加密、ID 生成、字符串
- `hucoo-commons-exception`：全局异常定义、业务异常、错误码体系
- `hucoo-component-web`：全局异常处理、统一响应包装、跨域、请求日志、参数校验
- `hucoo-component-security`：JWT 解析、权限拦截器、当前用户上下文
- `hucoo-component-cache`：Redis / Caffeine 抽象、缓存注解
- `hucoo-component-database`：MyBatis-Plus 自动配置、BaseEntity、MetaObjectHandler、多租户
- `hucoo-component-observability`：Micrometer、Trace ID、Actuator 扩展
- `hucoo-component-test`：测试基础类、Testcontainers 配置、Mock 工具
- `hucoo-gateway-server`：Spring Cloud Gateway 网关，注册到 Nacos
- `hucoo-module-tenant`：租户管理、组织管理、租户级策略开关
- `hucoo-module-identity`：用户、角色、权限、SSO、API Key、审批流
- `hucoo-module-model-governance`：平台模型、自定义模型、BYOK 密钥、模型路由、验证
- `hucoo-module-tool-mcp`：工具目录、MCP Server 注册审核、网络策略、工具市场
- `hucoo-module-agent`：Agent 模板、版本、市场审核、策略限制
- `hucoo-module-project`：项目模板、工作区策略、仓库绑定、环境变量
- `hucoo-module-billing`：用量统计、配额、套餐、账单、成本中心
- `hucoo-module-audit`：审计日志、数据保留、DLP、合规
- `hucoo-module-security`：安全策略、IP 白名单、DLP 规则、内容审核
- `hucoo-module-monitoring`：告警规则、通知渠道、SLA、健康检查
- `hucoo-module-integration`：Git、IM、CI/CD、Webhook、OAuth 应用
- `hucoo-application-admin`：Spring Boot 管理端启动器，聚合业务模块

每个业务模块的内部结构（DDD 分层）：

```text
hucoo-module-xxx/
├── pom.xml
└── src/main/java/dev/hucoo/<module-package>/
    ├── api/              # 对外 Facade 契约、DTO
    │   └── dto/
    ├── application/      # 应用服务、用例编排、转换器
    │   ├── converter/
    │   └── service/
    ├── domain/           # 领域模型、聚合、领域服务
    │   └── entity/
    ├── infrastructure/   # 仓储实现（MyBatis-Plus Mapper）、外部适配器
    │   ├── mapper/       # MyBatis-Plus Mapper 接口（继承 BaseMapper）
    │   └── repository/   # 仓储接口实现（调用 Mapper）
    ├── config/           # 模块级配置
    └── controller/       # REST 控制器
└── src/main/resources/
    └── mapper/           # MyBatis XML 映射文件（按需）
```

包名：`dev.hucoo.<module-package>`，例如 `dev.hucoo.tenant`、`dev.hucoo.modelgovernance`。

## 四、关键设计决策

### 1. 服务发现：Nacos

- 使用 Nacos 3.1.1 作为服务注册与配置中心。
- 禁止使用 `bootstrap.yml`，必须使用 `spring.config.import` 接入 Nacos。
- 依赖：`spring-cloud-starter-alibaba-nacos-discovery`
- 配置示例：

```yaml
spring:
  application:
    name: application-admin
  config:
    import:
      - nacos:application-admin.yml
      - nacos:common.yml
  cloud:
    nacos:
      server-addr: 127.0.0.1:8848
      username: nacos
      password: nacos
      discovery:
        namespace: public
        group: DEFAULT_GROUP
        naming-cache-persist: true
      config:
        namespace: public
        group: DEFAULT_GROUP
        file-extension: yml
```

- Gateway 路由使用 `lb://服务名` 指向 Nacos 注册的服务。
- Nacos 健康检查默认关闭，K8s Liveness Probe 场景下不要开启。

### 2. 数据库：MyBatis-Plus

- 禁止使用 JPA / Hibernate。
- Spring Boot 4 必须使用 `mybatis-plus-spring-boot4-starter`，不能使用旧 starter。
- BOM 导入：`mybatis-plus-bom` 3.5.16。
- 实体继承 `BaseEntity`，使用 `@TableName`、`@TableId`、`@TableField`。
- 自动填充：`MetaObjectHandler` 填充 `createdAt`、`updatedAt`、`deleted`。
- 逻辑删除：`@TableLogic`，全局配置 `logic-delete-field: deleted`。
- 分页：`PaginationInnerInterceptor`，使用 `IPage<T>` / `Page<T>`。
- 多租户：`TenantLineInnerInterceptor` + `CurrentTenantContext`。
- 乐观锁：`@Version` + `OptimisticLockerInnerInterceptor`。
- Mapper 继承 `BaseMapper<T>`，Service 继承 `IService<T>` / `ServiceImpl<Mapper, Entity>`。
- 复杂 SQL 使用 XML，放在 `src/main/resources/mapper/`。

配置示例：

```yaml
mybatis-plus:
  mapper-locations: classpath*:/mapper/**/*.xml
  type-aliases-package: com.agentplatform.*.domain.entity
  global-config:
    db-config:
      id-type: assign_id
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0
  configuration:
    map-underscore-to-camel-case: true
    log-impl: org.apache.ibatis.logging.slf4j.Slf4jImpl
```

### 3. 自定义模型治理

用户端允许配置自定义模型时，管理端必须提供：

- 租户/项目/环境级开关：`allowUserPrivateModel`、`allowLocalModel`、`allowShare` 等。
- 自定义模型注册与审批：BYOK、自定义 Endpoint、本地模型、企业网关。
- BYOK 密钥保险箱：加密存储、轮换、撤销、离职回收、指纹记录。
- 网络策略：域名白名单、禁止内网 CIDR、SSRF 防护、出网代理。
- 模型验证：连通性、流式、超时、并发、工具调用、JSON 模式、Token usage、上下文长度、多模态。
- 计费：平台模型费 vs 自定义模型费、fallback 费用归属、配额、预算、告警。
- 审计：谁、何时、用哪个 Key、调哪个模型、数据流向。
- 监控与降级：健康检查、熔断、降级到平台模型、独立监控。
- 角色：模型接入管理员、模型审核员、密钥管理员、安全审计员。

### 4. MCP 治理

管理端配 MCP 的意义是：准入、鉴权、权限、网络、数据、审计、计费、降级。

MCP 分四层：

1. 平台级 MCP：官方认证，全平台可用。
2. 租户级 MCP：企业内共享。
3. 项目级 MCP：项目内共享。
4. 用户私有 MCP：个人配置，默认仅自己可见。

用户私有 MCP 支持，但必须分级管控：

- 本地私有：默认允许，密钥不离开本机。
- 注册代理：提交审批，走平台网关，强制审计。
- 团队共享 / 市场：必须审核、签名、扫描、评分。
- 强合规租户：可一键禁止用户私有 MCP。

管理端策略字段：

`allowUserPrivateMcp`、`allowLocalOnly`、`allowRemotePrivateMcp`、`requireApproval`、`allowCloudExecution`、`allowedTransports`、`allowedDomains`、`blockPrivateCIDR`、`requireVault`、`auditLevel`、`allowShare`、`maxServersPerUser`、`quota`、`fallback`。

审批关注：归属、传输方式、Endpoint、工具列表、危险工具、数据流向、凭证类型、网络范围、风险等级、有效期。

## 五、代码生成规范

- 每个业务模块采用 DDD 分层：`api/`、`application/`、`domain/`、`infrastructure/`、`config/`、`controller/`
- 包名：`com.agentplatform.<module>`
- 统一响应：`Result<T>`、`PageResult<T>`
- 错误码：`ErrorCode` 枚举，`BusinessException`
- 全局异常处理：`@RestControllerAdvice`（component-web）
- 所有 REST 接口使用 `@Tag`、`@Operation` 注解
- 使用 Lombok、MapStruct、SLF4J
- 禁止 any、禁止硬编码版本号
- 禁止使用 JPA / Hibernate
- 禁止使用 `bootstrap.yml` 接入 Nacos
- 禁止在 Spring Boot 4 中使用旧的 MyBatis-Plus starter
- 禁止在 Gateway 中使用 Servlet 模式
- 禁止业务模块之间直接依赖
- 禁止忽略租户隔离、权限校验、审计日志

## 六、启动与验证

- `mvn clean install` 编译通过。
- `mvn spring-boot:run -pl application/application-admin` 启动 Admin。
- `mvn spring-boot:run -pl middleware/gateway-server` 启动网关。
- Swagger UI：`/swagger-ui.html`
- Actuator：`/actuator/health`
- 端口：Nacos `8848`，Gateway `8080`，Admin `8081`

Docker Compose 包含 Nacos 3.1.1、PostgreSQL 16、Redis 7.4。

## 七、重要禁止事项

- 禁止生成用户端聊天界面、代码编辑器、Agent 运行对话。
- 禁止使用 JPA / Hibernate。
- 禁止使用 `bootstrap.yml` 接入 Nacos。
- 禁止在 Spring Boot 4 中使用旧的 MyBatis-Plus starter。
- 禁止在 Gateway 中使用 Servlet 模式。
- 禁止业务模块之间直接依赖。
- 禁止硬编码依赖版本。
- 禁止忽略租户隔离、权限校验、审计日志。

## 八、参考优先级

1. 管理端功能范围以“项目定位”为准。
2. 后端技术栈与模块划分以“技术栈”“项目结构”“关键设计决策”为准。
3. 自定义模型与 MCP 治理以“关键设计决策”为准。
4. 生成代码时，先输出结构，再输出配置，再输出核心类，最后输出业务模块。

> 一句话总结：管理端管人、管租户、管策略、管模型、管工具、管资源、管钱、管安全、管审计、管运营；用户端负责用。

## 九、Git 提交规范

提交信息格式、type、scope、分支与 PR 规范见：[Git 提交规范](doc/GIT_COMMIT.md)

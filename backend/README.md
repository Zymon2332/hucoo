# Hucoo Agent Platform 管理端后端（hucoo-agent-platform）

Agent 平台管理端后端的 Maven 多模块骨架：Nacos 服务发现 + 配置中心、MyBatis-Plus 数据层、Spring Cloud Gateway（WebFlux）、OpenFeign、Resilience4j、SpringDoc、Micrometer/Prometheus。
默认使用静态 Mock 数据，不依赖真实数据库即可启动；数据层 Mapper / Entity / Flyway 脚本已预留。

## 1. 技术栈

| 组件 | 版本 | 说明 |
|---|---|---|
| JDK | 21（LTS，启用虚拟线程） | `maven.compiler.release=21` |
| Spring Boot | 4.0.8 | 父 POM `spring-boot-starter-parent` |
| Spring Cloud | 2025.1.3（Oakwood） | `spring-cloud-dependencies` BOM |
| Spring Cloud Alibaba | 2025.1.0.0 | `spring-cloud-alibaba-dependencies` BOM，对应 Nacos Client 3.1.1 |
| Nacos Server | 3.1.1 | 服务发现 + 配置中心，端口 8848 / 9848 |
| Maven | 3.9.9 | Maven Wrapper（`./mvnw`） |
| Spring Cloud Gateway | `spring-cloud-starter-gateway-server-webflux` | Boot 4 / SC 2025.1 的新坐标，WebFlux 模式 |
| MyBatis-Plus | 3.5.17 | 必须使用 `mybatis-plus-spring-boot4-starter` |
| HikariCP | Boot 4 托管（7.0.2） | 连接池 |
| Flyway | Boot 4 托管（11.14.1） | 迁移脚本目录 `hucoo-application-admin/src/main/resources/db/migration` |
| SpringDoc OpenAPI | 3.0.3 | Swagger UI `/swagger-ui.html` |
| Micrometer + Prometheus | Boot 4 / 1.16.7 | `/actuator/prometheus` |
| Lombok / MapStruct | 1.18.46 / 1.6.3 | 编译期注解处理（父 POM 统一配置 `annotationProcessorPaths`） |
| JUnit 5 + Testcontainers | Boot 4 托管（TC 2.0.5） | `hucoo-component-test` 提供基础类 |

> 注意：Spring Boot 4 环境下 MyBatis-Plus 必须使用 `mybatis-plus-spring-boot4-starter`，不能使用旧的 `mybatis-plus-boot-starter`；
> 分页 / 多租户插件来自 `mybatis-plus-jsqlparser`（MyBatis-Plus 3.5.9 起 JsqlParser 已解耦）。
> 本工程禁用 JPA / Hibernate，全部使用 MyBatis-Plus。

## 2. 模块结构

```
hucoo-agent-platform/
├── pom.xml                       # 父 POM：聚合模块 + BOM + 编译插件统一管理
├── mvnw / mvnw.cmd / .mvn/       # Maven Wrapper 3.9.9
├── docker-compose.yml            # Nacos 3.1.1 + MySQL 8.4 + Redis 7.4
├── dependencies/
│   └── hucoo-dependencies-bom/         # 对外发布用 BOM（导入 Boot/Cloud/Alibaba/MyBatis-Plus BOM）
├── commons/
│   ├── hucoo-commons-api/              # 通用常量、枚举、Facade 契约
│   ├── hucoo-commons-dto/              # Result / PageResult / BaseDTO / PageQuery
│   ├── hucoo-commons-util/             # JsonUtil / IdGenerator / DateTimeUtil / StringUtil / CryptoUtil
│   └── hucoo-commons-exception/        # ErrorCode / CommonErrorCode / BusinessException
├── components/
│   ├── hucoo-component-web/            # 全局异常、统一响应包装、CORS、请求日志、Swagger 配置
│   ├── hucoo-component-security/       # JwtUtil、CurrentUserContext、PermissionInterceptor（默认不鉴权）
│   ├── hucoo-component-cache/          # Caffeine / Redis 缓存抽象
│   ├── hucoo-component-database/       # MyBatis-Plus 配置、BaseEntity、MetaObjectHandler、多租户
│   ├── hucoo-component-observability/  # Micrometer 公共标签、TraceId 过滤器、Prometheus
│   └── hucoo-component-test/           # 测试基础类、Testcontainers 支持、Mock 工具
├── middleware/
│   └── hucoo-gateway-server/           # Spring Cloud Gateway（WebFlux）注册到 Nacos，端口 8080
├── modules/                      # 11 个业务模块（DDD 分层）
│   ├── hucoo-module-tenant/            # 租户、组织、租户级策略开关
│   ├── hucoo-module-identity/          # 用户、角色、权限、SSO、API Key
│   ├── hucoo-module-model-governance/  # 平台模型、自定义模型、BYOK、模型路由
│   ├── hucoo-module-tool-mcp/          # 工具目录、MCP Server 注册审核、网络策略
│   ├── hucoo-module-agent/             # Agent 模板、版本、市场审核
│   ├── hucoo-module-project/           # 项目模板、工作区策略、仓库绑定
│   ├── hucoo-module-billing/           # 用量统计、配额、套餐、成本中心
│   ├── hucoo-module-audit/             # 审计日志、数据保留、DLP、合规
│   ├── hucoo-module-security/          # 安全策略、IP 白名单、DLP 规则
│   ├── hucoo-module-monitoring/        # 告警规则、通知渠道、SLA
│   └── hucoo-module-integration/       # Git、IM、CI/CD、Webhook、OAuth（含 Feign 示例）
└── application/
    └── hucoo-application-admin/        # Admin 应用入口，端口 8081
```

### 依赖流向（单向，禁止反向）

```
application → modules → middleware → components → commons → dependencies
```

- `commons` / `dependencies` 不依赖任何上层模块
- `components` 只依赖 `commons`
- `middleware` 可依赖 `components`、`commons`
- `modules` 可依赖 `middleware`、`components`、`commons`
- **业务模块之间不直接依赖**，通过 `api` 包中的 Facade 契约（如 `TenantFacade`）或事件通信
- 每个业务模块内部采用 DDD 分层：`api` / `application` / `domain` / `infrastructure` / `config` / `controller`

### 业务模块统一约定

| 位置 | 内容 |
|---|---|
| `api/` | 对外 Facade 契约 + DTO（`XxxDTO` / `XxxCreateRequest` / `XxxQueryRequest`） |
| `domain/entity/` | 实体继承 `BaseEntity`，`@TableName` / `@TableField` / `@TableId` / `@TableLogic` / `@Version` |
| `infrastructure/mapper/` | `XxxMapper extends BaseMapper<T>`（`@Mapper`） |
| `infrastructure/repository/` | 仓储接口 + 实现（`LambdaQueryWrapper` / 分页 `IPage`） |
| `application/service/` | `XxxApplicationService extends IService<T>`（接口默认方法编排用例） |
| `application/service/impl/` | `XxxApplicationServiceImpl extends ServiceImpl<Mapper, Entity>`，真实 DB 实现，`agent-platform.persistence.enabled=true` 生效 |
| `application/service/mock/` | `MockXxxApplicationService`，内存 List/Map 静态数据，**默认生效** |
| `application/converter/` | MapStruct `@Mapper(componentModel = "spring")` |
| `controller/` | REST 接口，统一返回 `Result<T>`，`@Tag` / `@Operation` 注解 |
| `resources/mapper/` | MyBatis XML（hucoo-module-tenant、hucoo-module-audit 提供示例） |

> MyBatis-Plus 3.5.17 中 `IService` / `ServiceImpl` 位于 `com.baomidou.mybatisplus.spring.service[.impl]` 包（旧版为 `extension.service`）。

## 3. 端口分配

| 服务 | 端口 |
|---|---|
| Nacos Server | 8848（控制台 http://127.0.0.1:8848/nacos），gRPC 9848 |
| hucoo-gateway-server | 8080 |
| hucoo-application-admin | 8081 |
| MySQL | 3306 |
| Redis | 6379 |

## 4. 快速开始

### 4.1 编译

```bash
./mvnw clean install
```

### 4.2 启动 Nacos（可选，不启动也能跑 Mock 模式）

```bash
docker compose up -d nacos          # MySQL / Redis 同理：docker compose up -d
```

控制台：http://127.0.0.1:8848/nacos （默认 nacos/nacos）。

在 Nacos 中新建配置（`public` 命名空间、`DEFAULT_GROUP`、`yml` 格式）：

- `hucoo-application-admin.yml`：Admin 应用外部化配置
- `hucoo-gateway-server.yml`：网关外部化配置
- `common.yml`：公共配置

本地配置文件通过 `spring.config.import` 引入，未使用 bootstrap：

```yaml
spring:
  config:
    import:
      - optional:nacos:hucoo-application-admin.yml
      - optional:nacos:common.yml
```

`optional:` 前缀保证 Nacos 不可用时应用仍能以本地配置启动（日志中会出现 Nacos 连接告警，属正常现象）。

### 4.3 启动应用

```bash
# 先安装依赖模块，再启动（-pl 单模块启动时依赖从本地仓库解析）
./mvnw -pl application/hucoo-application-admin spring-boot:run
./mvnw -pl middleware/hucoo-gateway-server spring-boot:run
```

验证入口：

| 地址 | 说明 |
|---|---|
| http://127.0.0.1:8081/swagger-ui.html | Admin Swagger UI |
| http://127.0.0.1:8081/v3/api-docs | OpenAPI 文档 |
| http://127.0.0.1:8081/actuator/health | Admin 健康检查 |
| http://127.0.0.1:8081/actuator/prometheus | Prometheus 指标 |
| http://127.0.0.1:8081/api/admin/v1/tenants | 示例业务接口（Mock 数据） |
| http://127.0.0.1:8080/actuator/health | 网关健康检查 |
| http://127.0.0.1:8080/api/admin/v1/tenants | 经网关转发到 `lb://hucoo-application-admin` |

### 4.4 多环境

`hucoo-application-admin` 提供 `application.yml` + `application-dev.yml` / `application-test.yml` / `application-prod.yml`：

| Profile | Nacos 注册 | 数据源 | 持久层 |
|---|---|---|---|
| dev（默认） | 关闭（可离线启动） | H2 内存 | Mock 数据 |
| test | 关闭 | H2 内存 | Mock 数据 |
| prod | 开启 | MySQL 8.4 | MyBatis-Plus + Flyway |

不同环境也可通过 Nacos 的 namespace 隔离。

## 5. 关键配置说明

### 5.1 虚拟线程

```yaml
spring:
  threads:
    virtual:
      enabled: true
server:
  tomcat:
    threads:
      virtual:
        enabled: true
```

### 5.2 Nacos 服务发现（hucoo-application-admin、hucoo-gateway-server）

```yaml
spring:
  cloud:
    nacos:
      server-addr: 127.0.0.1:8848        # 优先级高于 discovery/config 下的 server-addr
      username: nacos
      password: nacos
      discovery:
        namespace: public
        group: DEFAULT_GROUP
        naming-cache-persist: true       # 本地文件缓存，Nacos 抖动时复用缓存地址
      config:
        namespace: public
        group: DEFAULT_GROUP
        file-extension: yml
```

- **禁止 bootstrap.yml**：Spring Cloud Alibaba 2025.1.x 已废弃 Bootstrap 引导方式，统一使用 `spring.config.import`
- Nacos Discovery / Config 的健康检查默认关闭；如需开启（K8s 环境请勿开启，否则网络抖动会导致 Liveness 探针失败重启）：

```yaml
management:
  health:
    nacos:
      discovery:
        enabled: true
    nacos-config:
      enabled: true
```

### 5.3 网关路由（Boot 4 / SC 2025.1 新前缀）

```yaml
spring:
  cloud:
    gateway:
      server:
        webflux:
          routes:
            - id: admin-route
              uri: lb://hucoo-application-admin     # 服务名 = spring.application.name
              predicates:
                - Path=/api/admin/**
```

### 5.4 MyBatis-Plus

```yaml
mybatis-plus:
  mapper-locations: classpath*:/mapper/**/*.xml
  type-aliases-package: dev.hucoo.*.domain.entity
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

- 分页：`PaginationInnerInterceptor(DbType.MYSQL)`（单页上限 500）
- 乐观锁：`@Version` + `OptimisticLockerInnerInterceptor`
- 多租户：`TenantLineInnerInterceptor` + `CurrentTenantContext`（`ap_tenant`、`flyway_schema_history` 等表通过 `TenantTableIgnore` 忽略）
- 自动填充：`@TableField(fill = FieldFill.INSERT / INSERT_UPDATE)` + `DefaultMetaObjectHandler`（替代 JPA Auditing）
- 逻辑删除：`@TableLogic`（替代 Hibernate 的删除策略）

### 5.5 统一定义

- 统一响应体 `Result<T>`（`code` / `message` / `data` / `traceId` / `timestamp`）
- 分页响应 `PageResult<T>`，分页入参 `PageQuery`
- 错误码 `ErrorCode` + `CommonErrorCode`，业务异常 `BusinessException`
- `hucoo-component-web` 通过 `@RestControllerAdvice` 统一处理参数校验、业务异常与未知异常

## 6. 切换真实数据库

1. 启动 MySQL：`docker compose up -d mysql`
2. 使用 `prod` profile 启动：`--spring.profiles.active=prod`
3. Flyway 会执行 `db/migration/V1__init_schema.sql` 建表
4. `agent-platform.persistence.enabled=true` 后，各模块的 `XxxApplicationServiceImpl`（DB 版）生效，`MockXxxApplicationService` 自动失效

## 7. 测试

```bash
./mvnw test                                # 全量单元测试
./mvnw -pl application/hucoo-application-admin test
```

- `hucoo-commons-util`：JsonUtil / IdGenerator / StringUtil 单元测试
- `hucoo-module-tenant`：MapStruct Converter 单元测试
- `hucoo-application-admin`：`@SpringBootTest` + MockMvc 上下文测试（校验统一响应、Actuator、OpenAPI）
- `hucoo-component-test` 提供 `BaseUnitTest` / `BaseIntegrationTest` / `TestcontainersConfiguration`（MySQL 8.4，需要本地 Docker）

## 8. 生产部署提示

- Nacos 生产环境至少 3 节点集群，避免单点
- 网关 `agent-platform.gateway.auth.enabled=false` 为占位鉴权，生产需接入真实鉴权（JWT / OAuth2）
- 敏感配置（数据库口令、BYOK 密钥）放 Nacos 加密配置或环境变量，Nacos 日志会自动对 username/password 脱敏
- 将 `/actuator/health/liveness`、`/actuator/health/readiness` 用作 K8s 探针，并保持 Nacos 健康检查关闭

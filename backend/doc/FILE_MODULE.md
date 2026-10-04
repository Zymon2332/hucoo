# 文件模块设计（对象存储：RustFS / 本地存储）

> 状态：**P0 已落地**（`hucoo-component-storage` + `hucoo-module-file`），P1/P2 待实现。
>
> 已实现：S3 / 本地 / 内存三驱动与自动配置、`/actuator/health` 的 `storage` 组件、
> 驱动契约测试（本地 + 内存已通过，RustFS 契约测试按环境变量开关）、V13 五张表、
> 元数据分页/详情/更新/回收站与还原、服务端代理上传（单遍流式 + SHA-256）、
> 代理下载与后端签名下载链接、Mock 与持久化双实现、审计事件、10 个 REST 操作。
>
> 未实现（P1/P2）：分片上传 API（驱动层已实现）、浏览器直传预签名、秒传、
> 分享链接管理接口、回收站定时清理与存储对账、租户配额、病毒扫描与 DLP 接入、
> 存储配置管理接口。第 10 节的待决项仍需确认，落地 P1 前请先过一遍。
>
> 关键词：`hucoo-component-storage`（能力组件，S3 / 本地双驱动）、`hucoo-module-file`（业务模块，元数据 / 上传会话 / 分享 / 配额）。

## 1. 目标与范围

### 1.1 目标

管理端需要一处统一的文件能力，替代各模块各自拼 multipart、各自找目录落盘的现状：

- 统一存储：一套 API 同时支持 **RustFS / MinIO / AWS S3 / 阿里云 OSS 等 S3 兼容对象存储** 与 **本地文件系统**。
- 统一元数据：文件归属（租户 / 用户 / 业务对象）、大小、SHA-256、MIME、可见性、状态可查询、可审计。
- 大文件可用：分片上传、断点续传、超时清理；服务端全程流式，不把文件读进内存。
- 治理能力：扩展名黑白名单、单文件与租户配额、可见性、分享链接、回收站、下载审计。
- 为其他模块提供公共服务：Agent 模板包、MCP 配置包、项目工作区附件、账单导出、审计归档等都以 `bizType + bizId` 挂到同一套文件表上。

### 1.2 非目标

- 不做用户端聊天附件上传（用户端在 `core/agent` 与前端消费侧，不在本管理端范围）。
- 不做 CDN、图片处理、转码、在线预览渲染（预览交给前端 + 预签名 URL）。
- 不自研对象存储协议；RustFS 只作为 S3 兼容服务端的部署选项。
- 不替换已有 `hucoo-module-integration` 的 Git 仓库文件能力（仓库代码仍走 Git，不落对象存储）。

## 2. 架构决策

### 2.1 为什么拆成「组件 + 业务模块」

用户诉求是"在 component 中新增文件模块"。按本仓库既有的分层约定（`application → modules → middleware → components → commons`），把它拆成两层更合适：

| 层 | 制品 | 职责 | 是否含业务表 | 是否含 Controller |
| --- | --- | --- | --- | --- |
| 能力层 | `hucoo-component-storage` | 对象存储驱动 SPI、S3 / 本地实现、自动配置、能力探测、健康检查 | 否 | 否 |
| 业务层 | `hucoo-module-file` | 文件元数据、上传会话、分享、配额、策略、审计、REST API | 是（`ap_file_*`） | 是 |

理由：

1. **复用**：`hucoo-module-audit` 的归档、`hucoo-module-billing` 的账单导出、`hucoo-module-agent` 的模板包都要写对象存储。若把 S3 SDK 写在业务模块里，其它模块只能反向依赖 `hucoo-module-file`，违反"业务模块之间禁止直接依赖"。
2. **可替换**：驱动切换（RustFS ↔ 本地 ↔ 未来 OSS）是配置项，不应触发业务代码改动。
3. **与既有代码一致**：`hucoo-component-cache`（Redis/Caffeine 抽象）、`hucoo-component-database`（MyBatis-Plus 抽象）都是这个形态，组件只经 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 激活，不参与组件扫描。

> 命名说明：若团队更希望组件名带 "file"，把 `hucoo-component-storage` 改名为 `hucoo-component-file` 即可，包名与职责划分不变。

### 2.2 依赖与边界

```text
hucoo-application-admin
  ├── hucoo-module-file ──► hucoo-component-storage ──► hucoo-commons-{api,dto,exception,util}
  │                     └─► hucoo-component-{web,security,database,observability}
  └── hucoo-component-storage（无需直接依赖，仅由模块传递引入）
```

- `hucoo-component-storage` 只依赖 `hucoo-commons-*` + AWS SDK v2 + Spring Boot 基础能力，**不依赖任何 module**。
- `hucoo-module-file` 不依赖任何其它 module；需要别的模块参与时走 `hucoo-commons-api` 里的端口接口（详见第 6 节），这与既有的 `AuditEventPublisher` 是同一套做法。
- 跨模块对外契约：`hucoo-module-file` 在 `api/` 暴露 `FileObjectFacade`，其它模块只依赖该 Facade 接口。

### 2.3 存储驱动选型

| 驱动 | `type` 取值 | 场景 | 预签名 | 分片 | 说明 |
| --- | --- | --- | --- | --- | --- |
| S3 兼容 | `s3` | 生产默认；RustFS / MinIO / AWS S3 / OSS | ✅ | ✅ | 唯一支持多实例共享与浏览器直传的方案 |
| 本地文件系统 | `local` | 本地开发、单机部署、离线演示 | ⚠️ 由后端签名代理替代 | ✅（临时分片目录） | **不可多实例共享**，见第 10 节风险 |
| 内存 | `memory` | 单元测试 / 契约测试 | ❌ | ⚠️ | 仅供测试，禁止在生产 profile 启用 |

RustFS 侧已核实的关键事实（用于配置默认值，来源见 [RustFS 官方文档](https://docs.rustfs.com/en/reference/s3-compatibility)）：

- S3 API 默认端口 `9000`（`RUSTFS_ADDRESS`），控制台默认 `9001`（`RUSTFS_CONSOLE_ADDRESS`），健康检查 `GET /health`。
- 默认凭证 `rustfsadmin / rustfsadmin`，官方明确要求首次部署后修改；生产应使用 IAM 用户/服务账号，不要用 root 凭证。
- 支持 SigV4、**path-style 寻址（默认）**、分片上传（create/upload/complete/abort）、**预签名 GET / PUT**、bucket policy、versioning、Object Lock、CORS、`ListObjectsV2`。
- **不支持 ACL 授权**（XML grant 返回 `NotImplemented`），权限用 IAM + bucket policy；bucket access logging、ownership controls 仍为计划中。
- 加密（SSE）对象格式在 RustFS 内外**不可移植**，跨实现迁移需先解密；默认设计不启用 SSE。
- 无官方 Java SDK，官方推荐直接用 **AWS SDK for Java v2**，并给出 `.endpointOverride(...)` + `.forcePathStyle(true)` + `Region.US_EAST_1` 的标准写法。
- 版本：Apache 2.0，1.0.0 GA（2026-09-16），最新 1.0.1。

## 3. `hucoo-component-storage` 设计

### 3.1 包结构

```text
hucoo-component/hucoo-component-storage/
├── pom.xml
└── src/main/
    ├── java/dev/hucoo/component/storage/
    │   ├── StorageClient.java                 # 驱动 SPI（唯一对外主接口）
    │   ├── StorageCapabilities.java           # 能力矩阵（presign/multipart/list...）
    │   ├── StorageObjectMetadata.java         # size/contentType/etag/lastModified
    │   ├── StorageListResult.java             # 列举结果 + nextToken，内含 StorageObjectSummary
    │   ├── StoragePutRequest.java             # key/contentType/size/metadata
    │   ├── StorageMultipartInit.java          # 分片初始化入参
    │   ├── StoragePartRef.java                # (partNumber, etag)
    │   ├── StoragePartResult.java
    │   ├── PresignedUrl.java                  # url/expiresAt/method/headers
    │   ├── StorageErrorCode.java              # 300xxx，implements ErrorCode
    │   ├── StorageException.java              # extends BusinessException
    │   ├── config/
    │   │   ├── StorageProperties.java         # agent-platform.storage.*
    │   │   ├── StorageAutoConfiguration.java
    │   │   └── StorageHealthIndicator.java    # /actuator/health -> storage
    │   ├── s3/
    │   │   ├── S3StorageProperties.java
    │   │   ├── S3StorageConfiguration.java    # S3Client / S3Presigner Bean
    │   │   └── S3StorageClient.java
    │   └── local/
    │       ├── LocalStorageProperties.java
    │       ├── LocalStoragePathResolver.java  # key -> 绝对路径 + 越权防护
    │       └── LocalStorageClient.java
    ├── java/dev/hucoo/component/storage/memory/InMemoryStorageClient.java
    └── resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
```

`AutoConfiguration.imports` 只写一行：

```text
dev.hucoo.component.storage.config.StorageAutoConfiguration
```

### 3.2 SPI 契约

驱动差异全部收敛在这个接口后面，业务模块只认它：

```java
package dev.hucoo.component.storage;

import java.io.InputStream;
import java.io.OutputStream;
import java.time.Duration;
import java.util.List;

public interface StorageClient {

    /** 驱动标识：s3 / local / memory */
    String provider();

    /** 能力矩阵，供上层决定 UI 与降级策略 */
    StorageCapabilities capabilities();

    void put(StoragePutRequest request, InputStream content);

    StorageObjectMetadata stat(String bucket, String key);

    boolean exists(String bucket, String key);

    /** 调用方负责关闭返回的流 */
    InputStream get(String bucket, String key);

    /** 流式落到调用方提供的 OutputStream（下载代理用，避免中间缓冲） */
    void get(String bucket, String key, OutputStream target);

    void delete(String bucket, String key);

    /** 列举对象；nextToken 为空表示没有更多数据 */
    StorageListResult list(String bucket, String prefix, String continuationToken, int limit);

    PresignedUrl presignGet(String bucket, String key, Duration ttl, String downloadFileName);

    PresignedUrl presignPut(String bucket, String key, Duration ttl, String contentType);

    // ---- 分片上传（本地驱动用临时分片目录实现，语义与 S3 一致）----
    String initMultipart(StorageMultipartInit request);

    StoragePartResult uploadPart(String bucket, String key, String uploadId,
                                 int partNumber, InputStream content, long contentLength);

    StorageObjectMetadata completeMultipart(String bucket, String key, String uploadId,
                                            List<StoragePartRef> parts);

    void abortMultipart(String bucket, String key, String uploadId);

    /** 确保 bucket 存在（默认空实现，S3 驱动会 headBucket/createBucket） */
    default void ensureBucket(String bucket) {
    }

    /** 删除 bucket，仅维护任务使用；默认抛"驱动不支持" */
    default void deleteBucket(String bucket) {
        throw new StorageException(StorageErrorCode.STORAGE_OPERATION_UNSUPPORTED, "当前驱动不支持");
    }
}
```

驱动契约测试位于 `hucoo-component-storage/src/test/java/.../StorageClientContract.java`：
新增驱动继承它即可获得同一份断言（put/stat/get/delete/list/分片/能力声明）。

```java
public record StorageCapabilities(boolean presignedGet,
                                  boolean presignedPut,
                                  boolean multipart,
                                  boolean listing,
                                  boolean versioning) {

    public static final StorageCapabilities S3 =
            new StorageCapabilities(true, true, true, true, false);

    public static final StorageCapabilities LOCAL =
            new StorageCapabilities(false, false, true, true, false);
}
```

约定：

- **不吞异常**。所有失败抛 `StorageException`（`extends BusinessException`），由 `component-web` 的 `GlobalExceptionHandler` 统一映射 HTTP 状态，业务模块不需要逐个 catch。
- **不接受 `byte[]`**。所有写入/读取都是流式；分片上传的 `contentLength` 必填，长度未知时由上层先落临时文件。
- **key 由调用方给出**，组件不做命名策略（命名属于业务规则，放在 `hucoo-module-file` 的领域服务里）。

### 3.3 S3 驱动

```java
@Bean(destroyMethod = "close")
@ConditionalOnMissingBean
public S3Client s3Client(S3StorageProperties p) {
    return S3Client.builder()
            .endpointOverride(URI.create(p.getEndpoint()))
            .region(Region.of(p.getRegion()))                       // RustFS 默认 us-east-1
            .credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(p.getAccessKey(), p.getSecretKey())))
            .forcePathStyle(true)                                   // 关键：不加会 301
            .httpClientBuilder(ApacheHttpClient.builder()
                    .connectionTimeout(p.getConnectionTimeout())
                    .socketTimeout(p.getSocketTimeout())
                    .maxConnections(p.getMaxConnections()))
            .overrideConfiguration(c -> c
                    .apiCallTimeout(p.getApiCallTimeout())
                    .apiCallAttemptTimeout(p.getApiCallAttemptTimeout()))
            // 关键：S3 兼容实现不认新版 SDK 默认附带的校验和
            .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
            .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
            .chunkedEncodingEnabled(false)                          // 关闭 aws-chunked
            .serviceConfiguration(S3Configuration.builder()
                    .pathStyleAccessEnabled(true)
                    .build())
            .build();
}
```

`S3Presigner` 同样必须开 path-style，否则签出来的 URL 在 RustFS 上 301/403：

```java
@Bean(destroyMethod = "close")
@ConditionalOnMissingBean
public S3Presigner s3Presigner(S3StorageProperties p) {
    return S3Presigner.builder()
            .endpointOverride(URI.create(p.getPublicEndpoint()))     // 对外可达地址，不是容器内网名
            .region(Region.of(p.getRegion()))
            .credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(p.getAccessKey(), p.getSecretKey())))
            .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
            .build();
}
```

要点：

- `endpoint` 用于服务端内部调用，`public-endpoint` 用于签发浏览器可用的 URL；K8s/Compose 内网名与对外域名常常不同，必须分开配置。
- `auto-create-bucket=true` 时由 `StorageBucketInitializer`（`ApplicationRunner`）调用 `headBucket` / `createBucket`，失败只告警不阻塞启动，健康状态由 `StorageHealthIndicator` 暴露。
- 分片上传直接用 `CreateMultipartUpload` / `UploadPart` / `CompleteMultipartUpload` / `AbortMultipartUpload` 低阶 API，不引入 `s3-transfer-manager`（它需要异步客户端，且行为不可控）。
- 上传带 `sha256` 时同时写入对象 user-metadata（`x-amz-meta-sha256`），便于对账巡检。

### 3.4 本地驱动

- 路径映射：`{root}/{bucket}/{key}`，`root` 必须是**绝对路径**。
- 越权防护（`LocalStoragePathResolver`）：拒绝 `..`、绝对路径、Windows 保留名；`normalize()` 后必须 `startsWith(root)`；目标已存在时用 `toRealPath()` 再校验一次，防止符号链接逃逸。
- 原子写：写入同目录 `.{key}.tmp` → `flush` + `FileChannel.force(true)` → `Files.move(..., ATOMIC_MOVE)`；文件权限 `rw-------`，目录 `rwx------`。
- 删除后自底向上清理空目录（遇到 bucket 根目录停止）。
- 分片：临时目录 `{root}/.uploads/{uploadId}/`，分片文件 `{partNumber}.part`；`complete` 时按序流式合并到目标文件（边合并边算 SHA-256）再原子搬迁；`abort`/过期清理整个目录。
- 预签名：本地驱动 `capabilities().presignedGet() == false`；上层降级为**后端签名代理**（第 4.5 节），不是简单报错。

### 3.5 自动配置与开关

```java
@AutoConfiguration
@EnableConfigurationProperties(StorageProperties.class)
@ConditionalOnProperty(prefix = "agent-platform.storage", name = "enabled",
        havingValue = "true", matchIfMissing = true)
public class StorageAutoConfiguration {

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnProperty(prefix = "agent-platform.storage", name = "type", havingValue = "s3")
    @Import({S3StorageConfiguration.class})
    static class S3Enabled { }

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnProperty(prefix = "agent-platform.storage", name = "type", havingValue = "local")
    static class LocalEnabled {
        @Bean @ConditionalOnMissingBean
        StorageClient localStorageClient(LocalStorageProperties p) { return new LocalStorageClient(p); }
    }

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnProperty(prefix = "agent-platform.storage", name = "type", havingValue = "memory")
    static class MemoryEnabled { /* 仅测试 */ }

    @Bean @ConditionalOnMissingBean
    StorageHealthIndicator storageHealthIndicator(StorageClient client, StorageProperties p) {
        return new StorageHealthIndicator(client, p);
    }
}
```

- `enabled=false` 或依赖缺失时，`hucoo-module-file` 的存储相关 Bean 也需要能优雅降级：模块侧用 `ObjectProvider<StorageClient>` 注入，缺失时上传接口返回 `220008 FILE_STORAGE_UNAVAILABLE`，元数据查询仍可用。
- 禁止引入 `spring-boot-starter-web`：组件是纯能力库，`hucoo-gateway-server` 也传递不到它（网关不依赖任何 module）。

### 3.6 错误码

组件内定义自己的错误码枚举，段位 **300xxx** 保留给基础设施组件（不与业务模块段位冲突）：

```java
public enum StorageErrorCode implements ErrorCode {
    STORAGE_OBJECT_NOT_FOUND(300001, "对象不存在", "storage"),
    STORAGE_ACCESS_DENIED(300002, "对象存储拒绝访问", "storage"),
    STORAGE_IO_FAILED(300003, "对象存储读写失败", "storage"),
    STORAGE_UNAVAILABLE(300004, "对象存储不可用", "storage"),
    STORAGE_OPERATION_UNSUPPORTED(300005, "当前存储驱动不支持该操作", "storage"),
    STORAGE_KEY_INVALID(300006, "对象 key 非法", "storage"),
    STORAGE_PAYLOAD_TOO_LARGE(300007, "对象超过存储上限", "storage");
    // ...
}
```

`StorageException extends BusinessException`，因此 `GlobalExceptionHandler` 无需改动即可返回统一 `Result` 信封与正确 HTTP 状态（`STORAGE_OBJECT_NOT_FOUND` → 404，`STORAGE_ACCESS_DENIED` → 403，`STORAGE_UNAVAILABLE` → 503）。

### 3.7 可观测性

- `StorageHealthIndicator`：`stat` 一个哨兵对象（`{prefix}/.health`）判断可用性；`management.health.storage.enabled` 控制开关，默认 `true`。
- Micrometer 指标：`storage_operation_duration_seconds{provider,operation}`、`storage_operation_total{provider,operation,result}`、`storage_bytes_written_total`、`storage_bytes_read_total`。
- 日志：对象 key 可打印（不含租户敏感信息），凭证永不打印；`secret-key` 在配置类 `toString` 中脱敏。

## 4. `hucoo-module-file` 设计

### 4.1 包结构

```text
hucoo-module/hucoo-module-file/
├── pom.xml
└── src/main/java/dev/hucoo/file/
    ├── api/
    │   ├── FileObjectFacade.java              # 跨模块契约（extends ModuleFacade）
    │   └── dto/
    │       ├── FileObjectDTO.java
    │       ├── FileObjectQueryRequest.java
    │       ├── FileObjectUpdateRequest.java
    │       ├── FileUploadSimpleRequest.java
    │       ├── FileMultipartInitRequest.java / FileMultipartInitDTO.java
    │       ├── FileUploadSessionDTO.java / FileUploadPartDTO.java
    │       ├── FileMultipartCompleteRequest.java
    │       ├── FilePresignRequest.java / FilePresignDTO.java
    │       ├── FileShareCreateRequest.java / FileShareDTO.java
    │       ├── FileStorageConfigDTO.java / FileStorageConfigSaveRequest.java
    │       ├── FileCapabilityDTO.java
    │       ├── FileStatisticsDTO.java
    │       └── FileContentDTO.java
    ├── application/
    │   ├── converter/FileObjectConverter.java / FileStorageConfigConverter.java
    │   └── service/
    │       ├── FileObjectApplicationService.java
    │       ├── FileUploadApplicationService.java
    │       ├── FileShareApplicationService.java
    │       ├── FileStorageConfigApplicationService.java
    │       ├── impl/   （@ConditionalOnProperty persistence.enabled=true）
    │       └── mock/   （@ConditionalOnProperty matchIfMissing=true）
    ├── domain/
    │   ├── entity/FileObject.java / FileUploadSession.java / FileUploadPart.java
    │   │        / FileShareToken.java / FileStorageConfig.java
    │   ├── enums/FileStatus.java / FileVisibility.java / UploadSessionStatus.java
    │   │        / StorageProvider.java / FileScanStatus.java
    │   └── service/StorageKeyGenerator.java   # 领域服务：对象 key 生成规则
    ├── infrastructure/
    │   ├── mapper/*.java                       # dev.hucoo.file.infrastructure.mapper（现有 @MapperScan 已覆盖）
    │   └── repository/*.java + *Impl.java
    ├── config/FileModuleConfig.java            # agent-platform.modules.file.*
    ├── job/FileMaintenanceJob.java             # 过期上传会话 / 回收站清理 / 孤儿对象对账
    └── controller/
        ├── FileObjectController.java
        ├── FileUploadController.java
        ├── FileDownloadController.java
        └── FileStorageConfigController.java
```

### 4.2 领域模型与表结构

四张表 + 一张配置表，新增 Flyway 迁移 `V13__file_storage_schema.sql`（沿用现有 DDL 风格：`TIMESTAMP(6)`、`tenant_id VARCHAR(64) DEFAULT '000000'`、`version/deleted`）。

```sql
-- V13__file_storage_schema.sql
CREATE TABLE IF NOT EXISTS ap_file_object (
    id              BIGINT       NOT NULL PRIMARY KEY,
    storage_type    VARCHAR(16)  NOT NULL,                 -- S3 / LOCAL
    bucket_name     VARCHAR(128) NOT NULL,
    object_key      VARCHAR(512) NOT NULL,
    file_name       VARCHAR(255) NOT NULL,                 -- 原始文件名
    display_name    VARCHAR(255),
    extension       VARCHAR(32),
    content_type    VARCHAR(128),
    size_bytes      BIGINT       NOT NULL DEFAULT 0,
    sha256          VARCHAR(64),
    etag            VARCHAR(128),
    visibility      VARCHAR(16)  NOT NULL DEFAULT 'PRIVATE', -- PRIVATE / TENANT / PUBLIC
    status          VARCHAR(16)  NOT NULL DEFAULT 'NORMAL',  -- NORMAL / RECYCLING / PURGED / QUARANTINED
    scan_status     VARCHAR(16)  NOT NULL DEFAULT 'SKIPPED', -- SKIPPED / PENDING / CLEAN / INFECTED
    scan_result     VARCHAR(512),
    biz_type        VARCHAR(64),                           -- AGENT_TEMPLATE / MCP_PACKAGE / PROJECT / BILLING_EXPORT ...
    biz_id          VARCHAR(64),
    owner_id        BIGINT,
    owner_name      VARCHAR(64),
    source          VARCHAR(32),                           -- UPLOAD / IMPORT / GENERATED
    ref_count       INT          NOT NULL DEFAULT 1,
    download_count  BIGINT       NOT NULL DEFAULT 0,
    metadata        TEXT,                                  -- JSON 扩展字段
    expires_at      TIMESTAMP(6),
    last_access_at  TIMESTAMP(6),
    tenant_id       VARCHAR(64)  DEFAULT '000000',
    version         INT          DEFAULT 0,
    deleted         INT          DEFAULT 0,
    created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 逻辑删除下必须用部分唯一索引，否则回收站与同名 key 冲突
CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_file_object_key
    ON ap_file_object (tenant_id, bucket_name, object_key) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_ap_file_object_biz
    ON ap_file_object (tenant_id, biz_type, biz_id);
CREATE INDEX IF NOT EXISTS idx_ap_file_object_sha
    ON ap_file_object (tenant_id, sha256, size_bytes);
CREATE INDEX IF NOT EXISTS idx_ap_file_object_owner
    ON ap_file_object (tenant_id, owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ap_file_object_status
    ON ap_file_object (tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS ap_file_upload_session (
    id                 BIGINT       NOT NULL PRIMARY KEY,
    upload_id          VARCHAR(128) NOT NULL,              -- 对外会话 ID（UUID）
    storage_type       VARCHAR(16)  NOT NULL,
    bucket_name        VARCHAR(128) NOT NULL,
    object_key         VARCHAR(512) NOT NULL,
    external_upload_id VARCHAR(256),                       -- S3 multipartUploadId / 本地临时目录名
    file_name          VARCHAR(255) NOT NULL,
    content_type       VARCHAR(128),
    size_bytes         BIGINT       NOT NULL DEFAULT 0,
    sha256             VARCHAR(64),
    part_size          BIGINT       NOT NULL DEFAULT 8388608,
    part_count         INT          NOT NULL DEFAULT 0,
    uploaded_parts     INT          NOT NULL DEFAULT 0,
    biz_type           VARCHAR(64),
    biz_id             VARCHAR(64),
    visibility         VARCHAR(16),
    file_object_id     BIGINT,
    status             VARCHAR(16)  NOT NULL DEFAULT 'INIT', -- INIT/UPLOADING/MERGING/COMPLETED/ABORTED/EXPIRED
    expires_at         TIMESTAMP(6),
    operator_id        BIGINT,
    operator_name      VARCHAR(64),
    tenant_id          VARCHAR(64)  DEFAULT '000000',
    version            INT          DEFAULT 0,
    deleted            INT          DEFAULT 0,
    created_at         TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_file_upload_session_upload_id
    ON ap_file_upload_session (upload_id) WHERE deleted = 0;

CREATE TABLE IF NOT EXISTS ap_file_upload_part (
    id          BIGINT       NOT NULL PRIMARY KEY,
    upload_id   VARCHAR(128) NOT NULL,
    part_number INT          NOT NULL,
    etag        VARCHAR(128),
    size_bytes  BIGINT       NOT NULL DEFAULT 0,
    checksum    VARCHAR(128),
    tenant_id   VARCHAR(64)  DEFAULT '000000',
    version     INT          DEFAULT 0,
    deleted     INT          DEFAULT 0,
    created_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_file_upload_part
    ON ap_file_upload_part (upload_id, part_number) WHERE deleted = 0;

CREATE TABLE IF NOT EXISTS ap_file_share_token (
    id             BIGINT       NOT NULL PRIMARY KEY,
    token          VARCHAR(128) NOT NULL,
    file_id        BIGINT       NOT NULL,
    mode           VARCHAR(16)  NOT NULL DEFAULT 'DOWNLOAD', -- DOWNLOAD / PREVIEW
    password_hash  VARCHAR(128),
    max_downloads  INT          DEFAULT 0,                   -- 0 = 不限
    download_count INT          NOT NULL DEFAULT 0,
    expires_at     TIMESTAMP(6) NOT NULL,
    status         INT          DEFAULT 1,
    created_by     BIGINT,
    tenant_id      VARCHAR(64)  DEFAULT '000000',
    version        INT          DEFAULT 0,
    deleted        INT          DEFAULT 0,
    created_at     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_file_share_token ON ap_file_share_token (token) WHERE deleted = 0;

CREATE TABLE IF NOT EXISTS ap_file_storage_config (
    id                 BIGINT       NOT NULL PRIMARY KEY,
    config_code        VARCHAR(64)  NOT NULL,
    config_name        VARCHAR(128) NOT NULL,
    provider           VARCHAR(32)  NOT NULL,                -- RUSTFS / MINIO / AWS_S3 / ALIYUN_OSS / LOCAL
    endpoint           VARCHAR(256),
    public_endpoint    VARCHAR(256),
    region             VARCHAR(64),
    bucket_name        VARCHAR(128),
    access_key         VARCHAR(256),
    secret_key         VARCHAR(512),                         -- AES 加密存储，接口永不回显
    path_style_access  BOOLEAN      DEFAULT TRUE,
    local_root         VARCHAR(512),
    max_file_size      BIGINT       DEFAULT 209715200,
    allowed_extensions VARCHAR(1024),
    default_visibility VARCHAR(16)  DEFAULT 'PRIVATE',
    is_default         BOOLEAN      DEFAULT FALSE,
    last_check_at      TIMESTAMP(6),
    last_check_status  VARCHAR(16),
    last_check_message VARCHAR(512),
    status             INT          DEFAULT 1,
    tenant_id          VARCHAR(64)  DEFAULT '000000',
    version            INT          DEFAULT 0,
    deleted            INT          DEFAULT 0,
    created_at         TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

对象 key 规则（`StorageKeyGenerator`，领域服务）：

```text
{prefix}/{tenantId}/{bizType 或 common}/{yyyy}/{MM}/{dd}/{雪花 ID 低字节十六进制}/{雪花 ID}.{ext}

示例：files/000000/PROJECT/2026/10/04/6c/365124159802552684.txt
```

- 日期 + ID 低字节两级散列，避免本地存储单目录文件数过多。
- **散列取自雪花 ID 而不是内容摘要**：上传因此可以单遍流式完成，不需要为了先算出 SHA-256
  而把文件读两遍或先落临时文件；SHA-256 在同一遍里由 `DigestInputStream` 顺带算出并落库。
- key 里**不含原始文件名**，文件名只存 DB，规避路径穿越、编码、超长与保留字问题。
- 文件名与 key 解耦后，重命名只改 `display_name`，不需要移动对象。

### 4.3 接口清单

统一前缀 `/api/admin/v1`，响应统一 `Result<T>` 信封，ID 字段一律字符串（`@JsonSerialize(using = ToStringSerializer.class)` + `@Schema(type = "string")`）。

**下表标注了落地状态：`✅` 为 P0 已实现并已导出到 `doc/openapi.json`，`⬜` 为 P1/P2 规划中（接口尚不存在）。**
P0 共 10 个操作：`GET /files`、`GET /files/storage/capabilities`、`GET|PATCH|DELETE /files/{id}`、
`POST /files/{id}/restore`、`GET /files/{id}/url`、`POST /files/uploads`、
`GET /files/{id}/content`、`GET /files/download/{token}`。

**文件元数据** `FileObjectController`

| 方法 | 路径 | 说明 | 权限点 |
| --- | --- | --- | --- |
| GET | `/files` | 分页查询（keyword/extension/bizType/bizId/ownerId/status/时间范围） | `file:read` |
| GET | `/files/{id}` | 详情 | `file:read` |
| PATCH | `/files/{id}` | 重命名 / 可见性 / 标签 / 业务绑定 | `file:update` |
| POST | `/files/check` | 秒传校验（sha256 + size） | `file:upload` |
| DELETE | `/files/{id}` | 移入回收站（软删 + 延迟物理删除） | `file:delete` |
| POST | `/files/{id}/restore` | 回收站还原 | `file:update` |
| POST | `/files/{id}/purge` | 物理删除（**异步**，返回 `AsyncJobDTO`） | `file:purge` |
| POST | `/files/batch/delete` | 批量删除（**异步**） | `file:delete` |
| GET | `/files/statistics` | 存储用量统计（按类型/状态/时间） | `file:read` |

**上传** `FileUploadController`

| 方法 | 路径 | 说明 | 权限点 |
| --- | --- | --- | --- |
| POST | `/files/uploads` | 简单上传（`multipart/form-data`，≤ `simple-threshold`） | `file:upload` |
| POST | `/files/uploads/multipart` | 初始化分片上传 | `file:upload` |
| GET | `/files/uploads/{uploadId}` | 会话与已传分片（断点续传） | `file:upload` |
| PUT | `/files/uploads/{uploadId}/parts/{partNumber}` | 上传分片（body 为二进制流） | `file:upload` |
| POST | `/files/uploads/{uploadId}/complete` | 合并完成 | `file:upload` |
| DELETE | `/files/uploads/{uploadId}` | 取消上传并释放存储 | `file:upload` |
| POST | `/files/uploads/{uploadId}/presign-parts` | 分片直传预签名（S3 专属，P2） | `file:upload` |
| POST | `/files/uploads/presign` | 整体直传预签名（S3 专属，P2） | `file:upload` |
| POST | `/files/uploads/{fileId}/confirm` | 直传确认回执（S3 专属，P2） | `file:upload` |

**下载与分享** `FileDownloadController`

| 方法 | 路径 | 说明 | 权限点 |
| --- | --- | --- | --- |
| GET | `/files/{id}/content` | 服务端流式下载 | `file:download` |
| HEAD | `/files/{id}/content` | 下载元信息（大小 / ETag / MIME） | `file:download` |
| GET | `/files/{id}/url` | 获取下载直链（S3 预签名 / 本地签名代理） | `file:download` |
| POST | `/files/{id}/shares` | 创建分享链接 | `file:share` |
| GET | `/files/{id}/shares` | 分享列表 | `file:read` |
| DELETE | `/files/shares/{shareId}` | 撤销分享 | `file:share` |
| GET | `/files/download/{token}` | **匿名**分享/签名下载入口 | 无（token 即凭证） |

**存储配置** `FileStorageConfigController`（全局 `/files/storage/*` 命名空间避免与业务动作冲突）

| 方法 | 路径 | 说明 | 权限点 |
| --- | --- | --- | --- |
| GET | `/files/storage/capabilities` | 当前驱动能力矩阵（前端据此决定是否显示直传 UI） | `file:storage:read` |
| GET | `/files/storage/configs` | 配置列表（`secretKey` 脱敏） | `file:storage:read` |
| POST | `/files/storage/configs` | 新建配置 | `file:storage:manage` |
| PATCH | `/files/storage/configs/{id}` | 修改配置 | `file:storage:manage` |
| DELETE | `/files/storage/configs/{id}` | 删除配置 | `file:storage:manage` |
| POST | `/files/storage/configs/{id}/test` | 连通性测试（**异步**：headBucket + 写入/读取/删除哨兵对象） | `file:storage:test` |
| POST | `/files/storage/configs/{id}/activate` | 设为默认存储 | `file:storage:manage` |
| POST | `/files/storage/sweep` | 存储对账（**异步**：孤儿对象 / 丢失对象） | `file:storage:manage` |

错误码新增到 `CommonErrorCode`（段位 **220xxx**，紧接审批的 210xxx）：

```java
FILE_NOT_FOUND(220001, "文件不存在", "file"),
FILE_TOO_LARGE(220002, "文件超过大小限制", "file"),
FILE_TYPE_NOT_ALLOWED(220003, "文件类型不允许上传", "file"),
FILE_UPLOAD_SESSION_NOT_FOUND(220004, "上传会话不存在或已过期", "file"),
FILE_UPLOAD_INCOMPLETE(220005, "上传分片不完整", "file"),
FILE_STORAGE_ERROR(220006, "文件存储操作失败", "file"),
FILE_STORAGE_CONFIG_NOT_FOUND(220007, "存储配置不存在", "file"),
FILE_STORAGE_UNAVAILABLE(220008, "文件存储不可用", "file"),
FILE_QUOTA_EXCEEDED(220009, "文件配额已超限", "file"),
FILE_SHARE_EXPIRED(220010, "分享链接已失效", "file"),
FILE_OPERATION_NOT_ALLOWED(220011, "当前文件状态不允许该操作", "file"),
FILE_STORAGE_CAPABILITY_UNSUPPORTED(220012, "当前存储驱动不支持该能力", "file"),
FILE_QUARANTINED(220013, "文件未通过安全检查，暂不可下载", "file");
```

### 4.4 上传流程

三条路径，**默认走服务端代理**，保证 `s3` 与 `local` 两种驱动下前端行为完全一致；直传作为 S3 专属优化后置。

**A. 简单上传（默认，≤ `simple-threshold`，建议 8 MB）**

```text
客户端 --POST /files/uploads (multipart/form-data)--> 服务端
  1. 认证 + file:upload 权限
  2. 策略校验：扩展名白名单/黑名单、content-type、单文件大小、租户配额
  3. 流式拷贝 + 同时计算 SHA-256（DigestInputStream，不落内存）
  4. 秒传判断（可选）：同租户同 bizType 下 (sha256,size) 命中且状态 NORMAL → 复用 object_key，ref_count+1
  5. 未命中 → storageClient.put(...)，key 由 StorageKeyGenerator 生成
  6. 落库 ap_file_object(status=NORMAL, scan_status=PENDING)
  7. 发布审计事件 + 用量事件
  8. 返回 FileObjectDTO
```

**B. 分片上传（> 阈值，或网络不稳定场景）**

```text
POST /files/uploads/multipart   { fileName, sizeBytes, contentType, sha256?, bizType, bizId }
  → 建会话；S3: CreateMultipartUpload；LOCAL: 建 {root}/.uploads/{uploadId}/
  → { uploadId, objectKey, partSize, partCount, uploadedParts: [] }

PUT /files/uploads/{uploadId}/parts/{partNumber}   （body: 二进制流，Content-Length 必填）
  → S3: UploadPart 取 ETag；LOCAL: 写 {partNumber}.part
  → { partNumber, etag, sizeBytes }

GET /files/uploads/{uploadId}      → 已传分片列表（断点续传 / 换网络后重连）

POST /files/uploads/{uploadId}/complete   { parts: [{partNumber, etag}] }
  → S3: CompleteMultipartUpload；LOCAL: 按序流式合并 + 原子 move
  → 落库 ap_file_object，返回 FileObjectDTO

DELETE /files/uploads/{uploadId}   → abort + 清理；过期会话由 FileMaintenanceJob 兜底
```

**C. 浏览器直传（S3 专属，P2，默认关闭）**

```text
POST /files/uploads/presign  → { fileId, bucket, objectKey, uploadUrl, method, headers, expiresAt }
浏览器 --PUT uploadUrl--> RustFS（不经应用，需 RustFS 侧配 CORS 白名单）
POST /files/uploads/{fileId}/confirm  → 校验 stat() 存在与大小一致 → 落库 NORMAL
```

直传开关：`agent-platform.modules.file.direct-upload-enabled`（默认 `false`）。
`local` 驱动时 `POST /files/uploads/presign` 直接返回 `220012 FILE_STORAGE_CAPABILITY_UNSUPPORTED`，前端先用 `/files/storage/capabilities` 判断。

### 4.5 下载流程

| 模式 | 路径 | 适用 | 说明 |
| --- | --- | --- | --- |
| 代理 | `GET /files/{id}/content` | 默认，两种驱动一致 | 服务端流式转发，可做权限、DLP、水印、下载审计 |
| 直链 | `GET /files/{id}/url` | S3 驱动 / 大文件 | 返回预签名 URL，`ttl` 默认 600s，可配 CDN `public-endpoint` |
| 分享 | `GET /files/download/{token}` | 匿名外发 | 本地驱动同样可用：后端 HMAC 签名代理 |

**本地驱动的签名代理**：`GET /files/{id}/url` 在 `local` 时返回后端地址
`/api/admin/v1/files/download/{token}`，token 形如 `{fileId}.{expEpoch}.{hmacSha256Base64Url(fileId + exp, jwtSecret)}`，用现成的 `CryptoUtil.hmacSha256Base64Url` / `CryptoUtil.secureEquals` 生成与校验。匿名端点必须自行完成：签名校验 → 过期校验 → 文件状态校验（`QUARANTINED`/`RECYCLING`/`PURGED` 一律拒绝）→ 计数。

> ⚠️ **下载端点的返回类型硬约束**：`hucoo-component-web` 的 `ResponseWrapper` 会包装所有 `dev.hucoo` 包下非 `void / String / byte[] / Resource` 的返回类型。因此流式下载方法必须声明为 **`Resource`**（不是 `ResponseEntity<Resource>`，其 `getParameterType()` 是 `ResponseEntity`，会被包装成 `Result` 导致二进制损坏）。响应头通过注入 `HttpServletResponse` 设置：

```java
@GetMapping("/{id}/content")
@RequirePermission("file:download")
public Resource download(@PathVariable Long id, HttpServletResponse response) {
    FileDownloadResource file = fileObjectApplicationService.openContent(id);   // 内部已做权限与状态校验
    response.setContentType(file.contentType());
    response.setContentLengthLong(file.size());
    response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(file.fileName(), StandardCharsets.UTF_8).build().toString());
    return file.resource();   // InputStreamResource / 本地 FileSystemResource
}
```

同时需要在 `WebMvcConfig#addCorsMappings` 的 `exposedHeaders` 中补 `Content-Disposition`、`Content-Length`，否则前端用 XHR 拿不到文件名。

> 如果后续需要 206（Range 断点续传）或 302（重定向到直链）这类必须由 `ResponseEntity` 控制状态码的场景，需要在 `ResponseWrapper.supports` 的排除列表里补 `ResponseEntity`，并自行保证业务接口仍返回 `Result` 信封。P0 先用 `Resource` + `HttpServletResponse` 的写法，不动公共组件。

> SDK 版本提示：`.chunkedEncodingEnabled(false)` 在 AWS SDK v2 ≥ 2.30 迁到了客户端 builder 上（原先只在 `S3Configuration`，已废弃）；本文按 `aws-sdk-java.version = 2.55.11` 编写，降级 SDK 版本时需改回 `S3Configuration.builder().chunkedEncodingEnabled(false)`。

匿名端点还有个租户上下文陷阱：无 token 时 `CurrentTenantContext` 取默认值 `000000`，而 `ap_file_*` 表受 `TenantLineInnerInterceptor` 过滤。因此匿名下载的**读与写**都要走专用 Mapper 方法并加 `@InterceptorIgnore(tenantLine = "true")`：

- 查询：`selectByIdIgnoreTenant`；
- 计数：`incrementDownloadCountIgnoreTenant`（否则带租户条件的 UPDATE 会静默更新 0 行）；
- 审计：`FileAuditSupport.publish(..., tenantId)` 显式传入文件记录自身的租户，不能用上下文的系统租户，
  否则跨租户的分享下载会被记到 `000000` 名下。

租户归属由签名 token 保证：token 的 HMAC 覆盖 `fileId + 过期时间`，服务端校验签名后才按 id 取数，
调用方无法通过篡改 id 访问其他租户的文件。

### 4.6 生命周期与对账

| 任务 | 触发 | 行为 |
| --- | --- | --- |
| 过期上传会话清理 | `@Scheduled`（默认每小时） | `status IN (INIT, UPLOADING)` 且 `expires_at < now` → abort 存储侧上传 + 标记 `EXPIRED` |
| 回收站清理 | `@Scheduled`（默认每天） | `status=RECYCLING` 且 `updated_at < now - retention-days` → 删对象 + `status=PURGED` |
| 孤儿对象对账 | 手动 `POST /files/storage/sweep`（异步） | 列桶 → 与 `ap_file_object` 比对：对象存在但无 DB 记录且 mtime > 24h → 报告（`dry-run` 默认 `true`）；DB 有记录但对象缺失 → 标记 `BROKEN` 并告警 |
| 到期文件 | 同回收站任务 | `expires_at < now` 且配置允许 → 自动移入回收站 |

对账的必要性：`put` 成功而 DB 写入失败会留下孤儿对象；`delete` 失败会留下"已删除记录仍占空间"。两者都必须可巡检、可重放。

### 4.7 安全与多租户

- **租户隔离**：DB 层由 `TenantLineInnerInterceptor` 自动加 `tenant_id`；对象 key 前缀同样带 `tenantId`，双保险。跨租户访问一律 403（`assertTenantHeader` 已覆盖）。
- **上传策略**：扩展名黑名单优先于白名单（黑名单默认 `exe, dll, so, sh, bat, cmd, jar, jsp, php`）；`content-type` 与扩展名不一致时以扩展名判定；禁止 `..`、绝对路径、控制字符文件名。
- **配额**：单文件（`max-file-size`，默认 200 MB）、租户总量与文件数（`agent-platform.modules.file.tenant-quota-*`），超限返回 `220009`。
- **下载审计**：`file:download` 与匿名分享下载都写审计事件（操作者、文件、大小、结果、客户端 IP、Trace ID），通过 `AuditEventPublisher` 发布，不直接依赖 audit 模块。
- **病毒扫描钩子**：`FileScanHook` 端口（`hucoo-commons-api`），默认实现直接置 `SKIPPED`；接入 ClamAV 后上传完成置 `PENDING`，扫描通过才允许下载，未通过置 `QUARANTINED` → `220013`。
- **敏感文件保护**：`FileAccessPolicyPort` 端口，由 `hucoo-module-security` 提供实现（扩展名/IP/大小/水印策略）；缺失时默认放行。
- **存储凭证**：`ap_file_storage_config.secret_key` 用 `CryptoUtil` 加密存储，DTO 只返回 `secretKeyMasked`（如 `****abcd`），任何接口都不回显明文。

### 4.8 Mock / 持久化双实现

沿用既有模式（`agent-platform.persistence.enabled`）：

- `MockFileObjectApplicationService`（`havingValue="false", matchIfMissing=true`）：元数据放 `ConcurrentHashMap` 并 seed 3 条示例；**内容仍真实写入 `StorageClient`**，这样 `test` profile 下（`storage.type=local`, root 指向 `target/`）上传下载是端到端可跑的，切换 `persistence.enabled=true` 不需要改前端。
- `FileObjectApplicationServiceImpl`（`havingValue="true"`）：`ServiceImpl<FileObjectMapper, FileObject>` + Repository，与 `hucoo-module-project` 的写法一致。
- 分片会话同理双实现；Mock 下的分片表用内存 Map。

## 5. 配置清单

`hucoo-component-storage`（组件前缀，与 `agent-platform.cache` 对齐）：

```yaml
agent-platform:
  storage:
    enabled: true
    type: s3                      # s3 | local | memory（memory 仅测试）
    default-bucket: hucoo-files
    key-prefix: files
    simple-upload-threshold: 8MB  # 超过走分片
    part-size: 8MB
    max-file-size: 200MB
    presign-ttl: 10m
    auto-create-bucket: true
    s3:
      endpoint: ${HUCOO_S3_ENDPOINT:http://127.0.0.1:9000}       # 服务端内网调用
      public-endpoint: ${HUCOO_S3_PUBLIC_ENDPOINT:http://127.0.0.1:9000}  # 签发给浏览器的地址
      region: ${HUCOO_S3_REGION:us-east-1}
      access-key: ${HUCOO_S3_ACCESS_KEY}
      secret-key: ${HUCOO_S3_SECRET_KEY}
      path-style-access: true     # RustFS 必须 true
      connection-timeout: 3s
      socket-timeout: 60s
      api-call-timeout: 120s
      max-connections: 64
    local:
      root: ${HUCOO_FILE_LOCAL_ROOT:./data/files}   # 生产必须写绝对路径
      create-dirs: true
```

`hucoo-module-file`（模块前缀，与 `agent-platform.modules.project` 对齐）：

```yaml
agent-platform:
  modules:
    file:
      enabled: true
      direct-upload-enabled: false       # 浏览器直传（S3 专属）
      dedup-enabled: true                # 秒传
      download-audit-enabled: true
      recycle-retention-days: 30
      upload-session-ttl-minutes: 1440
      tenant-quota-bytes: 107374182400   # 100 GB
      tenant-quota-files: 100000
      allowed-extensions: [pdf, doc, docx, xls, xlsx, ppt, pptx, txt, md, csv, json,
                           yaml, yml, xml, zip, tar, gz, png, jpg, jpeg, gif, svg, mp4, log]
      blocked-extensions: [exe, dll, so, sh, bat, cmd, jar, jsp, php]
```

Servlet 侧（`hucoo-application-admin/application.yml`，缺一不可）：

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 200MB
      max-request-size: 210MB
      file-size-threshold: 2MB     # 超过则落磁盘临时文件，避免堆内存暴涨
server:
  tomcat:
    max-swallow-size: 210MB        # 否则中断上传会报 connection reset
management:
  health:
    storage:
      enabled: true
```

**两层限额的关系**（实测确认）：

- `spring.servlet.multipart.max-file-size` 是硬闸门。超限请求在进入业务代码前就被 Tomcat/Spring 拒绝，
  由 `component-web` 的 `GlobalExceptionHandler` 统一转成 **HTTP 413 + 平台错误码 `413 PAYLOAD_TOO_LARGE`**
  （"上传内容超过大小限制"）；若不加这个 handler，前端拿到的是框架原文 `Maximum upload size exceeded`。
- `agent-platform.modules.file.max-file-size` 是业务闸门，应用层校验，返回 **`220002 FILE_TOO_LARGE`**。
  按当前配置两者都是 200MB，因此实际上总是前者先触发；只有把模块限额配得更小时才会看到 220002。
- 上传中断（客户端提前断开）依赖 `server.tomcat.max-swallow-size`，否则连接被重置而不是返回正常错误。

各 profile 差异：

| profile | `storage.type` | `local.root` | 说明 |
| --- | --- | --- | --- |
| `test` | `local` | `${java.io.tmpdir}/hucoo-file-test` | 契约导出与 `AdminApplicationTests` 零外部依赖 |
| `dev` | `local` | `./data/files` | 本地开发不依赖 RustFS |
| `prod` | `s3` | — | 生产必须用对象存储（多实例共享） |

## 6. 与其他模块协作

模块之间不直接依赖，统一走 `hucoo-commons-api` 的端口/事件（与既有 `AuditEventPublisher` 同一模式）：

| 协作方 | 契约（定义在 `hucoo-commons-api`） | 方向 |
| --- | --- | --- |
| `hucoo-module-audit` | `AuditEventPublisher`（已存在） | file → 事件 |
| `hucoo-module-security` | `FileAccessPolicyPort`（新增），security 提供实现，file 注入 `ObjectProvider` | security → file（实现注入） |
| `hucoo-module-billing` | `FileUsageEventPublisher`（新增：字节数、下载次数） | file → 事件 |
| `hucoo-module-agent` / `tool-mcp` / `project` / `billing` | `hucoo-module-file` 的 `FileObjectFacade`（`api/` 包） | 其它模块 → file |
| `hucoo-component-web` | `WebMvcConfig` 暴露 `Content-Disposition` 头 | 组件改动 |
| `hucoo-gateway-server` | 无改动（路由已覆盖 `/api/admin/**`；注意 API_CONTRACT.md 记录的 `StripPrefix` 层数问题仍存在） | — |

`FileObjectFacade` 对外只暴露业务方需要的少数方法：

```java
public interface FileObjectFacade extends ModuleFacade {

    /** 由其它模块登记一个已落存储的文件（如 Agent 模板包、账单导出） */
    FileObjectDTO register(FileRegisterCommand command);

    FileObjectDTO getDto(Long id);

    /** 业务对象撤销时释放引用（ref_count-1，为 0 时进回收站） */
    void releaseByBiz(String bizType, String bizId);

    PageResult<FileObjectDTO> pageByBiz(String bizType, String bizId, long page, long pageSize);

    @Override
    default String moduleName() {
        return "hucoo-module-file";
    }
}
```

## 7. 本地开发与部署

`docker-compose.yml`（仓库根）追加 RustFS 服务。注意官方镜像以非 root `rustfs`（UID/GID `10001`）运行，bind mount 需要先 chown：

```yaml
  rustfs-perms:
    image: alpine:3.20
    container_name: rustfs-perms
    command: chown -R 10001:10001 /data
    volumes:
      - ./rustfs-data:/data
    restart: "no"

  rustfs:
    image: rustfs/rustfs:1.0.1
    container_name: rustfs
    depends_on:
      rustfs-perms:
        condition: service_completed_successfully
    command: ["/data"]
    environment:
      - RUSTFS_ACCESS_KEY=${RUSTFS_ACCESS_KEY:-hucoo-local-ak}     # 不要用默认 rustfsadmin
      - RUSTFS_SECRET_KEY=${RUSTFS_SECRET_KEY:-hucoo-local-sk}
      - RUSTFS_ADDRESS=:9000
      - RUSTFS_CONSOLE_ADDRESS=:9001
      - RUSTFS_CONSOLE_ENABLE=true
      - RUSTFS_REGION=us-east-1
      - RUSTFS_OBS_LOGGER_LEVEL=error
    ports:
      - "9000:9000"     # S3 API
      - "9001:9001"     # 控制台
    volumes:
      - ./rustfs-data:/data
    healthcheck:
      test: ["CMD", "curl", "--fail", "http://localhost:9000/health"]   # 官方文档给出的探活地址；镜像内是否自带 curl 需实测，缺失则改为 TCP 探测
      interval: 10s
      timeout: 3s
      retries: 5
```

运维要点：

- 生产**不要**用 root 的 `rustfsadmin`，在控制台建 IAM 用户并只授予该 bucket 的读写策略（RustFS 不支持 ACL 授权，只能用 IAM + bucket policy）。
- 不启用 SSE：RustFS 的加密对象格式不跨实现可移植，且需要 KMS 配置；传输层用 HTTPS/TLS（`RUSTFS_TLS_PATH`）。
- 预签名 URL 的 host 必须与 `public-endpoint` 一致（RustFS 要求签名与访问的 host/scheme/port/region/path 完全一致），走网关或域名时不要用容器内网名。
- 直传模式下需在 RustFS 配置 bucket CORS（允许来源、`PUT`、`Content-Type` 等头）。

存储配置初始化：首次启动由 `StorageBucketInitializer` 建桶；RustFS 控制台（`http://localhost:9001`）可用于人工核对对象。

## 8. 测试策略

| 层次 | 用例 | 依赖 |
| --- | --- | --- |
| ✅ 组件单测 | `LocalStoragePathResolverTest`（`..`、绝对路径、控制字符、bucket 非法、符号链接逃逸、根目录尚不存在） | 无 |
| ✅ 组件契约测试 | `StorageClientContract`：同一套 9 条断言分别跑 `InMemoryStorageClient`、`LocalStorageClient`、`S3StorageClient`，覆盖 put/stat/get/delete/list/分片/能力声明 | 前两个无依赖；S3 需 Docker |
| ⏸ S3 真机契约测试 | `S3StorageClientContractTest`（Testcontainers + RustFS 1.0.1，默认跳过）：<br>`HUCOO_S3_CONTRACT_TEST=true ./mvnw -pl hucoo-component/hucoo-component-storage test` | Docker |
| ✅ 模块单测 | `StorageKeyGeneratorTest`（key 规则、脱敏、非法扩展名回落）、`FileModulePropertiesTest`（黑白名单优先级） | 无 |
| ✅ 模块 API 测试 | `FileApiTests`（test profile + Mock 持久化 + 本地驱动）：上传/列表/下载/重命名/回收站/还原、被拦扩展名、签名链接与篡改拒绝、能力矩阵、404 | 无 |
| ⬜ 模块集成测试 | 继承 `BaseIntegrationTest`（Testcontainers PostgreSQL）跑真实落库与租户隔离 | Docker（P1） |
| ✅ 契约导出 | `./scripts/export-openapi.sh`：163 路径 / 237 操作 / 167 schema，`doc/ENDPOINTS.md` 同步刷新 | 无 |

组件契约测试是这套设计的关键保障：**两种驱动必须满足同一份契约**，否则"支持本地存储"会在上线后变成一堆 `if (local)` 分支。

## 9. 落地步骤与改动清单

### 阶段划分

| 阶段 | 内容 | 产出 |
| --- | --- | --- |
| ✅ P0 组件 | `hucoo-component-storage`：SPI + 本地驱动 + S3 驱动 + 内存驱动 + 自动配置 + 健康检查 + 契约测试 | 25 个用例通过，全量 `./mvnw test` 绿 |
| ✅ P0 模块 | `hucoo-module-file`：V13 表结构 + 元数据 CRUD/回收站 + 简单上传 + 代理/签名下载 + Mock/持久化双实现 + 审计 | 上传下载端到端可用（`FileApiTests` 5 个用例 + 手工 curl 验证） |
| ⬜ P1 治理 | 分片上传 API 与断点续传、分享链接管理、回收站定时清理、租户配额、存储配置管理、孤儿对象对账 | 生产可用 |
| ⬜ P2 优化 | 浏览器直传（预签名）、秒传、CDN `public-endpoint`、病毒扫描与 DLP 接入、用量接入计费 | 体验与治理增强 |

### 需要改动的既有文件（除新增模块目录外）

| 文件 | 改动 |
| --- | --- |
| `pom.xml` | `<properties>` 加 `aws-sdk-java.version`；`dependencyManagement` 加 `software.amazon.awssdk:bom` import + `hucoo-component-storage` / `hucoo-module-file` 条目 |
| `hucoo-dependencies-bom/pom.xml` | 同步加 AWS SDK BOM 与两个内部制品 |
| `hucoo-component/pom.xml` | `<modules>` 加 `hucoo-component-storage` |
| `hucoo-module/pom.xml` | `<modules>` 加 `hucoo-module-file` |
| `hucoo-server/hucoo-application-admin/.../AdminApplication.java` | `scanBasePackages` 加 `dev.hucoo.file`（Mapper 已被现有 `@MapperScan("dev.hucoo.**.infrastructure.mapper")` 覆盖，无需改） |
| `application.yml` | 加 `agent-platform.storage.*`、`agent-platform.modules.file.*`、`spring.servlet.multipart.*`、`server.tomcat.max-swallow-size`、`management.health.storage.enabled` |
| `application-dev.yml` / `application-test.yml` | `storage.type=local` + `local.root` |
| `application-prod.yml` | `storage.type=s3` + 凭证从环境注入 |
| `db/migration/V13__file_storage_schema.sql` | 新增 5 张表（见 4.2） |
| `docker-compose.yml` | 追加 RustFS 服务（见第 7 节） |
| `hucoo-component-web` `WebMvcConfig.java` | `exposedHeaders` 补 `Content-Disposition`、`Content-Length` |
| `hucoo-commons-exception` `CommonErrorCode.java` | 追加 `FILE_*` 220001–220013 |
| `doc/API_CONTRACT.md` | 错误码分段表补 `文件 220xxx` |
| `doc/openapi.json` / `doc/ENDPOINTS.md` | 跑 `./scripts/export-openapi.sh` 重新生成 |
| `AGENTS.md` | 模块清单补 `hucoo-component-storage` / `hucoo-module-file` |

AWS SDK 依赖（只引必需的两个，避免拉入全套）：

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>software.amazon.awssdk</groupId>
      <artifactId>bom</artifactId>
      <version>${aws-sdk-java.version}</version>   <!-- 当前 Maven Central 最新 2.55.11 -->
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

```xml
<!-- hucoo-component-storage/pom.xml -->
<dependency>
  <groupId>software.amazon.awssdk</groupId>
  <artifactId>s3</artifactId>
</dependency>
<dependency>
  <groupId>software.amazon.awssdk</groupId>
  <artifactId>apache-client</artifactId>
</dependency>
```

### 验证命令

```bash
cd backend
./mvnw -q -DskipTests install                                   # 保证 -pl 能解析兄弟模块
./mvnw -pl hucoo-component/hucoo-component-storage test         # 组件契约测试
./mvnw -pl hucoo-module/hucoo-module-file test                  # 模块测试
./mvnw -pl hucoo-server/hucoo-application-admin test            # 端到端（AdminApplicationTests + 新增 API 测试）
./scripts/export-openapi.sh                                     # 刷新契约与接口清单
docker compose up -d rustfs                                     # 本地 RustFS
./mvnw -pl hucoo-server/hucoo-application-admin spring-boot:run -Dspring-boot.run.profiles=dev
```

## 10. 风险、边界与待决项

### 已知风险

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 本地存储不共享 | 多实例部署时上传到 A 节点的文件在 B 节点 404 | 生产强制 `type=s3`；`local` 仅限 dev/单机；启动时打 WARN 日志 |
| 对象与 DB 双写不一致 | 孤儿对象占空间 / 记录指向不存在的对象 | 对账任务（4.6）+ `put` 失败即回滚/删除 |
| 大文件并发上传 | 磁盘、连接池、内存压力 | 流式 + `file-size-threshold` 落盘 + `max-connections` 限流 + 单租户并发上限 |
| 广播式直传 | 浏览器直连对象存储绕过服务端 DLP 与审计 | 默认关闭直传；开启时要求 bucket policy + CORS 收敛，并保留 confirm 回执审计 |
| S3 兼容差异 | 新 SDK 默认校验和、`aws-chunked`、ACL 语义在 RustFS/MinIO 上表现不同 | 客户端显式关闭 checksum/chunked；不使用 ACL；契约测试跑真实服务端 |
| RustFS 加密不可移植 | 后续迁移到 AWS S3 时加密对象读不出 | 默认不启用 SSE，加密交给存储层 TLS + 静态加密的卷 |

### 待决项（实现前需要确认）

1. **组件命名**：已确认使用 `hucoo-component-storage`（✅ 已落地）。
2. **单桶还是多桶**：本文按"单桶 + key 前缀含租户"设计（运维简单、RustFS 无 ACL）；若合规要求租户物理隔离，需要改成每租户一个 bucket。
3. **存储配置来源**：`ap_file_storage_config` 表（管理端可改）还是纯配置文件/Nacos（更安全）？本文默认"配置文件为主，表用于多存储与切换"，但两处同时存在需要有明确的优先级规则。
4. **秒传的越权边界**：是否需要按 `owner_id` 再收敛（同一租户内不同用户之间是否允许命中复用）。
5. **匿名分享是否需要密码/水印**：`ap_file_share_token` 已预留 `password_hash`，P1 是否实现待定。
6. **是否引入 ClamAV**：决定 `scan_status` 默认值是 `SKIPPED`（P0）还是 `PENDING`（强制扫描）。
7. **默认扩展名白名单偏严**：`.bin`、`.dat`、`.key`、`.pem`、`.p12`、`.7z` 等默认被拒（只放行文档/表格/压缩/图片/日志类）。
   若接入侧需要更多类型，改 `agent-platform.modules.file.allowed-extensions` 即可，但要注意黑名单优先级更高。

## 11. 验证记录（P0）

环境：macOS + JDK 23 编译（`--release 21`）、`./mvnw -o clean install` 全绿；运行实例为 `test` profile
（Mock 持久化 + 本地驱动 + 零外部依赖）。**未覆盖**：真实数据库持久化路径与 S3/RustFS 通路（本机 Docker 未启动）。

| # | 用例 | 结果 |
| --- | --- | --- |
| 1 | `./mvnw -o clean install` 全量构建 + 测试（35 模块） | ✅ BUILD SUCCESS |
| 2 | 存储组件：契约测试（本地 9 + 内存 9）+ 路径防护 7 | ✅ 25 通过（S3 真机 9 条按环境变量跳过） |
| 3 | 模块单测：key 规则 5 + 配置 4 | ✅ 9 通过 |
| 4 | `FileApiTests`（上传/列表/下载/重命名/回收站/还原/签名链接/404） | ✅ 5 通过 |
| 5 | `FileSecurityApiTests`（鉴权开启：未登录 401、匿名签名下载放行、签名篡改拒绝） | ✅ 2 通过 |
| 6 | `/actuator/health` 的 `storage` 组件 | ✅ UP，`provider=local`，能力矩阵如实反映 |
| 7 | 上传：中文文件名 + 中文内容 + 1MB/10MB 二进制 | ✅ 落库 SHA-256 与本地 `shasum -a 256` 完全一致 |
| 8 | 下载：字节级比对（文本 / 1MB / 10MB） | ✅ `cmp` 全部一致；`Content-Disposition` 带 RFC 5987 `filename*` |
| 9 | 本地落盘结构 | ✅ `{root}/hucoo-files/files/{tenant}/{bizType}/{yyyy}/{MM}/{dd}/{shard}/{id}.{ext}`，目录 0700、文件 0600 |
| 10 | 列表：分页字段（items/total/page/pageSize/pages）+ bizType/keyword 过滤 | ✅ |
| 11 | 签名链接：正常下载、篡改签名、**正确签名但已过期**、不存在的文件 | ✅ 分别 200 / 220010 / 220010"已过期" / 404 |
| 12 | 回收站：DELETE → 下载与取链接均 220011；restore → NORMAL，`downloadCount` 正确累加 | ✅ |
| 13 | 错误路径：`.exe`/`.sh` → 220003、非法 visibility → 400、空文件 → 400、详情 404 | ✅ |
| 14 | 超限上传 205MB | ✅ HTTP 413 + `413 上传内容超过大小限制`（修复前是框架英文原文） |
| 15 | 鉴权开启（`security.enabled=true`）：无令牌访问 10 个文件接口 | ✅ 401；改写签名后匿名端点不放行 |
| 16 | `./scripts/export-openapi.sh` | ✅ 163 路径 / 237 操作 / 167 schema，`doc/ENDPOINTS.md` 同步 |

验证过程中发现并修复的缺陷：

1. **本地驱动首启即判越权**（component-storage）：存储根目录尚不存在时（首次启动），
   macOS 的 `/var → /private/var` 符号链接会让"根目录真实路径"与"最近存在祖先的真实路径"前缀不一致，
   健康检查直接 DOWN。改为逐级校验已存在的路径组件 + 解析最近存在祖先的真实路径，并补了回归用例。
2. **超限上传返回框架英文错误**（component-web）：新增 `MaxUploadSizeExceededException` 处理器与
   `PAYLOAD_TOO_LARGE(413)` 平台错误码。
3. **匿名分享下载的计数与审计租户错误**（module-file）：匿名请求的租户上下文是系统租户，
   带租户条件 UPDATE 会静默更新 0 行、审计也会记到 `000000` 名下；改为 `@InterceptorIgnore` 的计数语句 +
   显式传入文件自身租户。

未覆盖项与执行方式（需要 Docker）：

```bash
docker compose up -d postgres rustfs                       # 起 DB 与对象存储
HUCOO_S3_CONTRACT_TEST=true ./mvnw -pl hucoo-component/hucoo-component-storage test   # RustFS 真机契约测试
HUCOO_FILE_STORAGE_TYPE=s3 ./mvnw -pl hucoo-server/hucoo-application-admin spring-boot:run -Dspring-boot.run.profiles=dev
```

已知平台级限制（非本模块引入）：`security.enabled=true` + `persistence.enabled=false` 时，
`@RequirePermission` 的权限解析走 `dev.hucoo.identity.config.DatabasePermissionResolver`，
需要数据库里有权限数据；数据库不可用时任何带权限点的接口都会 500。
若要让 Mock 模式与鉴权共存，需要给权限解析器加"JWT 声明优先 / 数据库兜底"的开关。

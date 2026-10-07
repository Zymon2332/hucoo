# 客户端平台模型目录

## 接口与接入

`GET /api/v1/model-catalog?projectId=7`，管理服务与网关使用相同路径。
必须提供登录 Bearer Token，租户和用户身份从登录上下文获得；不要求模型管理权限。
`projectId` 可省略，提供时必须为正整数。首期只校验格式，不校验项目归属；本接口的项目可见性结果不能替代模型调用时的项目权限校验。

响应为 `Result<PublicModelCatalogDTO>`。无可用模型时 `providers` 为 `[]`。
模型只使用平台稳定编码，返回已声明支持的版本能力；不暴露 Endpoint、上游模型名、渠道、凭证、数据库 ID、权重或内部元数据。

```json
{
  "code": 200,
  "message": "success",
  "timestamp": 1791360000000,
  "data": {
    "catalogVersion": "<SHA-256>",
    "policyVersion": "stable-v1",
    "providers": [{
      "providerCode": "vendor",
      "providerName": "供应商",
      "models": [{
        "modelCode": "platform-model",
        "modelName": "平台模型",
        "modelFamily": "Family",
        "modelType": "CHAT",
        "versionCode": "v1",
        "contextWindow": 8192,
        "maxInputTokens": null,
        "maxOutputTokens": 1024,
        "inputModalities": ["text"],
        "outputModalities": ["text"],
        "capabilities": ["STREAMING", "TOOL_CALLING"]
      }]
    }]
  }
}
```

服务间消费只依赖 `hucoo-module-model-governance-client`，并在消费方启用：

```java
@EnableFeignClients(basePackageClasses = PublicModelCatalogFeignClient.class)
```

调用 `client.catalog(projectId)`。默认服务名为 `hucoo-application-admin`；配置项
`agent-platform.clients.model-governance.service-name` 可覆盖服务名，
`agent-platform.clients.model-governance.base-url` 可指定直连地址。
认证、租户和链路上下文由 `hucoo-component-remote` 透传。治理服务自身无消费需求，不注册调用自身的 Feign Bean。

## 发布与可见性

系统租户 `000000` 和当前登录租户的配置在单次快照中读取。MyBatis 使用只读、可重复读事务并保留租户拦截器；内存实现使用同步快照。查询始终恢复原租户上下文，管理端原有 `list()` 语义不变。
所有关联链路必须属于同一归属租户。仅返回 `sourceType=PLATFORM` 且无私有拥有者的模型。

准入条件：

- 模型、版本、供应商、渠道、映射已发布，供应商启用，渠道/映射 ACTIVE，渠道未标记 UNHEALTHY。
- 版本发布时间不得在未来，计划废弃时间未到期；无发布时间的已发布版本允许作为未标注日期的基线。
- 映射指向的最近验证记录为 PASSED，且关联当前映射和版本。
- 路由策略启用且匹配请求范围，目标 ACTIVE 且权重大于零，版本锁定与候选版本一致。
- 目标凭证属于渠道、为平台凭证、认证类型一致、ACTIVE、未到期，需认证时必须有密文；`authType=NONE` 的目标可不配置凭证。
- 至少有一条有效 ALLOW 授权；未匹配授权默认隐藏。有效期为 `[validFrom, validTo)`，缺省边界不限制。

授权范围匹配 `USER > PROJECT > TENANT > PLATFORM`。任意匹配范围的 DENY 优先，用户 ALLOW 不能覆盖租户 DENY。
路由在匹配的已启用策略中选取最具体范围，较宽范围不会绕过更具体范围的不可用目标。
未提供项目时不匹配 PROJECT 授权或路由。

同一模型编码只保留可用候选中最新的版本，按 `releasedAt`、`versionCode`、内部版本 ID 依次确定；版本无可用目标时可以回到仍可用的旧版本。
按实际可用渠道所属供应商分组。同一版本经多家供应商提供时会出现在各组，同组内多渠道去重。
供应商、模型、模态和能力集合按编码排序。

当前种子只包含模型配置，不包含准入所需的验证、凭证、授权及路由目标，因此默认返回空目录。不会为演示而伪造验证结果或平台凭证。
无需新增数据库表或迁移，复用规范化模型治理表。

## 后续灰度名单

扩展 `ModelCatalogReleasePolicy` Bean，并实现 `policyVersion()` 与 `isVisible(context, candidate)`。
上下文包含租户、项目、用户、查询时间、模型编码、版本编码以及稳定候选目录基线摘要。
稳定准入条件在扩展策略之前强制执行；新增策略只能进一步收窄目录，无法恢复被 DENY、未发布或不可路由的模型。
可据此接入租户/项目/用户/版本名单，先做名单灰度，再独立评估百分比灰度。

`catalogVersion` 是排序后的安全目录与 `policyVersion` 的 SHA-256 摘要；不会对密钥或渠道敏感字段做摘要。
可见内容、版本选择或策略版本变化会改变目录版本，同一结果的重复请求保持版本稳定。
服务返回 `Cache-Control: no-store`，客户端可按登录身份及项目维护本地目录并比较两个版本字段，切换身份或项目时重新获取。
后续模型调用准入应复用同一灰度决策，目录隐藏本身不构成调用权限控制。

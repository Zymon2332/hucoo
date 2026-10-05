# 模型与供应商治理设计

本文描述管理端模型治理和模型运行时之间的目标数据模型。设计重点是把“模型是什么”“供应商如何提供模型”“平台用哪一组凭证访问”以及“请求应该如何路由”拆开，避免把供应商、模型和 API Key 堆在一张配置表中。

当前落地状态：已新增 V14 规范化表结构及中文表、字段注释，并实现 Java 实体、Mapper、应用服务、管理接口和 Mock/数据库双仓储。供应商与渠道管理已经使用共享业务服务；逻辑模型、版本、映射、能力、价格、可见性授权、加密凭证与路由配置通过新目录接口管理。运行时读取新配置、真实模型验证、多级审批流、旧数据搬迁和旧表清理尚未完成。具体接口、配置步骤、验证情况见 [实现与接入说明](MODEL_GOVERNANCE_IMPLEMENTATION.md)。

以下内容区分目标架构与当前实现；范围继承、运行时准入、故障切换等描述是目标行为，不能据此认为当前调用链已经启用这些规则。

## 设计目标

- 一个逻辑模型可以有多个版本，也可以通过多个供应商渠道提供。
- 一个供应商可以配置多个区域、协议、代理网关或自部署渠道。
- 凭证独立于模型和供应商渠道，可轮换、撤销、过期和审计。
- 模型、渠道和路由支持平台、租户、项目、用户四级范围。
- 只有审批通过、验证通过、已发布的渠道映射才能进入运行时路由。
- 路由同时考虑优先级、健康、并发、权重、成本和 fallback。
- 数据库保存平台加密后的密文，不保存 API Key 明文。

## 领域分层

```text
逻辑模型 ap_model
  └── 模型版本 ap_model_version
        └── 模型渠道映射 ap_model_channel_binding
              ├── 供应商渠道 ap_model_channel
              │     └── 供应商 ap_model_provider
              └── 价格 ap_model_channel_price

模型版本 ── 能力 ap_model_version_capability
供应商渠道 ── 凭证 ap_model_credential

模型范围 ap_model_visibility_grant
路由策略 ap_model_route_policy
  └── 路由目标 ap_model_route_target
        └── 运行时状态 ap_model_account_runtime_state
```

### 逻辑模型和模型版本

`ap_model` 是平台稳定引用的逻辑模型，例如 `deepseek-chat` 或 `gpt-4o`。Agent、项目策略和路由规则优先引用逻辑模型，避免供应商替换时修改业务配置。

`ap_model_version` 表示可发布的模型版本，保存上下文长度、最大输出、输入输出模态和默认参数。供应商实际使用的编码保存在渠道映射中，因为不同供应商的编码可能不同。

### 供应商和供应商渠道

`ap_model_provider` 只描述供应商主体，例如 OpenAI、DeepSeek、企业模型网关或自建推理集群。

`ap_model_channel` 描述一次实际接入，包括 Endpoint、区域、网络区域、协议和认证方式。同一供应商可以拥有多个渠道，例如国内渠道、国际渠道和企业代理渠道。

协议公共字段使用列保存，协议专属差异使用 `protocol_config_json` 保存。JSON 必须带 `schemaVersion`，并且禁止保存任何密钥。

### 模型渠道映射

`ap_model_channel_binding` 是运行时真正选择的接入单元。它把一个模型版本绑定到一个供应商渠道，并记录供应商侧的实际模型编码、模型别名、Endpoint 覆盖、默认权重和验证状态。

例如同一个逻辑模型可以拥有以下映射：

```text
deepseek-chat + DeepSeek 官方渠道 + deepseek-chat
deepseek-chat + 企业代理渠道     + deepseek-chat
deepseek-chat + 自建 vLLM 渠道    + deepseek-v3
```

### 凭证

`ap_model_credential` 挂在渠道上，可以被多个模型映射和路由目标复用。数据库只保存密文、Nonce、加密密钥版本、指纹和脱敏值。

凭证创建和轮换请求可以接收明文，但明文只能进入加密服务和供应商请求流程，不能写入日志、审计事件、DTO 或异常信息。轮换历史保存到 `ap_model_credential_rotation`。

### 可见性

`ap_model_visibility_grant` 支持四级范围：`PLATFORM`、`TENANT`、`PROJECT`、`USER`。范围解析顺序固定为：

```text
USER > PROJECT > TENANT > PLATFORM
```

显式拒绝优先于继承的允许规则。平台级记录使用系统租户 `000000`，其他记录按当前租户隔离。

### 路由

`ap_model_route_policy` 描述某个模型在某个范围内如何选择目标。`ap_model_route_target` 引用模型渠道映射和凭证，并保存优先级、权重、最大并发和成本限制。

首期选择顺序固定为：

```text
范围匹配 → 发布状态 → 优先级 → 健康状态 → 并发容量 → 权重 → 成本
```

请求失败时，只有配置为可重试的失败类型才允许切换目标。流式响应已经产生内容后不透明重试。

## 状态规则

模型、渠道和模型渠道映射统一使用以下生命周期：

```text
DRAFT → VALIDATING → PENDING_APPROVAL → PUBLISHED → SUSPENDED → REVOKED
```

运行时可选目标必须同时满足：

1. 模型版本是 `PUBLISHED`。
2. 渠道和映射是 `PUBLISHED`。
3. 最近一次验证通过。
4. 凭证处于 `ACTIVE` 且没有过期。
5. 路由目标处于 `ACTIVE`。
6. 当前租户、项目和用户拥有可见性授权。

审批复用身份模块已有的 `ap_approval` 和 `ap_approval_step`，通过 `resource_type/resource_id` 关联模型、渠道或映射，不在模型模块复制审批表。

## 表关系和关键约束

| 表 | 作用 | 关键唯一约束 |
| --- | --- | --- |
| `ap_model` | 逻辑模型 | 活跃记录的租户 + 模型编码 |
| `ap_model_version` | 模型版本 | 模型 + 版本编码 |
| `ap_model_provider` | 供应商 | 租户 + 供应商编码 |
| `ap_model_channel` | 供应商渠道 | 供应商 + 渠道编码 |
| `ap_model_channel_binding` | 模型渠道映射 | 版本 + 渠道 + 供应商模型编码 |
| `ap_model_visibility_grant` | 模型范围 | 模型 + 范围类型 + 范围 ID |
| `ap_model_version_capability` | 能力声明 | 版本 + 能力编码 |
| `ap_model_channel_price` | 渠道价格 | 应用事务锁定映射，检查阶梯与时间区间重叠 |
| `ap_model_credential` | 加密凭证 | 渠道 + 凭证指纹 |
| `ap_model_route_policy` | 路由策略 | 租户 + 模型 + 范围 |
| `ap_model_route_target` | 路由目标 | 策略 + 映射 + 凭证 |
| `ap_model_account_runtime_state` | 熔断和健康状态 | 租户 + 路由目标 |

## 价格模型

`ap_model_channel_price.billing_dimension` 支持：

- `INPUT_TOKEN`
- `OUTPUT_TOKEN`
- `CACHE_READ_TOKEN`
- `CACHE_WRITE_TOKEN`
- `REQUEST`

通过 `tier_start/tier_end` 表达阶梯价，`tier_end` 为空表示无上限。价格必须有货币和生效时间，不能覆盖同一映射、同一维度的重叠生效区间。

## 验证和调用记录

验证任务必须关联到具体的模型版本、渠道和映射，检查项至少覆盖：

- 连通性
- 非流式调用
- 流式调用
- 超时
- 并发
- 工具调用
- JSON 模式
- Token usage
- 上下文长度
- 多模态能力

调用记录必须保存请求模型、实际模型版本、供应商、渠道、路由目标、凭证指纹、尝试次数、失败类别、Token 用量、延迟、成本、租户、项目和用户信息。

## 迁移策略

新增 Flyway 迁移，不修改已经执行过的 V1～V13 文件。迁移负责创建规范化模型表，并在切换代码后完成数据搬迁：

- `ap_model_definition` → `ap_model`、`ap_model_version`
- `ap_model_provider` → `ap_model_provider` 扩展字段
- `ap_custom_model_registration` → 模型、渠道、映射和可见性授权
- `ap_model_key` → `ap_model_credential`
- `ap_model_access_account` → 渠道、凭证、映射和路由目标
- `ap_model_route_policy/target` → 新路由策略和目标结构

旧结构完成数据校验后，由后续迁移删除；应用代码切换前不删除旧表，避免已部署服务启动失败。

## 管理接口

供应商保留 `/api/admin/v1/models/providers`；渠道嵌套在供应商下。规范化模型目录与路由配置使用 `/api/admin/v1/model-catalog`，避免与现有 `/models` 旧表接口冲突。完整路径与请求示例见 [实现与接入说明](MODEL_GOVERNANCE_IMPLEMENTATION.md)。

凭证接口只返回指纹、脱敏值和生命周期状态。目标运行时接口使用内部凭证句柄；当前调用执行器仍使用原账户和 SecretStore，尚未读取新凭证表。

## 中文注释规范

所有模型迁移表必须同时提供：

- 中文 `COMMENT ON TABLE`。
- 每个字段的中文 `COMMENT ON COLUMN`。
- 枚举字段的允许值和业务含义。
- JSON 字段的结构版本、用途和禁止存放内容。
- 密文、Nonce、指纹、加密密钥版本等安全字段的实际含义。

禁止使用“字段：xxx”这类无业务含义的模板描述。

# 模型目录基线数据说明

本文说明模型治理模块内置的市面知名供应商与模型目录数据，包括数据来源、规模、落库位置和维护方式。

数据文件：

- `hucoo-module/hucoo-module-model-governance/src/main/resources/model-catalog/model-catalog-seed.json`：规范数据源，Mock 模式启动时装载。
- `hucoo-server/hucoo-application-admin/src/main/resources/db/migration/V15__seed_model_catalog.sql`：Flyway 迁移，持久化模式（`agent-platform.persistence.enabled=true`）下写入数据库。

两份文件内容同源，改一处必须同步另一处。

## 数据规模

| 对象 | 数量 | 落库表 |
| --- | --- | --- |
| 供应商 | 25 | `ap_model_provider` |
| 接入渠道 | 25 | `ap_model_channel` |
| 逻辑模型 | 96 | `ap_model` |
| 模型版本 | 96 | `ap_model_version` |
| 能力声明 | 642 | `ap_model_version_capability` |
| 渠道映射 | 115 | `ap_model_channel_binding` |
| 阶梯价格 | 340 | `ap_model_channel_price` |
| 旧版模型定义影子数据 | 96 | `ap_model_definition` |

供应商类型覆盖治理设计中的五类来源：`OFFICIAL` 官方、`CLOUD` 云平台、`ENTERPRISE` 企业网关、`LOCAL` 本地推理、`PROXY` 聚合代理。

## 供应商清单

| 供应商编码 | 供应商 | 类型 | 默认区域 | 原生模型 | 附加映射 |
| --- | --- | --- | --- | --- | --- |
| `openai` | OpenAI | OFFICIAL | us-east | 11 | 0 |
| `anthropic` | Anthropic | OFFICIAL | us-east | 6 | 0 |
| `google` | Google Gemini | OFFICIAL | us-central1 | 8 | 0 |
| `deepseek` | 深度求索 DeepSeek | OFFICIAL | cn-hangzhou | 6 | 0 |
| `qwen` | 阿里云百炼 通义千问 | CLOUD | cn-beijing | 8 | 0 |
| `zhipu` | 智谱 AI GLM | OFFICIAL | cn-beijing | 6 | 0 |
| `moonshot` | 月之暗面 Kimi | OFFICIAL | cn-beijing | 5 | 0 |
| `bytedance` | 字节跳动 火山方舟 | CLOUD | cn-beijing | 5 | 0 |
| `minimax` | MiniMax 稀宇科技 | OFFICIAL | cn-shanghai | 4 | 0 |
| `tencent` | 腾讯混元 Hunyuan | CLOUD | cn-guangzhou | 4 | 0 |
| `baidu` | 百度智能云千帆 文心 | CLOUD | cn-beijing | 1 | 0 |
| `stepfun` | 阶跃星辰 StepFun | OFFICIAL | cn-shanghai | 2 | 0 |
| `xai` | xAI Grok | OFFICIAL | us-west | 4 | 0 |
| `meta` | Meta Llama | OFFICIAL | us-east | 4 | 0 |
| `mistral` | Mistral AI | OFFICIAL | eu-west | 5 | 0 |
| `cohere` | Cohere | OFFICIAL | us-east | 4 | 0 |
| `amazon` | Amazon Bedrock | CLOUD | us-east-1 | 4 | 0 |
| `microsoft` | Microsoft Azure AI | ENTERPRISE | eastus | 2 | 0 |
| `nvidia` | NVIDIA NIM | OFFICIAL | us-east | 4 | 0 |
| `perplexity` | Perplexity | OFFICIAL | us-east | 3 | 0 |
| `ollama` | Ollama 本地推理 | LOCAL | on-prem | 0 | 4 |
| `vllm` | vLLM 私有部署 | LOCAL | on-prem | 0 | 4 |
| `siliconflow` | 硅基流动 SiliconFlow | PROXY | cn-beijing | 0 | 4 |
| `openrouter` | OpenRouter 聚合网关 | PROXY | global | 0 | 4 |
| `azure-openai` | Azure OpenAI Service | ENTERPRISE | eastus | 0 | 3 |

`原生模型` 指该供应商自有的模型；`附加映射` 指开放权重模型在该通道上的额外可路由映射。Ollama、vLLM、硅基流动、OpenRouter、Azure OpenAI 不产生新的逻辑模型，只作为同一批逻辑模型的第二条通道，用于演示降级链路与成本对比。

## 数据来源与口径

- 供应商主体信息（官网、文档地址、Endpoint、协议、默认区域、合规等级）按各供应商公开文档整理。
- 模型名称、上下文长度、输入输出模态、能力与单价参考公开聚合目录（catalogVersion `2026-10-06`）。
- 单价统一为**每百万 Token 的美元价格**，写入 `ap_model_channel_price.unit_scale = 1000000`。图像生成按 `REQUEST` 维度记录，`unit_scale = 1000`。
- 价格只作为平台初始基线，实际结算以供应商账单为准。价格行 `effective_to` 为空表示当前有效，`tier_end` 为空表示无上限。
- 能力编码由上游声明的参数和模态推导：`STREAMING`、`TOOL_CALLING`、`JSON_MODE`、`STRUCTURED_OUTPUT`、`REASONING`、`VISION_INPUT`、`AUDIO_INPUT`、`AUDIO_OUTPUT`、`IMAGE_OUTPUT`、`VIDEO_INPUT`、`FILE_INPUT`、`PROMPT_CACHE`、`WEB_SEARCH`。
- 模型版本编码使用该版本的发布日期（`YYYY-MM-DD`），符合 `ap_model_version.version_code` 的示例约定。

## 字段约定

| 字段 | 取值 | 说明 |
| --- | --- | --- |
| `tenant_id` | `000000` | 平台级目录归属系统租户，租户侧只读 |
| `source_type` | `PLATFORM` | 逻辑模型来源 |
| `lifecycle_status` / `release_status` / `approval_status` | `PUBLISHED` | 开箱即可路由；要求走审批流时改为 `PENDING_APPROVAL` |
| `status`（供应商） | `1` | 启用 |
| `status`（渠道、映射） | `ACTIVE` | 可路由 |
| `health_status` | `UNKNOWN` | 未经真实健康检查，避免伪造健康状态 |
| `network_zone` | `PUBLIC` / `PRIVATE` / `INTRANET` | 官方与云平台为 `PUBLIC`，企业网关为 `PRIVATE`，本地推理为 `INTRANET` |
| `protocol_config_json` | 含正整数 `schemaVersion` | 与配置校验一致，不写入任何密钥 |
| `auth_type` | `API_KEY` | 仅声明认证方式，凭证另行登记 |

ID 使用固定区间，便于人工排查与回滚：旧版模型定义 `970001+`、供应商 `900001+`、渠道 `910001+`、逻辑模型 `920001+`、模型版本 `930001+`、能力声明 `940001+`、渠道映射 `950001+`、阶梯价格 `960001+`。

## 凭证不写入

任何迁移与种子文件都不包含 API Key。渠道凭证必须通过
`POST /api/admin/v1/model-catalog/channels/{channelId}/credentials` 加密登记，
数据库只保存密文、Nonce、主密钥版本与指纹。因此基线数据写入后，渠道处于“可配置但未授权”状态，
调用前需要为每个要使用的渠道登记凭证。

## 装载路径

**Mock 模式（默认，`persistence.enabled=false`）**

`ModelCatalogSeedLoader` 在容器启动时读取 `model-catalog-seed.json` 写入 `InMemoryModelCatalogRepository`，
并同步填充旧版 `ap_model_definition` 影子数据，避免 `/api/admin/v1/models` 与 `/api/admin/v1/model-catalog` 表现不一致。
装载只在内存仓储为空时执行，装载期间租户切换为 `000000`，完成后恢复原上下文。

**持久化模式（`persistence.enabled=true`）**

Flyway 执行 `V15__seed_model_catalog.sql`。迁移带幂等保护：检测到系统租户下已存在 `openai` 供应商时整体跳过，
不会产生重复目录。生产环境启用前需要确认 `spring.flyway.enabled=true`。

## 租户可见性

平台目录记录的 `tenant_id` 为 `000000`。内存仓储与 MyBatis 多租户拦截器都按当前租户过滤，
因此普通租户查询不到这批数据，只有系统租户上下文（未鉴权的本地联调、`test` profile）可见。
面向租户开放平台模型需要可见性授权（`ap_model_visibility_grant`）与运行时执行器接入，
属于实现文档中“当前边界与后续接入”一节列出的未完成工作。

## 维护方式

新增或替换模型时按以下顺序修改，保证两条路径一致：

1. 修改 `model-catalog-seed.json`：在 `models` 增加逻辑模型与版本、能力；在顶层 `bindings` 增加渠道映射与价格（`providerCode` + `channelCode` 定位通道）。
2. 同步更新 `V15__seed_model_catalog.sql` 对应 INSERT 的 VALUES 列表，保持 ID 区间递增。
3. 修改后必须回归：`./mvnw -pl hucoo-module/hucoo-module-model-governance -am test`，
   以及管理端 `ModelCatalogApiTests` 与 `AdminApplicationTests`。

校验要点：

- `ap_model_version` 的 `max_input_tokens`、`max_output_tokens` 均不得大于 `context_window`（数据库有 CHECK 约束）。
- 同一映射、同一计费维度的阶梯区间与生效区间不能重叠（应用在映射行锁内校验）。
- `protocol_config_json` 必须包含正整数 `schemaVersion`，且不得出现 `apiKey`、`secret`、`password`、`token`、`authorization` 等键。
- 渠道 Endpoint 必须是 HTTP/HTTPS 地址，且不能包含认证信息、查询参数或片段。

## 模型明细

**OpenAI（`openai`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `gpt-6.1-sol-pro` | GPT-6.1 Sol Pro | CHAT | 1,050,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 2.0 |
| `gpt-6-astra-pro` | GPT-6 Astra Pro | CHAT | 1,050,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 10.0 |
| `gpt-6-sol` | GPT-6 Sol | CHAT | 1,050,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 2.0 |
| `gpt-5.6-terra-pro` | GPT-5.6 Terra Pro | CHAT | 1,050,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 2.0 |
| `gpt-5.6-sol` | GPT-5.6 Sol | CHAT | 1,050,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 2.0 |
| `gpt-5.5-pro` | GPT-5.5 Pro | CHAT | 1,050,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、WEB_SEARCH | 30.0 |
| `gpt-5.4-mini` | GPT-5.4 Mini | CHAT | 400,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 0.75 |
| `gpt-5.3-codex` | GPT-5.3 Codex | CHAT | 400,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 1.75 |
| `gpt-image` | GPT Image | IMAGE | 272,000 | STREAMING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、IMAGE_OUTPUT、PROMPT_CACHE、WEB_SEARCH | 8.0 |
| `gpt-audio` | GPT Audio | AUDIO | 128,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、AUDIO_INPUT、AUDIO_OUTPUT | 2.5 |
| `gpt-oss-120b` | GPT-OSS 120B | CHAT | 131,072 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING | 0.037 |

**Anthropic（`anthropic`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `claude-opus-5.5` | Claude Opus 5.5 | CHAT | 1,000,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 4.0 |
| `claude-sonnet-5.5` | Claude Sonnet 5.5 | CHAT | 1,000,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 2.0 |
| `claude-fable-5.1` | Claude Fable 5.1 | CHAT | 1,000,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 10.0 |
| `claude-opus-5` | Claude Opus 5 | CHAT | 1,000,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 5.0 |
| `claude-sonnet-5` | Claude Sonnet 5 | CHAT | 1,000,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 2.0 |
| `claude-haiku-4.5` | Claude Haiku 4.5 | CHAT | 200,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 1.0 |

**Google Gemini（`google`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `gemini-3.8-flash` | Gemini 3.8 Flash | CHAT | 1,048,576 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、AUDIO_INPUT、VIDEO_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 0.75 |
| `gemini-3.5-flash` | Gemini 3.5 Flash | CHAT | 1,048,576 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、AUDIO_INPUT、VIDEO_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 1.5 |
| `gemini-3.1-flash-lite` | Gemini 3.1 Flash Lite | CHAT | 1,048,576 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、AUDIO_INPUT、VIDEO_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 0.25 |
| `gemini-3.1-pro-preview` | Gemini 3.1 Pro | CHAT | 1,048,576 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、AUDIO_INPUT、VIDEO_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 2.0 |
| `gemini-3-pro-image` | Gemini 3 Pro Image | IMAGE | 131,072 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、IMAGE_OUTPUT、PROMPT_CACHE、WEB_SEARCH | 2.0 |
| `gemini-2.5-pro` | Gemini 2.5 Pro | CHAT | 1,048,576 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、AUDIO_INPUT、VIDEO_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 1.25 |
| `gemma-4-31b-it` | Gemma 4 31B IT | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、VIDEO_INPUT、PROMPT_CACHE | 0.09 |
| `gemma-4-26b-a4b-it` | Gemma 4 26B A4B IT | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、VIDEO_INPUT、PROMPT_CACHE | 0.09 |

**深度求索 DeepSeek（`deepseek`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `deepseek-v4.1-flash` | DeepSeek V4.1 Flash | CHAT | 1,048,576 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、PROMPT_CACHE | 0.012563 |
| `deepseek-v4-pro` | DeepSeek V4 Pro | CHAT | 1,048,576 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、PROMPT_CACHE | 0.2088 |
| `deepseek-v4-flash` | DeepSeek V4 Flash | CHAT | 1,048,576 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、PROMPT_CACHE | 0.0106 |
| `deepseek-v3.2` | DeepSeek V3.2 | CHAT | 163,840 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、PROMPT_CACHE | 0.28 |
| `deepseek-r1-0528` | DeepSeek R1 0528 | CHAT | 163,840 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、PROMPT_CACHE | 0.5 |
| `deepseek-chat-v3.1` | DeepSeek Chat V3.1 | CHAT | 163,840 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、PROMPT_CACHE | 0.25 |

**阿里云百炼 通义千问（`qwen`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `qwen3.8-max-prime` | Qwen3.8 Max Prime | CHAT | 1,000,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、VIDEO_INPUT、PROMPT_CACHE | 4.0 |
| `qwen3.8-max` | Qwen3.8 Max | CHAT | 1,000,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、VIDEO_INPUT、PROMPT_CACHE | 2.0 |
| `qwen3.8-flash` | Qwen3.8 Flash | CHAT | 1,000,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、VIDEO_INPUT、PROMPT_CACHE | 0.15 |
| `qwen3.8-omni-flash` | Qwen3.8 Omni Flash | CHAT | 1,000,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、AUDIO_INPUT、VIDEO_INPUT、PROMPT_CACHE | 0.15 |
| `qwen3.8-27b` | Qwen3.8 27B | CHAT | 1,000,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、VIDEO_INPUT、PROMPT_CACHE | 0.425 |
| `qwen3.7-plus` | Qwen3.7 Plus | CHAT | 1,000,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、PROMPT_CACHE | 0.32 |
| `qwen3.7-max` | Qwen3.7 Max | CHAT | 1,000,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、PROMPT_CACHE | 1.475 |
| `qwen3-max-thinking` | Qwen3 Max Thinking | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING | 0.78 |

**智谱 AI GLM（`zhipu`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `glm-5.3-prime` | GLM-5.3 Prime | CHAT | 1,000,000 | STREAMING、TOOL_CALLING、JSON_MODE、REASONING、PROMPT_CACHE | 2.8 |
| `glm-5.3` | GLM-5.3 | CHAT | 1,048,576 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、PROMPT_CACHE | 0.07 |
| `glm-5.3-flash` | GLM-5.3 Flash | CHAT | 1,048,576 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、VIDEO_INPUT、PROMPT_CACHE | 0.15 |
| `glm-5.2` | GLM-5.2 | CHAT | 1,048,576 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、PROMPT_CACHE | 0.152 |
| `glm-5v-turbo` | GLM-5V Turbo | CHAT | 202,752 | STREAMING、TOOL_CALLING、JSON_MODE、REASONING、VISION_INPUT、VIDEO_INPUT、PROMPT_CACHE | 1.2 |
| `glm-4.7-flash` | GLM-4.7 Flash | CHAT | 200,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING | 0.0605 |

**月之暗面 Kimi（`moonshot`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `kimi-k3` | Kimi K3 | CHAT | 1,048,576 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、VIDEO_INPUT、PROMPT_CACHE | 0.95 |
| `kimi-k2.7-code` | Kimi K2.7 Code | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、PROMPT_CACHE | 0.6712 |
| `kimi-k2.6` | Kimi K2.6 | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、PROMPT_CACHE | 0.95 |
| `kimi-k2.5` | Kimi K2.5 | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、PROMPT_CACHE | 0.45 |
| `kimi-k2-thinking` | Kimi K2 Thinking | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING | 0.6 |

**字节跳动 火山方舟（`bytedance`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `seed-2.1-turbo` | Seed 2.1 Turbo | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、VIDEO_INPUT | 0.5 |
| `seed-2.0-code` | Seed 2.0 Code | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、VIDEO_INPUT | 0.5 |
| `seed-2.0-lite` | Seed 2.0 Lite | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、VIDEO_INPUT | 0.25 |
| `seed-2.0-mini` | Seed 2.0 Mini | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、VIDEO_INPUT | 0.1 |
| `seed-1.6` | Seed 1.6 | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、VIDEO_INPUT | 0.25 |

**MiniMax 稀宇科技（`minimax`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `minimax-m3` | MiniMax M3 | CHAT | 1,048,576 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、VIDEO_INPUT、PROMPT_CACHE | 0.3 |
| `minimax-m2.7` | MiniMax M2.7 | CHAT | 204,800 | STREAMING、TOOL_CALLING、JSON_MODE、REASONING、PROMPT_CACHE | 0.21 |
| `minimax-m2.5` | MiniMax M2.5 | CHAT | 204,800 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、PROMPT_CACHE | 0.27 |
| `minimax-m1` | MiniMax M1 | CHAT | 1,000,000 | STREAMING、TOOL_CALLING、REASONING | 0.55 |

**腾讯混元 Hunyuan（`tencent`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `hunyuan-hy4` | 混元 HY4 Preview | CHAT | 1,048,576 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、PROMPT_CACHE | 0.834 |
| `hunyuan-hy3` | 混元 HY3 | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、PROMPT_CACHE | 0.132 |
| `hunyuan-hy3-preview` | 混元 HY3 Preview | CHAT | 262,144 | STREAMING、TOOL_CALLING、REASONING、PROMPT_CACHE | 0.18 |
| `hunyuan-a13b-instruct` | 混元 A13B Instruct | CHAT | 131,072 | STREAMING、JSON_MODE、STRUCTURED_OUTPUT、REASONING | 0.14 |

**百度智能云千帆 文心（`baidu`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `ernie-4.5-vl-424b` | 文心 ERNIE 4.5 VL 424B | CHAT | 123,000 | STREAMING、REASONING、VISION_INPUT | 0.42 |

**阶跃星辰 StepFun（`stepfun`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `step-3.7-flash` | Step 3.7 Flash | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、VIDEO_INPUT、PROMPT_CACHE | 0.2 |
| `step-3.5-flash` | Step 3.5 Flash | CHAT | 262,144 | STREAMING、TOOL_CALLING、REASONING | 0.1 |

**xAI Grok（`xai`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `grok-4.7` | Grok 4.7 | CHAT | 500,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 2.0 |
| `grok-4.6` | Grok 4.6 | CHAT | 500,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 2.0 |
| `grok-4.5` | Grok 4.5 | CHAT | 500,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 2.0 |
| `grok-4.20` | Grok 4.20 | CHAT | 2,000,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT、PROMPT_CACHE、WEB_SEARCH | 1.25 |

**Meta Llama（`meta`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `llama-4-maverick` | Llama 4 Maverick | CHAT | 1,048,576 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、VISION_INPUT | 0.1875 |
| `llama-4-scout` | Llama 4 Scout | CHAT | 1,310,720 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、VISION_INPUT | 0.1 |
| `llama-3.3-70b-instruct` | Llama 3.3 70B Instruct | CHAT | 131,072 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、PROMPT_CACHE | 0.22 |
| `llama-guard-4-12b` | Llama Guard 4 12B | CHAT | 163,840 | STREAMING、VISION_INPUT | 0.18 |

**Mistral AI（`mistral`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `mistral-large-2512` | Mistral Large 2512 | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、VISION_INPUT、FILE_INPUT、PROMPT_CACHE | 0.5 |
| `mistral-medium-3-5` | Mistral Medium 3.5 | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、FILE_INPUT | 1.5 |
| `mistral-small-2603` | Mistral Small 2603 | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、PROMPT_CACHE | 0.15 |
| `devstral-2512` | Devstral 2512 | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、FILE_INPUT、PROMPT_CACHE | 0.4 |
| `voxtral-small-24b` | Voxtral Small 24B | AUDIO | 32,768 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、AUDIO_INPUT、FILE_INPUT、PROMPT_CACHE | 0.1 |

**Cohere（`cohere`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `command-a-plus` | Command A Plus | CHAT | 192,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、PROMPT_CACHE | 0.3 |
| `command-a` | Command A | CHAT | 256,000 | STREAMING、JSON_MODE、STRUCTURED_OUTPUT | 2.5 |
| `command-r-plus-08-2024` | Command R+ 08-2024 | CHAT | 128,000 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT | 2.5 |
| `command-r7b-12-2024` | Command R7B 12-2024 | CHAT | 128,000 | STREAMING、JSON_MODE、STRUCTURED_OUTPUT | 0.0375 |

**Amazon Bedrock（`amazon`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `nova-2-lite-v1` | Amazon Nova 2 Lite | CHAT | 1,000,000 | STREAMING、TOOL_CALLING、REASONING、VISION_INPUT、VIDEO_INPUT、FILE_INPUT | 0.3 |
| `nova-premier-v1` | Amazon Nova Premier | CHAT | 1,000,000 | STREAMING、TOOL_CALLING、VISION_INPUT、PROMPT_CACHE | 2.5 |
| `nova-pro-v1` | Amazon Nova Pro | CHAT | 300,000 | STREAMING、TOOL_CALLING、VISION_INPUT | 0.8 |
| `nova-micro-v1` | Amazon Nova Micro | CHAT | 128,000 | STREAMING、TOOL_CALLING | 0.035 |

**Microsoft Azure AI（`microsoft`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `phi-4` | Phi-4 | CHAT | 16,384 | STREAMING、JSON_MODE、STRUCTURED_OUTPUT | 0.07 |
| `wizardlm-2-8x22b` | WizardLM-2 8x22B | CHAT | 65,535 | STREAMING、JSON_MODE | 0.62 |

**NVIDIA NIM（`nvidia`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `nemotron-3.5-lightning` | Nemotron 3.5 Lightning | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、PROMPT_CACHE | 0.06 |
| `nemotron-3-ultra` | Nemotron 3 Ultra 550B | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、PROMPT_CACHE | 0.5 |
| `nemotron-3-super` | Nemotron 3 Super 120B | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING | 0.08 |
| `nemotron-3-nano` | Nemotron 3 Nano 30B | CHAT | 262,144 | STREAMING、TOOL_CALLING、JSON_MODE、STRUCTURED_OUTPUT、REASONING、PROMPT_CACHE | 0.05 |

**Perplexity（`perplexity`）**

| 模型编码 | 模型名称 | 类型 | 上下文 | 能力 | 输入价(USD/M) |
| --- | --- | --- | --- | --- | --- |
| `sonar-pro-search` | Sonar Pro Search | CHAT | 200,000 | STREAMING、STRUCTURED_OUTPUT、REASONING、VISION_INPUT、WEB_SEARCH | 3.0 |
| `sonar-reasoning-pro` | Sonar Reasoning Pro | CHAT | 128,000 | STREAMING、REASONING、VISION_INPUT、WEB_SEARCH | 2.0 |
| `sonar-deep-research` | Sonar Deep Research | CHAT | 128,000 | STREAMING、REASONING、WEB_SEARCH | 2.0 |

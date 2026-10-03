# 模型运行时账户池

模型运行时服务为平台模型提供 OpenAI-compatible 接口。服务名为 `hucoo-model-runtime`，默认端口 `8082`；Gateway 会把 `/api/model/**` 转发到该服务。

## 快速配置

开发环境可以先启动运行时服务，再通过管理端创建账户：

```http
POST /api/admin/v1/models/accounts
Content-Type: application/json

{
  "providerCode": "deepseek",
  "modelCode": "deepseek-chat",
  "accountName": "deepseek-account-a",
  "endpoint": "https://api.deepseek.com",
  "apiKey": "sk-...",
  "configuredWeight": 2,
  "maxConcurrency": 10,
  "lowBalanceThreshold": 20,
  "hardStopBalanceThreshold": 5
}
```

`apiKey` 只用于创建时写入运行时 SecretStore，响应只返回指纹。开发环境使用内存 SecretStore；生产环境应替换为 Vault/KMS 实现，并打开 Flyway 的 `V12__model_runtime_routing_schema.sql`。

## 模型调用

```http
POST /api/model/v1/chat/completions
Content-Type: application/json

{
  "model": "deepseek-chat",
  "messages": [{"role": "user", "content": "你好"}],
  "stream": false
}
```

运行时会按账户有效权重选择 Key。余额不足、429、超时、连接异常和供应商 5xx 会切换到同模型的其他账户；参数错误和内容审核失败不会自动重试。流式响应已经输出内容后不会透明重试。

## 运行时配置

配置前缀为 `agent-platform.model-runtime`，常用字段包括 `max-attempts`、`response-timeout`、`stream-idle-timeout`、`circuit-failure-threshold` 和 `circuit-open-seconds`。当前运行时账户池使用内存实现，V12 已提供生产持久化所需表结构；部署生产环境前需要接入 Vault/KMS 和账户仓储实现。

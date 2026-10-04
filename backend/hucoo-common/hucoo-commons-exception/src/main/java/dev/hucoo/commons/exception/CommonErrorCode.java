package dev.hucoo.commons.exception;

public enum CommonErrorCode implements ErrorCode {

    SUCCESS(200, "success", "platform"),
    BAD_REQUEST(400, "请求参数不合法", "platform"),
    UNAUTHORIZED(401, "未认证或凭证已过期", "platform"),
    FORBIDDEN(403, "无权访问该资源", "platform"),
    NOT_FOUND(404, "资源不存在", "platform"),
    METHOD_NOT_ALLOWED(405, "请求方法不支持", "platform"),
    CONFLICT(409, "数据冲突", "platform"),
    TOO_MANY_REQUESTS(429, "请求过于频繁", "platform"),
    PAYLOAD_TOO_LARGE(413, "上传内容超过大小限制", "platform"),
    INTERNAL_ERROR(500, "系统内部错误", "platform"),
    SERVICE_UNAVAILABLE(503, "下游服务不可用", "platform"),
    IDEMPOTENCY_KEY_CONFLICT(400001, "幂等键与原请求不匹配", "platform"),
    ASYNC_JOB_NOT_FOUND(400002, "异步任务不存在", "platform"),

    TENANT_NOT_FOUND(100001, "租户不存在", "tenant"),
    TENANT_DISABLED(100002, "租户已被禁用", "tenant"),
    TENANT_QUOTA_EXCEEDED(100003, "租户配额已超限", "tenant"),

    USER_NOT_FOUND(110001, "用户不存在", "identity"),
    USER_DISABLED(110002, "用户已被禁用", "identity"),
    API_KEY_INVALID(110003, "API Key 无效", "identity"),
    AUTHENTICATION_FAILED(110004, "账号或凭证错误", "identity"),
    AUTHENTICATION_METHOD_DISABLED(110005, "认证方式未启用", "identity"),
    ACCOUNT_PENDING_ACTIVATION(110006, "账号尚未激活", "identity"),
    VERIFICATION_CODE_INVALID(110007, "验证码错误或已过期", "identity"),
    VERIFICATION_CODE_RATE_LIMITED(110008, "验证码发送过于频繁", "identity"),
    REFRESH_TOKEN_INVALID(110009, "刷新令牌无效", "identity"),
    REFRESH_TOKEN_REUSED(110010, "刷新令牌已被重复使用", "identity"),
    TENANT_MEMBERSHIP_REQUIRED(110011, "用户尚未加入可访问的租户", "identity"),
    AUTH_PROVIDER_UNAVAILABLE(110012, "认证提供方暂不可用", "identity"),

    MODEL_NOT_FOUND(120001, "模型不存在", "model-governance"),
    MODEL_ROUTE_FAILED(120002, "模型路由失败", "model-governance"),

    MCP_SERVER_NOT_FOUND(130001, "MCP Server 不存在", "tool-mcp"),
    MCP_NETWORK_POLICY_DENIED(130002, "网络策略拒绝访问", "tool-mcp"),

    AGENT_NOT_FOUND(140001, "Agent 模板不存在", "agent"),
    AGENT_REVIEW_REJECTED(140002, "Agent 模板审核未通过", "agent"),

    PROJECT_NOT_FOUND(150001, "项目不存在", "project"),
    WORKSPACE_POLICY_VIOLATION(150002, "工作区策略校验失败", "project"),

    BILLING_QUOTA_EXCEEDED(160001, "计费配额不足", "billing"),

    AUDIT_LOG_NOT_FOUND(170001, "审计日志不存在", "audit"),

    SECURITY_POLICY_VIOLATION(180001, "安全策略校验失败", "security"),

    ALERT_RULE_NOT_FOUND(190001, "告警规则不存在", "monitoring"),

    INTEGRATION_NOT_FOUND(200001, "集成应用不存在", "integration"),
    INTEGRATION_CALLBACK_FAILED(200002, "集成回调失败", "integration"),

    APPROVAL_NOT_FOUND(210001, "审批申请不存在", "identity"),
    APPROVAL_STATE_CONFLICT(210002, "审批申请状态不允许该操作", "identity"),

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

    private final int code;
    private final String message;
    private final String module;

    CommonErrorCode(int code, String message, String module) {
        this.code = code;
        this.message = message;
        this.module = module;
    }

    @Override
    public int getCode() {
        return code;
    }

    @Override
    public String getMessage() {
        return message;
    }

    @Override
    public String getModule() {
        return module;
    }
}

-- Agent Platform admin schema (placeholder migration scripts, Flyway disabled by default)
-- Enable with: spring.flyway.enabled=true (see application-prod.yml)

CREATE TABLE IF NOT EXISTS ap_tenant (
    id            BIGINT       NOT NULL PRIMARY KEY,
    tenant_code   VARCHAR(64)  NOT NULL,
    tenant_name   VARCHAR(128) NOT NULL,
    contact_email VARCHAR(128),
    plan_code     VARCHAR(64),
    status        INT          DEFAULT 1,
    expire_at     TIMESTAMP(6),
    tenant_id     VARCHAR(64)  DEFAULT '000000',
    version       INT          DEFAULT 0,
    deleted       INT          DEFAULT 0,
    created_at    TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_user_account (
    id           BIGINT       NOT NULL PRIMARY KEY,
    username     VARCHAR(64)  NOT NULL,
    display_name VARCHAR(128),
    email        VARCHAR(128),
    phone        VARCHAR(32),
    role_code    VARCHAR(64),
    status       INT          DEFAULT 1,
    tenant_id    VARCHAR(64)  DEFAULT '000000',
    version      INT          DEFAULT 0,
    deleted      INT          DEFAULT 0,
    created_at   TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_model_definition (
    id         BIGINT       NOT NULL PRIMARY KEY,
    model_code VARCHAR(64)  NOT NULL,
    model_name VARCHAR(128) NOT NULL,
    provider   VARCHAR(64),
    model_type VARCHAR(64),
    endpoint   VARCHAR(256),
    status     INT          DEFAULT 1,
    tenant_id  VARCHAR(64)  DEFAULT '000000',
    version    INT          DEFAULT 0,
    deleted    INT          DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_mcp_server (
    id             BIGINT       NOT NULL PRIMARY KEY,
    server_code    VARCHAR(64)  NOT NULL,
    server_name    VARCHAR(128) NOT NULL,
    endpoint       VARCHAR(256),
    transport      VARCHAR(32),
    review_status  INT          DEFAULT 0,
    network_policy VARCHAR(256),
    tenant_id      VARCHAR(64)  DEFAULT '000000',
    version        INT          DEFAULT 0,
    deleted        INT          DEFAULT 0,
    created_at     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_agent_template (
    id             BIGINT       NOT NULL PRIMARY KEY,
    agent_code     VARCHAR(64)  NOT NULL,
    agent_name     VARCHAR(128) NOT NULL,
    category       VARCHAR(64),
    description    VARCHAR(512),
    latest_version VARCHAR(32),
    review_status  INT          DEFAULT 0,
    tenant_id      VARCHAR(64)  DEFAULT '000000',
    version        INT          DEFAULT 0,
    deleted        INT          DEFAULT 0,
    created_at     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_project_workspace (
    id               BIGINT       NOT NULL PRIMARY KEY,
    project_code     VARCHAR(64)  NOT NULL,
    project_name     VARCHAR(128) NOT NULL,
    owner_id         BIGINT,
    workspace_policy VARCHAR(256),
    repository_url   VARCHAR(512),
    status           INT          DEFAULT 1,
    tenant_id        VARCHAR(64)  DEFAULT '000000',
    version          INT          DEFAULT 0,
    deleted          INT          DEFAULT 0,
    created_at       TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_usage_record (
    id                BIGINT        NOT NULL PRIMARY KEY,
    billing_tenant_id BIGINT,
    usage_type        VARCHAR(64),
    model_code        VARCHAR(64),
    quantity          BIGINT,
    unit_price        DECIMAL(18, 6),
    amount            DECIMAL(18, 6),
    period            VARCHAR(32),
    tenant_id         VARCHAR(64)   DEFAULT '000000',
    version           INT           DEFAULT 0,
    deleted           INT           DEFAULT 0,
    created_at        TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_audit_log (
    id            BIGINT       NOT NULL PRIMARY KEY,
    operator_id   BIGINT,
    operator_name VARCHAR(128),
    action        VARCHAR(64),
    resource_type VARCHAR(64),
    resource_id   VARCHAR(128),
    result        INT,
    client_ip     VARCHAR(64),
    tenant_id     VARCHAR(64)  DEFAULT '000000',
    version       INT          DEFAULT 0,
    deleted       INT          DEFAULT 0,
    created_at    TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_security_policy (
    id             BIGINT       NOT NULL PRIMARY KEY,
    policy_code    VARCHAR(64)  NOT NULL,
    policy_name    VARCHAR(128) NOT NULL,
    policy_type    VARCHAR(64),
    policy_content VARCHAR(1024),
    enabled        INT          DEFAULT 1,
    tenant_id      VARCHAR(64)  DEFAULT '000000',
    version        INT          DEFAULT 0,
    deleted        INT          DEFAULT 0,
    created_at     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_alert_rule (
    id              BIGINT       NOT NULL PRIMARY KEY,
    rule_code       VARCHAR(64)  NOT NULL,
    rule_name       VARCHAR(128) NOT NULL,
    metric_name     VARCHAR(128),
    threshold_value DECIMAL(18, 6),
    alert_level     VARCHAR(32),
    notify_channel  VARCHAR(64),
    enabled         INT          DEFAULT 1,
    tenant_id       VARCHAR(64)  DEFAULT '000000',
    version         INT          DEFAULT 0,
    deleted         INT          DEFAULT 0,
    created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_integration_app (
    id               BIGINT       NOT NULL PRIMARY KEY,
    app_code         VARCHAR(64)  NOT NULL,
    app_name         VARCHAR(128) NOT NULL,
    integration_type VARCHAR(64),
    webhook_url      VARCHAR(512),
    oauth_client_id  VARCHAR(128),
    status           INT          DEFAULT 1,
    tenant_id        VARCHAR(64)  DEFAULT '000000',
    version          INT          DEFAULT 0,
    deleted          INT          DEFAULT 0,
    created_at       TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ap_tenant IS '租户信息表';
COMMENT ON TABLE ap_user_account IS '用户账号表';
COMMENT ON TABLE ap_model_definition IS '模型定义表';
COMMENT ON TABLE ap_mcp_server IS 'MCP Server 注册表';
COMMENT ON TABLE ap_agent_template IS 'Agent 模板表';
COMMENT ON TABLE ap_project_workspace IS '项目工作区表';
COMMENT ON TABLE ap_usage_record IS '用量记录表';
COMMENT ON TABLE ap_audit_log IS '审计日志表';
COMMENT ON TABLE ap_security_policy IS '安全策略表';
COMMENT ON TABLE ap_alert_rule IS '告警规则表';
COMMENT ON TABLE ap_integration_app IS '集成应用表';

COMMENT ON COLUMN ap_tenant.id IS '主键 ID';
COMMENT ON COLUMN ap_tenant.tenant_code IS '租户编码';
COMMENT ON COLUMN ap_tenant.tenant_name IS '租户名称';
COMMENT ON COLUMN ap_tenant.contact_email IS '联系邮箱';
COMMENT ON COLUMN ap_tenant.plan_code IS '套餐编码';
COMMENT ON COLUMN ap_tenant.status IS '状态：1 启用，0 停用';
COMMENT ON COLUMN ap_tenant.expire_at IS '到期时间';
COMMENT ON COLUMN ap_tenant.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_tenant.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_tenant.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_tenant.created_at IS '创建时间';
COMMENT ON COLUMN ap_tenant.updated_at IS '更新时间';

COMMENT ON COLUMN ap_user_account.id IS '主键 ID';
COMMENT ON COLUMN ap_user_account.username IS '登录用户名';
COMMENT ON COLUMN ap_user_account.display_name IS '显示名称';
COMMENT ON COLUMN ap_user_account.email IS '电子邮箱';
COMMENT ON COLUMN ap_user_account.phone IS '手机号码';
COMMENT ON COLUMN ap_user_account.role_code IS '角色编码';
COMMENT ON COLUMN ap_user_account.status IS '状态：1 启用，0 停用';
COMMENT ON COLUMN ap_user_account.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_user_account.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_user_account.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_user_account.created_at IS '创建时间';
COMMENT ON COLUMN ap_user_account.updated_at IS '更新时间';

COMMENT ON COLUMN ap_model_definition.id IS '主键 ID';
COMMENT ON COLUMN ap_model_definition.model_code IS '模型编码';
COMMENT ON COLUMN ap_model_definition.model_name IS '模型名称';
COMMENT ON COLUMN ap_model_definition.provider IS '模型提供方';
COMMENT ON COLUMN ap_model_definition.model_type IS '模型类型';
COMMENT ON COLUMN ap_model_definition.endpoint IS '模型服务地址';
COMMENT ON COLUMN ap_model_definition.status IS '状态：1 启用，0 停用';
COMMENT ON COLUMN ap_model_definition.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_definition.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_definition.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_definition.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_definition.updated_at IS '更新时间';

COMMENT ON COLUMN ap_mcp_server.id IS '主键 ID';
COMMENT ON COLUMN ap_mcp_server.server_code IS 'MCP Server 编码';
COMMENT ON COLUMN ap_mcp_server.server_name IS 'MCP Server 名称';
COMMENT ON COLUMN ap_mcp_server.endpoint IS 'MCP Server 服务地址';
COMMENT ON COLUMN ap_mcp_server.transport IS '传输协议';
COMMENT ON COLUMN ap_mcp_server.review_status IS '审核状态';
COMMENT ON COLUMN ap_mcp_server.network_policy IS '网络策略配置';
COMMENT ON COLUMN ap_mcp_server.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_mcp_server.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_mcp_server.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_mcp_server.created_at IS '创建时间';
COMMENT ON COLUMN ap_mcp_server.updated_at IS '更新时间';

COMMENT ON COLUMN ap_agent_template.id IS '主键 ID';
COMMENT ON COLUMN ap_agent_template.agent_code IS 'Agent 模板编码';
COMMENT ON COLUMN ap_agent_template.agent_name IS 'Agent 模板名称';
COMMENT ON COLUMN ap_agent_template.category IS '模板分类';
COMMENT ON COLUMN ap_agent_template.description IS '模板描述';
COMMENT ON COLUMN ap_agent_template.latest_version IS '最新版本号';
COMMENT ON COLUMN ap_agent_template.review_status IS '审核状态';
COMMENT ON COLUMN ap_agent_template.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_agent_template.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_agent_template.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_agent_template.created_at IS '创建时间';
COMMENT ON COLUMN ap_agent_template.updated_at IS '更新时间';

COMMENT ON COLUMN ap_project_workspace.id IS '主键 ID';
COMMENT ON COLUMN ap_project_workspace.project_code IS '项目编码';
COMMENT ON COLUMN ap_project_workspace.project_name IS '项目名称';
COMMENT ON COLUMN ap_project_workspace.owner_id IS '项目负责人 ID';
COMMENT ON COLUMN ap_project_workspace.workspace_policy IS '工作区策略配置';
COMMENT ON COLUMN ap_project_workspace.repository_url IS '代码仓库地址';
COMMENT ON COLUMN ap_project_workspace.status IS '状态：1 启用，0 停用';
COMMENT ON COLUMN ap_project_workspace.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_project_workspace.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_project_workspace.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_project_workspace.created_at IS '创建时间';
COMMENT ON COLUMN ap_project_workspace.updated_at IS '更新时间';

COMMENT ON COLUMN ap_usage_record.id IS '主键 ID';
COMMENT ON COLUMN ap_usage_record.billing_tenant_id IS '计费租户 ID';
COMMENT ON COLUMN ap_usage_record.usage_type IS '用量类型';
COMMENT ON COLUMN ap_usage_record.model_code IS '模型编码';
COMMENT ON COLUMN ap_usage_record.quantity IS '使用量';
COMMENT ON COLUMN ap_usage_record.unit_price IS '单位价格';
COMMENT ON COLUMN ap_usage_record.amount IS '费用金额';
COMMENT ON COLUMN ap_usage_record.period IS '计费周期';
COMMENT ON COLUMN ap_usage_record.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_usage_record.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_usage_record.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_usage_record.created_at IS '创建时间';
COMMENT ON COLUMN ap_usage_record.updated_at IS '更新时间';

COMMENT ON COLUMN ap_audit_log.id IS '主键 ID';
COMMENT ON COLUMN ap_audit_log.operator_id IS '操作人 ID';
COMMENT ON COLUMN ap_audit_log.operator_name IS '操作人名称';
COMMENT ON COLUMN ap_audit_log.action IS '操作动作';
COMMENT ON COLUMN ap_audit_log.resource_type IS '资源类型';
COMMENT ON COLUMN ap_audit_log.resource_id IS '资源标识';
COMMENT ON COLUMN ap_audit_log.result IS '执行结果';
COMMENT ON COLUMN ap_audit_log.client_ip IS '客户端 IP 地址';
COMMENT ON COLUMN ap_audit_log.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_audit_log.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_audit_log.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_audit_log.created_at IS '创建时间';
COMMENT ON COLUMN ap_audit_log.updated_at IS '更新时间';

COMMENT ON COLUMN ap_security_policy.id IS '主键 ID';
COMMENT ON COLUMN ap_security_policy.policy_code IS '策略编码';
COMMENT ON COLUMN ap_security_policy.policy_name IS '策略名称';
COMMENT ON COLUMN ap_security_policy.policy_type IS '策略类型';
COMMENT ON COLUMN ap_security_policy.policy_content IS '策略内容';
COMMENT ON COLUMN ap_security_policy.enabled IS '是否启用：1 是，0 否';
COMMENT ON COLUMN ap_security_policy.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_security_policy.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_security_policy.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_security_policy.created_at IS '创建时间';
COMMENT ON COLUMN ap_security_policy.updated_at IS '更新时间';

COMMENT ON COLUMN ap_alert_rule.id IS '主键 ID';
COMMENT ON COLUMN ap_alert_rule.rule_code IS '规则编码';
COMMENT ON COLUMN ap_alert_rule.rule_name IS '规则名称';
COMMENT ON COLUMN ap_alert_rule.metric_name IS '监控指标名称';
COMMENT ON COLUMN ap_alert_rule.threshold_value IS '告警阈值';
COMMENT ON COLUMN ap_alert_rule.alert_level IS '告警级别';
COMMENT ON COLUMN ap_alert_rule.notify_channel IS '通知渠道';
COMMENT ON COLUMN ap_alert_rule.enabled IS '是否启用：1 是，0 否';
COMMENT ON COLUMN ap_alert_rule.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_alert_rule.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_alert_rule.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_alert_rule.created_at IS '创建时间';
COMMENT ON COLUMN ap_alert_rule.updated_at IS '更新时间';

COMMENT ON COLUMN ap_integration_app.id IS '主键 ID';
COMMENT ON COLUMN ap_integration_app.app_code IS '集成应用编码';
COMMENT ON COLUMN ap_integration_app.app_name IS '集成应用名称';
COMMENT ON COLUMN ap_integration_app.integration_type IS '集成类型';
COMMENT ON COLUMN ap_integration_app.webhook_url IS 'Webhook 地址';
COMMENT ON COLUMN ap_integration_app.oauth_client_id IS 'OAuth 客户端 ID';
COMMENT ON COLUMN ap_integration_app.status IS '状态：1 启用，0 停用';
COMMENT ON COLUMN ap_integration_app.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_integration_app.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_integration_app.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_integration_app.created_at IS '创建时间';
COMMENT ON COLUMN ap_integration_app.updated_at IS '更新时间';

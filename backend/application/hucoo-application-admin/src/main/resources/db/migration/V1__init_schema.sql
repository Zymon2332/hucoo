-- Agent Platform admin schema (placeholder migration scripts, Flyway disabled by default)
-- Enable with: spring.flyway.enabled=true (see application-prod.yml)

CREATE TABLE IF NOT EXISTS ap_tenant (
    id            BIGINT       NOT NULL PRIMARY KEY,
    tenant_code   VARCHAR(64)  NOT NULL,
    tenant_name   VARCHAR(128) NOT NULL,
    contact_email VARCHAR(128),
    plan_code     VARCHAR(64),
    status        INT          DEFAULT 1,
    expire_at     DATETIME,
    tenant_id     VARCHAR(64)  DEFAULT '000000',
    version       INT          DEFAULT 0,
    deleted       INT          DEFAULT 0,
    created_at    DATETIME,
    updated_at    DATETIME
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
    created_at   DATETIME,
    updated_at   DATETIME
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
    created_at DATETIME,
    updated_at DATETIME
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
    created_at     DATETIME,
    updated_at     DATETIME
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
    created_at     DATETIME,
    updated_at     DATETIME
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
    created_at       DATETIME,
    updated_at       DATETIME
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
    created_at        DATETIME,
    updated_at        DATETIME
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
    created_at    DATETIME,
    updated_at    DATETIME
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
    created_at     DATETIME,
    updated_at     DATETIME
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
    created_at      DATETIME,
    updated_at      DATETIME
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
    created_at       DATETIME,
    updated_at       DATETIME
);

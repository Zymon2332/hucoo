CREATE TABLE IF NOT EXISTS ap_auth_identity_user (
    id              BIGINT       NOT NULL PRIMARY KEY,
    username        VARCHAR(64)  NOT NULL,
    display_name    VARCHAR(128),
    avatar_url      VARCHAR(512),
    status          VARCHAR(32)  NOT NULL DEFAULT 'PENDING',
    activated_at    TIMESTAMP(6),
    tenant_id       VARCHAR(64)  NOT NULL DEFAULT '000000',
    version         INT          NOT NULL DEFAULT 0,
    deleted         INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_auth_identity_user_username UNIQUE (username)
);

CREATE TABLE IF NOT EXISTS ap_auth_login_identity (
    id              BIGINT       NOT NULL PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    method          VARCHAR(32)  NOT NULL,
    identifier      VARCHAR(256),
    provider_subject VARCHAR(256),
    verified_at     TIMESTAMP(6),
    status          VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    tenant_id       VARCHAR(64)  NOT NULL DEFAULT '000000',
    version         INT          NOT NULL DEFAULT 0,
    deleted         INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_auth_login_identity_identifier UNIQUE (method, identifier),
    CONSTRAINT uk_auth_login_identity_provider UNIQUE (method, provider_subject)
);

CREATE TABLE IF NOT EXISTS ap_auth_password_credential (
    id              BIGINT       NOT NULL PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    password_hash   VARCHAR(512) NOT NULL,
    failed_attempts INT          NOT NULL DEFAULT 0,
    locked_until    TIMESTAMP(6),
    password_changed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tenant_id       VARCHAR(64)  NOT NULL DEFAULT '000000',
    version         INT          NOT NULL DEFAULT 0,
    deleted         INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_auth_password_user UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS ap_auth_tenant_membership (
    id              BIGINT       NOT NULL PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    organization_id BIGINT,
    membership_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    source          VARCHAR(32),
    default_membership INT        NOT NULL DEFAULT 0,
    tenant_id       VARCHAR(64)  NOT NULL,
    version         INT          NOT NULL DEFAULT 0,
    deleted         INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_auth_membership UNIQUE (user_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS ap_auth_verification_challenge (
    id              BIGINT       NOT NULL PRIMARY KEY,
    channel         VARCHAR(32)  NOT NULL,
    purpose         VARCHAR(32)  NOT NULL,
    destination     VARCHAR(256) NOT NULL,
    code_hash       VARCHAR(128) NOT NULL,
    expires_at      TIMESTAMP(6) NOT NULL,
    consumed_at     TIMESTAMP(6),
    attempts        INT          NOT NULL DEFAULT 0,
    tenant_id       VARCHAR(64)  NOT NULL DEFAULT '000000',
    version         INT          NOT NULL DEFAULT 0,
    deleted         INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_login_identity_user
    ON ap_auth_login_identity (user_id, method, status);
CREATE INDEX IF NOT EXISTS idx_auth_membership_user_status
    ON ap_auth_tenant_membership (user_id, membership_status);
CREATE INDEX IF NOT EXISTS idx_auth_verification_destination
    ON ap_auth_verification_challenge (channel, purpose, destination, created_at);

COMMENT ON TABLE ap_auth_identity_user IS '统一认证用户主体';
COMMENT ON TABLE ap_auth_login_identity IS '统一认证登录身份绑定';
COMMENT ON TABLE ap_auth_password_credential IS '统一认证密码凭据';
COMMENT ON TABLE ap_auth_tenant_membership IS '统一认证用户租户成员关系';
COMMENT ON TABLE ap_auth_verification_challenge IS '统一认证验证码挑战';

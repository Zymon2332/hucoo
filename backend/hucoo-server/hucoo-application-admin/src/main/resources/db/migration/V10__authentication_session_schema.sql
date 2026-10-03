CREATE TABLE IF NOT EXISTS ap_auth_refresh_session (
    id              BIGINT       NOT NULL PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    tenant_id       VARCHAR(64),
    client_id       VARCHAR(64)  NOT NULL,
    device_id       VARCHAR(128),
    token_hash      VARCHAR(128) NOT NULL,
    token_family    VARCHAR(128) NOT NULL,
    expires_at      TIMESTAMP(6) NOT NULL,
    revoked_at      TIMESTAMP(6),
    replaced_by     BIGINT,
    session_status  VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE',
    tenant_scope_id VARCHAR(64)  NOT NULL DEFAULT '000000',
    version         INT          NOT NULL DEFAULT 0,
    deleted         INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_auth_refresh_token_hash UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_user_status
    ON ap_auth_refresh_session (user_id, session_status, expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_family
    ON ap_auth_refresh_session (token_family, session_status);

COMMENT ON TABLE ap_auth_refresh_session IS '统一认证刷新会话';

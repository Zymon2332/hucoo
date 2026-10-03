CREATE TABLE IF NOT EXISTS ap_model_access_account (
    id BIGINT NOT NULL PRIMARY KEY,
    provider_id BIGINT,
    provider_code VARCHAR(64) NOT NULL,
    model_code VARCHAR(128) NOT NULL,
    account_name VARCHAR(128) NOT NULL,
    endpoint VARCHAR(512) NOT NULL,
    model_key_id BIGINT,
    key_fingerprint VARCHAR(128) NOT NULL,
    configured_weight INT NOT NULL DEFAULT 1,
    max_concurrency INT NOT NULL DEFAULT 0,
    balance NUMERIC(18,6),
    low_balance_threshold NUMERIC(18,6),
    hard_stop_balance_threshold NUMERIC(18,6),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_model_access_account UNIQUE (tenant_id, provider_code, model_code, key_fingerprint)
);

CREATE TABLE IF NOT EXISTS ap_model_route_policy (
    id BIGINT NOT NULL PRIMARY KEY,
    provider_code VARCHAR(64) NOT NULL,
    model_code VARCHAR(128) NOT NULL,
    scope_type VARCHAR(32) NOT NULL DEFAULT 'PLATFORM',
    scope_id VARCHAR(128),
    selection_algorithm VARCHAR(64) NOT NULL DEFAULT 'SMOOTH_WEIGHTED_ROUND_ROBIN',
    max_attempts INT NOT NULL DEFAULT 3,
    connect_timeout_ms BIGINT NOT NULL DEFAULT 2000,
    response_timeout_ms BIGINT NOT NULL DEFAULT 30000,
    stream_idle_timeout_ms BIGINT NOT NULL DEFAULT 60000,
    circuit_failure_threshold INT NOT NULL DEFAULT 5,
    circuit_window_seconds INT NOT NULL DEFAULT 60,
    circuit_open_seconds INT NOT NULL DEFAULT 30,
    retryable_failure_classes TEXT,
    fallback_chain TEXT,
    enabled INT NOT NULL DEFAULT 1,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_model_route_policy UNIQUE (tenant_id, provider_code, model_code, scope_type, scope_id)
);

CREATE TABLE IF NOT EXISTS ap_model_route_target (
    id BIGINT NOT NULL PRIMARY KEY,
    route_policy_id BIGINT NOT NULL,
    provider_id BIGINT,
    model_code VARCHAR(128) NOT NULL,
    model_key_id BIGINT,
    endpoint_override VARCHAR(512),
    configured_weight INT NOT NULL DEFAULT 1,
    max_concurrency INT NOT NULL DEFAULT 0,
    priority INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_model_account_runtime_state (
    id BIGINT NOT NULL PRIMARY KEY,
    target_id BIGINT NOT NULL,
    circuit_state VARCHAR(32) NOT NULL DEFAULT 'CLOSED',
    effective_weight NUMERIC(18,6) NOT NULL DEFAULT 1,
    health_score NUMERIC(10,6) NOT NULL DEFAULT 1,
    latency_ewma NUMERIC(18,6),
    rolling_request_count BIGINT NOT NULL DEFAULT 0,
    rolling_success_count BIGINT NOT NULL DEFAULT 0,
    rolling_failure_count BIGINT NOT NULL DEFAULT 0,
    rolling_rate_limit_count BIGINT NOT NULL DEFAULT 0,
    consecutive_failures INT NOT NULL DEFAULT 0,
    cooldown_until TIMESTAMP(6),
    last_balance NUMERIC(18,6),
    last_balance_checked_at TIMESTAMP(6),
    state_version BIGINT NOT NULL DEFAULT 0,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_model_account_runtime_state UNIQUE (tenant_id, target_id)
);

CREATE TABLE IF NOT EXISTS ap_model_balance_snapshot (
    id BIGINT NOT NULL PRIMARY KEY,
    target_id BIGINT NOT NULL,
    provider_code VARCHAR(64) NOT NULL,
    balance NUMERIC(18,6),
    currency VARCHAR(8),
    balance_status VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',
    source VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
    observed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_model_invocation (
    id BIGINT NOT NULL PRIMARY KEY,
    request_id VARCHAR(128) NOT NULL,
    trace_id VARCHAR(128),
    project_id BIGINT,
    requested_model VARCHAR(128) NOT NULL,
    effective_model VARCHAR(128),
    provider_code VARCHAR(64),
    target_id BIGINT,
    key_fingerprint VARCHAR(128),
    attempt_no INT NOT NULL DEFAULT 1,
    stream INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL,
    failure_class VARCHAR(64),
    fallback_reason VARCHAR(512),
    input_tokens BIGINT,
    output_tokens BIGINT,
    total_tokens BIGINT,
    latency_ms BIGINT,
    amount NUMERIC(18,6),
    request_hash VARCHAR(128),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_model_event_outbox (
    id BIGINT NOT NULL PRIMARY KEY,
    event_type VARCHAR(128) NOT NULL,
    aggregate_id VARCHAR(128),
    payload TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMP(6),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ap_model_access_account_model ON ap_model_access_account (tenant_id, provider_code, model_code, status);
CREATE INDEX IF NOT EXISTS idx_ap_model_access_account_balance ON ap_model_access_account (tenant_id, balance, status);
CREATE INDEX IF NOT EXISTS idx_ap_model_invocation_created ON ap_model_invocation (tenant_id, created_at);

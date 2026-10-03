CREATE TABLE IF NOT EXISTS ap_model_capability (
    id BIGINT NOT NULL PRIMARY KEY,
    model_id BIGINT NOT NULL,
    capability_code VARCHAR(64) NOT NULL,
    enabled INT NOT NULL DEFAULT 1,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_model_capability UNIQUE (tenant_id, model_id, capability_code)
);

CREATE TABLE IF NOT EXISTS ap_model_price (
    id BIGINT NOT NULL PRIMARY KEY,
    model_id BIGINT NOT NULL,
    input_price NUMERIC(18,6) NOT NULL DEFAULT 0,
    output_price NUMERIC(18,6) NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    effective_from TIMESTAMP(6),
    effective_to TIMESTAMP(6),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_model_key (
    id BIGINT NOT NULL PRIMARY KEY,
    key_name VARCHAR(128) NOT NULL,
    key_ref VARCHAR(256) NOT NULL,
    key_fingerprint VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMP(6),
    last_rotated_at TIMESTAMP(6),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_model_key_fingerprint UNIQUE (tenant_id, key_fingerprint)
);

CREATE TABLE IF NOT EXISTS ap_model_key_rotation (
    id BIGINT NOT NULL PRIMARY KEY,
    key_id BIGINT NOT NULL,
    old_fingerprint VARCHAR(128),
    new_fingerprint VARCHAR(128) NOT NULL,
    reason VARCHAR(512),
    rotated_by BIGINT,
    rotated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_provider_route (
    id BIGINT NOT NULL PRIMARY KEY,
    routing_rule_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    model_code VARCHAR(128) NOT NULL,
    priority INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_tool_version (
    id BIGINT NOT NULL PRIMARY KEY,
    tool_id BIGINT NOT NULL,
    version_code VARCHAR(64) NOT NULL,
    parameter_schema TEXT,
    release_status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_tool_version UNIQUE (tenant_id, tool_id, version_code)
);

CREATE TABLE IF NOT EXISTS ap_tool_review (
    id BIGINT NOT NULL PRIMARY KEY,
    tool_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    reviewer_id BIGINT,
    reason VARCHAR(1024),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_mcp_server_tool (
    id BIGINT NOT NULL PRIMARY KEY,
    server_id BIGINT NOT NULL,
    tool_id BIGINT NOT NULL,
    allow_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_mcp_server_tool UNIQUE (tenant_id, server_id, tool_id)
);

CREATE TABLE IF NOT EXISTS ap_market_review (
    id BIGINT NOT NULL PRIMARY KEY,
    listing_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    reviewer_id BIGINT,
    reason VARCHAR(1024),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_market_report (
    id BIGINT NOT NULL PRIMARY KEY,
    listing_id BIGINT NOT NULL,
    reporter_id BIGINT,
    reason VARCHAR(1024) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_project (
    id BIGINT NOT NULL PRIMARY KEY,
    project_code VARCHAR(128) NOT NULL,
    project_name VARCHAR(256) NOT NULL,
    owner_id BIGINT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_project_code UNIQUE (tenant_id, project_code)
);

CREATE TABLE IF NOT EXISTS ap_project_member (
    id BIGINT NOT NULL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    member_role VARCHAR(64) NOT NULL DEFAULT 'MEMBER',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_project_member UNIQUE (tenant_id, project_id, user_id)
);

CREATE TABLE IF NOT EXISTS ap_workspace (
    id BIGINT NOT NULL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    workspace_code VARCHAR(128) NOT NULL,
    repository_url VARCHAR(512),
    status VARCHAR(32) NOT NULL DEFAULT 'STOPPED',
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_workspace_code UNIQUE (tenant_id, project_id, workspace_code)
);

CREATE TABLE IF NOT EXISTS ap_sandbox_image (
    id BIGINT NOT NULL PRIMARY KEY,
    sandbox_id BIGINT NOT NULL,
    image_ref VARCHAR(512) NOT NULL,
    digest VARCHAR(256),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_environment_variable (
    id BIGINT NOT NULL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    variable_name VARCHAR(128) NOT NULL,
    value_ref VARCHAR(256) NOT NULL,
    sensitive INT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_environment_variable UNIQUE (tenant_id, project_id, variable_name)
);

CREATE TABLE IF NOT EXISTS ap_sensitive_file_policy (
    id BIGINT NOT NULL PRIMARY KEY,
    project_id BIGINT NOT NULL,
    pattern VARCHAR(512) NOT NULL,
    effect VARCHAR(32) NOT NULL DEFAULT 'BLOCK',
    enabled INT NOT NULL DEFAULT 1,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_invoice_item (
    id BIGINT NOT NULL PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    item_type VARCHAR(64) NOT NULL,
    description VARCHAR(512),
    quantity NUMERIC(18,6) NOT NULL DEFAULT 0,
    unit_price NUMERIC(18,6) NOT NULL DEFAULT 0,
    amount NUMERIC(18,6) NOT NULL DEFAULT 0,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_cost_allocation (
    id BIGINT NOT NULL PRIMARY KEY,
    center_id BIGINT NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id BIGINT,
    amount NUMERIC(18,6) NOT NULL DEFAULT 0,
    period VARCHAR(32) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_cost_simulation (
    id BIGINT NOT NULL PRIMARY KEY,
    simulation_name VARCHAR(128) NOT NULL,
    input_json TEXT NOT NULL,
    result_json TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_audit_export_job (
    id BIGINT NOT NULL PRIMARY KEY,
    job_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    filter_json TEXT,
    file_ref VARCHAR(512),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_audit_export_job UNIQUE (tenant_id, job_id)
);

CREATE TABLE IF NOT EXISTS ap_kms_key (
    id BIGINT NOT NULL PRIMARY KEY,
    key_ref VARCHAR(256) NOT NULL,
    key_fingerprint VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    rotated_at TIMESTAMP(6),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_kms_key_ref UNIQUE (tenant_id, key_ref)
);

CREATE TABLE IF NOT EXISTS ap_compliance_evidence (
    id BIGINT NOT NULL PRIMARY KEY,
    item_id BIGINT NOT NULL,
    evidence_type VARCHAR(64) NOT NULL,
    evidence_ref VARCHAR(512) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_alert_silence (
    id BIGINT NOT NULL PRIMARY KEY,
    rule_id BIGINT,
    starts_at TIMESTAMP(6) NOT NULL,
    ends_at TIMESTAMP(6) NOT NULL,
    reason VARCHAR(512),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_backup_job (
    id BIGINT NOT NULL PRIMARY KEY,
    job_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    backup_ref VARCHAR(512),
    checksum VARCHAR(256),
    started_at TIMESTAMP(6),
    finished_at TIMESTAMP(6),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_backup_job UNIQUE (tenant_id, job_id)
);

CREATE TABLE IF NOT EXISTS ap_webhook_event (
    id BIGINT NOT NULL PRIMARY KEY,
    endpoint_id BIGINT NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    payload_json TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    attempts INT NOT NULL DEFAULT 0,
    last_error VARCHAR(1024),
    next_retry_at TIMESTAMP(6),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_webhook_delivery (
    id BIGINT NOT NULL PRIMARY KEY,
    event_id BIGINT NOT NULL,
    attempt INT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    response_code INT,
    delivered_at TIMESTAMP(6),
    error VARCHAR(1024),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_ticket (
    id BIGINT NOT NULL PRIMARY KEY,
    ticket_no VARCHAR(64) NOT NULL,
    title VARCHAR(256) NOT NULL,
    description TEXT,
    priority VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    assignee_id BIGINT,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_ticket_no UNIQUE (tenant_id, ticket_no)
);

CREATE TABLE IF NOT EXISTS ap_ticket_message (
    id BIGINT NOT NULL PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    sender_id BIGINT,
    content TEXT NOT NULL,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_coupon (
    id BIGINT NOT NULL PRIMARY KEY,
    coupon_code VARCHAR(64) NOT NULL,
    coupon_type VARCHAR(32) NOT NULL,
    discount_value NUMERIC(18,6) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    starts_at TIMESTAMP(6),
    ends_at TIMESTAMP(6),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_coupon_code UNIQUE (tenant_id, coupon_code)
);

CREATE TABLE IF NOT EXISTS ap_experiment_release (
    id BIGINT NOT NULL PRIMARY KEY,
    experiment_id BIGINT NOT NULL,
    release_type VARCHAR(32) NOT NULL,
    traffic_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    started_at TIMESTAMP(6),
    ended_at TIMESTAMP(6),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_platform_setting_history (
    id BIGINT NOT NULL PRIMARY KEY,
    setting_id BIGINT NOT NULL,
    version_no INT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by BIGINT,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_license (
    id BIGINT NOT NULL PRIMARY KEY,
    license_key_ref VARCHAR(256) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMP(6),
    seat_limit INT,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_node_info (
    id BIGINT NOT NULL PRIMARY KEY,
    node_id VARCHAR(128) NOT NULL,
    node_name VARCHAR(128) NOT NULL,
    node_status VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',
    last_heartbeat TIMESTAMP(6),
    metadata_json TEXT,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_node_info UNIQUE (tenant_id, node_id)
);

DO $$
DECLARE
    tbl_name TEXT;
    col_name TEXT;
BEGIN
    FOR tbl_name IN
        SELECT unnest(ARRAY[
            'ap_model_capability','ap_model_price','ap_model_key','ap_model_key_rotation','ap_provider_route',
            'ap_tool_version','ap_tool_review','ap_mcp_server_tool','ap_market_review','ap_market_report',
            'ap_project','ap_project_member','ap_workspace','ap_sandbox_image','ap_environment_variable','ap_sensitive_file_policy',
            'ap_invoice_item','ap_cost_allocation','ap_cost_simulation','ap_audit_export_job','ap_kms_key','ap_compliance_evidence',
            'ap_alert_silence','ap_backup_job','ap_webhook_event','ap_webhook_delivery','ap_ticket','ap_ticket_message','ap_coupon',
            'ap_experiment_release','ap_platform_setting_history','ap_license','ap_node_info'
        ])
    LOOP
        EXECUTE format('COMMENT ON TABLE %I IS %L', tbl_name, '管理端领域表：' || replace(tbl_name, 'ap_', ''));
        FOR col_name IN
            SELECT c.column_name FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.table_name = tbl_name
        LOOP
            EXECUTE format('COMMENT ON COLUMN %I.%I IS %L', tbl_name, col_name, '字段：' || col_name);
        END LOOP;
    END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_ap_model_key_status ON ap_model_key (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ap_project_member_project ON ap_project_member (tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_ap_workspace_project ON ap_workspace (tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_ap_invoice_item_invoice ON ap_invoice_item (tenant_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_ap_webhook_event_status ON ap_webhook_event (tenant_id, status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_ap_ticket_status ON ap_ticket (tenant_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_ap_experiment_release_experiment ON ap_experiment_release (tenant_id, experiment_id);

-- Request-level audit metadata. Payloads and credentials are intentionally excluded.
ALTER TABLE ap_audit_log
    ADD COLUMN IF NOT EXISTS trace_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS request_method VARCHAR(16),
    ADD COLUMN IF NOT EXISTS request_uri VARCHAR(512),
    ADD COLUMN IF NOT EXISTS operation_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS http_status INT,
    ADD COLUMN IF NOT EXISTS duration_ms BIGINT,
    ADD COLUMN IF NOT EXISTS user_agent VARCHAR(512),
    ADD COLUMN IF NOT EXISTS data_scope VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_ap_audit_log_tenant_created
    ON ap_audit_log (tenant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ap_audit_log_operator_created
    ON ap_audit_log (operator_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ap_audit_log_action_created
    ON ap_audit_log (action, created_at);

CREATE INDEX IF NOT EXISTS idx_ap_audit_log_resource
    ON ap_audit_log (resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_ap_audit_log_trace_id
    ON ap_audit_log (trace_id);

COMMENT ON COLUMN ap_audit_log.trace_id IS '请求 Trace ID';
COMMENT ON COLUMN ap_audit_log.request_method IS 'HTTP 请求方法';
COMMENT ON COLUMN ap_audit_log.request_uri IS '请求路径，不包含请求体';
COMMENT ON COLUMN ap_audit_log.operation_name IS '操作名称';
COMMENT ON COLUMN ap_audit_log.http_status IS 'HTTP 响应状态码';
COMMENT ON COLUMN ap_audit_log.duration_ms IS '请求耗时，单位毫秒';
COMMENT ON COLUMN ap_audit_log.user_agent IS '客户端 User-Agent';
COMMENT ON COLUMN ap_audit_log.data_scope IS '数据范围';

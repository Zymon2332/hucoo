ALTER TABLE ap_async_job ADD COLUMN IF NOT EXISTS result_json TEXT;
ALTER TABLE ap_async_job ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0;
ALTER TABLE ap_async_job ADD COLUMN IF NOT EXISTS cancel_requested INT NOT NULL DEFAULT 0;
COMMENT ON COLUMN ap_async_job.result_json IS '任务结果 JSON';
COMMENT ON COLUMN ap_async_job.retry_count IS '重试次数';
COMMENT ON COLUMN ap_async_job.cancel_requested IS '取消请求标记';

CREATE TABLE IF NOT EXISTS ap_model_validation_check (
    id BIGINT NOT NULL PRIMARY KEY,
    run_id BIGINT NOT NULL,
    check_code VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    failure_reason VARCHAR(1024),
    result_json TEXT,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_model_validation_check UNIQUE (tenant_id, run_id, check_code)
);

CREATE TABLE IF NOT EXISTS ap_image_vulnerability (
    id BIGINT NOT NULL PRIMARY KEY,
    scan_id BIGINT NOT NULL,
    vulnerability_code VARCHAR(128) NOT NULL,
    severity VARCHAR(32) NOT NULL,
    package_name VARCHAR(256),
    fixed_version VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_image_vulnerability UNIQUE (tenant_id, scan_id, vulnerability_code)
);

COMMENT ON TABLE ap_model_validation_check IS '模型验证检查项';
COMMENT ON COLUMN ap_model_validation_check.id IS '主键 ID';
COMMENT ON COLUMN ap_model_validation_check.run_id IS '验证运行记录 ID';
COMMENT ON COLUMN ap_model_validation_check.check_code IS '检查项编码';
COMMENT ON COLUMN ap_model_validation_check.status IS '检查状态';
COMMENT ON COLUMN ap_model_validation_check.failure_reason IS '失败原因';
COMMENT ON COLUMN ap_model_validation_check.result_json IS '检查结果 JSON';
COMMENT ON COLUMN ap_model_validation_check.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_validation_check.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_validation_check.deleted IS '逻辑删除标记';
COMMENT ON COLUMN ap_model_validation_check.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_validation_check.updated_at IS '更新时间';

COMMENT ON TABLE ap_image_vulnerability IS '镜像漏洞明细';
COMMENT ON COLUMN ap_image_vulnerability.id IS '主键 ID';
COMMENT ON COLUMN ap_image_vulnerability.scan_id IS '镜像扫描记录 ID';
COMMENT ON COLUMN ap_image_vulnerability.vulnerability_code IS '漏洞编码';
COMMENT ON COLUMN ap_image_vulnerability.severity IS '漏洞等级';
COMMENT ON COLUMN ap_image_vulnerability.package_name IS '受影响软件包';
COMMENT ON COLUMN ap_image_vulnerability.fixed_version IS '修复版本';
COMMENT ON COLUMN ap_image_vulnerability.status IS '漏洞状态';
COMMENT ON COLUMN ap_image_vulnerability.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_image_vulnerability.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_image_vulnerability.deleted IS '逻辑删除标记';
COMMENT ON COLUMN ap_image_vulnerability.created_at IS '创建时间';
COMMENT ON COLUMN ap_image_vulnerability.updated_at IS '更新时间';

CREATE INDEX IF NOT EXISTS idx_ap_async_job_status ON ap_async_job (tenant_id, status, updated_at);
CREATE INDEX IF NOT EXISTS idx_ap_model_validation_check_run ON ap_model_validation_check (tenant_id, run_id);
CREATE INDEX IF NOT EXISTS idx_ap_image_vulnerability_scan ON ap_image_vulnerability (tenant_id, scan_id);

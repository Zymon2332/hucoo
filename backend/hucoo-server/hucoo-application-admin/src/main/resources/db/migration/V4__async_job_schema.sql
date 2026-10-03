ALTER TABLE ap_audit_log ADD COLUMN IF NOT EXISTS trace_id VARCHAR(128);
ALTER TABLE ap_audit_log ADD COLUMN IF NOT EXISTS data_scope VARCHAR(256);
COMMENT ON COLUMN ap_audit_log.trace_id IS '链路追踪 ID';
COMMENT ON COLUMN ap_audit_log.data_scope IS '数据范围';

CREATE TABLE IF NOT EXISTS ap_async_job (
    id BIGINT NOT NULL PRIMARY KEY,
    job_id VARCHAR(64) NOT NULL,
    request_id VARCHAR(64) NOT NULL,
    job_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    progress INT NOT NULL DEFAULT 0,
    message VARCHAR(1024),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_async_job_id UNIQUE (tenant_id, job_id),
    CONSTRAINT uk_ap_async_request_id UNIQUE (tenant_id, request_id)
);

COMMENT ON TABLE ap_async_job IS '异步任务表';
COMMENT ON COLUMN ap_async_job.id IS '主键 ID';
COMMENT ON COLUMN ap_async_job.job_id IS '任务 ID';
COMMENT ON COLUMN ap_async_job.request_id IS '请求 ID';
COMMENT ON COLUMN ap_async_job.job_type IS '任务类型';
COMMENT ON COLUMN ap_async_job.status IS '任务状态';
COMMENT ON COLUMN ap_async_job.progress IS '完成百分比';
COMMENT ON COLUMN ap_async_job.message IS '任务消息或失败原因';
COMMENT ON COLUMN ap_async_job.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_async_job.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_async_job.deleted IS '逻辑删除标记';
COMMENT ON COLUMN ap_async_job.created_at IS '创建时间';
COMMENT ON COLUMN ap_async_job.updated_at IS '更新时间';

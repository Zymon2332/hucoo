ALTER TABLE ap_async_job ADD COLUMN IF NOT EXISTS owner_id VARCHAR(128);
ALTER TABLE ap_async_job ADD COLUMN IF NOT EXISTS lease_until TIMESTAMP(6);
ALTER TABLE ap_async_job ADD COLUMN IF NOT EXISTS attempt INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN ap_async_job.owner_id IS '当前执行实例标识';
COMMENT ON COLUMN ap_async_job.lease_until IS '执行租约过期时间';
COMMENT ON COLUMN ap_async_job.attempt IS '执行尝试次数';

CREATE INDEX IF NOT EXISTS idx_ap_async_job_lease
    ON ap_async_job (tenant_id, status, lease_until);

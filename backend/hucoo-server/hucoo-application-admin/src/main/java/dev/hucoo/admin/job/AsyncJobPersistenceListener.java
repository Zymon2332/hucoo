package dev.hucoo.admin.job;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import dev.hucoo.commons.dto.AsyncJobDTO;
import dev.hucoo.commons.dto.AsyncJobExecutor;
import dev.hucoo.commons.dto.AsyncJobListener;
import dev.hucoo.commons.util.JsonUtil;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.admin.infrastructure.mapper.AsyncJobRecordMapper;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;

import jakarta.annotation.PostConstruct;

@Component
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class AsyncJobPersistenceListener implements AsyncJobListener {

    private static final String INSTANCE_ID = UUID.randomUUID().toString();

    private final AsyncJobRecordMapper mapper;

    public AsyncJobPersistenceListener(AsyncJobRecordMapper mapper) {
        this.mapper = mapper;
    }

    @PostConstruct
    void register() {
        AsyncJobExecutor.setTenantSupplier(CurrentTenantContext::getTenantId);
        AsyncJobExecutor.registerListener(this);
        recoverExpiredJobs();
    }

    @Override
    public void created(AsyncJobDTO job) {
        withTenant(job, () -> {
            AsyncJobRecord existing = find(job);
            if (existing == null) {
                mapper.insert(toRecord(job, null));
            } else {
                mapper.updateById(toRecord(job, existing));
            }
        });
    }

    @Override
    public void updated(AsyncJobDTO job) {
        withTenant(job, () -> {
            AsyncJobRecord existing = find(job);
            if (existing == null) {
                mapper.insert(toRecord(job, null));
            } else {
                UpdateWrapper<AsyncJobRecord> update = new UpdateWrapper<AsyncJobRecord>()
                        .eq("id", existing.getId())
                        .eq("tenant_id", job.getTenantId())
                        .eq("version", existing.getVersion());
                mapper.update(toRecord(job, existing), update);
            }
        });
    }

    private AsyncJobRecord find(AsyncJobDTO job) {
        List<AsyncJobRecord> records = mapper.selectList(new QueryWrapper<AsyncJobRecord>()
                .eq("job_id", job.getJobId())
                .eq("tenant_id", job.getTenantId())
                .eq("deleted", 0));
        return records.isEmpty() ? null : records.get(0);
    }

    private void recoverExpiredJobs() {
        List<AsyncJobRecord> stale = mapper.selectList(new QueryWrapper<AsyncJobRecord>()
                .in("status", "PENDING", "RUNNING")
                .isNotNull("lease_until")
                .lt("lease_until", LocalDateTime.now(ZoneOffset.UTC)));
        for (AsyncJobRecord job : stale) {
            mapper.update(null, new UpdateWrapper<AsyncJobRecord>()
                    .eq("id", job.getId())
                    .eq("version", job.getVersion())
                    .in("status", "PENDING", "RUNNING")
                    .set("status", "FAILED")
                    .set("message", "任务执行实例租约已过期，等待重新提交")
                    .set("owner_id", INSTANCE_ID)
                    .set("lease_until", null)
                    .set("updated_at", java.sql.Timestamp.from(java.time.Instant.now())));
        }
    }

    private AsyncJobRecord toRecord(AsyncJobDTO job, AsyncJobRecord existing) {
        AsyncJobRecord record = existing == null ? new AsyncJobRecord() : existing;
        record.setJobId(job.getJobId());
        record.setRequestId(job.getRequestId());
        record.setJobType(job.getJobType());
        record.setStatus(job.getStatus().name());
        record.setProgress(job.getProgress());
        record.setMessage(job.getMessage());
        record.setResultJson(job.getResult() == null ? null : JsonUtil.toJson(job.getResult()));
        record.setRetryCount(job.getRetryCount() == null ? 0 : job.getRetryCount());
        record.setCancelRequested(Boolean.TRUE.equals(job.getCancelRequested()) ? 1 : 0);
        record.setTenantId(job.getTenantId());
        record.setOwnerId(INSTANCE_ID);
        record.setLeaseUntil(job.getStatus().name().equals("PENDING") || job.getStatus().name().equals("RUNNING")
                ? LocalDateTime.now(ZoneOffset.UTC).plusMinutes(5) : null);
        record.setAttempt((existing == null || existing.getAttempt() == null ? 0 : existing.getAttempt())
                + (job.getStatus().name().equals("RUNNING") && (existing == null || !"RUNNING".equals(existing.getStatus())) ? 1 : 0));
        return record;
    }

    private void withTenant(AsyncJobDTO job, Runnable action) {
        String previous = CurrentTenantContext.getTenantIdOrNull();
        CurrentTenantContext.set(job.getTenantId());
        try {
            action.run();
        } finally {
            if (previous == null) {
                CurrentTenantContext.clear();
            } else {
                CurrentTenantContext.set(previous);
            }
        }
    }
}

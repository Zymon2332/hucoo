package dev.hucoo.commons.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Supplier;

/**
 * Shared in-process executor for long-running administrative jobs.
 */
public final class AsyncJobExecutor {

    private static final ExecutorService EXECUTOR = Executors.newVirtualThreadPerTaskExecutor();
    private static final Map<String, AsyncJobDTO> JOBS = new ConcurrentHashMap<>();
    private static final Map<String, AsyncJobTask> TASKS = new ConcurrentHashMap<>();
    private static final CopyOnWriteArrayList<AsyncJobListener> LISTENERS = new CopyOnWriteArrayList<>();
    private static volatile Supplier<String> tenantSupplier = () -> "000000";

    private AsyncJobExecutor() {
    }

    public static void registerListener(AsyncJobListener listener) {
        if (listener != null) {
            LISTENERS.addIfAbsent(listener);
        }
    }

    public static void setTenantSupplier(Supplier<String> supplier) {
        tenantSupplier = supplier == null ? () -> "000000" : supplier;
    }

    public static AsyncJobDTO submit(String message, Runnable task) {
        return submit(message, context -> task.run());
    }

    public static AsyncJobDTO submit(String message, AsyncJobTask task) {
        Instant now = Instant.now();
        AsyncJobDTO job = AsyncJobDTO.builder()
                .jobId(UUID.randomUUID().toString())
                .requestId(UUID.randomUUID().toString())
                .jobType("ADMIN_TASK")
                .tenantId(tenantSupplier.get())
                .status(AsyncJobStatus.PENDING)
                .progress(0)
                .message(message)
                .retryCount(0)
                .cancelRequested(false)
                .createdAt(now)
                .updatedAt(now)
                .build();
        JOBS.put(job.getJobId(), job);
        TASKS.put(job.getJobId(), task);
        LISTENERS.forEach(listener -> listener.created(job));
        EXECUTOR.submit(() -> run(job, task));
        return job;
    }

    public static AsyncJobDTO find(String jobId) {
        return JOBS.get(jobId);
    }

    public static AsyncJobDTO cancel(String jobId) {
        AsyncJobDTO job = JOBS.get(jobId);
        if (job == null) {
            return null;
        }
        job.setCancelRequested(true);
        if (job.getStatus() == AsyncJobStatus.PENDING) {
            update(job, AsyncJobStatus.CANCELLED, job.getProgress(), "任务已取消");
        }
        return job;
    }

    public static AsyncJobDTO retry(String jobId) {
        AsyncJobDTO job = JOBS.get(jobId);
        AsyncJobTask task = TASKS.get(jobId);
        if (job == null || task == null || job.getStatus() == AsyncJobStatus.RUNNING) {
            return job;
        }
        job.setRetryCount((job.getRetryCount() == null ? 0 : job.getRetryCount()) + 1);
        job.setCancelRequested(false);
        job.setProgress(0);
        update(job, AsyncJobStatus.PENDING, 0, "任务重试已提交");
        EXECUTOR.submit(() -> run(job, task));
        return job;
    }

    private static void run(AsyncJobDTO job, AsyncJobTask task) {
        update(job, AsyncJobStatus.RUNNING, 10, job.getMessage());
        try {
            task.run(new AsyncJobContext(job));
            if (Boolean.TRUE.equals(job.getCancelRequested())) {
                update(job, AsyncJobStatus.CANCELLED, job.getProgress(), "任务已取消");
                return;
            }
            update(job, AsyncJobStatus.SUCCEEDED, 100, "任务完成");
        } catch (AsyncJobCancelledException ex) {
            update(job, AsyncJobStatus.CANCELLED, job.getProgress(), ex.getMessage());
        } catch (Exception ex) {
            update(job, AsyncJobStatus.FAILED, 100, ex.getMessage());
        }
    }

    private static void update(AsyncJobDTO job, AsyncJobStatus status, int progress, String message) {
        job.setStatus(status);
        job.setProgress(progress);
        job.setMessage(message);
        job.setUpdatedAt(Instant.now());
        LISTENERS.forEach(listener -> listener.updated(job));
    }
}

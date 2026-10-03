package dev.hucoo.commons.dto;

import java.time.Instant;
import java.util.LinkedHashMap;

public final class AsyncJobContext {

    private final AsyncJobDTO job;

    AsyncJobContext(AsyncJobDTO job) {
        this.job = job;
    }

    public void progress(int progress, String message) {
        job.setProgress(Math.max(0, Math.min(100, progress)));
        if (message != null) {
            job.setMessage(message);
        }
        job.setUpdatedAt(Instant.now());
    }

    public void result(String key, Object value) {
        if (job.getResult() == null) {
            job.setResult(new LinkedHashMap<>());
        }
        job.getResult().put(key, value);
        job.setUpdatedAt(Instant.now());
    }

    public boolean isCancellationRequested() {
        return Boolean.TRUE.equals(job.getCancelRequested());
    }

    public void checkCancelled() {
        if (isCancellationRequested()) {
            throw new AsyncJobCancelledException();
        }
    }
}

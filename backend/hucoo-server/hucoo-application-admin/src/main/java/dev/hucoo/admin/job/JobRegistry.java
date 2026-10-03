package dev.hucoo.admin.job;

import org.springframework.stereotype.Component;

import dev.hucoo.commons.dto.AsyncJobDTO;
import dev.hucoo.commons.dto.AsyncJobExecutor;

@Component
public class JobRegistry {

    public AsyncJobDTO create(String message) {
        return AsyncJobExecutor.submit(message, () -> {
        });
    }

    public AsyncJobDTO find(String jobId) {
        return AsyncJobExecutor.find(jobId);
    }

    public AsyncJobDTO cancel(String jobId) {
        return AsyncJobExecutor.cancel(jobId);
    }

    public AsyncJobDTO retry(String jobId) {
        return AsyncJobExecutor.retry(jobId);
    }
}

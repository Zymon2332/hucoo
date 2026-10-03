package dev.hucoo.admin.job;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

import dev.hucoo.commons.dto.AsyncJobDTO;
import dev.hucoo.commons.dto.AsyncJobStatus;

@Component
public class JobRegistry {

    private final Map<String, AsyncJobDTO> jobs = new ConcurrentHashMap<>();

    public AsyncJobDTO create(String message) {
        Instant now = Instant.now();
        AsyncJobDTO job = AsyncJobDTO.builder()
                .jobId(UUID.randomUUID().toString())
                .requestId(UUID.randomUUID().toString())
                .status(AsyncJobStatus.PENDING)
                .progress(0)
                .message(message)
                .createdAt(now)
                .updatedAt(now)
                .build();
        jobs.put(job.getJobId(), job);
        return job;
    }

    public AsyncJobDTO find(String jobId) {
        return jobs.get(jobId);
    }
}

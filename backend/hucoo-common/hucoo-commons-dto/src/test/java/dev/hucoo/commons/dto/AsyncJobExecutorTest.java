package dev.hucoo.commons.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.time.Duration;
import java.util.concurrent.CountDownLatch;

import org.junit.jupiter.api.Test;

class AsyncJobExecutorTest {

    @Test
    void executesVirtualThreadJobAndPublishesTerminalState() throws Exception {
        var job = AsyncJobExecutor.submit("test", () -> {
        });
        assertNotNull(job.getJobId());
        long deadline = System.nanoTime() + Duration.ofSeconds(2).toNanos();
        while (AsyncJobExecutor.find(job.getJobId()).getStatus() != AsyncJobStatus.SUCCEEDED
                && System.nanoTime() < deadline) {
            Thread.sleep(10);
        }
        assertEquals(AsyncJobStatus.SUCCEEDED, AsyncJobExecutor.find(job.getJobId()).getStatus());
        assertEquals(100, AsyncJobExecutor.find(job.getJobId()).getProgress());
    }

    @Test
    void publishesTaskResultAndSupportsRetry() throws Exception {
        var attempts = new java.util.concurrent.atomic.AtomicInteger();
        var job = AsyncJobExecutor.submit("retry", context -> {
            int attempt = attempts.incrementAndGet();
            if (attempt == 1) {
                throw new IllegalStateException("transient");
            }
            context.result("attempt", attempt);
        });
        awaitTerminal(job.getJobId());
        assertEquals(AsyncJobStatus.FAILED, AsyncJobExecutor.find(job.getJobId()).getStatus());
        AsyncJobExecutor.retry(job.getJobId());
        awaitTerminal(job.getJobId());
        assertEquals(AsyncJobStatus.SUCCEEDED, AsyncJobExecutor.find(job.getJobId()).getStatus());
        assertEquals(2, AsyncJobExecutor.find(job.getJobId()).getResult().get("attempt"));
    }

    @Test
    void supportsCooperativeCancellation() throws Exception {
        CountDownLatch started = new CountDownLatch(1);
        var job = AsyncJobExecutor.submit("cancel", context -> {
            started.countDown();
            while (!context.isCancellationRequested()) {
                Thread.sleep(5);
            }
            context.checkCancelled();
        });
        started.await();
        AsyncJobExecutor.cancel(job.getJobId());
        awaitTerminal(job.getJobId());
        assertEquals(AsyncJobStatus.CANCELLED, AsyncJobExecutor.find(job.getJobId()).getStatus());
    }

    private void awaitTerminal(String jobId) throws InterruptedException {
        long deadline = System.nanoTime() + Duration.ofSeconds(2).toNanos();
        while ((AsyncJobExecutor.find(jobId).getStatus() == AsyncJobStatus.PENDING
                || AsyncJobExecutor.find(jobId).getStatus() == AsyncJobStatus.RUNNING)
                && System.nanoTime() < deadline) {
            Thread.sleep(10);
        }
    }
}

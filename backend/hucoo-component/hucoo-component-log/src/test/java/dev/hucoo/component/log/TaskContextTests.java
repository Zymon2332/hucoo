package dev.hucoo.component.log;

import static org.assertj.core.api.Assertions.*;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.annotation.Async;
import dev.hucoo.commons.dto.AsyncJobExecutor;
import dev.hucoo.commons.dto.AsyncJobStatus;
import dev.hucoo.component.log.context.TaskContext;
import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import org.springframework.boot.micrometer.tracing.test.autoconfigure.AutoConfigureTracing;

@org.springframework.test.annotation.DirtiesContext
@SpringBootTest(classes = LoggingTestApplication.class, webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {"spring.application.name=log-test", "spring.threads.virtual.enabled=true"})
@AutoConfigureTracing
@Import(TaskContextTests.AsyncConfiguration.class)
class TaskContextTests {
    @Autowired TaskContext context;
    @Autowired Tracer tracer;
    @Autowired AsyncProbe asyncProbe;
    @AfterEach void clear() { MDC.clear(); }
    @Test void reusedWorkerRestoresOriginalContextEvenAfterFailure() throws Exception {
        try (ExecutorService raw = Executors.newSingleThreadExecutor()) {
            raw.submit(() -> MDC.put("worker", "original")).get(3, TimeUnit.SECONDS);
            var executor = context.wrapExecutorService(raw);
            Span parent = tracer.nextSpan().name("request").start();
            try (var scope = tracer.withSpan(parent)) {
                MDC.put("business", "caller");
                Map<String, String> child = executor.submit(MDC::getCopyOfContextMap).get(3, TimeUnit.SECONDS);
                assertThat(child).containsEntry("traceId", parent.context().traceId()).containsEntry("business", "caller");
                assertThat(child.get("spanId")).isNotEqualTo(parent.context().spanId());
                assertThat(child).doesNotContainKey("worker");
                assertThatThrownBy(() -> executor.submit(() -> { throw new IllegalStateException("failure"); }).get())
                        .isInstanceOf(ExecutionException.class);
                assertThat(MDC.get("spanId")).isEqualTo(parent.context().spanId());
            } finally { parent.end(); }
            assertThat(raw.submit(MDC::getCopyOfContextMap).get(3, TimeUnit.SECONDS)).containsOnly(entry("worker", "original"));
        }
    }
    @Test void capturesCallbacksBeforeForeignThreadCompletesFuture() throws Exception {
        Span parent = tracer.nextSpan().name("callback-parent").start();
        CompletableFuture<Integer> source = new CompletableFuture<>();
        CompletableFuture<String> result;
        try (var scope = tracer.withSpan(parent)) {
            result = source.thenApply(context.wrapFunction(value -> MDC.get("traceId") + ":" + value));
        }
        try (ExecutorService foreign = Executors.newSingleThreadExecutor()) {
            foreign.submit(() -> source.complete(7)).get(3, TimeUnit.SECONDS);
            assertThat(result.get(3, TimeUnit.SECONDS)).isEqualTo(parent.context().traceId() + ":7");
            assertThat(foreign.submit(() -> MDC.get("traceId")).get()).isNull();
        } finally { parent.end(); }
    }
    @Test void propagatesAcrossCompletableFutureStagesAndVirtualThreads() throws Exception {
        try (ExecutorService raw = Executors.newVirtualThreadPerTaskExecutor()) {
            var executor = context.wrapExecutor(raw);
            Span parent = tracer.nextSpan().name("future-parent").start();
            try (var scope = tracer.withSpan(parent)) {
                String result = CompletableFuture.supplyAsync(() -> MDC.get("traceId"), executor)
                        .thenApplyAsync(context.wrapFunction(value -> value + ":" + MDC.get("traceId")), executor)
                        .get(3, TimeUnit.SECONDS);
                assertThat(result).isEqualTo(parent.context().traceId() + ":" + parent.context().traceId());
            } finally { parent.end(); }
        }
    }
    @Test void asyncAnnotationPreservesExistingTaskDecoratorAndCreatesTaskSpan() throws Exception {
        Span parent = tracer.nextSpan().name("async-parent").start();
        try (var scope = tracer.withSpan(parent)) {
            Map<String, String> result = asyncProbe.probe().get(3, TimeUnit.SECONDS);
            assertThat(result).containsEntry("traceId", parent.context().traceId()).containsEntry("custom", "preserved");
            assertThat(result.get("spanId")).isNotEqualTo(parent.context().spanId());
        } finally { parent.end(); }
    }
    @Test void backgroundJobsAndRetryCaptureEachSubmission() throws Exception {
        var traces = new LinkedBlockingQueue<String>();
        Span first = tracer.nextSpan().name("submit").start();
        dev.hucoo.commons.dto.AsyncJobDTO job;
        try (var scope = tracer.withSpan(first)) {
            job = AsyncJobExecutor.submit("retry", () -> {
                traces.add(MDC.get("traceId"));
                throw new IllegalStateException("retry");
            });
        } finally { first.end(); }
        assertThat(traces.poll(3, TimeUnit.SECONDS)).isEqualTo(first.context().traceId());
        awaitFailed(job.getJobId());
        Span second = tracer.nextSpan().name("retry").start();
        try (var scope = tracer.withSpan(second)) { AsyncJobExecutor.retry(job.getJobId()); }
        finally { second.end(); }
        assertThat(traces.poll(3, TimeUnit.SECONDS)).isEqualTo(second.context().traceId());
        awaitFailed(job.getJobId());
        var orphan = new CompletableFuture<String>();
        context.wrapExecutor(Runnable::run).execute(() -> orphan.complete(MDC.get("traceId")));
        assertThat(orphan.get()).hasSize(32);
        assertThat(MDC.get("traceId")).isNull();
    }
    private void awaitFailed(String id) throws InterruptedException {
        long deadline = System.nanoTime() + Duration.ofSeconds(3).toNanos();
        while (AsyncJobExecutor.find(id).getStatus() != AsyncJobStatus.FAILED && System.nanoTime() < deadline) Thread.sleep(5);
        assertThat(AsyncJobExecutor.find(id).getStatus()).isEqualTo(AsyncJobStatus.FAILED);
    }
    @Test void cancelledFutureAndRejectedTaskDoNotLeakContext() throws Exception {
        try (ExecutorService raw = Executors.newSingleThreadExecutor()) {
            var executor = context.wrapExecutorService(raw);
            var started = new CountDownLatch(1);
            Future<?> future = executor.submit(() -> {
                started.countDown();
                try { Thread.sleep(10_000); } catch (InterruptedException ex) { Thread.currentThread().interrupt(); }
            });
            assertThat(started.await(3, TimeUnit.SECONDS)).isTrue();
            assertThat(future.cancel(true)).isTrue();
            assertThat(raw.submit(() -> MDC.get("traceId")).get(3, TimeUnit.SECONDS)).isNull();
            raw.shutdown();
            assertThatThrownBy(() -> executor.execute(() -> {})).isInstanceOf(RejectedExecutionException.class);
            assertThat(MDC.get("traceId")).isNull();
        }
    }
    @Test void scheduledRunsCreateSeparateRootTraces() throws Exception {
        Map<String, String> first = asyncProbe.scheduledResults().poll(3, TimeUnit.SECONDS);
        Map<String, String> second = asyncProbe.scheduledResults().poll(3, TimeUnit.SECONDS);
        assertThat(first).isNotNull(); assertThat(second).isNotNull();
        assertThat(first.get("traceId")).hasSize(32).isNotEqualTo(second.get("traceId"));
        assertThat(first.get("spanId")).hasSize(16);
        assertThat(MDC.get("traceId")).isNull();
    }
    @org.springframework.scheduling.annotation.EnableScheduling
    @TestConfiguration(proxyBeanMethods = false)
    static class AsyncConfiguration {
        @Bean AsyncProbe asyncProbe() { return new AsyncProbe(); }
        @Bean TaskDecorator existingDecorator() {
            return action -> () -> {
                String previous = MDC.get("custom");
                MDC.put("custom", "preserved");
                try { action.run(); }
                finally { if (previous == null) MDC.remove("custom"); else MDC.put("custom", previous); }
            };
        }
    }
    static class AsyncProbe {
        final LinkedBlockingQueue<Map<String, String>> scheduled = new LinkedBlockingQueue<>();
        public LinkedBlockingQueue<Map<String, String>> scheduledResults() { return scheduled; }
        @org.springframework.scheduling.annotation.Scheduled(initialDelay = 100, fixedDelay = 200)
        public void scheduled() { scheduled.offer(MDC.getCopyOfContextMap()); }
        @Async public CompletableFuture<Map<String, String>> probe() {
            return CompletableFuture.completedFuture(MDC.getCopyOfContextMap());
        }
    }
}

package dev.hucoo.audit.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Set;
import java.util.Map;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.micrometer.observation.autoconfigure.ObservationAutoConfiguration;
import org.springframework.boot.micrometer.tracing.autoconfigure.MicrometerTracingAutoConfiguration;
import org.springframework.boot.micrometer.tracing.brave.autoconfigure.BraveAutoConfiguration;
import dev.hucoo.audit.api.OperationLogEvent;
import dev.hucoo.audit.application.service.AuditLogApplicationService;
import dev.hucoo.component.log.config.LogAutoConfiguration;
import dev.hucoo.component.log.context.TaskContext;
import dev.hucoo.component.database.config.TenantContextAutoConfiguration;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.component.security.config.UserContextAutoConfiguration;
import dev.hucoo.component.security.context.CurrentUser;
import dev.hucoo.component.security.context.CurrentUserContext;
import io.micrometer.tracing.Tracer;
import io.micrometer.core.instrument.MeterRegistry;

class OperationLogContextTests {
    @Test void auditWorkerPropagatesIdentityAndTraceAndRestoresItsPreviousContext() {
        new ApplicationContextRunner().withConfiguration(AutoConfigurations.of(
                ObservationAutoConfiguration.class, MicrometerTracingAutoConfiguration.class,
                BraveAutoConfiguration.class, LogAutoConfiguration.class,
                TenantContextAutoConfiguration.class, UserContextAutoConfiguration.class))
                .run(application -> {
                    assertThat(application).hasNotFailed();
                    var tasks = application.getBean(TaskContext.class);
                    var tracer = application.getBean(Tracer.class);
                    ThreadPoolExecutor pool = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS, new ArrayBlockingQueue<>(2));
                    var service = mock(AuditLogApplicationService.class);
                    var captured = new CompletableFuture<Map<String, String>>();
                    when(service.save(any())).thenAnswer(call -> {
                        assertThat(CurrentTenantContext.getTenantId()).isEqualTo("event-tenant");
                        assertThat(CurrentUserContext.get().username()).isEqualTo("caller");
                        captured.complete(MDC.getCopyOfContextMap());
                        throw new IllegalStateException("simulated-write-failure");
                    });
                    var publisher = new OperationLogPublisherImpl(service, pool,
                            new StaticListableBeanFactory().getBeanProvider(MeterRegistry.class), tasks);
                    try {
                        pool.submit(() -> { CurrentTenantContext.set("worker-tenant"); MDC.put("worker", "original"); }).get();
                        var user = new CurrentUser(1L, "caller", "caller-tenant", Set.of("*"));
                        CurrentUserContext.set(user);
                        CurrentTenantContext.set("caller-tenant");
                        var span = tracer.nextSpan().name("audit-parent").start();
                        try (var scope = tracer.withSpan(span)) {
                            publisher.publish(new OperationLogEvent(1L, "caller", "event-tenant", "update", "test", "1",
                                    1, "127.0.0.1", span.context().traceId(), "POST", "/test", "test", 200, 1, "test"));
                            var mdc = captured.get(3, TimeUnit.SECONDS);
                            assertThat(mdc).containsEntry("traceId", span.context().traceId());
                            assertThat(mdc.get("spanId")).isNotEqualTo(span.context().spanId());
                        } finally { span.end(); }
                        assertThat(pool.submit(CurrentTenantContext::getTenantId).get()).isEqualTo("worker-tenant");
                        assertThat(pool.submit(CurrentUserContext::get).get()).isNull();
                        assertThat(pool.submit(MDC::getCopyOfContextMap).get()).containsOnly(entry("worker", "original"));
                        assertThat(CurrentTenantContext.getTenantId()).isEqualTo("caller-tenant");
                        pool.shutdown();
                        publisher.publish(new OperationLogEvent(1L, "caller", "event-tenant", "update", "test", "1",
                                1, "127.0.0.1", null, "POST", "/test", "test", 200, 1, "test"));
                        assertThat(CurrentTenantContext.getTenantId()).isEqualTo("caller-tenant");
                    } finally {
                        pool.shutdownNow(); CurrentTenantContext.clear(); CurrentUserContext.clear(); MDC.clear();
                    }
                });
    }
}

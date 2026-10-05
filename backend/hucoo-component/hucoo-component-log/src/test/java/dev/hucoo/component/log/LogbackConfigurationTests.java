package dev.hucoo.component.log;

import static org.assertj.core.api.Assertions.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.core.rolling.RollingFileAppender;
import ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy;
import tools.jackson.databind.json.JsonMapper;

class LogbackConfigurationTests {
    @TempDir Path directory;
    @Test void profilesSelectCorrectAppendersAndLevelsWithoutCreatingDevFiles() throws Exception {
        for (String profiles : List.of("", "test", "other", "dev", "prod", "prod,dev", "dev,prod")) {
            Path logs = directory.resolve(profiles.replace(',', '-').isEmpty() ? "default" : profiles.replace(',', '-'));
            SpringApplication application = new SpringApplication(LoggingTestApplication.class);
            application.setWebApplicationType(WebApplicationType.NONE);
            try (var ignored = application.run("--spring.profiles.active=" + profiles,
                    "--spring.application.name=configuration-test", "--logging.file.path=" + logs)) {
                Logger root = (Logger) LoggerFactory.getLogger(Logger.ROOT_LOGGER_NAME);
                assertThat(root.getAppender("CONSOLE")).isNotNull();
                boolean prod = profiles.contains("prod");
                assertThat(root.getAppender("JSON_FILE") != null).isEqualTo(prod);
                Logger business = (Logger) LoggerFactory.getLogger("dev.hucoo.configuration-test");
                assertThat(business.isDebugEnabled()).isEqualTo(profiles.equals("dev"));
                var statuses = ((LoggerContext) LoggerFactory.getILoggerFactory()).getStatusManager().getCopyOfStatusList();
                assertThat(statuses).noneMatch(status -> status.getLevel() == ch.qos.logback.core.status.Status.ERROR);
                if (!prod) {
                    assertThat(Files.exists(logs)).isFalse();
                    continue;
                }
                var appender = (RollingFileAppender<?>) root.getAppender("JSON_FILE");
                var policy = (SizeAndTimeBasedRollingPolicy<?>) appender.getRollingPolicy();
                assertThat(policy.getMaxHistory()).isEqualTo(15);
                assertThat(policy.getFileNamePattern()).endsWith(".%d{yyyy-MM-dd}.%i.json.gz");
                MDC.put("traceId", "0123456789abcdef0123456789abcdef");
                MDC.put("spanId", "0123456789abcdef");
                MDC.put("secret", "must-not-appear");
                business.error("json-escaping: \"quote\"\nnewline", new IllegalStateException("exception-marker"));
                MDC.clear();
                business.info("no-trace-marker");
                var mapper = new JsonMapper();
                var lines = Files.readAllLines(logs.resolve("configuration-test.json"));
                var error = lines.stream().map(mapper::readTree).filter(node -> node.get("message").asText().startsWith("json-escaping")).findFirst().orElseThrow();
                assertThat(error.get("service").asText()).isEqualTo("configuration-test");
                assertThat(error.get("env").asText()).isEqualTo("prod");
                assertThat(error.get("traceId").asText()).hasSize(32);
                assertThat(error.get("stack_trace").asText()).contains("exception-marker");
                assertThat(error.has("secret")).isFalse();
                var empty = lines.stream().map(mapper::readTree).filter(node -> node.get("message").asText().equals("no-trace-marker")).findFirst().orElseThrow();
                assertThat(empty.has("traceId")).isFalse();
                assertThat(empty.has("spanId")).isFalse();
            } finally { MDC.clear(); }
        }
    }
}

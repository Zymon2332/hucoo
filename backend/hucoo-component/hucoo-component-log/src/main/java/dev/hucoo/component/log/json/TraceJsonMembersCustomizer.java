package dev.hucoo.component.log.json;

import ch.qos.logback.classic.spi.ILoggingEvent;
import org.springframework.boot.json.JsonWriter;
import org.springframework.boot.logging.structured.StructuredLoggingJsonMembersCustomizer;
import org.springframework.core.env.Environment;

/**
 * Instantiated by Boot before application beans exist. Never serialize arbitrary MDC.
 */
public final class TraceJsonMembersCustomizer implements StructuredLoggingJsonMembersCustomizer<ILoggingEvent> {
    private final Environment environment;

    public TraceJsonMembersCustomizer(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void customize(JsonWriter.Members<ILoggingEvent> members) {
        members.add("service", environment.getProperty("spring.application.name", "application"));
        members.add("env", environment.getProperty("agent-platform.logging.environment", "prod"));
        members.add("traceId", event -> event.getMDCPropertyMap().get("traceId")).whenHasLength();
        members.add("spanId", event -> event.getMDCPropertyMap().get("spanId")).whenHasLength();
    }
}

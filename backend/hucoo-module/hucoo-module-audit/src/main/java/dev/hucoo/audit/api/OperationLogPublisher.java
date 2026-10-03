package dev.hucoo.audit.api;

@FunctionalInterface
public interface OperationLogPublisher {

    void publish(OperationLogEvent event);
}

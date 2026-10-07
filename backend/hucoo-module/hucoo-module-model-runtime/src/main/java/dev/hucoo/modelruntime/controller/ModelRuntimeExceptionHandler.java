package dev.hucoo.modelruntime.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import dev.hucoo.modelruntime.infrastructure.adapter.ProviderFailure;

@org.springframework.core.annotation.Order(org.springframework.core.Ordered.HIGHEST_PRECEDENCE)
@dev.hucoo.commons.api.RawResponse
@RestControllerAdvice(basePackageClasses = ModelRuntimeController.class)
public class ModelRuntimeExceptionHandler {
    @ExceptionHandler(ProviderFailure.class)
    public ResponseEntity<Map<String, Object>> providerFailure(ProviderFailure failure) {
        HttpStatus status = switch (failure.failureClass()) {
            case AUTHENTICATION -> HttpStatus.BAD_GATEWAY;
            case RATE_LIMITED -> HttpStatus.TOO_MANY_REQUESTS;
            case INVALID_REQUEST -> HttpStatus.BAD_REQUEST;
            case INSUFFICIENT_BALANCE, TIMEOUT, CONNECTION, PROVIDER_5XX -> HttpStatus.SERVICE_UNAVAILABLE;
            default -> HttpStatus.BAD_GATEWAY;
        };
        return ResponseEntity.status(status).body(Map.of("error", Map.of(
                "type", failure.failureClass().name().toLowerCase(),
                "message", failure.getMessage())));
    }
}

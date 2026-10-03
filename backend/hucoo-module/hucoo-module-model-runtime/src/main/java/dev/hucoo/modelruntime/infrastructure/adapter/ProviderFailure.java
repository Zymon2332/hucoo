package dev.hucoo.modelruntime.infrastructure.adapter;

import dev.hucoo.modelruntime.domain.FailureClass;

public class ProviderFailure extends RuntimeException {
    private final FailureClass failureClass;
    private final int status;
    public ProviderFailure(FailureClass failureClass, int status, String message) { super(message); this.failureClass = failureClass; this.status = status; }
    public FailureClass failureClass() { return failureClass; }
    public int status() { return status; }
}

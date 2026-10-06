package dev.hucoo.component.remote;

/**
 * Raised when a remote HTTP call returns a non-success response.
 */
public class RemoteCallException extends RuntimeException {

    private final int status;

    public RemoteCallException(String methodKey, int status, Throwable cause) {
        super("Remote call failed: " + methodKey + " (status=" + status + ")", cause);
        this.status = status;
    }

    public int getStatus() {
        return status;
    }
}

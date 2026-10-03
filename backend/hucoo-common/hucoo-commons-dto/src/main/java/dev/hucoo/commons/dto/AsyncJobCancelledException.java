package dev.hucoo.commons.dto;

public final class AsyncJobCancelledException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public AsyncJobCancelledException() {
        super("任务已取消");
    }
}

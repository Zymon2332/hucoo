package dev.hucoo.commons.exception;

import java.io.Serial;

public class ResourceNotFoundException extends BusinessException {

    @Serial
    private static final long serialVersionUID = 1L;

    public ResourceNotFoundException(String resourceType, Object id) {
        super(CommonErrorCode.NOT_FOUND, "%s(%s) 不存在".formatted(resourceType, String.valueOf(id)));
    }

    public ResourceNotFoundException(ErrorCode errorCode) {
        super(errorCode);
    }
}

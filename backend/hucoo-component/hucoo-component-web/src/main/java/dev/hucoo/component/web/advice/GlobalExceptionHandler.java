package dev.hucoo.component.web.advice;

import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;

import jakarta.validation.ConstraintViolationException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** 凭证类错误码：语义为“未认证/凭证失效”，统一映射 401。 */
    private static final Set<Integer> UNAUTHORIZED_CODES = Set.of(
            CommonErrorCode.API_KEY_INVALID.getCode(),
            CommonErrorCode.AUTHENTICATION_FAILED.getCode(),
            CommonErrorCode.VERIFICATION_CODE_INVALID.getCode(),
            CommonErrorCode.REFRESH_TOKEN_INVALID.getCode(),
            CommonErrorCode.REFRESH_TOKEN_REUSED.getCode());

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Result<Void>> handleBusinessException(BusinessException ex) {
        log.warn("business exception: code={}, module={}, message={}", ex.getCode(), ex.getModule(), ex.getMessage());
        return ResponseEntity.status(resolveHttpStatus(ex.getCode()))
                .body(Result.<Void>fail(ex.getCode(), ex.getMessage())
                        .withTraceId(org.slf4j.MDC.get(PlatformConstants.TRACE_ID_MDC_KEY)));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    public Result<Void> handleBindException(BindException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(this::describeFieldError)
                .collect(Collectors.joining("; "));
        return badRequest(message);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public Result<Void> handleConstraintViolation(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
                .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
                .collect(Collectors.joining("; "));
        return badRequest(message);
    }

    @ExceptionHandler({MissingServletRequestParameterException.class, MethodArgumentTypeMismatchException.class})
    public Result<Void> handleParameterException(Exception ex) {
        return badRequest(ex.getMessage());
    }

    /**
     * multipart 层的大小限制（{@code spring.servlet.multipart.max-file-size} / {@code max-request-size}）。
     *
     * <p>这类请求在进入业务代码之前就被 Tomcat/Spring 拒绝，业务模块的"文件过大"错误码用不上，
     * 因此统一在这里返回 413 与平台级错误码，避免把框架的英文异常信息直接暴露给前端。
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Result<Void>> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        log.warn("upload size exceeded: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(Result.<Void>fail(CommonErrorCode.PAYLOAD_TOO_LARGE.getCode(),
                                CommonErrorCode.PAYLOAD_TOO_LARGE.getMessage())
                        .withTraceId(org.slf4j.MDC.get(PlatformConstants.TRACE_ID_MDC_KEY)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleUnhandledException(Exception ex) {
        if (ex instanceof ErrorResponse errorResponse) {
            int status = errorResponse.getStatusCode().value();
            log.warn("request rejected: status={}, message={}", status, ex.getMessage());
            return ResponseEntity.status(status)
                    .body(Result.<Void>fail(status, ex.getMessage())
                            .withTraceId(org.slf4j.MDC.get(PlatformConstants.TRACE_ID_MDC_KEY)));
        }
        log.error("unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Result.<Void>fail(CommonErrorCode.INTERNAL_ERROR.getCode(), CommonErrorCode.INTERNAL_ERROR.getMessage())
                        .withTraceId(org.slf4j.MDC.get(PlatformConstants.TRACE_ID_MDC_KEY)));
    }

    private Result<Void> badRequest(String message) {
        return Result.<Void>fail(CommonErrorCode.BAD_REQUEST.getCode(), message)
                .withTraceId(org.slf4j.MDC.get(PlatformConstants.TRACE_ID_MDC_KEY));
    }

    private HttpStatus resolveHttpStatus(int code) {
        if (UNAUTHORIZED_CODES.contains(code)) {
            return HttpStatus.UNAUTHORIZED;
        }
        return switch (code) {
            case 400 -> HttpStatus.BAD_REQUEST;
            case 401 -> HttpStatus.UNAUTHORIZED;
            case 403 -> HttpStatus.FORBIDDEN;
            case 404, 400002, 210001 -> HttpStatus.NOT_FOUND;
            case 409, 400001, 210002 -> HttpStatus.CONFLICT;
            case 429 -> HttpStatus.TOO_MANY_REQUESTS;
            case 503 -> HttpStatus.SERVICE_UNAVAILABLE;
            // 各业务模块的“资源不存在 / 账号不可用”错误码，按接口契约映射到语义一致的 HTTP 状态，
            // 不能统一落到 400，否则前端无法区分“凭证错误”和“参数不合法”。
            case 100001, 120001, 130001, 140001, 150001, 170001, 190001, 200001 -> HttpStatus.NOT_FOUND;
            case 100002, 110002, 110006, 140002 -> HttpStatus.FORBIDDEN;
            default -> HttpStatus.BAD_REQUEST;
        };
    }

    private String describeFieldError(FieldError fieldError) {
        return fieldError.getField() + ": " + fieldError.getDefaultMessage();
    }
}

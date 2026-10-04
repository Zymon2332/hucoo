package dev.hucoo.component.swagger.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 统一错误响应体，供 OpenAPI 契约中的公共错误响应引用。
 *
 * <p>必须用 POJO 而不是在 {@code OpenAPI} bean 里手工拼 {@code Schema} 对象：
 * springdoc 在解析过程中会丢弃手工构造 schema 的属性类型，最终产出
 * {@code {"code": {}, "message": {}}} 这样的空属性，前端据此生成的类型不可用。
 */
@Schema(name = "ErrorResponse", description = "统一错误响应；业务错误码见 code 字段")
public class ErrorResponse {

    @Schema(description = "业务错误码，如 110004", example = "110004")
    private int code;

    @Schema(description = "错误描述", example = "账号或凭证错误")
    private String message;

    @Schema(description = "链路追踪 ID，与响应头 X-Trace-Id 一致", example = "8395b83fdfe24560")
    private String traceId;

    @Schema(description = "服务端时间戳（毫秒）", example = "1791096714657")
    private long timestamp;

    public int getCode() {
        return code;
    }

    public void setCode(int code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getTraceId() {
        return traceId;
    }

    public void setTraceId(String traceId) {
        this.traceId = traceId;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
}

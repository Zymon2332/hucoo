package dev.hucoo.commons.dto;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public abstract class BaseDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 主键。雪花算法 ID 为 19 位长整型，超过 JavaScript 的
     * {@code Number.MAX_SAFE_INTEGER}（9007199254740991），因此必须序列化为字符串。
     *
     * <p>{@code @JsonSerialize} 决定运行时的实际序列化，{@code @Schema} 决定 springdoc 生成的
     * OpenAPI 契约类型 —— 二者缺一不可：springdoc 不解析 {@code @JsonSerialize}，
     * 只写前者会导致契约声明为 integer 而运行时返回字符串。
     */
    @JsonSerialize(using = ToStringSerializer.class)
    @Schema(type = "string", description = "主键，字符串形式的雪花 ID")
    private Long id;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

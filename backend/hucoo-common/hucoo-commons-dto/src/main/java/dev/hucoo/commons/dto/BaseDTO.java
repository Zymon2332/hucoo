package dev.hucoo.commons.dto;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;

import tools.jackson.databind.annotation.JsonSerialize;
import tools.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

@Data
public abstract class BaseDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

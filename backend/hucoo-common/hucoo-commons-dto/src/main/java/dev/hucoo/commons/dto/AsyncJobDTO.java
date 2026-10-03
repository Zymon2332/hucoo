package dev.hucoo.commons.dto;

import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AsyncJobDTO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String jobId;
    private String requestId;
    private AsyncJobStatus status;
    private Integer progress;
    private String message;
    private Instant createdAt;
    private Instant updatedAt;
}

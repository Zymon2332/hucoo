package dev.hucoo.modelruntime.api.dto;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

@Data
public class ChatCompletionRequest {
    @NotBlank private String model;
    @NotEmpty private List<ChatMessage> messages = new ArrayList<>();
    @jakarta.validation.constraints.Positive
    private Long projectId;
    private Boolean stream = false;
    private Double temperature;
    private Integer maxTokens;
    private Map<String, Object> extra = new LinkedHashMap<>();
}

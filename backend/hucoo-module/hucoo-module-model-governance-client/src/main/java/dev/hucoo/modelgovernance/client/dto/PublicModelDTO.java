package dev.hucoo.modelgovernance.client.dto;

import java.io.Serializable;
import java.util.List;

/** 客户端稳定模型标识与能力，不包含任何渠道或认证配置。 */
public record PublicModelDTO(String modelCode, String modelName, String modelFamily, String modelType,
                             String versionCode, Long contextWindow, Long maxInputTokens, Long maxOutputTokens,
                             List<String> inputModalities, List<String> outputModalities,
                             List<String> capabilities) implements Serializable {
    public PublicModelDTO {
        inputModalities = List.copyOf(inputModalities);
        outputModalities = List.copyOf(outputModalities);
        capabilities = List.copyOf(capabilities);
    }
}

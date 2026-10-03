package dev.hucoo.modelruntime.infrastructure.adapter;

import java.util.List;
import java.util.Map;

import dev.hucoo.modelruntime.api.dto.ChatMessage;

public record ProviderRequest(String model, List<ChatMessage> messages, boolean stream,
                              Double temperature, Integer maxTokens, Map<String, Object> extra) {
}

package dev.hucoo.modelruntime.api.dto;

import lombok.Data;

@Data
public class ChatMessage {
    private String role;
    private Object content;
    private String name;
}

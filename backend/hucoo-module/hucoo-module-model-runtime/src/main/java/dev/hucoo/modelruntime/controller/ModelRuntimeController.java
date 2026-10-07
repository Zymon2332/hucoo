package dev.hucoo.modelruntime.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import dev.hucoo.modelruntime.api.dto.ChatCompletionRequest;
import dev.hucoo.modelruntime.application.service.ModelInvocationService;
import jakarta.validation.Valid;

@RestController
@dev.hucoo.commons.api.RawResponse
@Tag(name = "模型运行时")
@RequestMapping("/api/model/v1")
public class ModelRuntimeController {
    private final ModelInvocationService service;

    public ModelRuntimeController(ModelInvocationService service) { this.service = service; }

    @PostMapping(value = "/chat/completions", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "执行模型对话")
    public reactor.core.publisher.Mono<ResponseEntity<?>> complete(@Valid @RequestBody ChatCompletionRequest request) {
        if (Boolean.TRUE.equals(request.getStream())) {
            ResponseEntity<?> response = ResponseEntity.ok().contentType(MediaType.TEXT_EVENT_STREAM)
                    .body(service.stream(request).map(this::ssePayload));
            return reactor.core.publisher.Mono.just(response);
        }
        return service.invoke(request).map(body -> (ResponseEntity<?>) ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON).body(body));
    }

    /** Spring 的 text/event-stream 转换器会写入 data: 前缀，去掉上游已有前缀避免 data:data:。 */
    private String ssePayload(String chunk) {
        if (chunk == null) return "";
        return chunk.lines().map(line -> line.startsWith("data:") ? line.substring(5).stripLeading() : line)
                .collect(java.util.stream.Collectors.joining("\n"));
    }
}

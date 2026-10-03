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
                    .body(service.stream(request).map(chunk -> chunk.startsWith("data:") ? chunk : "data: " + chunk + "\n\n"));
            return reactor.core.publisher.Mono.just(response);
        }
        return service.invoke(request).map(body -> (ResponseEntity<?>) ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON).body(body));
    }
}

package dev.hucoo.modelruntime.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.openfeign.FallbackFactory;

/** Fallback for calls to the model runtime service. */
public class ModelRuntimeFallbackFactory implements FallbackFactory<ModelRuntimeFeignClient> {

    private static final Logger log = LoggerFactory.getLogger(ModelRuntimeFallbackFactory.class);

    @Override
    public ModelRuntimeFeignClient create(Throwable cause) {
        return model -> {
            log.warn("model runtime fallback triggered: model={}, reason={}", model,
                    cause == null || cause.getMessage() == null ? "unknown" : cause.getMessage());
            throw new IllegalStateException("Model runtime service is unavailable", cause);
        };
    }
}

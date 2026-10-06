package dev.hucoo.modelruntime.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.modelruntime.client.dto.RoutePreviewDTO;

@FeignClient(
        name = "${agent-platform.clients.model-runtime.service-name:hucoo-model-runtime}",
        path = PlatformConstants.API_PREFIX + "/models",
        contextId = "modelRuntimeFeignClient",
        configuration = ModelRuntimeClientConfiguration.class,
        fallbackFactory = ModelRuntimeFallbackFactory.class)
public interface ModelRuntimeFeignClient {

    @GetMapping("/pools/{model}/preview")
    Result<RoutePreviewDTO> preview(@PathVariable("model") String model);
}

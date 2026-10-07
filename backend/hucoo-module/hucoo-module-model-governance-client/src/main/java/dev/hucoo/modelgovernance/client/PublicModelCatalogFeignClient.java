package dev.hucoo.modelgovernance.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.modelgovernance.client.dto.PublicModelCatalogDTO;

/** 消费方显式启用此 Client；认证上下文由 component-remote 透传。 */
@FeignClient(name = "${agent-platform.clients.model-governance.service-name:hucoo-application-admin}",
        url = "${agent-platform.clients.model-governance.base-url:}",
        contextId = "publicModelCatalogFeignClient", path = PublicModelCatalogApi.PATH)
public interface PublicModelCatalogFeignClient {
    @GetMapping
    Result<PublicModelCatalogDTO> catalog(@RequestParam(value = "projectId", required = false) Long projectId);
}

package dev.hucoo.modelgovernance.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.modelgovernance.api.ModelPublicCatalogFacade;
import dev.hucoo.modelgovernance.api.dto.PublicModelCatalogQuery;
import dev.hucoo.modelgovernance.client.PublicModelCatalogApi;
import dev.hucoo.modelgovernance.client.dto.PublicModelCatalogDTO;

@RestController
@RequestMapping(PublicModelCatalogApi.PATH)
@Tag(name = "客户端平台模型目录")
@RequiredArgsConstructor
public class PublicModelCatalogController {
    private final ModelPublicCatalogFacade catalog;

    @GetMapping
    @Operation(summary = "按供应商查询当前登录用户可见的平台模型")
    public ResponseEntity<Result<PublicModelCatalogDTO>> catalog(
            @RequestParam(value = "projectId", required = false) Long projectId) {
        // 用户目录不能被网关或共享 HTTP 缓存复用；客户端可比较版本后更新本地目录。
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(Result.ok(catalog.catalog(new PublicModelCatalogQuery(projectId))));
    }
}

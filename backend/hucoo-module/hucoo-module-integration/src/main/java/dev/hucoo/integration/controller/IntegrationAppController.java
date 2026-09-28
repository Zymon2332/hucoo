package dev.hucoo.integration.controller;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.integration.api.dto.IntegrationAppCreateRequest;
import dev.hucoo.integration.api.dto.IntegrationAppDTO;
import dev.hucoo.integration.api.dto.IntegrationAppQueryRequest;
import dev.hucoo.integration.application.service.IntegrationAppApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "集成应用")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/integrations")
@RequiredArgsConstructor
public class IntegrationAppController {

    private final IntegrationAppApplicationService integrationAppApplicationService;

    @Operation(summary = "分页查询集成应用")
    @GetMapping
    public Result<PageResult<IntegrationAppDTO>> page(IntegrationAppQueryRequest request) {
        return Result.ok(integrationAppApplicationService.pageDtos(request));
    }

    @Operation(summary = "查询集成应用 详情")
    @GetMapping("/{id}")
    public Result<IntegrationAppDTO> detail(@PathVariable Long id) {
        return Result.ok(integrationAppApplicationService.getDto(id));
    }

    @Operation(summary = "创建集成应用")
    @PostMapping
    public Result<IntegrationAppDTO> create(@Valid @RequestBody IntegrationAppCreateRequest request) {
        return Result.ok(integrationAppApplicationService.create(request));
    }

    @Operation(summary = "更新集成应用")
    @PutMapping("/{id}")
    public Result<IntegrationAppDTO> update(@PathVariable Long id, @Valid @RequestBody IntegrationAppCreateRequest request) {
        return Result.ok(integrationAppApplicationService.update(id, request));
    }

    @Operation(summary = "删除集成应用")
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(integrationAppApplicationService.remove(id));
    }
}

package dev.hucoo.modelgovernance.controller;

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
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionCreateRequest;
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionDTO;
import dev.hucoo.modelgovernance.api.dto.ModelDefinitionQueryRequest;
import dev.hucoo.modelgovernance.application.service.ModelDefinitionApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "模型治理")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/models")
@RequiredArgsConstructor
public class ModelDefinitionController {

    private final ModelDefinitionApplicationService modelDefinitionApplicationService;

    @Operation(summary = "分页查询模型治理")
    @GetMapping
    public Result<PageResult<ModelDefinitionDTO>> page(ModelDefinitionQueryRequest request) {
        return Result.ok(modelDefinitionApplicationService.pageDtos(request));
    }

    @Operation(summary = "查询模型治理 详情")
    @GetMapping("/{id}")
    public Result<ModelDefinitionDTO> detail(@PathVariable Long id) {
        return Result.ok(modelDefinitionApplicationService.getDto(id));
    }

    @Operation(summary = "创建模型治理")
    @PostMapping
    public Result<ModelDefinitionDTO> create(@Valid @RequestBody ModelDefinitionCreateRequest request) {
        return Result.ok(modelDefinitionApplicationService.create(request));
    }

    @Operation(summary = "更新模型治理")
    @PutMapping("/{id}")
    public Result<ModelDefinitionDTO> update(@PathVariable Long id, @Valid @RequestBody ModelDefinitionCreateRequest request) {
        return Result.ok(modelDefinitionApplicationService.update(id, request));
    }

    @Operation(summary = "删除模型治理")
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(modelDefinitionApplicationService.remove(id));
    }
}

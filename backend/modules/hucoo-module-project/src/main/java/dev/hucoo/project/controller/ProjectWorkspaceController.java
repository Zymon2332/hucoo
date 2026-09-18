package dev.hucoo.project.controller;

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
import dev.hucoo.project.api.dto.ProjectWorkspaceCreateRequest;
import dev.hucoo.project.api.dto.ProjectWorkspaceDTO;
import dev.hucoo.project.api.dto.ProjectWorkspaceQueryRequest;
import dev.hucoo.project.application.service.ProjectWorkspaceApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "项目工作区")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/projects")
@RequiredArgsConstructor
public class ProjectWorkspaceController {

    private final ProjectWorkspaceApplicationService projectWorkspaceApplicationService;

    @Operation(summary = "分页查询项目工作区")
    @GetMapping
    public Result<PageResult<ProjectWorkspaceDTO>> page(ProjectWorkspaceQueryRequest request) {
        return Result.ok(projectWorkspaceApplicationService.pageDtos(request));
    }

    @Operation(summary = "查询项目工作区 详情")
    @GetMapping("/{id}")
    public Result<ProjectWorkspaceDTO> detail(@PathVariable Long id) {
        return Result.ok(projectWorkspaceApplicationService.getDto(id));
    }

    @Operation(summary = "创建项目工作区")
    @PostMapping
    public Result<ProjectWorkspaceDTO> create(@Valid @RequestBody ProjectWorkspaceCreateRequest request) {
        return Result.ok(projectWorkspaceApplicationService.create(request));
    }

    @Operation(summary = "更新项目工作区")
    @PutMapping("/{id}")
    public Result<ProjectWorkspaceDTO> update(@PathVariable Long id, @Valid @RequestBody ProjectWorkspaceCreateRequest request) {
        return Result.ok(projectWorkspaceApplicationService.update(id, request));
    }

    @Operation(summary = "删除项目工作区")
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(projectWorkspaceApplicationService.remove(id));
    }
}

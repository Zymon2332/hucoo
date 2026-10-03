package dev.hucoo.tenant.controller;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.tenant.api.dto.OrganizationCreateRequest;
import dev.hucoo.tenant.api.dto.OrganizationDTO;
import dev.hucoo.tenant.api.dto.OrganizationQueryRequest;
import dev.hucoo.tenant.application.service.OrganizationApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import dev.hucoo.component.security.annotation.RequirePermission;

@Tag(name = "组织架构")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/organizations")
@RequiredArgsConstructor
public class OrganizationController {

    private final OrganizationApplicationService organizationApplicationService;

    @Operation(summary = "分页查询组织")
    @GetMapping
    public Result<PageResult<OrganizationDTO>> page(OrganizationQueryRequest request) {
        return Result.ok(organizationApplicationService.pageDtos(request));
    }

    @Operation(summary = "查询组织详情")
    @GetMapping("/{id}")
    public Result<OrganizationDTO> detail(@PathVariable Long id) {
        return Result.ok(organizationApplicationService.getDto(id));
    }

    @Operation(summary = "创建组织")
    @PostMapping
    @RequirePermission("organization:create")
    public Result<OrganizationDTO> create(@Valid @RequestBody OrganizationCreateRequest request) {
        return Result.ok(organizationApplicationService.create(request));
    }

    @Operation(summary = "更新组织")
    @PutMapping("/{id}")
    @RequirePermission("organization:update")
    public Result<OrganizationDTO> update(@PathVariable Long id, @Valid @RequestBody OrganizationCreateRequest request) {
        return Result.ok(organizationApplicationService.update(id, request));
    }

    @PatchMapping("/{id}")
    @RequirePermission("organization:update")
    public Result<OrganizationDTO> patch(@PathVariable Long id, @Valid @RequestBody OrganizationCreateRequest request) {
        return Result.ok(organizationApplicationService.update(id, request));
    }

    @Operation(summary = "删除组织")
    @DeleteMapping("/{id}")
    @RequirePermission("organization:delete")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(organizationApplicationService.remove(id));
    }
}

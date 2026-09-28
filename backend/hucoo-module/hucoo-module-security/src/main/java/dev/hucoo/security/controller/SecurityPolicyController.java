package dev.hucoo.security.controller;

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
import dev.hucoo.security.api.dto.SecurityPolicyCreateRequest;
import dev.hucoo.security.api.dto.SecurityPolicyDTO;
import dev.hucoo.security.api.dto.SecurityPolicyQueryRequest;
import dev.hucoo.security.application.service.SecurityPolicyApplicationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "安全策略")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/security-policies")
@RequiredArgsConstructor
public class SecurityPolicyController {

    private final SecurityPolicyApplicationService securityPolicyApplicationService;

    @Operation(summary = "分页查询安全策略")
    @GetMapping
    public Result<PageResult<SecurityPolicyDTO>> page(SecurityPolicyQueryRequest request) {
        return Result.ok(securityPolicyApplicationService.pageDtos(request));
    }

    @Operation(summary = "查询安全策略 详情")
    @GetMapping("/{id}")
    public Result<SecurityPolicyDTO> detail(@PathVariable Long id) {
        return Result.ok(securityPolicyApplicationService.getDto(id));
    }

    @Operation(summary = "创建安全策略")
    @PostMapping
    public Result<SecurityPolicyDTO> create(@Valid @RequestBody SecurityPolicyCreateRequest request) {
        return Result.ok(securityPolicyApplicationService.create(request));
    }

    @Operation(summary = "更新安全策略")
    @PutMapping("/{id}")
    public Result<SecurityPolicyDTO> update(@PathVariable Long id, @Valid @RequestBody SecurityPolicyCreateRequest request) {
        return Result.ok(securityPolicyApplicationService.update(id, request));
    }

    @Operation(summary = "删除安全策略")
    @DeleteMapping("/{id}")
    public Result<Boolean> delete(@PathVariable Long id) {
        return Result.ok(securityPolicyApplicationService.remove(id));
    }
}

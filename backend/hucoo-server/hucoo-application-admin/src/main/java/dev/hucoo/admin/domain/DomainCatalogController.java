package dev.hucoo.admin.domain;

import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.component.security.annotation.RequirePermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "领域资源")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/domain")
@RequiredArgsConstructor
public class DomainCatalogController {
    private final DomainCatalogFacade catalog;

    @Operation(summary = "分页查询领域资源")
    @GetMapping("/{resource}")
    public Result<PageResult<Map<String, Object>>> page(@PathVariable String resource,
                                                         @RequestParam(required = false) String keyword,
                                                         @RequestParam(defaultValue = "1") long page,
                                                         @RequestParam(defaultValue = "20") long pageSize) {
        return Result.ok(catalog.page(resource, keyword, page, pageSize));
    }

    @GetMapping("/{resource}/{id}")
    public Result<Map<String, Object>> get(@PathVariable String resource, @PathVariable Long id) {
        return Result.ok(catalog.get(resource, id));
    }

    @PostMapping("/{resource}")
    @RequirePermission("domain:create")
    public Result<Map<String, Object>> create(@PathVariable String resource, @RequestBody Map<String, Object> values) {
        return Result.ok(catalog.create(resource, values));
    }

    @PatchMapping("/{resource}/{id}")
    @RequirePermission("domain:update")
    public Result<Map<String, Object>> update(@PathVariable String resource, @PathVariable Long id,
                                               @RequestBody Map<String, Object> values) {
        return Result.ok(catalog.update(resource, id, values));
    }

    @DeleteMapping("/{resource}/{id}")
    @RequirePermission("domain:delete")
    public Result<Boolean> delete(@PathVariable String resource, @PathVariable Long id,
                                  @RequestParam(required = false) Integer version) {
        return Result.ok(catalog.delete(resource, id, version));
    }

    @PostMapping("/{resource}/{id}/{action}")
    @RequirePermission("domain:action")
    public Result<Map<String, Object>> action(@PathVariable String resource, @PathVariable Long id,
                                               @PathVariable String action,
                                               @RequestBody(required = false) Map<String, Object> values) {
        return Result.ok(catalog.action(resource, id, action, values));
    }
}

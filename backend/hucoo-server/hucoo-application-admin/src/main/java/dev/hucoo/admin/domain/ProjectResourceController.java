package dev.hucoo.admin.domain;

import java.util.Map;
import org.springframework.web.bind.annotation.*;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.component.security.annotation.RequirePermission;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name="项目资源")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/projects")
@RequiredArgsConstructor
public class ProjectResourceController {
    private final DomainCatalogFacade catalog;
    @GetMapping("/resources") public Result<PageResult<Map<String,Object>>> projects(@RequestParam(required=false) String keyword,@RequestParam(defaultValue="1") long page,@RequestParam(defaultValue="20") long pageSize){return Result.ok(catalog.page("projects",keyword,page,pageSize));}
    @GetMapping("/members") public Result<PageResult<Map<String,Object>>> members(@RequestParam(required=false) String keyword,@RequestParam(defaultValue="1") long page,@RequestParam(defaultValue="20") long pageSize){return Result.ok(catalog.page("project-members",keyword,page,pageSize));}
    @GetMapping("/policies") public Result<PageResult<Map<String,Object>>> policies(@RequestParam(required=false) String keyword,@RequestParam(defaultValue="1") long page,@RequestParam(defaultValue="20") long pageSize){return Result.ok(catalog.page("project-policies",keyword,page,pageSize));}
    @GetMapping("/workspace-resources") public Result<PageResult<Map<String,Object>>> workspaceResources(@RequestParam(required=false) String keyword,@RequestParam(defaultValue="1") long page,@RequestParam(defaultValue="20") long pageSize){return Result.ok(catalog.page("workspace-resources",keyword,page,pageSize));}
    @GetMapping("/sandbox-images") public Result<PageResult<Map<String,Object>>> sandboxImages(@RequestParam(required=false) String keyword,@RequestParam(defaultValue="1") long page,@RequestParam(defaultValue="20") long pageSize){return Result.ok(catalog.page("sandbox-images",keyword,page,pageSize));}
    @GetMapping("/environment-variables") public Result<PageResult<Map<String,Object>>> variables(@RequestParam(required=false) String keyword,@RequestParam(defaultValue="1") long page,@RequestParam(defaultValue="20") long pageSize){return Result.ok(catalog.page("environment-variables",keyword,page,pageSize));}
    @GetMapping("/sensitive-file-policies") public Result<PageResult<Map<String,Object>>> sensitive(@RequestParam(required=false) String keyword,@RequestParam(defaultValue="1") long page,@RequestParam(defaultValue="20") long pageSize){return Result.ok(catalog.page("sensitive-file-policies",keyword,page,pageSize));}
    @PostMapping("/resources") @RequirePermission("project:create") public Result<Map<String,Object>> create(@RequestBody Map<String,Object> body){return Result.ok(catalog.create("projects",body));}
    @PatchMapping("/resources/{id}") @RequirePermission("project:update") public Result<Map<String,Object>> update(@PathVariable Long id,@RequestBody Map<String,Object> body){return Result.ok(catalog.update("projects",id,body));}
    @DeleteMapping("/resources/{id}") @RequirePermission("project:delete") public Result<Boolean> delete(@PathVariable Long id,@RequestParam(required=false) Integer version){return Result.ok(catalog.delete("projects",id,version));}
}

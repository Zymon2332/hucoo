package dev.hucoo.admin.domain;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.component.security.annotation.RequirePermission;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
@Tag(name="安全合规资源") @RestController @RequestMapping(PlatformConstants.API_PREFIX+"/security") @RequiredArgsConstructor
public class SecurityCatalogController {
 private final DomainCatalogFacade catalog;
 @GetMapping("/dlp-rules") public Result<PageResult<Map<String,Object>>> dlp(@RequestParam(required=false) String keyword,@RequestParam(defaultValue="1") long page,@RequestParam(defaultValue="20") long pageSize){return Result.ok(catalog.page("dlp-rules",keyword,page,pageSize));}
 @GetMapping("/content-filters") public Result<PageResult<Map<String,Object>>> filters(@RequestParam(required=false) String keyword,@RequestParam(defaultValue="1") long page,@RequestParam(defaultValue="20") long pageSize){return Result.ok(catalog.page("content-filters",keyword,page,pageSize));}
 @GetMapping("/ip-allowlist") public Result<PageResult<Map<String,Object>>> ips(@RequestParam(required=false) String keyword,@RequestParam(defaultValue="1") long page,@RequestParam(defaultValue="20") long pageSize){return Result.ok(catalog.page("ip-allowlist",keyword,page,pageSize));}
 @GetMapping("/retention") public Result<PageResult<Map<String,Object>>> retention(@RequestParam(required=false) String keyword,@RequestParam(defaultValue="1") long page,@RequestParam(defaultValue="20") long pageSize){return Result.ok(catalog.page("retention-policies",keyword,page,pageSize));}
 @GetMapping("/compliance-evidence") public Result<PageResult<Map<String,Object>>> evidence(@RequestParam(required=false) String keyword,@RequestParam(defaultValue="1") long page,@RequestParam(defaultValue="20") long pageSize){return Result.ok(catalog.page("compliance-evidence",keyword,page,pageSize));}
 @GetMapping("/notification-channels") public Result<PageResult<Map<String,Object>>> channels(@RequestParam(required=false) String keyword,@RequestParam(defaultValue="1") long page,@RequestParam(defaultValue="20") long pageSize){return Result.ok(catalog.page("notification-channels",keyword,page,pageSize));}
 @PostMapping("/alerts/{id}/{action}") @RequirePermission("alert:action") public Result<Map<String,Object>> alertAction(@PathVariable Long id,@PathVariable String action){return Result.ok(catalog.action("alerts",id,action,Map.of()));}
 @PostMapping("/alert-silences/{id}/activate") @RequirePermission("alert:silence") public Result<Map<String,Object>> activateSilence(@PathVariable Long id){return Result.ok(catalog.action("alert-silences",id,"activate",Map.of()));}
}

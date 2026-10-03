package dev.hucoo.admin.domain;

import java.util.Map;

import org.springframework.web.bind.annotation.*;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.component.security.annotation.RequirePermission;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "Webhook 事件")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/webhooks")
@RequiredArgsConstructor
public class WebhookCatalogController {
    private final DomainCatalogFacade catalog;

    @GetMapping("/events")
    public Result<PageResult<Map<String, Object>>> events(@RequestParam(required = false) String keyword, @RequestParam(defaultValue = "1") long page, @RequestParam(defaultValue = "20") long pageSize) {
        return Result.ok(catalog.page("webhook-events", keyword, page, pageSize));
    }

    @GetMapping("/deliveries")
    public Result<PageResult<Map<String, Object>>> deliveries(@RequestParam(required = false) String keyword, @RequestParam(defaultValue = "1") long page, @RequestParam(defaultValue = "20") long pageSize) {
        return Result.ok(catalog.page("webhook-deliveries", keyword, page, pageSize));
    }

    @PostMapping("/events/{id}/replay")
    @RequirePermission("webhook:replay")
    public Result<Map<String, Object>> replay(@PathVariable Long id) {
        return Result.ok(catalog.action("webhook-events", id, "replay", Map.of()));
    }
}

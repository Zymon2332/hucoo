package dev.hucoo.admin.domain;

import java.util.Map;

import org.springframework.web.bind.annotation.*;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.component.security.annotation.RequirePermission;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag(name = "账单资源")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/billing")
@RequiredArgsConstructor
public class BillingCatalogController {
    private final DomainCatalogFacade catalog;

    @GetMapping("/plans")
    public Result<PageResult<Map<String, Object>>> plans(@RequestParam(required = false) String keyword, @RequestParam(defaultValue = "1") long page, @RequestParam(defaultValue = "20") long pageSize) {
        return Result.ok(catalog.page("billing-plans", keyword, page, pageSize));
    }

    @GetMapping("/invoices")
    public Result<PageResult<Map<String, Object>>> invoices(@RequestParam(required = false) String keyword, @RequestParam(defaultValue = "1") long page, @RequestParam(defaultValue = "20") long pageSize) {
        return Result.ok(catalog.page("invoices", keyword, page, pageSize));
    }

    @GetMapping("/cost-centers")
    public Result<PageResult<Map<String, Object>>> centers(@RequestParam(required = false) String keyword, @RequestParam(defaultValue = "1") long page, @RequestParam(defaultValue = "20") long pageSize) {
        return Result.ok(catalog.page("cost-centers", keyword, page, pageSize));
    }

    @GetMapping("/budget-alerts")
    public Result<PageResult<Map<String, Object>>> alerts(@RequestParam(required = false) String keyword, @RequestParam(defaultValue = "1") long page, @RequestParam(defaultValue = "20") long pageSize) {
        return Result.ok(catalog.page("budget-alerts", keyword, page, pageSize));
    }

    @GetMapping("/cost-allocations")
    public Result<PageResult<Map<String, Object>>> allocations(@RequestParam(required = false) String keyword, @RequestParam(defaultValue = "1") long page, @RequestParam(defaultValue = "20") long pageSize) {
        return Result.ok(catalog.page("cost-allocations", keyword, page, pageSize));
    }

    @PostMapping("/invoices/{id}/{action}")
    @RequirePermission("billing:invoice-action")
    public Result<Map<String, Object>> invoiceAction(@PathVariable Long id, @PathVariable String action) {
        return Result.ok(catalog.action("invoices", id, action, Map.of()));
    }

    @PatchMapping("/plans/{id}")
    @RequirePermission("billing:plan-update")
    public Result<Map<String, Object>> updatePlan(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return Result.ok(catalog.update("billing-plans", id, body));
    }
}

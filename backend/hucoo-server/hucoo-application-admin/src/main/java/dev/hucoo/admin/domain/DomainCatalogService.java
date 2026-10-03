package dev.hucoo.admin.domain;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;

import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.component.database.tenant.CurrentTenantContext;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class DomainCatalogService implements DomainCatalogFacade {

    private record Definition(String table, Set<String> fields, String keywordField) { }

    private static final Map<String, Definition> DEFINITIONS = definitions();
    private final JdbcTemplate jdbc;

    public DomainCatalogService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    public PageResult<Map<String, Object>> page(String resource, String keyword, long page, long size) {
        Definition d = definition(resource);
        long safePage = Math.max(1, page);
        long safeSize = Math.min(100, Math.max(1, size));
        String where = "tenant_id = ? AND deleted = 0";
        List<Object> args = new ArrayList<>();
        args.add(CurrentTenantContext.getTenantId());
        if (keyword != null && !keyword.isBlank() && d.keywordField() != null) {
            where += " AND " + d.keywordField() + " ILIKE ?";
            args.add("%" + keyword + "%");
        }
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM " + d.table() + " WHERE " + where, Long.class, args.toArray());
        args.add(safeSize); args.add((safePage - 1) * safeSize);
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM " + d.table() + " WHERE " + where + " ORDER BY id DESC LIMIT ? OFFSET ?", args.toArray());
        return PageResult.of(rows, total == null ? 0 : total, safePage, safeSize);
    }

    @Override
    public Map<String, Object> get(String resource, Long id) {
        Definition d = definition(resource);
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT * FROM " + d.table() + " WHERE id = ? AND tenant_id = ? AND deleted = 0", id, CurrentTenantContext.getTenantId());
        if (rows.isEmpty()) throw new ResourceNotFoundException(resource, id);
        return rows.get(0);
    }

    @Override
    public Map<String, Object> create(String resource, Map<String, Object> values) {
        Definition d = definition(resource);
        Map<String, Object> clean = clean(d, values);
        long id = IdWorker.getId();
        List<String> columns = new ArrayList<>(clean.keySet());
        columns.add("id"); columns.add("tenant_id"); columns.add("version"); columns.add("deleted");
        List<Object> params = new ArrayList<>(clean.values());
        params.add(id); params.add(CurrentTenantContext.getTenantId()); params.add(0); params.add(0);
        String placeholders = columns.stream().map(c -> "?").collect(Collectors.joining(", "));
        jdbc.update("INSERT INTO " + d.table() + " (" + String.join(", ", columns) + ") VALUES (" + placeholders + ")", params.toArray());
        return get(resource, id);
    }

    @Override
    public Map<String, Object> update(String resource, Long id, Map<String, Object> values) {
        Definition d = definition(resource);
        Map<String, Object> clean = clean(d, values);
        if (clean.isEmpty()) return get(resource, id);
        Integer version = values == null || values.get("version") == null ? null : Integer.valueOf(String.valueOf(values.get("version")));
        List<Object> params = new ArrayList<>();
        String assignments = clean.keySet().stream().map(c -> c + " = ?").collect(Collectors.joining(", "));
        params.addAll(clean.values());
        params.add(id); params.add(CurrentTenantContext.getTenantId());
        String versionClause = "";
        if (version != null) { versionClause = " AND version = ?"; params.add(version); }
        int changed = jdbc.update("UPDATE " + d.table() + " SET " + assignments + ", version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ? AND deleted = 0" + versionClause, params.toArray());
        if (changed == 0) throw new ResourceNotFoundException(resource, id);
        return get(resource, id);
    }

    @Override
    public boolean delete(String resource, Long id, Integer version) {
        Definition d = definition(resource);
        String sql = "UPDATE " + d.table() + " SET deleted = 1, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ? AND deleted = 0";
        List<Object> params = new ArrayList<>(List.of(id, CurrentTenantContext.getTenantId()));
        if (version != null) { sql += " AND version = ?"; params.add(version); }
        if (jdbc.update(sql, params.toArray()) == 0) throw new ResourceNotFoundException(resource, id);
        return true;
    }

    @Override
    public Map<String, Object> action(String resource, Long id, String action, Map<String, Object> values) {
        Definition d = definition(resource);
        String status = switch (resource + ":" + action) {
            case "invoices:issue" -> "ISSUED";
            case "invoices:pay" -> "PAID";
            case "invoices:void" -> "VOID";
            case "alerts:acknowledge" -> "ACKNOWLEDGED";
            case "alerts:resolve" -> "RESOLVED";
            case "alert-silences:activate" -> "ACTIVE";
            case "webhook-events:replay" -> "RETRYING";
            default -> throw new IllegalArgumentException("Unsupported action: " + resource + "/" + action);
        };
        String statusColumn = resource.equals("alert-silences") ? "status" : "status";
        int changed = jdbc.update("UPDATE " + d.table() + " SET " + statusColumn + " = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ? AND deleted = 0", status, id, CurrentTenantContext.getTenantId());
        if (changed == 0) throw new ResourceNotFoundException(resource, id);
        if (resource.equals("webhook-events")) {
            jdbc.update("UPDATE " + d.table() + " SET attempts = attempts + 1, next_retry_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ? AND deleted = 0", id, CurrentTenantContext.getTenantId());
        }
        return get(resource, id);
    }

    private Definition definition(String resource) {
        Definition d = DEFINITIONS.get(resource);
        if (d == null) throw new IllegalArgumentException("Unsupported domain resource: " + resource);
        return d;
    }

    private Map<String, Object> clean(Definition d, Map<String, Object> values) {
        if (values == null) return Map.of();
        return values.entrySet().stream().filter(e -> d.fields().contains(e.getKey()) && e.getValue() != null)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a, b) -> b, LinkedHashMap::new));
    }

    private static Map<String, Definition> definitions() {
        Map<String, Definition> m = new LinkedHashMap<>();
        add(m, "tool-versions", "ap_tool_version", "version_code", "tool_id", "parameter_schema", "release_status");
        add(m, "mcp-reviews", "ap_mcp_server_review", "status", "server_id", "reviewer_id", "reason");
        add(m, "agent-versions", "ap_agent_version", "version_code", "agent_id", "prompt", "model_policy", "tool_allowlist", "knowledge_refs", "release_status");
        add(m, "market-listings", "ap_market_listing", "resource_type", "resource_id", "listing_status", "recommended", "score");
        add(m, "projects", "ap_project", "project_code", "project_name", "owner_id", "status");
        add(m, "project-members", "ap_project_member", "member_role", "project_id", "user_id", "status");
        add(m, "project-policies", "ap_project_policy", "model_policy", "project_id", "tool_policy", "budget", "sensitive_file_policy");
        add(m, "workspace-resources", "ap_workspace_resource", "cpu", "workspace_id", "memory", "disk", "gpu", "concurrency_limit", "idle_timeout_seconds");
        add(m, "workspaces", "ap_workspace", "workspace_code", "project_id", "repository_url", "status");
        add(m, "sandboxes", "ap_sandbox", "sandbox_code", "image", "network_policy", "compliance_baseline", "vulnerability_count", "status");
        add(m, "sandbox-images", "ap_sandbox_image", "image_ref", "sandbox_id", "digest", "status");
        add(m, "environment-variables", "ap_environment_variable", "variable_name", "project_id", "value_ref", "sensitive", "status");
        add(m, "sensitive-file-policies", "ap_sensitive_file_policy", "pattern", "project_id", "effect", "enabled");
        add(m, "billing-plans", "ap_billing_plan", "plan_code", "plan_name", "monthly_price", "model_fee", "byok_fee", "status");
        add(m, "invoices", "ap_invoice", "invoice_no", "period", "plan_id", "seats", "model_fees", "byok_fee", "total_amount", "status");
        add(m, "cost-centers", "ap_cost_center", "center_code", "center_name", "owner_id", "budget", "spent");
        add(m, "budget-alerts", "ap_budget_alert", null, "center_id", "threshold_percent", "enabled", "last_triggered_at");
        add(m, "cost-allocations", "ap_cost_allocation", "resource_type", "center_id", "resource_id", "amount", "period");
        add(m, "dlp-rules", "ap_dlp_rule", "rule_name", "pattern", "category", "action", "scope", "enabled");
        add(m, "content-filters", "ap_content_filter_rule", "rule_name", "stage", "category", "action", "severity", "enabled");
        add(m, "ip-allowlist", "ap_ip_allowlist", "cidr", "label", "scope", "effect", "expires_at");
        add(m, "retention-policies", "ap_data_retention_policy", "data_type", "retention_days", "deletion_mode", "export_enabled", "jurisdiction");
        add(m, "compliance-evidence", "ap_compliance_evidence", "evidence_type", "item_id", "evidence_ref", "status");
        add(m, "webhook-events", "ap_webhook_event", "event_type", "endpoint_id", "payload_json", "status", "attempts", "last_error", "next_retry_at");
        add(m, "webhook-deliveries", "ap_webhook_delivery", "status", "event_id", "attempt", "response_code", "delivered_at", "error");
        add(m, "alerts", "ap_alert", "message", "rule_id", "severity", "status", "fired_at", "resolved_at");
        add(m, "alert-silences", "ap_alert_silence", "reason", "rule_id", "starts_at", "ends_at", "status");
        add(m, "notification-channels", "ap_notification_channel", "channel_name", "channel_type", "config_ref", "enabled");
        return m;
    }

    private static void add(Map<String, Definition> m, String resource, String table, String keyword, String... fields) {
        Set<String> allowed = new java.util.LinkedHashSet<>();
        if (keyword != null) allowed.add(keyword);
        java.util.Collections.addAll(allowed, fields);
        m.put(resource, new Definition(table, Set.copyOf(allowed), keyword));
    }
}

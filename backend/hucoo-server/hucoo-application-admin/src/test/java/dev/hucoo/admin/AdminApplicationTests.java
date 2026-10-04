package dev.hucoo.admin;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import com.jayway.jsonpath.JsonPath;

import java.util.List;
import java.util.Map;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void contextLoads() {
    }

    @Test
    void shouldReturnUnifiedResultFromTenantApi() throws Exception {
        mockMvc.perform(get("/api/admin/v1/tenants"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.traceId").isNotEmpty())
                .andExpect(jsonPath("$.data.items").isArray())
                .andExpect(jsonPath("$.data.items[0].id").isString())
                .andExpect(jsonPath("$.data.items[0].createdAt").isString())
                .andExpect(jsonPath("$.data.total").value(greaterThanOrEqualTo(3)));
    }

    @Test
    void shouldReturnOrganizationPageFromMockApi() throws Exception {
        mockMvc.perform(get("/api/admin/v1/organizations").param("page", "1").param("pageSize", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.items").isArray())
                .andExpect(jsonPath("$.data.items.length()").value(2))
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.pageSize").value(2))
                .andExpect(jsonPath("$.data.total").value(greaterThanOrEqualTo(3)));
    }

    @Test
    void shouldReturnRolePageFromMockApi() throws Exception {
        mockMvc.perform(get("/api/admin/v1/roles").param("page", "1").param("pageSize", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.items").isArray())
                .andExpect(jsonPath("$.data.items.length()").value(2))
                .andExpect(jsonPath("$.data.total").value(greaterThanOrEqualTo(3)));
    }

    @Test
    void shouldReturnPermissionPageAndMatrixFromMockApi() throws Exception {
        mockMvc.perform(get("/api/admin/v1/permissions").param("page", "1").param("pageSize", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.items").isArray())
                .andExpect(jsonPath("$.data.items.length()").value(2))
                .andExpect(jsonPath("$.data.total").value(greaterThanOrEqualTo(3)));

        mockMvc.perform(get("/api/admin/v1/permissions/matrix"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(3));
    }

    @Test
    void shouldExposeActuatorHealth() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void shouldExposeApiDocs() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openapi").exists())
                .andExpect(jsonPath("$.info.title").value("Hucoo Agent Platform Admin API"))
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"))
                .andExpect(jsonPath("$.components.responses.BadRequest").exists())
                .andExpect(jsonPath("$.paths['/api/admin/v1/tenants'].get.responses['400'].$ref").value("#/components/responses/BadRequest"));
    }

    @Test
    void shouldReplaySuccessfulMutationWithSameIdempotencyKey() throws Exception {
        String body = "{\"orgCode\":\"idempotent-org\",\"orgName\":\"幂等组织\",\"orgType\":\"TEAM\"}";
        MvcResult first = mockMvc.perform(post("/api/admin/v1/organizations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", "organization-create-1")
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        String firstId = JsonPath.read(first.getResponse().getContentAsString(), "$.data.id");

        MvcResult second = mockMvc.perform(post("/api/admin/v1/organizations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Idempotency-Key", "organization-create-1")
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        String secondId = JsonPath.read(second.getResponse().getContentAsString(), "$.data.id");
        assertEquals(firstId, secondId);
    }

    @Test
    void shouldQueryAndTransitionApprovalWithSteps() throws Exception {
        MvcResult page = mockMvc.perform(get("/api/admin/v1/approvals").param("page", "1").param("pageSize", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items").isArray())
                .andExpect(jsonPath("$.data.total").value(greaterThanOrEqualTo(2)))
                .andReturn();
        List<Map<String, Object>> items = JsonPath.read(page.getResponse().getContentAsString(), "$.data.items");
        String pendingId = items.stream()
                .filter(item -> "PENDING".equals(item.get("status")))
                .map(item -> String.valueOf(item.get("id")))
                .findFirst()
                .orElse(null);
        assertNotNull(pendingId);

        mockMvc.perform(get("/api/admin/v1/approvals/{id}", pendingId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.steps").isArray())
                .andExpect(jsonPath("$.data.steps.length()").value(1));

        mockMvc.perform(post("/api/admin/v1/approvals/{id}/approve", pendingId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"审核通过\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"))
                .andExpect(jsonPath("$.data.steps[0].status").value("APPROVED"));

        mockMvc.perform(post("/api/admin/v1/approvals/{id}/reject", pendingId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"重复操作\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(210002));
    }
}

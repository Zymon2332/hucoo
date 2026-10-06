package dev.hucoo.admin;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import dev.hucoo.audit.api.OperationLogPublisher;
import dev.hucoo.audit.api.OperationLogEvent;
import org.mockito.ArgumentCaptor;

import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CommonAdminApiTests {
    @Autowired
    MockMvc mvc;
    @MockitoBean
    OperationLogPublisher audit;

    @Test
    void commonModuleRegistersApiAndRetiresSettings() throws Exception {
        mvc.perform(get("/api/admin/v1/dictionary-types")).andExpect(status().isOk()).andExpect(jsonPath("$.data.items").isArray());
        mvc.perform(get("/api/admin/v1/configs")).andExpect(status().isOk());
        for (String path : java.util.List.of("/settings/license", "/settings/nodes", "/settings/general"))
            mvc.perform(get("/api/admin/v1" + path)).andExpect(status().isNotFound());
        String docs = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertTrue(docs.contains("/api/admin/v1/dictionaries/{code}/options"));
        assertTrue(docs.contains("/api/admin/v1/configs/effective/{key}"));
        assertFalse(docs.contains("/api/admin/v1/settings"));
        var schema = dev.hucoo.commons.util.JsonUtil.mapper().readTree(docs).path("components").path("schemas")
                .path("SystemConfigRequest").path("properties").path("value");
        assertTrue(schema.path("$ref").isMissingNode(), "配置值不得泄露 JsonNode 实现类型");
        assertTrue(schema.path("type").isArray());

    }

    @Test
    void dictionaryMutationsAreCapturedByExistingAudit() throws Exception {
        String code = UUID.randomUUID().toString();
        String body = "{\"code\":\"" + code + "\",\"name\":\"审计字典\"}";
        String json = mvc.perform(post("/api/admin/v1/dictionary-types").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var data = dev.hucoo.commons.util.JsonUtil.mapper().readTree(json).path("data");
        String id = data.path("id").asString();
        mvc.perform(put("/api/admin/v1/dictionary-types/" + id).contentType(MediaType.APPLICATION_JSON)
                .content(body.replace("}", ",\"enabled\":false,\"version\":0}"))).andExpect(status().isOk());
        mvc.perform(delete("/api/admin/v1/dictionary-types/" + id).param("version", "1")).andExpect(status().isOk());
        var captor = ArgumentCaptor.forClass(OperationLogEvent.class);
        verify(audit, atLeast(3)).publish(captor.capture());
        assertTrue(captor.getAllValues().stream().anyMatch(e -> e.action().equals("dictionary:create")));
        assertTrue(captor.getAllValues().stream().anyMatch(e -> e.action().equals("dictionary:update") && id.equals(e.resourceId())));
        assertTrue(captor.getAllValues().stream().anyMatch(e -> e.action().equals("dictionary:delete") && id.equals(e.resourceId())));
    }
}

package dev.hucoo.common;

import java.time.Duration;
import java.util.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import dev.hucoo.component.security.util.JwtUtil;
import dev.hucoo.commons.util.JsonUtil;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = CommonTestApplication.class, properties = {
        "agent-platform.persistence.enabled=false", "agent-platform.security.enabled=true",
        "spring.datasource.url=jdbc:postgresql://127.0.0.1:1/unused", "spring.datasource.driver-class-name=org.postgresql.Driver"
})
@AutoConfigureMockMvc
class CommonSecurityWebTests {
    @Autowired
    MockMvc mvc;
    @Autowired
    JwtUtil jwt;

    String token(String tenant, String... permissions) {
        return "Bearer " + jwt.createToken("tester", Map.of("tenantId", tenant, "username", "tester", "permissions", List.of(permissions)), Duration.ofMinutes(5));
    }

    String body(String key) {
        return "{\"key\":\"" + key + "\",\"name\":\"Parameter\",\"group\":\"limits\",\"valueType\":\"NUMBER\",\"value\":10}";
    }

    @Test
    void everyReadRequiresAuthenticationAndPermission() throws Exception {
        for (String path : List.of("/dictionary-types", "/dictionary-types/1", "/dictionary-types/1/items", "/dictionary-types/1/items/2",
                "/dictionaries/status/options", "/configs", "/configs/1", "/configs/effective", "/configs/effective/key")) {
            mvc.perform(get("/api/admin/v1" + path)).andExpect(status().isUnauthorized());
            mvc.perform(get("/api/admin/v1" + path).header("Authorization", token("tenant-a"))).andExpect(status().isForbidden());
        }
    }

    @Test
    void platformWriteRequiresIdentityContextAndDedicatedPermission() throws Exception {
        String path = "/api/admin/v1/configs";
        mvc.perform(post(path).param("scope", "PLATFORM").header("Authorization", token("tenant-a", "*"))
                .contentType(MediaType.APPLICATION_JSON).content(body("forbidden1"))).andExpect(status().isForbidden());
        mvc.perform(post(path).param("scope", "PLATFORM").header("Authorization", token("000000", "config:create"))
                .contentType(MediaType.APPLICATION_JSON).content(body("forbidden2"))).andExpect(status().isForbidden());
        mvc.perform(post(path).header("Authorization", token("000000", "config:create"))
                .contentType(MediaType.APPLICATION_JSON).content(body("forbidden3"))).andExpect(status().isForbidden());
        mvc.perform(post(path).param("scope", "PLATFORM").header("X-Tenant-Id", "tenant-a")
                .header("Authorization", token("000000", "*")).contentType(MediaType.APPLICATION_JSON)
                .content(body("forbidden4"))).andExpect(status().isForbidden());
        mvc.perform(post(path).header("X-Tenant-Id", "000000").header("Authorization", token("tenant-a", "*"))
                .contentType(MediaType.APPLICATION_JSON).content(body("forbidden5"))).andExpect(status().isForbidden());
        mvc.perform(post(path).param("scope", "PLATFORM").header("Authorization", token("000000", "config:create", "config:platform:manage"))
                        .contentType(MediaType.APPLICATION_JSON).content(body(UUID.randomUUID().toString())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.scope").value("PLATFORM"));
        mvc.perform(post("/api/admin/v1/dictionary-types").param("scope", "PLATFORM")
                        .header("Authorization", token("000000", "dictionary:create"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"blocked\",\"name\":\"Blocked\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void authenticatedCrudReturnsTypedValuesAndRejectsCrossTenantAndStaleVersions() throws Exception {
        String key = UUID.randomUUID().toString();
        String auth = token("tenant-a", "*");
        String response = mvc.perform(post("/api/admin/v1/configs").header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON).content(body(key))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").isString()).andExpect(jsonPath("$.data.value").value(10))
                .andExpect(jsonPath("$.data.source").value("TENANT")).andReturn().getResponse().getContentAsString();
        String id = JsonUtil.mapper().readTree(response).path("data").path("id").asString();
        mvc.perform(get("/api/admin/v1/configs/" + id).header("Authorization", token("tenant-b", "*"))).andExpect(status().isNotFound());
        String update = body(key).replace("\"value\":10", "\"value\":11,\"version\":0");
        mvc.perform(put("/api/admin/v1/configs/" + id).header("Authorization", auth).contentType(MediaType.APPLICATION_JSON).content(update))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.version").value(1));
        mvc.perform(put("/api/admin/v1/configs/" + id).header("Authorization", auth).contentType(MediaType.APPLICATION_JSON).content(update))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/admin/v1/configs/effective/" + key).header("Authorization", auth)).andExpect(jsonPath("$.data.value").value(11));
        mvc.perform(delete("/api/admin/v1/configs/" + id).param("version", "1").header("Authorization", auth)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/v1/configs/effective/" + key).header("Authorization", auth)).andExpect(status().isNotFound());
    }

    @Test
    void requestValidationDoesNotCreateBadRecords() throws Exception {
        mvc.perform(post("/api/admin/v1/configs").header("Authorization", token("tenant-a", "*"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"key\":\"invalid key\",\"name\":\"x\",\"group\":\"g\",\"valueType\":\"STRING\",\"value\":\"x\"}"))
                .andExpect(jsonPath("$.code").value(400));
        mvc.perform(post("/api/admin/v1/configs").header("Authorization", token("tenant-a", "*"))
                        .contentType(MediaType.APPLICATION_JSON).content(body("mismatched").replace("\"value\":10", "\"value\":\"ten\"")))
                .andExpect(status().isBadRequest());
    }
}

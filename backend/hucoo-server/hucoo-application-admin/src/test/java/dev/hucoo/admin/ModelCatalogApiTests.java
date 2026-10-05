package dev.hucoo.admin;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** 验证规范化配置在管理端的真实接口装配、关联保存和凭证脱敏。 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ModelCatalogApiTests {
    private static final String CATALOG = "/api/admin/v1/model-catalog";
    @Autowired private MockMvc mvc;

    @Test
    void shouldPersistRelatedConfigurationAndOnlyReturnMaskedCredentials() throws Exception {
        String providerId = create("/api/admin/v1/models/providers", """
                {"providerCode":"api-test-provider","providerName":"测试供应商","providerType":"ENTERPRISE"}
                """);
        String channelId = create("/api/admin/v1/models/providers/" + providerId + "/channels", """
                {"channelCode":"primary","channelName":"企业主渠道","protocolType":"OPENAI_COMPATIBLE",
                 "endpoint":"https://models.example.com","region":"cn-east",
                 "protocolConfigJson":"{\\\"schemaVersion\\\":1}"}
                """);
        mvc.perform(get("/api/admin/v1/models/providers/{id}/channels", providerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].id").value(channelId))
                .andExpect(jsonPath("$.data.items[0].region").value("cn-east"))
                .andExpect(jsonPath("$.data.items[0].approvalStatus").value("PENDING_APPROVAL"));

        String modelId = create(CATALOG + "/models", """
                {"modelCode":"api-test-model","modelName":"测试逻辑模型","modelType":"CHAT"}
                """);
        String versionId = create(CATALOG + "/models/" + modelId + "/versions", """
                {"versionCode":"v1","contextWindow":32000,"maxOutputTokens":4000}
                """);
        String bindingId = create(CATALOG + "/versions/" + versionId + "/bindings",
                "{\"channelId\":\"" + channelId + "\",\"providerModelCode\":\"upstream-chat\"}");
        mvc.perform(get(CATALOG + "/versions/{id}/bindings", versionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(bindingId))
                .andExpect(jsonPath("$.data[0].providerModelCode").value("upstream-chat"));

        String response = mvc.perform(post(CATALOG + "/channels/{id}/credentials", channelId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"credentialName\":\"接口测试凭证\",\"secret\":\"test-only-credential\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.maskedValue").value("********"))
                .andExpect(jsonPath("$.data.secret").doesNotExist())
                .andExpect(jsonPath("$.data.secretCiphertext").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        assertFalse(response.contains("test-only-credential"));
        mvc.perform(get(CATALOG + "/channels/{id}/credentials", channelId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].secretCiphertext").doesNotExist())
                .andExpect(jsonPath("$.data[0].maskedValue").value("********"));
    }

    @Test
    void shouldRejectSecretInConfigurationJson() throws Exception {
        mvc.perform(post(CATALOG + "/models").contentType(MediaType.APPLICATION_JSON).content("""
                {"modelCode":"invalid-secret-model","modelName":"非法模型","modelType":"CHAT",
                 "metadataJson":"{\\\"apiKey\\\":\\\"forbidden\\\"}"}
                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldPublishNewConfigurationPathsInOpenApi() throws Exception {
        String response = mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertTrue(response.contains(CATALOG + "/models"));
        assertTrue(response.contains(CATALOG + "/credentials/{id}/rotate"));
        assertTrue(response.contains(CATALOG + "/route-policies/{policyId}/targets"));
    }

    private String create(String path, String body) throws Exception {
        String response = mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.data.id");
    }
}

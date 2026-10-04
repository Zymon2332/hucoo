package dev.hucoo.admin;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;

import dev.hucoo.identity.application.auth.mock.MockAuthenticationApplicationService;

/**
 * 认证链路端到端用例：验证 Mock 持久化模式下登录接口可用。
 *
 * <p>回归背景：认证控制器带 {@code @ConditionalOnBean(AuthenticationApplicationService.class)}，
 * 而唯一实现依赖 {@code persistence.enabled=true}，导致本地默认配置下登录接口整体缺失。
 * 本用例锁定 Mock 实现存在，并覆盖登录、签发令牌、令牌访问受保护接口、刷新与退出。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthenticationApiTests {

    private static final String LOGIN_BODY = """
            {"method":"PASSWORD","identifier":"admin","credential":"%s","clientId":"ADMIN_CONSOLE"}
            """.formatted(MockAuthenticationApplicationService.DEMO_PASSWORD);

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldExposeAuthenticationControllerUnderMockPersistence() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/admin/v1/auth/login']").exists())
                .andExpect(jsonPath("$.paths['/api/admin/v1/auth/refresh']").exists())
                .andExpect(jsonPath("$.paths['/api/admin/v1/auth/me']").exists());
    }

    @Test
    void shouldReportEnabledProviders() throws Exception {
        mockMvc.perform(get("/api/admin/v1/auth/providers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data[?(@.method=='PASSWORD')].enabled").value(true));
    }

    @Test
    void shouldLoginAndAccessProtectedEndpointWithIssuedToken() throws Exception {
        String accessToken = login();

        mockMvc.perform(get("/api/admin/v1/auth/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.username").value("admin"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    void shouldRejectLoginWithWrongCredential() throws Exception {
        mockMvc.perform(post("/api/admin/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"method":"PASSWORD","identifier":"admin","credential":"wrong-password"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(110004));
    }

    @Test
    void shouldRefreshAndRevokeSession() throws Exception {
        String refreshToken = loginRefreshToken();

        MvcResult refreshed = mockMvc.perform(post("/api/admin/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"%s\"}".formatted(refreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andReturn();

        String rotatedRefreshToken = JsonPath.read(refreshed.getResponse().getContentAsString(),
                "$.data.refreshToken");
        assertNotNull(rotatedRefreshToken);

        // 轮换后旧 refreshToken 立即失效，防止重放。
        mockMvc.perform(post("/api/admin/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"%s\"}".formatted(refreshToken)))
                .andExpect(status().isUnauthorized());

        String accessToken = JsonPath.read(refreshed.getResponse().getContentAsString(), "$.data.accessToken");
        mockMvc.perform(get("/api/admin/v1/auth/sessions")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].status").value("ACTIVE"));

        mockMvc.perform(post("/api/admin/v1/auth/logout")
                        .param("refreshToken", rotatedRefreshToken)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
    }

    private String login() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/admin/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LOGIN_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.username").value("admin"))
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.accessToken");
    }

    private String loginRefreshToken() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/admin/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LOGIN_BODY))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.refreshToken");
    }
}

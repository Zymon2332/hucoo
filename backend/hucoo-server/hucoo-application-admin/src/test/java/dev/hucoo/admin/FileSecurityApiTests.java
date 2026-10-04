package dev.hucoo.admin;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import dev.hucoo.component.security.interceptor.PermissionResolver;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 鉴权开启（{@code agent-platform.security.enabled=true}）时的文件接口行为。
 *
 * <p>核心断言：受保护接口必须要求令牌，而**匿名签名下载端点必须放行** ——
 * 这是"分享链接"能力成立的前提，也是本模块唯一一个不加 {@code @RequirePermission} 的接口。
 *
 * <p>{@link PermissionResolver} 被替换为固定放行：真实实现是 {@code DatabasePermissionResolver}，
 * 需要 PostgreSQL 里存在权限数据，而本用例只关心文件模块的鉴权语义。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "agent-platform.security.enabled=true")
class FileSecurityApiTests {

    private static final String LOGIN_BODY = """
            {"method":"PASSWORD","identifier":"admin","credential":"Admin@12345"}
            """;

    private static final byte[] CONTENT = "secured-file-content".getBytes(StandardCharsets.UTF_8);

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PermissionResolver permissionResolver;

    @BeforeEach
    void stubPermissionResolver() {
        given(permissionResolver.hasPermission(any(), any())).willReturn(true);
    }

    @Test
    void shouldRejectUnauthenticatedAccessToFileEndpoints() throws Exception {
        mockMvc.perform(get("/api/admin/v1/files"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401));

        mockMvc.perform(get("/api/admin/v1/files/1/content"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(multipart("/api/admin/v1/files/uploads")
                        .file(new MockMultipartFile("file", "x.txt", MediaType.TEXT_PLAIN_VALUE, CONTENT)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldAllowAnonymousSignedDownloadWhileSecurityEnabled() throws Exception {
        String token = login();
        String fileId = upload(token);
        String signedUrl = signedUrl(token, fileId);

        // 关键：不带 Authorization，仅凭签名 token 就能下载
        mockMvc.perform(get(signedUrl))
                .andExpect(status().isOk())
                .andExpect(content().bytes(CONTENT));

        // 同一份内容走受保护接口仍然需要令牌
        mockMvc.perform(get("/api/admin/v1/files/{id}/content", fileId))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/v1/files/{id}/content", fileId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().bytes(CONTENT));

        // 签名被篡改时，匿名端点也不会放行
        mockMvc.perform(get(signedUrl + "tampered"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(220010));
    }

    private String login() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/admin/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LOGIN_BODY))
                .andExpect(status().isOk())
                .andReturn();
        return com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.data.accessToken");
    }

    private String upload(String token) throws Exception {
        MvcResult result = mockMvc.perform(multipart("/api/admin/v1/files/uploads")
                        .file(new MockMultipartFile("file", "secured.txt", MediaType.TEXT_PLAIN_VALUE, CONTENT))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andReturn();
        return com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
    }

    private String signedUrl(String token, String fileId) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/admin/v1/files/{id}/url", fileId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        return com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.data.url");
    }
}

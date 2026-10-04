package dev.hucoo.admin;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 文件模块端到端接口测试（test profile：Mock 持久化 + 本地存储驱动）。
 *
 * <p>重点验证三件容易出错的事：响应信封与 ID 字符串化、二进制下载不被 {@code ResponseWrapper} 包装、
 * 匿名签名链接的签名与过期校验。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FileApiTests {

    @Autowired
    private MockMvc mockMvc;

    private String uploadSample() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "样例 报告.txt", MediaType.TEXT_PLAIN_VALUE,
                "file-module-e2e-content 中文".getBytes(StandardCharsets.UTF_8));
        MvcResult result = mockMvc.perform(multipart("/api/admin/v1/files/uploads")
                        .file(file)
                        .param("bizType", "PROJECT")
                        .param("bizId", "1001")
                        .param("visibility", "TENANT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.status").value("NORMAL"))
                .andExpect(jsonPath("$.data.storageType").value("LOCAL"))
                .andExpect(jsonPath("$.data.sha256").isNotEmpty())
                .andReturn();
        return com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.data.id");
    }

    @Test
    void shouldUploadListDownloadAndRecycle() throws Exception {
        String fileId = uploadSample();

        mockMvc.perform(get("/api/admin/v1/files").param("page", "1").param("pageSize", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items").isArray())
                .andExpect(jsonPath("$.data.total").isNumber());

        mockMvc.perform(get("/api/admin/v1/files/{id}", fileId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bizType").value("PROJECT"));

        // 下载返回原始字节流：不能是 Result 信封
        MvcResult download = mockMvc.perform(get("/api/admin/v1/files/{id}/content", fileId))
                .andExpect(status().isOk())
                .andExpect(header().exists("Content-Disposition"))
                .andReturn();
        String body = bodyOf(download);
        assertEquals("file-module-e2e-content 中文", body);
        assertTrue(!body.contains("\"code\""), "下载响应不应被包装成 Result 信封");

        // 重命名只改元数据
        mockMvc.perform(patch("/api/admin/v1/files/{id}", fileId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"改名后的文件.txt\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.displayName").value("改名后的文件.txt"));

        // 进回收站后不允许下载
        mockMvc.perform(delete("/api/admin/v1/files/{id}", fileId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(true));
        mockMvc.perform(get("/api/admin/v1/files/{id}/content", fileId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(220011));

        // 还原后可再次下载
        mockMvc.perform(post("/api/admin/v1/files/{id}/restore", fileId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("NORMAL"));
        assertEquals("file-module-e2e-content 中文",
                bodyOf(mockMvc.perform(get("/api/admin/v1/files/{id}/content", fileId))
                        .andExpect(status().isOk())
                        .andReturn()));
    }

    private static String bodyOf(MvcResult result) throws Exception {
        // 响应没有 charset 时 MockMvc 默认按 ISO-8859-1 解码，中文内容必须显式按 UTF-8 读
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }

    @Test
    void shouldRejectBlockedExtension() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "payload.exe",
                MediaType.APPLICATION_OCTET_STREAM_VALUE, "MZ".getBytes(StandardCharsets.UTF_8));
        mockMvc.perform(multipart("/api/admin/v1/files/uploads").file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(220003));
    }

    @Test
    void shouldIssueAndValidateSignedDownloadUrl() throws Exception {
        String fileId = uploadSample();

        MvcResult urlResult = mockMvc.perform(get("/api/admin/v1/files/{id}/url", fileId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mode").value("PROXY"))
                .andReturn();
        String url = com.jayway.jsonpath.JsonPath.read(urlResult.getResponse().getContentAsString(), "$.data.url");
        String token = url.substring(url.lastIndexOf('/') + 1);

        mockMvc.perform(get("/api/admin/v1/files/download/{token}", token))
                .andExpect(status().isOk())
                .andExpect(content().bytes("file-module-e2e-content 中文".getBytes(StandardCharsets.UTF_8)));

        mockMvc.perform(get("/api/admin/v1/files/download/{token}", "1.1.deadbeef"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(220010));

        // 篡改有效期必须被签名校验拦住
        String tampered = fileId + ".9999999999." + token.substring(token.lastIndexOf('.') + 1);
        mockMvc.perform(get("/api/admin/v1/files/download/{token}", tampered))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(220010));
    }

    @Test
    void shouldReportStorageCapabilities() throws Exception {
        mockMvc.perform(get("/api/admin/v1/files/storage/capabilities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.enabled").value(true))
                .andExpect(jsonPath("$.data.provider").value("local"))
                // 本地驱动没有预签名能力，前端据此走代理上传
                .andExpect(jsonPath("$.data.presignedPut").value(false));
    }

    @Test
    void shouldReturnNotFoundForUnknownFile() throws Exception {
        mockMvc.perform(get("/api/admin/v1/files/{id}", "999999999999"))
                .andExpect(status().isNotFound());
    }
}

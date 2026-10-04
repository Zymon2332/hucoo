package dev.hucoo.admin;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * 导出管理端 OpenAPI 契约，作为前后端对接的唯一契约源。
 *
 * <p>产物固定写入 {@code target/openapi/openapi.json}，通过
 * {@code ./mvnw -pl hucoo-server/hucoo-application-admin test -Dtest=OpenApiContractExportTests} 可重复生成。
 * 契约内容与运行时 {@code GET /v3/api-docs} 完全一致，避免手工拷贝导致漂移。
 *
 * <p>使用 {@code test} profile：关闭 Nacos 与安全拦截，走 Mock 持久化，无需外部依赖即可导出。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpenApiContractExportTests {

    private static final String API_DOCS_PATH = "/v3/api-docs";
    private static final Path OUTPUT = Path.of("target", "openapi", "openapi.json");
    private static final String ADMIN_PREFIX = "/api/admin/v1";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldExportOpenApiContractToTargetDirectory() throws Exception {
        MvcResult result = mockMvc.perform(get(API_DOCS_PATH))
                .andExpect(status().isOk())
                .andReturn();

        String json = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertFalse(json.isBlank(), "OpenAPI 契约不得为空");

        Files.createDirectories(OUTPUT.getParent());
        Files.writeString(OUTPUT, json, StandardCharsets.UTF_8);

        assertTrue(Files.exists(OUTPUT), "契约文件应写入 " + OUTPUT.toAbsolutePath());
        assertTrue(json.contains("\"openapi\""), "应包含 openapi 版本字段");
        assertTrue(json.contains(ADMIN_PREFIX), "应包含管理端接口前缀 " + ADMIN_PREFIX);
    }
}

package dev.hucoo.admin;

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
 * 契约回归用例：主键类字段必须以 JSON 字符串返回，避免前端 JavaScript 精度丢失。
 *
 * <p>背景：雪花算法 ID 为 19 位长整型，超过 {@code Number.MAX_SAFE_INTEGER}（9007199254740991）。
 * 继承 {@code BaseDTO} 的 DTO 已通过 {@code @JsonSerialize(ToStringSerializer)} 序列化为字符串，
 * 但独立 DTO 的 {@code id}、{@code userId} 等字段此前是裸数字，前端 {@code JSON.parse} 会静默截断。
 * 本用例锁定这些字段的字符串类型。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class IdSerializationContractTests {

    private static final String LOGIN_BODY = """
            {"method":"PASSWORD","identifier":"admin","credential":"%s"}
            """.formatted(MockAuthenticationApplicationService.DEMO_PASSWORD);

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldSerializeLoginIdentifiersAsStrings() throws Exception {
        mockMvc.perform(post("/api/admin/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LOGIN_BODY))
                .andExpect(status().isOk())
                // 判断 JSON 类型：字符串会带引号，数字不会
                .andExpect(jsonPath("$.data.userId").isString())
                .andExpect(jsonPath("$.data.tenantId").isString());
    }

    @Test
    void shouldSerializeCurrentUserAndRegisterIdentifiersAsStrings() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/admin/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LOGIN_BODY))
                .andExpect(status().isOk())
                .andReturn();
        String accessToken = JsonPath.read(login.getResponse().getContentAsString(), "$.data.accessToken");

        mockMvc.perform(get("/api/admin/v1/auth/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").isString());

        // AuthRegisterResult 是 record 组件上的注解，单独验证
        mockMvc.perform(post("/api/admin/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"identifier":"contract-check-%d","password":"Admin@12345","displayName":"契约校验"}
                                """.formatted(System.nanoTime())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").isString());
    }

    @Test
    void shouldSerializeEntityIdentifiersAsStrings() throws Exception {
        mockMvc.perform(get("/api/admin/v1/tenants").param("page", "1").param("pageSize", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].id").isString());

        mockMvc.perform(get("/api/admin/v1/organizations").param("page", "1").param("pageSize", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].id").isString());

        mockMvc.perform(get("/api/admin/v1/roles").param("page", "1").param("pageSize", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].id").isString());

        mockMvc.perform(get("/api/admin/v1/audit-logs").param("page", "1").param("pageSize", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].id").isString());
    }

    @Test
    void shouldSerializeOrganizationOwnerAndParentIdsAsStrings() throws Exception {
        mockMvc.perform(post("/api/admin/v1/organizations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"orgCode":"contract-org","orgName":"契约组织","orgType":"TEAM",
                                 "parentId":123456789012345678,"ownerId":987654321098765432}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").isString())
                .andExpect(jsonPath("$.data.parentId").isString())
                .andExpect(jsonPath("$.data.ownerId").isString());
    }
}

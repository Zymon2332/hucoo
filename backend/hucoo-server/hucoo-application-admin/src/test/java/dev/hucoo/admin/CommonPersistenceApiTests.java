package dev.hucoo.admin;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import dev.hucoo.component.test.TestcontainersConfiguration;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"agent-platform.persistence.enabled=true", "spring.flyway.enabled=true"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class CommonPersistenceApiTests {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(TestcontainersConfiguration.POSTGRES_IMAGE);

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    MockMvc mvc;
    @Autowired
    JdbcTemplate jdbc;

    @Test
    void fullFlywayHistoryAndNewModuleWorkTogether() throws Exception {
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM flyway_schema_history WHERE version='16' AND success=true", Integer.class));
        // The former settings table survives while its routes are retired.
        assertNotNull(jdbc.queryForObject("SELECT to_regclass('ap_platform_setting')::text", String.class));
        mvc.perform(post("/api/admin/v1/configs").param("scope", "PLATFORM").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"key\":\"integration.enabled\",\"name\":\"Enabled\",\"group\":\"integration\",\"valueType\":\"BOOLEAN\",\"value\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.id").isString());
        mvc.perform(get("/api/admin/v1/configs/effective/integration.enabled"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.value").value(true));
        mvc.perform(get("/api/admin/v1/settings/license")).andExpect(status().isNotFound());
    }
}

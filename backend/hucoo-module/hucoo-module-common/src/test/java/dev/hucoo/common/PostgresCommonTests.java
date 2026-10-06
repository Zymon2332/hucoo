package dev.hucoo.common;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.core.io.FileSystemResource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import dev.hucoo.component.test.TestcontainersConfiguration;
import dev.hucoo.common.api.dto.*;
import dev.hucoo.component.database.tenant.CurrentTenantContext;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = CommonTestApplication.class, properties = {
        "agent-platform.persistence.enabled=true", "agent-platform.security.enabled=false"
})
@Testcontainers(disabledWithoutDocker = true)
class PostgresCommonTests extends CommonBehaviorContract {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(TestcontainersConfiguration.POSTGRES_IMAGE);
    @Autowired
    JdbcTemplate jdbc;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        // Apply the exact production migration; no approximation with H2.
        registry.add("spring.datasource.hikari.connection-init-sql", () -> "SET search_path TO public");
    }

    @org.junit.jupiter.api.BeforeAll
    static void schema() throws Exception {
        var source = new org.springframework.jdbc.datasource.DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        new ResourceDatabasePopulator(new FileSystemResource("../../hucoo-server/hucoo-application-admin/src/main/resources/db/migration/V16__common_dictionary_config_schema.sql")).execute(source);
    }

    @Test
    void ownerForeignKeyAndTransactionalDeletion() {
        tenant("tenant-a");
        var type = dictionaries.createType(CommonScope.TENANT, typeRequest());
        var item = dictionaries.createItem(type.getId(), CommonScope.TENANT, itemRequest("x", "X", 0));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> jdbc.update(
                "INSERT INTO ap_common_dictionary_item(id,type_id,item_label,item_value,tenant_id) VALUES(?,?,?,?,?)",
                item.getId() + 1, type.getId(), "bad", "bad", "tenant-b"));
        dictionaries.deleteType(type.getId(), CommonScope.TENANT, type.getVersion());
        assertEquals(1, jdbc.queryForObject("SELECT deleted FROM ap_common_dictionary_item WHERE id=?", Integer.class, item.getId()));
        assertEquals(1, jdbc.queryForObject("SELECT deleted FROM ap_common_dictionary_type WHERE id=?", Integer.class, type.getId()));
    }

    @Test
    void failedParentDeletionRollsBackItemDeletion() {
        tenant("rollback-tenant");
        var type = dictionaries.createType(CommonScope.TENANT, typeRequest());
        var item = dictionaries.createItem(type.getId(), CommonScope.TENANT, itemRequest("x", "X", 0));
        jdbc.execute("CREATE FUNCTION common_reject_delete() RETURNS TRIGGER AS $$ BEGIN IF NEW.deleted=1 AND OLD.id=" + type.getId()
                + " THEN RAISE EXCEPTION 'rollback probe'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql");
        jdbc.execute("CREATE TRIGGER common_delete_probe BEFORE UPDATE ON ap_common_dictionary_type FOR EACH ROW EXECUTE FUNCTION common_reject_delete()");
        try {
            assertThrows(RuntimeException.class, () -> dictionaries.deleteType(type.getId(), CommonScope.TENANT, type.getVersion()));
            assertEquals(0, jdbc.queryForObject("SELECT deleted FROM ap_common_dictionary_item WHERE id=?", Integer.class, item.getId()));
            assertEquals(0, jdbc.queryForObject("SELECT deleted FROM ap_common_dictionary_type WHERE id=?", Integer.class, type.getId()));
        } finally {
            jdbc.execute("DROP TRIGGER common_delete_probe ON ap_common_dictionary_type");
            jdbc.execute("DROP FUNCTION common_reject_delete()");
        }
    }
}

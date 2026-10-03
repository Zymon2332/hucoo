package dev.hucoo.component.test;

import org.testcontainers.postgresql.PostgreSQLContainer;

public final class TestcontainersConfiguration {

    public static final String POSTGRES_IMAGE = "postgres:16-alpine";

    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(POSTGRES_IMAGE)
            .withDatabaseName("hucoo_agent_platform");

    private TestcontainersConfiguration() {
    }

    public static PostgreSQLContainer postgres() {
        if (!POSTGRES.isRunning()) {
            POSTGRES.start();
        }
        return POSTGRES;
    }
}

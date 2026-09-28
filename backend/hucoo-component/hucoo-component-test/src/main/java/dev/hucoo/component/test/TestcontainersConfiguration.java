package dev.hucoo.component.test;

import org.testcontainers.mysql.MySQLContainer;

public final class TestcontainersConfiguration {

    public static final String MYSQL_IMAGE = "mysql:8.4";

    private static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4")
            .withDatabaseName("hucoo_agent_platform");

    private TestcontainersConfiguration() {
    }

    public static MySQLContainer mysql() {
        if (!MYSQL.isRunning()) {
            MYSQL.start();
        }
        return MYSQL;
    }
}

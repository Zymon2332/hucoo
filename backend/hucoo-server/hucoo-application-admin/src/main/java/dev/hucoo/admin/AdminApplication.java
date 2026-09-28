package dev.hucoo.admin;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {
        "dev.hucoo.admin",
        "dev.hucoo.tenant",
        "dev.hucoo.identity",
        "dev.hucoo.modelgovernance",
        "dev.hucoo.toolmcp",
        "dev.hucoo.agent",
        "dev.hucoo.project",
        "dev.hucoo.billing",
        "dev.hucoo.audit",
        "dev.hucoo.security",
        "dev.hucoo.monitoring",
        "dev.hucoo.integration"
})
@MapperScan("dev.hucoo.**.infrastructure.mapper")
public class AdminApplication {

    public static void main(String[] args) {
        SpringApplication.run(AdminApplication.class, args);
    }
}

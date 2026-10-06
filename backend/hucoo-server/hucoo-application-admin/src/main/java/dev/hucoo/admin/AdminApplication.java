package dev.hucoo.admin;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

import dev.hucoo.integration.client.GitProviderClient;
import dev.hucoo.modelruntime.client.ModelRuntimeFeignClient;

@SpringBootApplication(scanBasePackages = {
        "dev.hucoo.admin",
        "dev.hucoo.common",
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
        "dev.hucoo.integration",
        "dev.hucoo.file"
})
@EnableFeignClients(basePackageClasses = {
        GitProviderClient.class,
        ModelRuntimeFeignClient.class
})
// 业务与组件的 Mapper 统一由 Admin 注册；两个旧包保留历史结构例外。
// 不扫描 infrastructure.repository，避免将普通仓储接口注册为 Mapper。
@MapperScan({
        "dev.hucoo.**.infrastructure.mapper",
        "dev.hucoo.identity.infrastructure.auth.mapper",
        "dev.hucoo.admin.operations.infrastructure"
})
public class AdminApplication {

    public static void main(String[] args) {
        SpringApplication.run(AdminApplication.class, args);
    }
}

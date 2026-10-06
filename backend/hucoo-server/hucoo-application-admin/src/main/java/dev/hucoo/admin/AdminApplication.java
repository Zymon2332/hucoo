package dev.hucoo.admin;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

import dev.hucoo.integration.client.GitProviderClient;
import dev.hucoo.modelruntime.client.ModelRuntimeFeignClient;

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
        "dev.hucoo.integration",
        "dev.hucoo.file"
})
@EnableFeignClients(basePackageClasses = {
        GitProviderClient.class,
        ModelRuntimeFeignClient.class
})
// 扫描范围需要显式列出：MyBatis 的 Mapper 不是全部位于 <module>.infrastructure.mapper，
// 还有三个例外包：
//   - dev.hucoo.identity.infrastructure.auth.mapper   （统一认证的 6 个 Mapper）
//   - dev.hucoo.admin.operations.infrastructure       （运营域 6 个 Mapper）
//   - dev.hucoo.admin.platformconfig.infrastructure   （平台配置 2 个 Mapper）
// 只写 **.infrastructure.mapper 会漏掉这 14 个，导致 persistence.enabled=true 时认证等模块装配失败。
// 注意不能放宽成 **.infrastructure：那会把 infrastructure.repository 下的普通仓储接口
// 也当成 Mapper 注册，运行时报 Invalid bound statement。
@MapperScan({
        "dev.hucoo.**.infrastructure.mapper",
        "dev.hucoo.identity.infrastructure.auth.mapper",
        "dev.hucoo.admin.operations.infrastructure",
        "dev.hucoo.admin.platformconfig.infrastructure"
})
public class AdminApplication {

    public static void main(String[] args) {
        SpringApplication.run(AdminApplication.class, args);
    }
}

package dev.hucoo.common;

import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.annotation.Configuration;
import org.mybatis.spring.annotation.MapperScan;

@Configuration(proxyBeanMethods = false)
@EnableAutoConfiguration
@org.springframework.context.annotation.ComponentScan("dev.hucoo.common")
@MapperScan("dev.hucoo.common.infrastructure.mapper")
class CommonTestApplication {
}

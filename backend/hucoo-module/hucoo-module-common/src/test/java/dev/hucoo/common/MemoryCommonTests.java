package dev.hucoo.common;

import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(classes = CommonTestApplication.class, properties = {
        "agent-platform.persistence.enabled=false", "agent-platform.security.enabled=false",
        "spring.datasource.url=jdbc:postgresql://127.0.0.1:1/unused",
        "spring.datasource.driver-class-name=org.postgresql.Driver"
})
class MemoryCommonTests extends CommonBehaviorContract {
}

package dev.hucoo.admin;

import java.util.Set;
import java.util.TreeSet;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

/**
 * 诊断用例：打印 Mock 持久化模式下实际注册的 MVC 端点。
 *
 * <p>用于验证 {@code @ConditionalOnBean} 对控制器注册的影响，例如认证控制器在
 * {@code agent-platform.persistence.enabled=false} 时是否缺席。
 */
@SpringBootTest
@ActiveProfiles("test")
class RegisteredEndpointDiagnosticsTests {

    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    private RequestMappingHandlerMapping handlerMapping;

    @Test
    void reportRegisteredEndpointsUnderMockPersistence() {
        Set<String> patterns = new TreeSet<>();
        handlerMapping.getHandlerMethods().forEach((info, method) -> {
            if (info.getPathPatternsCondition() != null) {
                info.getPathPatternsCondition().getPatternValues()
                        .forEach(pattern -> patterns.add(pattern + "  <- " + method.getBeanType().getSimpleName()));
            }
        });

        System.out.println("=== REGISTERED ENDPOINTS: " + patterns.size() + " ===");
        patterns.stream()
                .filter(p -> p.contains("/auth") || p.contains("/api/admin/v1"))
                .limit(400)
                .forEach(System.out::println);

        boolean hasAuthController = handlerMapping.getHandlerMethods().values().stream()
                .anyMatch(m -> m.getBeanType().getSimpleName().equals("AuthenticationController"));
        System.out.println("=== AuthenticationController registered: " + hasAuthController + " ===");
    }
}

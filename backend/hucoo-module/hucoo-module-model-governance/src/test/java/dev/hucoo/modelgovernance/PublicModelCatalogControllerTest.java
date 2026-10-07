package dev.hucoo.modelgovernance;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.component.security.config.SecurityProperties;
import dev.hucoo.component.security.context.CurrentUserContext;
import dev.hucoo.component.security.interceptor.PermissionInterceptor;
import dev.hucoo.component.security.interceptor.PermissionResolver;
import dev.hucoo.component.security.util.JwtUtil;
import dev.hucoo.component.web.advice.GlobalExceptionHandler;
import dev.hucoo.modelgovernance.client.PublicModelCatalogApi;
import dev.hucoo.modelgovernance.controller.PublicModelCatalogController;
import dev.hucoo.modelgovernance.infrastructure.repository.InMemoryModelCatalogRepository;

class PublicModelCatalogControllerTest {
    private MockMvc mvc;
    private String token;

    @BeforeEach void setUp() {
        var f = new CatalogTestFixture(new InMemoryModelCatalogRepository());
        f.ready("tenant-a", "vendor", "model");
        var properties = new SecurityProperties();
        // 即使本地关闭管理权限拦截，客户端目录仍必须有真实登录上下文。
        properties.setEnabled(false);
        var jwt = new JwtUtil(properties.getJwtSecret());
        token = jwt.createToken("42", Map.of("userId", 42L, "username", "client", "tenantId", "tenant-a"), Duration.ofMinutes(5));
        var interceptor = new PermissionInterceptor(properties, jwt,
                new DefaultListableBeanFactory().getBeanProvider(PermissionResolver.class));
        mvc = MockMvcBuilders.standaloneSetup(new PublicModelCatalogController(f.service()))
                .setControllerAdvice(new GlobalExceptionHandler()).addInterceptors(interceptor).build();
        CurrentUserContext.clear(); CurrentTenantContext.clear();
    }

    @AfterEach void cleanup() { CurrentUserContext.clear(); CurrentTenantContext.clear(); }

    @Test void requiresLoginAndDoesNotTrustIdentityHeaders() throws Exception {
        mvc.perform(get(PublicModelCatalogApi.PATH).header("X-User-Id", "42").header("X-Tenant-Id", "tenant-a"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value(401));
    }

    @Test void returnsSafeGroupedCatalogForUserWithoutAdminPermissions() throws Exception {
        mvc.perform(get(PublicModelCatalogApi.PATH).header("Authorization", "Bearer " + token).param("projectId", "7"))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.catalogVersion").isNotEmpty())
                .andExpect(jsonPath("$.data.policyVersion").value("stable-v1"))
                .andExpect(jsonPath("$.data.providers[0].providerCode").value("vendor"))
                .andExpect(jsonPath("$.data.providers[0].models[0].modelCode").value("model"))
                .andExpect(jsonPath("$.data.providers[0].models[0].capabilities[0]").value("STREAMING"))
                .andExpect(jsonPath("$.data.providers[0].endpoint").doesNotExist())
                .andExpect(jsonPath("$.data.providers[0].models[0].id").doesNotExist());
        assertNull(CurrentUserContext.get()); assertNull(CurrentTenantContext.getTenantIdOrNull());
    }

    @Test void rejectsInvalidProjectIdAndTenantSpoofing() throws Exception {
        for (String project : new String[]{"0", "-1", "not-a-number", "99999999999999999999"}) {
            mvc.perform(get(PublicModelCatalogApi.PATH).header("Authorization", "Bearer " + token).param("projectId", project))
                    .andExpect(jsonPath("$.code").value(400));
        }
        mvc.perform(get(PublicModelCatalogApi.PATH).header("Authorization", "Bearer " + token).header("X-Tenant-Id", "tenant-b"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value(403));
    }
}

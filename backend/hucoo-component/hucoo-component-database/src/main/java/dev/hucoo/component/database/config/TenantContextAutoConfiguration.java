package dev.hucoo.component.database.config;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Bean;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import io.micrometer.context.ThreadLocalAccessor;

@AutoConfiguration(beforeName = "dev.hucoo.component.log.config.LogAutoConfiguration")
public class TenantContextAutoConfiguration {
    @Bean
    ThreadLocalAccessor<String> tenantContextAccessor() {
        return new ThreadLocalAccessor<>() {
            @Override public Object key() { return "hucoo.database.context"; }
            @Override public String getValue() { return CurrentTenantContext.getTenantIdOrNull(); }
            @Override public void setValue(String value) { CurrentTenantContext.set(value); }
            @Override public void setValue() { CurrentTenantContext.clear(); }
        };
    }
}

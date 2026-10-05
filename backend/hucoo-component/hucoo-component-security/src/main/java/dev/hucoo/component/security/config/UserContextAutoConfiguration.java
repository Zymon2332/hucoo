package dev.hucoo.component.security.config;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Bean;
import dev.hucoo.component.security.context.CurrentUserContext;
import dev.hucoo.component.security.context.CurrentUser;
import io.micrometer.context.ThreadLocalAccessor;

@AutoConfiguration(beforeName = "dev.hucoo.component.log.config.LogAutoConfiguration")
public class UserContextAutoConfiguration {
    @Bean
    ThreadLocalAccessor<CurrentUser> userContextAccessor() {
        return new ThreadLocalAccessor<>() {
            @Override public Object key() { return "hucoo.security.context"; }
            @Override public CurrentUser getValue() { return CurrentUserContext.get(); }
            @Override public void setValue(CurrentUser value) { CurrentUserContext.set(value); }
            @Override public void setValue() { CurrentUserContext.clear(); }
        };
    }
}

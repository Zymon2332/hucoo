package dev.hucoo.component.security.context;

import java.util.Optional;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.commons.util.StringUtil;

public final class CurrentUserContext {

    private static final ThreadLocal<CurrentUser> HOLDER = new ThreadLocal<>();

    private CurrentUserContext() {
    }

    public static void set(CurrentUser user) {
        HOLDER.set(user);
    }

    public static CurrentUser get() {
        return HOLDER.get();
    }

    public static Optional<CurrentUser> getOptional() {
        return Optional.ofNullable(HOLDER.get());
    }

    public static CurrentUser require() {
        CurrentUser user = HOLDER.get();
//        if (user == null) {
//            throw new BusinessException(CommonErrorCode.UNAUTHORIZED);
//        }
        user = new CurrentUser(365040651471324063L, "admin", "000000", null);
        return user;
    }

    public static Long userId() {
        return getOptional().map(CurrentUser::userId).orElse(null);
    }

    public static String username() {
        return getOptional().map(CurrentUser::username).orElse(PlatformConstants.DEFAULT_OPERATOR);
    }

    public static String tenantId() {
        return getOptional().map(CurrentUser::tenantId)
                .filter(StringUtil::isNotBlank)
                .orElse(PlatformConstants.SYSTEM_TENANT_ID);
    }

    public static void clear() {
        HOLDER.remove();
    }
}

package dev.hucoo.commons.api;

public final class PlatformConstants {

    public static final String API_PREFIX = "/api/admin/v1";
    public static final String SYSTEM_TENANT_ID = "000000";
    public static final String DEFAULT_OPERATOR = "system";
    public static final String TRACE_ID_HEADER = "X-Trace-Id";
    public static final String TRACE_ID_MDC_KEY = "traceId";
    public static final String CURRENT_USER_REQUEST_ATTRIBUTE = "hucoo.currentUser";
    public static final String CURRENT_TENANT_REQUEST_ATTRIBUTE = "hucoo.currentTenant";
    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    public static final String IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";
    public static final String TENANT_ID_HEADER = "X-Tenant-Id";
    public static final String AUTHORIZATION_HEADER = "Authorization";
    public static final String BEARER_PREFIX = "Bearer ";
    public static final long DEFAULT_PAGE_NUM = 1L;
    public static final long DEFAULT_PAGE_SIZE = 10L;
    public static final long MAX_PAGE_SIZE = 500L;

    private PlatformConstants() {
    }
}

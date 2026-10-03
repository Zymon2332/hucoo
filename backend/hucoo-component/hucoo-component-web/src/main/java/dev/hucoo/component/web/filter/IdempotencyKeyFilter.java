package dev.hucoo.component.web.filter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.util.StringUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Replays successful mutation responses for a bounded idempotency-key window. */
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class IdempotencyKeyFilter extends OncePerRequestFilter {

    private static final Duration CACHE_TTL = Duration.ofMinutes(10);
    private static final int MAX_BODY_BYTES = 1024 * 1024;

    private final Map<String, CachedResponse> cache = new ConcurrentHashMap<>();
    private final Map<String, Object> locks = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        if (!isMutation(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }
        String idempotencyKey = request.getHeader(PlatformConstants.IDEMPOTENCY_KEY_HEADER);
        if (StringUtil.isBlank(idempotencyKey)) {
            filterChain.doFilter(request, response);
            return;
        }

        String tenantId = request.getHeader(PlatformConstants.TENANT_ID_HEADER);
        String cacheKey = String.valueOf(tenantId) + " " + request.getMethod() + " "
                + request.getRequestURI() + " " + idempotencyKey;
        Object lock = locks.computeIfAbsent(cacheKey, ignored -> new Object());
        synchronized (lock) {
            CachedResponse cached = cache.get(cacheKey);
            if (cached != null && !cached.expired()) {
                cached.writeTo(response);
                return;
            }
            if (cached != null) {
                cache.remove(cacheKey, cached);
            }

            ContentCachingResponseWrapper wrapped = new ContentCachingResponseWrapper(response);
            try {
                filterChain.doFilter(request, wrapped);
            } finally {
                byte[] body = wrapped.getContentAsByteArray();
                if (wrapped.getStatus() >= 200 && wrapped.getStatus() < 300 && body.length <= MAX_BODY_BYTES) {
                    cache.put(cacheKey, CachedResponse.from(wrapped, body));
                }
                wrapped.copyBodyToResponse();
                locks.remove(cacheKey, lock);
            }
        }
    }

    private boolean isMutation(String method) {
        return "POST".equalsIgnoreCase(method)
                || "PUT".equalsIgnoreCase(method)
                || "PATCH".equalsIgnoreCase(method)
                || "DELETE".equalsIgnoreCase(method);
    }

    private record CachedResponse(int status, String contentType, byte[] body, Instant expiresAt) {

        private static CachedResponse from(ContentCachingResponseWrapper response, byte[] body) {
            return new CachedResponse(response.getStatus(), response.getContentType(), body.clone(),
                    Instant.now().plus(CACHE_TTL));
        }

        private boolean expired() {
            return Instant.now().isAfter(expiresAt);
        }

        private void writeTo(HttpServletResponse response) throws IOException {
            response.setStatus(status);
            if (contentType != null) {
                response.setContentType(contentType);
            }
            response.setContentLength(body.length);
            response.getOutputStream().write(body);
        }
    }
}

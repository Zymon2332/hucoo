package dev.hucoo.gateway.filter;

import java.nio.charset.StandardCharsets;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ServerWebExchange;

import dev.hucoo.commons.dto.Result;
import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.commons.util.JsonUtil;
import dev.hucoo.commons.util.StringUtil;
import dev.hucoo.gateway.config.GatewayAuthProperties;

import reactor.core.publisher.Mono;

@Component
public class AuthGlobalFilter implements GlobalFilter, Ordered {

    private static final AntPathMatcher PATH_MATCHER = new AntPathMatcher();
    private static final String SUBJECT_ATTRIBUTE = "gateway.auth.subject";
    private static final String BEARER_PREFIX = "Bearer ";

    private final GatewayAuthProperties properties;

    public AuthGlobalFilter(GatewayAuthProperties properties) {
        this.properties = properties;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        if (!properties.isEnabled() || isWhitelisted(path)) {
            return chain.filter(exchange);
        }
        String token = resolveToken(request);
        if (StringUtil.isBlank(token)) {
            return writeUnauthorized(exchange, "缺少访问令牌");
        }
        exchange.getAttributes().put(SUBJECT_ATTRIBUTE, token);
        return chain.filter(exchange.mutate()
                .request(request.mutate().header("X-Gateway-Subject", token).build())
                .build());
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 100;
    }

    private boolean isWhitelisted(String path) {
        return properties.getWhitelist().stream().anyMatch(pattern -> PATH_MATCHER.match(pattern, path));
    }

    private String resolveToken(ServerHttpRequest request) {
        String authorization = request.getHeaders().getFirst(properties.getTokenHeader());
        if (StringUtil.isBlank(authorization)) {
            return null;
        }
        if (authorization.startsWith(BEARER_PREFIX)) {
            return authorization.substring(BEARER_PREFIX.length()).trim();
        }
        return authorization.trim();
    }

    private Mono<Void> writeUnauthorized(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        byte[] bytes = StringUtil.defaultIfBlank(
                JsonUtil.toJson(Result.fail(CommonErrorCode.UNAUTHORIZED.getCode(), message)
                        .withTraceId(response.getHeaders().getFirst(PlatformConstants.TRACE_ID_HEADER))), "{}")
                .getBytes(StandardCharsets.UTF_8);
        DataBuffer buffer = response.bufferFactory().wrap(bytes);
        return response.writeWith(Mono.just(buffer));
    }
}

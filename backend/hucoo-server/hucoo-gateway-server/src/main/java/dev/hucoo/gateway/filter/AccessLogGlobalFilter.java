package dev.hucoo.gateway.filter;

import java.net.URI;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;

import reactor.core.publisher.Mono;
import dev.hucoo.component.log.context.TaskContext;

@Component
public class AccessLogGlobalFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(AccessLogGlobalFilter.class);

    private final TaskContext taskContext;

    public AccessLogGlobalFilter(TaskContext taskContext) { this.taskContext = taskContext; }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return Mono.deferContextual(reactorContext -> {
            var captured = taskContext.capture();
            long start = System.currentTimeMillis();
            return chain.filter(exchange).doFinally(signal -> {
                try (var scope = captured.open()) {
                    Route route = exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR);
                    URI target = exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_REQUEST_URL_ATTR);
                    log.info("{} {} -> route={}, target={}, status={}, cost={} ms",
                            exchange.getRequest().getMethod(),
                            exchange.getRequest().getURI().getPath(),
                            route == null ? "-" : route.getId(),
                            target == null ? "-" : target,
                            exchange.getResponse().getStatusCode(),
                            System.currentTimeMillis() - start);
                }
            });
        });
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}

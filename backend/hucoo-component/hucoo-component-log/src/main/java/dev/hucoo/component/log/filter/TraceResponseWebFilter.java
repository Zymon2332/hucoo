package dev.hucoo.component.log.filter;

import org.springframework.core.Ordered;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import dev.hucoo.commons.api.PlatformConstants;
import io.micrometer.observation.Observation;
import io.micrometer.observation.contextpropagation.ObservationThreadLocalAccessor;
import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import io.micrometer.tracing.handler.TracingObservationHandler;
import reactor.core.publisher.Mono;

public final class TraceResponseWebFilter implements WebFilter, Ordered {
    private final Tracer tracer;

    public TraceResponseWebFilter(Tracer tracer) {
        this.tracer = tracer;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        return Mono.deferContextual(context -> {
            Span span = tracer.currentSpan();
            Observation observation = context.getOrDefault(ObservationThreadLocalAccessor.KEY, null);
            if (observation != null) {
                TracingObservationHandler.TracingContext tracing = observation.getContext().get(TracingObservationHandler.TracingContext.class);
                if (tracing != null) span = tracing.getSpan();
            }
            if (span != null) exchange.getResponse().getHeaders()
                    .set(PlatformConstants.TRACE_ID_HEADER, span.context().traceId());
            return chain.filter(exchange);
        });
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 2;
    }
}

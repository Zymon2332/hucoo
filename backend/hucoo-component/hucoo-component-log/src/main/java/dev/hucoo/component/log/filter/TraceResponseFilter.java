package dev.hucoo.component.log.filter;

import java.io.IOException;

import org.springframework.web.filter.OncePerRequestFilter;
import dev.hucoo.commons.api.PlatformConstants;
import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Runs inside Boot's HTTP observation scope. Does not generate or manually modify IDs.
 */
public final class TraceResponseFilter extends OncePerRequestFilter {
    private static final String SPAN_ATTRIBUTE = TraceResponseFilter.class.getName() + ".span";
    private final Tracer tracer;

    public TraceResponseFilter(Tracer tracer) {
        this.tracer = tracer;
    }

    @Override
    protected boolean shouldNotFilterAsyncDispatch() {
        return false;
    }

    @Override
    protected boolean shouldNotFilterErrorDispatch() {
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws IOException, ServletException {
        Span span = tracer.currentSpan();
        if (span != null) request.setAttribute(SPAN_ATTRIBUTE, span);
        else span = (Span) request.getAttribute(SPAN_ATTRIBUTE);
        if (span == null) {
            chain.doFilter(request, response);
            return;
        }
        try (var scope = tracer.withSpan(span)) {
            response.setHeader(PlatformConstants.TRACE_ID_HEADER, span.context().traceId());
            chain.doFilter(request, response);
        }
    }

    @Override
    protected void doFilterNestedErrorDispatch(HttpServletRequest request, HttpServletResponse response,
                                               FilterChain chain) throws IOException, ServletException {
        doFilterInternal(request, response, chain);
    }
}

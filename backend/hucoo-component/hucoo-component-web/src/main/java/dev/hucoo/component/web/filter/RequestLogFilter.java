package dev.hucoo.component.web.filter;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class RequestLogFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestLogFilter.class);

    private static final String START_ATTRIBUTE = RequestLogFilter.class.getName() + ".start";

    @Override
    protected boolean shouldNotFilterAsyncDispatch() { return false; }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        Long start = (Long) request.getAttribute(START_ATTRIBUTE);
        if (start == null) {
            start = System.currentTimeMillis();
            request.setAttribute(START_ATTRIBUTE, start);
        }
        try {
            filterChain.doFilter(request, response);
        } finally {
            if (!request.isAsyncStarted()) {
                long cost = System.currentTimeMillis() - start;
                log.info("{} {} -> {} ({} ms)", request.getMethod(), request.getRequestURI(), response.getStatus(), cost);
            }
        }
    }
}

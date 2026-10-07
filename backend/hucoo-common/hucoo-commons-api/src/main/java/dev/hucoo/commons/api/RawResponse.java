package dev.hucoo.commons.api;

import java.lang.annotation.*;

/** 协议端点保持原始响应，例如 OpenAI JSON/SSE，不套用 Result。 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface RawResponse {}

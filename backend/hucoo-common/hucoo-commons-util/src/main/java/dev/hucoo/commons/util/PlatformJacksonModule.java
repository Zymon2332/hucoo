package dev.hucoo.commons.util;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.JacksonModule;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;
import tools.jackson.databind.module.SimpleModule;
import tools.jackson.databind.ser.std.ToStringSerializer;

/** Shared JSON rules for HTTP responses and internal JSON utilities. */
public final class PlatformJacksonModule {

    private PlatformJacksonModule() {
    }

    public static JacksonModule create() {
        SimpleModule module = new SimpleModule("hucoo-platform-json");
        module.addSerializer(LocalDateTime.class, ToStringSerializer.instance);
        module.addSerializer(Instant.class, ToStringSerializer.instance);
        module.addSerializer(BigDecimal.class, PlainBigDecimalSerializer.INSTANCE);
        return module;
    }

    private static final class PlainBigDecimalSerializer extends ValueSerializer<BigDecimal> {

        private static final PlainBigDecimalSerializer INSTANCE = new PlainBigDecimalSerializer();

        @Override
        public void serialize(BigDecimal value, JsonGenerator generator, SerializationContext context)
                throws JacksonException {
            generator.writeNumber(value.toPlainString());
        }
    }
}

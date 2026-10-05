package dev.hucoo.component.log.context;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import io.micrometer.context.ContextRegistry;
import io.micrometer.context.ThreadLocalAccessor;

/**
 * Restore previous registrations on shutdown; do not remove another context's accessors.
 */
public final class ContextRegistrations implements AutoCloseable {
    private final ContextRegistry registry;
    private final Map<Object, ThreadLocalAccessor<?>> installed = new LinkedHashMap<>();
    private final Map<Object, ThreadLocalAccessor<?>> previous = new LinkedHashMap<>();

    public ContextRegistrations(ContextRegistry registry, List<ThreadLocalAccessor<?>> accessors) {
        this.registry = registry;
        for (ThreadLocalAccessor<?> accessor : accessors) {
            registry.getThreadLocalAccessors().stream().filter(a -> a.key().equals(accessor.key()))
                    .findFirst().ifPresent(a -> previous.put(a.key(), a));
            registry.registerThreadLocalAccessor(accessor);
            installed.put(accessor.key(), accessor);
        }
    }

    @Override
    public void close() {
        installed.forEach((key, accessor) -> {
            if (registry.getThreadLocalAccessors().stream().anyMatch(a -> a == accessor)) {
                registry.removeThreadLocalAccessor(key);
                if (previous.containsKey(key)) registry.registerThreadLocalAccessor(previous.get(key));
            }
        });
    }
}

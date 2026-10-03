package dev.hucoo.modelruntime.infrastructure.secret;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.stereotype.Component;

@Component
public class InMemorySecretStore implements SecretStore {
    private final ConcurrentMap<String, String> values = new ConcurrentHashMap<>();

    @Override public String get(String keyRef) { return values.get(keyRef); }
    @Override public void put(String keyRef, String secret) { values.put(keyRef, secret); }
    @Override public void delete(String keyRef) { values.remove(keyRef); }
}

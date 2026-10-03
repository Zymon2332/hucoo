package dev.hucoo.modelruntime.infrastructure.secret;

public interface SecretStore {
    String get(String keyRef);
    void put(String keyRef, String secret);
    void delete(String keyRef);
}

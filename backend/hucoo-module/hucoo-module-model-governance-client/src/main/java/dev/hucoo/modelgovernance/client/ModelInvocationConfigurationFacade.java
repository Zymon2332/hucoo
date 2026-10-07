package dev.hucoo.modelgovernance.client;

import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Supplier;

/** 进程内的受信任运行时契约，不作为 HTTP API 暴露；密钥仅在实际调用前解密。 */
public interface ModelInvocationConfigurationFacade {
    List<Route> resolve(Context context);

    record Context(String tenantId, Long userId, Long projectId, String modelCode, LocalDateTime requestTime) {}

    record Route(String tenantId, Long targetId, String modelCode, String providerModelCode,
                 String providerCode, String protocol, String endpoint, int weight, int priority, int maxConcurrency, boolean authenticationRequired, String credentialFingerprint,
                 Supplier<String> credential) {
        public Route(String tenantId, Long targetId, String modelCode, String providerModelCode,
                     String protocol, String endpoint, int weight, int priority, int maxConcurrency,
                     boolean authenticationRequired, String credentialFingerprint, Supplier<String> credential) {
            this(tenantId, targetId, modelCode, providerModelCode, protocol, protocol, endpoint, weight,
                    priority, maxConcurrency, authenticationRequired, credentialFingerprint, credential);
        }
        @Override public String toString() {
            return "ModelInvocationRoute[targetId=" + targetId + ", modelCode=" + modelCode + "]";
        }
    }
}

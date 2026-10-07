package dev.hucoo.modelgovernance.domain;

/** 后续名单策略应组合 StableModelCatalogPolicy，不能绕过稳定目录准入条件。 */
public interface ModelCatalogReleasePolicy {
    String policyVersion();

    boolean isVisible(ModelCatalogPolicyContext context, ModelCatalogCandidate candidate);
}

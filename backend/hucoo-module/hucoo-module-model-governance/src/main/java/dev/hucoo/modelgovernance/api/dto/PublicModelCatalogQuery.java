package dev.hucoo.modelgovernance.api.dto;

/** 租户和用户身份仅从登录上下文读取，不接受客户端指定。 */
public record PublicModelCatalogQuery(Long projectId) {
}

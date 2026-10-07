package dev.hucoo.modelgovernance.domain;

import java.util.List;
import dev.hucoo.modelgovernance.domain.entity.*;

/** 一个可路由候选链路；只在治理模块内使用。 */
public record ModelCatalogCandidate(LogicalModel model, ModelVersion version, ModelProvider provider,
                                    ModelChannel channel, ModelChannelBinding binding,
                                    ModelValidationRun validation, ModelCredential credential,
                                    ModelRoutePolicy routePolicy, ModelRouteTarget target,
                                    List<ModelVisibilityGrant> grants) {
}

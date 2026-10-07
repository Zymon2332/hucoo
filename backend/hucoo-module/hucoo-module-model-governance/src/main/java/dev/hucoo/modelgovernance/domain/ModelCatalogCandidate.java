package dev.hucoo.modelgovernance.domain;

import java.util.List;
import dev.hucoo.modelgovernance.domain.entity.*;

/**
 * 一个可路由候选链路；只在治理模块内使用。
 * 模型目录候选项。
 * <p>
 * 表示在构建平台模型目录时，某个逻辑模型及其相关版本、供应商、渠道、绑定、
 * 验证记录、凭证、路由策略、路由目标和可见性授权等信息的组合。
 * 用于筛选、展示或发布当前用户可见的模型目录。
 *
 * @param model       逻辑模型，模型目录中的核心业务实体
 * @param version     模型版本，逻辑模型的具体版本
 * @param provider    模型供应商，提供该模型的厂商或组织
 * @param channel     模型渠道，模型接入或调用的通道
 * @param binding     渠道绑定，渠道与模型/版本之间的关联配置
 * @param validation  模型验证运行记录，记录该候选模型是否通过校验
 * @param credential  模型凭证，访问该模型所需的密钥或认证信息
 * @param routePolicy 路由策略，决定请求如何路由到目标
 * @param target      路由目标，路由策略指向的具体目标
 * @param grants      可见性授权列表，控制哪些用户或项目可见
 */
public record ModelCatalogCandidate(LogicalModel model, ModelVersion version, ModelProvider provider,
                                    ModelChannel channel, ModelChannelBinding binding,
                                    ModelValidationRun validation, ModelCredential credential,
                                    ModelRoutePolicy routePolicy, ModelRouteTarget target,
                                    List<ModelVisibilityGrant> grants) {
}


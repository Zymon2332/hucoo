-- 模型治理规范化模型。
--
-- 本迁移先创建规范化结构并扩展运行时表，保留旧表供应用切换期间读取。
-- 应用代码完成切换、数据校验通过后，再由后续迁移清理旧字段和旧表。

-- 逻辑删除后允许重新登记同一供应商编码，与其他规范化表保持一致。
ALTER TABLE ap_model_provider DROP CONSTRAINT IF EXISTS uk_ap_model_provider_code;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_model_provider_active_code
    ON ap_model_provider (tenant_id, provider_code) WHERE deleted = 0;

ALTER TABLE ap_model_provider
    ADD COLUMN IF NOT EXISTS provider_type VARCHAR(32) NOT NULL DEFAULT 'OFFICIAL',
    ADD COLUMN IF NOT EXISTS website VARCHAR(512),
    ADD COLUMN IF NOT EXISTS documentation_url VARCHAR(512),
    ADD COLUMN IF NOT EXISTS default_region VARCHAR(64),
    ADD COLUMN IF NOT EXISTS compliance_level VARCHAR(32),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED';

COMMENT ON COLUMN ap_model_provider.provider_type IS '供应商类型：OFFICIAL 官方、CLOUD 云平台、ENTERPRISE 企业网关、LOCAL 本地部署、PROXY 代理服务';
COMMENT ON COLUMN ap_model_provider.website IS '供应商官方网站';
COMMENT ON COLUMN ap_model_provider.documentation_url IS '供应商开发文档地址';
COMMENT ON COLUMN ap_model_provider.default_region IS '供应商默认服务区域';
COMMENT ON COLUMN ap_model_provider.compliance_level IS '供应商合规等级';
COMMENT ON COLUMN ap_model_provider.description IS '供应商业务说明';
COMMENT ON COLUMN ap_model_provider.approval_status IS '供应商审批状态：DRAFT、PENDING_APPROVAL、PUBLISHED、SUSPENDED、REVOKED';

CREATE TABLE IF NOT EXISTS ap_model (
    id BIGINT NOT NULL PRIMARY KEY,
    model_code VARCHAR(128) NOT NULL,
    model_name VARCHAR(256) NOT NULL,
    model_family VARCHAR(128),
    model_type VARCHAR(32) NOT NULL,
    source_type VARCHAR(32) NOT NULL DEFAULT 'PLATFORM',
    lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    description TEXT,
    metadata_json JSONB,
    owner_user_id BIGINT,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ap_model IS '逻辑模型目录，供 Agent、项目和路由稳定引用';
COMMENT ON COLUMN ap_model.id IS '逻辑模型主键 ID';
COMMENT ON COLUMN ap_model.model_code IS '平台内部稳定模型编码';
COMMENT ON COLUMN ap_model.model_name IS '模型展示名称';
COMMENT ON COLUMN ap_model.model_family IS '模型系列，例如 GPT、DeepSeek 或 Embedding 系列';
COMMENT ON COLUMN ap_model.model_type IS '模型类型：CHAT、EMBEDDING、RERANK、IMAGE、AUDIO 等';
COMMENT ON COLUMN ap_model.source_type IS '模型来源：PLATFORM、CUSTOM、LOCAL、ENTERPRISE';
COMMENT ON COLUMN ap_model.lifecycle_status IS '模型生命周期：DRAFT、VALIDATING、PENDING_APPROVAL、PUBLISHED、SUSPENDED、REVOKED';
COMMENT ON COLUMN ap_model.description IS '模型业务说明';
COMMENT ON COLUMN ap_model.metadata_json IS '模型扩展元数据 JSON，不得保存凭证明文';
COMMENT ON COLUMN ap_model.owner_user_id IS '用户私有模型的拥有者用户 ID';
COMMENT ON COLUMN ap_model.tenant_id IS '租户隔离标识，平台级模型使用系统租户 000000';
COMMENT ON COLUMN ap_model.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model.created_at IS '创建时间';
COMMENT ON COLUMN ap_model.updated_at IS '最后更新时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_model_active_code
    ON ap_model (tenant_id, model_code) WHERE deleted = 0;

CREATE TABLE IF NOT EXISTS ap_model_version (
    id BIGINT NOT NULL PRIMARY KEY,
    model_id BIGINT NOT NULL,
    version_code VARCHAR(128) NOT NULL,
    context_window BIGINT,
    max_input_tokens BIGINT,
    max_output_tokens BIGINT,
    input_modalities_json JSONB,
    output_modalities_json JSONB,
    default_parameters_json JSONB,
    release_status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    released_at TIMESTAMP(6),
    deprecated_at TIMESTAMP(6),
    metadata_json JSONB,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ap_model_version_model FOREIGN KEY (model_id) REFERENCES ap_model(id)
);

COMMENT ON TABLE ap_model_version IS '逻辑模型的可发布版本和基础能力约束';
COMMENT ON COLUMN ap_model_version.id IS '模型版本主键 ID';
COMMENT ON COLUMN ap_model_version.model_id IS '所属逻辑模型 ID';
COMMENT ON COLUMN ap_model_version.version_code IS '模型版本编码，例如 2024-08-06';
COMMENT ON COLUMN ap_model_version.context_window IS '最大上下文 Token 数';
COMMENT ON COLUMN ap_model_version.max_input_tokens IS '最大输入 Token 数';
COMMENT ON COLUMN ap_model_version.max_output_tokens IS '最大输出 Token 数';
COMMENT ON COLUMN ap_model_version.input_modalities_json IS '输入模态 JSON，例如 text、image、audio';
COMMENT ON COLUMN ap_model_version.output_modalities_json IS '输出模态 JSON，例如 text、image、audio';
COMMENT ON COLUMN ap_model_version.default_parameters_json IS '模型默认推理参数 JSON';
COMMENT ON COLUMN ap_model_version.release_status IS '版本状态：DRAFT、VALIDATING、PENDING_APPROVAL、PUBLISHED、SUSPENDED、REVOKED';
COMMENT ON COLUMN ap_model_version.released_at IS '版本发布时间';
COMMENT ON COLUMN ap_model_version.deprecated_at IS '版本计划废弃时间';
COMMENT ON COLUMN ap_model_version.metadata_json IS '模型版本扩展元数据 JSON';
COMMENT ON COLUMN ap_model_version.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_version.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_version.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_version.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_version.updated_at IS '最后更新时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_model_version_active_code
    ON ap_model_version (model_id, version_code) WHERE deleted = 0;

CREATE TABLE IF NOT EXISTS ap_model_channel (
    id BIGINT NOT NULL PRIMARY KEY,
    provider_id BIGINT NOT NULL,
    channel_code VARCHAR(128) NOT NULL,
    channel_name VARCHAR(256) NOT NULL,
    protocol_type VARCHAR(32) NOT NULL,
    endpoint VARCHAR(512) NOT NULL,
    base_path VARCHAR(256),
    region VARCHAR(64),
    network_zone VARCHAR(64),
    auth_type VARCHAR(32) NOT NULL DEFAULT 'API_KEY',
    protocol_config_json JSONB,
    request_timeout_ms BIGINT NOT NULL DEFAULT 30000,
    stream_timeout_ms BIGINT NOT NULL DEFAULT 60000,
    network_policy_id BIGINT,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    approval_status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    health_status VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',
    last_health_checked_at TIMESTAMP(6),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ap_model_channel_provider FOREIGN KEY (provider_id) REFERENCES ap_model_provider(id)
);

COMMENT ON TABLE ap_model_channel IS '供应商实际接入渠道，承载协议、Endpoint、区域和网络配置';
COMMENT ON COLUMN ap_model_channel.id IS '供应商渠道主键 ID';
COMMENT ON COLUMN ap_model_channel.provider_id IS '所属供应商 ID';
COMMENT ON COLUMN ap_model_channel.channel_code IS '供应商范围内唯一的渠道编码';
COMMENT ON COLUMN ap_model_channel.channel_name IS '渠道展示名称';
COMMENT ON COLUMN ap_model_channel.protocol_type IS '协议类型：OPENAI_COMPATIBLE、ANTHROPIC、GEMINI、OLLAMA、VLLM、CUSTOM';
COMMENT ON COLUMN ap_model_channel.endpoint IS '渠道服务根地址，不包含凭证';
COMMENT ON COLUMN ap_model_channel.base_path IS '协议 API 基础路径';
COMMENT ON COLUMN ap_model_channel.region IS '渠道所在服务区域';
COMMENT ON COLUMN ap_model_channel.network_zone IS '渠道网络区域，例如 PUBLIC、PRIVATE、INTRANET';
COMMENT ON COLUMN ap_model_channel.auth_type IS '认证类型：API_KEY、OAUTH2、MTLS、NONE';
COMMENT ON COLUMN ap_model_channel.protocol_config_json IS '协议专属配置 JSON，必须包含 schemaVersion，禁止保存密钥明文';
COMMENT ON COLUMN ap_model_channel.request_timeout_ms IS '非流式请求超时时间，单位毫秒';
COMMENT ON COLUMN ap_model_channel.stream_timeout_ms IS '流式请求空闲超时时间，单位毫秒';
COMMENT ON COLUMN ap_model_channel.network_policy_id IS '关联的出网策略 ID';
COMMENT ON COLUMN ap_model_channel.status IS '渠道运行状态：ACTIVE、DRAINING、DISABLED、REVOKED';
COMMENT ON COLUMN ap_model_channel.approval_status IS '渠道审批状态：DRAFT、PENDING_APPROVAL、PUBLISHED、SUSPENDED、REVOKED';
COMMENT ON COLUMN ap_model_channel.health_status IS '渠道健康状态：UNKNOWN、HEALTHY、DEGRADED、UNHEALTHY';
COMMENT ON COLUMN ap_model_channel.last_health_checked_at IS '最近一次健康检查时间';
COMMENT ON COLUMN ap_model_channel.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_channel.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_channel.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_channel.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_channel.updated_at IS '最后更新时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_model_channel_active_code
    ON ap_model_channel (tenant_id, provider_id, channel_code) WHERE deleted = 0;

CREATE TABLE IF NOT EXISTS ap_model_channel_binding (
    id BIGINT NOT NULL PRIMARY KEY,
    model_version_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    provider_model_code VARCHAR(256) NOT NULL,
    model_alias VARCHAR(256),
    endpoint_override VARCHAR(512),
    capability_override_json JSONB,
    default_weight INT NOT NULL DEFAULT 1,
    priority INT NOT NULL DEFAULT 0,
    max_concurrency INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    approval_status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    last_validation_run_id BIGINT,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ap_model_binding_version FOREIGN KEY (model_version_id) REFERENCES ap_model_version(id),
    CONSTRAINT fk_ap_model_binding_channel FOREIGN KEY (channel_id) REFERENCES ap_model_channel(id)
);

COMMENT ON TABLE ap_model_channel_binding IS '模型版本与供应商渠道的可路由映射';
COMMENT ON COLUMN ap_model_channel_binding.id IS '模型渠道映射主键 ID';
COMMENT ON COLUMN ap_model_channel_binding.model_version_id IS '关联的平台模型版本 ID';
COMMENT ON COLUMN ap_model_channel_binding.channel_id IS '关联的供应商渠道 ID';
COMMENT ON COLUMN ap_model_channel_binding.provider_model_code IS '供应商侧实际模型编码';
COMMENT ON COLUMN ap_model_channel_binding.model_alias IS '渠道内可选的模型别名';
COMMENT ON COLUMN ap_model_channel_binding.endpoint_override IS '本映射专用的 Endpoint 覆盖地址';
COMMENT ON COLUMN ap_model_channel_binding.capability_override_json IS '渠道对模型能力的覆盖声明 JSON';
COMMENT ON COLUMN ap_model_channel_binding.default_weight IS '默认路由权重';
COMMENT ON COLUMN ap_model_channel_binding.priority IS '路由目标优先级，数值越小越优先';
COMMENT ON COLUMN ap_model_channel_binding.max_concurrency IS '该映射允许的最大并发数，0 表示不限制';
COMMENT ON COLUMN ap_model_channel_binding.status IS '映射运行状态：ACTIVE、DRAINING、DISABLED、REVOKED';
COMMENT ON COLUMN ap_model_channel_binding.approval_status IS '映射审批状态：DRAFT、PENDING_APPROVAL、PUBLISHED、SUSPENDED、REVOKED';
COMMENT ON COLUMN ap_model_channel_binding.last_validation_run_id IS '最近一次模型验证任务 ID';
COMMENT ON COLUMN ap_model_channel_binding.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_channel_binding.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_channel_binding.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_channel_binding.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_channel_binding.updated_at IS '最后更新时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_model_binding_active_code
    ON ap_model_channel_binding (model_version_id, channel_id, provider_model_code) WHERE deleted = 0;

CREATE TABLE IF NOT EXISTS ap_model_visibility_grant (
    id BIGINT NOT NULL PRIMARY KEY,
    model_id BIGINT NOT NULL,
    scope_type VARCHAR(32) NOT NULL,
    scope_id VARCHAR(128) NOT NULL DEFAULT '',
    effect VARCHAR(16) NOT NULL DEFAULT 'ALLOW',
    valid_from TIMESTAMP(6),
    valid_to TIMESTAMP(6),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ap_model_visibility_model FOREIGN KEY (model_id) REFERENCES ap_model(id)
);

COMMENT ON TABLE ap_model_visibility_grant IS '模型在平台、租户、项目和用户范围内的可见性授权';
COMMENT ON COLUMN ap_model_visibility_grant.id IS '模型可见性授权主键 ID';
COMMENT ON COLUMN ap_model_visibility_grant.model_id IS '关联的逻辑模型 ID';
COMMENT ON COLUMN ap_model_visibility_grant.scope_type IS '范围类型：PLATFORM、TENANT、PROJECT、USER';
COMMENT ON COLUMN ap_model_visibility_grant.scope_id IS '范围对象 ID，平台范围使用空字符串';
COMMENT ON COLUMN ap_model_visibility_grant.effect IS '授权效果：ALLOW 或 DENY，DENY 优先';
COMMENT ON COLUMN ap_model_visibility_grant.valid_from IS '授权生效时间';
COMMENT ON COLUMN ap_model_visibility_grant.valid_to IS '授权失效时间';
COMMENT ON COLUMN ap_model_visibility_grant.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_visibility_grant.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_visibility_grant.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_visibility_grant.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_visibility_grant.updated_at IS '最后更新时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_model_visibility_active
    ON ap_model_visibility_grant (model_id, scope_type, scope_id) WHERE deleted = 0;

CREATE TABLE IF NOT EXISTS ap_model_version_capability (
    id BIGINT NOT NULL PRIMARY KEY,
    model_version_id BIGINT NOT NULL,
    capability_code VARCHAR(64) NOT NULL,
    supported INT NOT NULL DEFAULT 1,
    constraint_json JSONB,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ap_model_capability_version FOREIGN KEY (model_version_id) REFERENCES ap_model_version(id)
);

COMMENT ON TABLE ap_model_version_capability IS '模型版本能力声明和能力约束';
COMMENT ON COLUMN ap_model_version_capability.id IS '模型能力记录主键 ID';
COMMENT ON COLUMN ap_model_version_capability.model_version_id IS '关联的模型版本 ID';
COMMENT ON COLUMN ap_model_version_capability.capability_code IS '能力编码，例如 STREAMING、TOOL_CALLING、JSON_MODE、VISION_INPUT';
COMMENT ON COLUMN ap_model_version_capability.supported IS '是否支持该能力：1 支持，0 不支持';
COMMENT ON COLUMN ap_model_version_capability.constraint_json IS '能力约束 JSON，例如最大图片数量或工具数量';
COMMENT ON COLUMN ap_model_version_capability.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_version_capability.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_version_capability.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_version_capability.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_version_capability.updated_at IS '最后更新时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_model_capability_active
    ON ap_model_version_capability (model_version_id, capability_code) WHERE deleted = 0;

CREATE TABLE IF NOT EXISTS ap_model_channel_price (
    id BIGINT NOT NULL PRIMARY KEY,
    binding_id BIGINT NOT NULL,
    billing_dimension VARCHAR(32) NOT NULL,
    tier_start BIGINT NOT NULL DEFAULT 0,
    tier_end BIGINT,
    unit_price NUMERIC(18,8) NOT NULL DEFAULT 0,
    unit_scale BIGINT NOT NULL DEFAULT 1000000,
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    effective_from TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP(6),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ap_model_price_binding FOREIGN KEY (binding_id) REFERENCES ap_model_channel_binding(id)
);

COMMENT ON TABLE ap_model_channel_price IS '模型渠道映射的输入、输出、缓存和请求阶梯价格';
COMMENT ON COLUMN ap_model_channel_price.id IS '模型渠道价格主键 ID';
COMMENT ON COLUMN ap_model_channel_price.binding_id IS '关联的模型渠道映射 ID';
COMMENT ON COLUMN ap_model_channel_price.billing_dimension IS '计费维度：INPUT_TOKEN、OUTPUT_TOKEN、CACHE_READ_TOKEN、CACHE_WRITE_TOKEN、REQUEST';
COMMENT ON COLUMN ap_model_channel_price.tier_start IS '价格阶梯起始数量，包含该值';
COMMENT ON COLUMN ap_model_channel_price.tier_end IS '价格阶梯结束数量，包含该值，空值表示无上限';
COMMENT ON COLUMN ap_model_channel_price.unit_price IS '单价数值，按 unit_scale 换算';
COMMENT ON COLUMN ap_model_channel_price.unit_scale IS '价格单位缩放因子，默认按百万单位换算';
COMMENT ON COLUMN ap_model_channel_price.currency IS '价格币种，例如 USD、CNY';
COMMENT ON COLUMN ap_model_channel_price.effective_from IS '价格生效时间';
COMMENT ON COLUMN ap_model_channel_price.effective_to IS '价格失效时间，空值表示当前有效';
COMMENT ON COLUMN ap_model_channel_price.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_channel_price.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_channel_price.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_channel_price.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_channel_price.updated_at IS '最后更新时间';

CREATE TABLE IF NOT EXISTS ap_model_credential (
    id BIGINT NOT NULL PRIMARY KEY,
    channel_id BIGINT NOT NULL,
    credential_name VARCHAR(128) NOT NULL,
    credential_type VARCHAR(32) NOT NULL DEFAULT 'API_KEY',
    secret_ciphertext TEXT,
    secret_nonce VARCHAR(256),
    encryption_key_id VARCHAR(128),
    encryption_key_version VARCHAR(64),
    secret_fingerprint VARCHAR(128) NOT NULL,
    masked_value VARCHAR(256),
    owner_scope_type VARCHAR(32) NOT NULL DEFAULT 'TENANT',
    owner_scope_id VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMP(6),
    last_rotated_at TIMESTAMP(6),
    last_verified_at TIMESTAMP(6),
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ap_model_credential_channel FOREIGN KEY (channel_id) REFERENCES ap_model_channel(id)
);

COMMENT ON TABLE ap_model_credential IS '供应商渠道访问凭证，只保存平台加密密文和凭证指纹';
COMMENT ON COLUMN ap_model_credential.id IS '模型凭证主键 ID';
COMMENT ON COLUMN ap_model_credential.channel_id IS '凭证所属供应商渠道 ID';
COMMENT ON COLUMN ap_model_credential.credential_name IS '凭证展示名称';
COMMENT ON COLUMN ap_model_credential.credential_type IS '凭证类型：API_KEY、OAUTH2、MTLS、NONE';
COMMENT ON COLUMN ap_model_credential.secret_ciphertext IS '平台加密后的凭证密文，禁止保存明文';
COMMENT ON COLUMN ap_model_credential.secret_nonce IS '凭证加密使用的随机 Nonce';
COMMENT ON COLUMN ap_model_credential.encryption_key_id IS '用于解密的主密钥标识';
COMMENT ON COLUMN ap_model_credential.encryption_key_version IS '用于解密的主密钥版本';
COMMENT ON COLUMN ap_model_credential.secret_fingerprint IS '凭证指纹，用于去重和审计，不可还原明文';
COMMENT ON COLUMN ap_model_credential.masked_value IS '凭证脱敏展示值，例如 ****abcd';
COMMENT ON COLUMN ap_model_credential.owner_scope_type IS '凭证所有权范围：PLATFORM、TENANT、PROJECT、USER';
COMMENT ON COLUMN ap_model_credential.owner_scope_id IS '凭证所有权范围对象 ID';
COMMENT ON COLUMN ap_model_credential.status IS '凭证状态：ACTIVE、EXPIRED、ROTATING、REVOKED、DISABLED';
COMMENT ON COLUMN ap_model_credential.expires_at IS '凭证过期时间';
COMMENT ON COLUMN ap_model_credential.last_rotated_at IS '最近一次轮换时间';
COMMENT ON COLUMN ap_model_credential.last_verified_at IS '最近一次凭证验证时间';
COMMENT ON COLUMN ap_model_credential.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_credential.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_credential.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_credential.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_credential.updated_at IS '最后更新时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_model_credential_active_fingerprint
    ON ap_model_credential (tenant_id, channel_id, secret_fingerprint) WHERE deleted = 0;

CREATE TABLE IF NOT EXISTS ap_model_credential_rotation (
    id BIGINT NOT NULL PRIMARY KEY,
    credential_id BIGINT NOT NULL,
    old_fingerprint VARCHAR(128),
    new_fingerprint VARCHAR(128) NOT NULL,
    reason VARCHAR(512),
    operator_id BIGINT,
    rotated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tenant_id VARCHAR(64) NOT NULL DEFAULT '000000',
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ap_model_credential_rotation_credential FOREIGN KEY (credential_id) REFERENCES ap_model_credential(id)
);

COMMENT ON TABLE ap_model_credential_rotation IS '模型凭证轮换历史和操作审计';
COMMENT ON COLUMN ap_model_credential_rotation.id IS '凭证轮换记录主键 ID';
COMMENT ON COLUMN ap_model_credential_rotation.credential_id IS '被轮换的凭证 ID';
COMMENT ON COLUMN ap_model_credential_rotation.old_fingerprint IS '轮换前凭证指纹';
COMMENT ON COLUMN ap_model_credential_rotation.new_fingerprint IS '轮换后凭证指纹';
COMMENT ON COLUMN ap_model_credential_rotation.reason IS '轮换原因';
COMMENT ON COLUMN ap_model_credential_rotation.operator_id IS '执行轮换的用户 ID';
COMMENT ON COLUMN ap_model_credential_rotation.rotated_at IS '轮换完成时间';
COMMENT ON COLUMN ap_model_credential_rotation.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_credential_rotation.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_credential_rotation.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_credential_rotation.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_credential_rotation.updated_at IS '最后更新时间';

ALTER TABLE ap_model_route_policy
    ADD COLUMN IF NOT EXISTS model_id BIGINT,
    ADD COLUMN IF NOT EXISTS model_version_id BIGINT,
    ADD COLUMN IF NOT EXISTS scope_type VARCHAR(32) NOT NULL DEFAULT 'PLATFORM',
    ADD COLUMN IF NOT EXISTS scope_id VARCHAR(128) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS budget_limit NUMERIC(18,6),
    ADD COLUMN IF NOT EXISTS quality_requirement_json JSONB;

COMMENT ON COLUMN ap_model_route_policy.model_id IS '路由策略关联的逻辑模型 ID';
COMMENT ON COLUMN ap_model_route_policy.model_version_id IS '路由策略锁定的模型版本 ID，可为空表示跟随已发布版本';
COMMENT ON COLUMN ap_model_route_policy.scope_type IS '路由范围类型：PLATFORM、TENANT、PROJECT、USER';
COMMENT ON COLUMN ap_model_route_policy.scope_id IS '路由范围对象 ID，平台范围使用空字符串';
COMMENT ON COLUMN ap_model_route_policy.budget_limit IS '该路由策略允许的成本上限';
COMMENT ON COLUMN ap_model_route_policy.quality_requirement_json IS '质量要求 JSON，例如能力、延迟和上下文长度要求';

CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_model_route_policy_scope
    ON ap_model_route_policy (tenant_id, model_id, scope_type, scope_id)
    WHERE deleted = 0 AND model_id IS NOT NULL;

-- 新路由按逻辑模型关联；旧路由继续按供应商编码区分，均排除已删除记录。
ALTER TABLE ap_model_route_policy DROP CONSTRAINT IF EXISTS uk_ap_model_route_policy;
CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_model_route_policy_legacy_active
    ON ap_model_route_policy (tenant_id, provider_code, model_code, scope_type, scope_id)
    WHERE deleted = 0 AND model_id IS NULL;

ALTER TABLE ap_model_route_target
    ADD COLUMN IF NOT EXISTS binding_id BIGINT,
    ADD COLUMN IF NOT EXISTS credential_id BIGINT,
    ADD COLUMN IF NOT EXISTS cost_limit NUMERIC(18,6),
    ADD COLUMN IF NOT EXISTS health_threshold NUMERIC(10,6);

COMMENT ON COLUMN ap_model_route_target.binding_id IS '模型渠道映射 ID';
COMMENT ON COLUMN ap_model_route_target.credential_id IS '本路由目标使用的凭证 ID';
COMMENT ON COLUMN ap_model_route_target.cost_limit IS '本路由目标的单次成本限制';
COMMENT ON COLUMN ap_model_route_target.health_threshold IS '允许进入路由的最低健康分';

CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_model_route_target_binding_active
    ON ap_model_route_target (tenant_id, route_policy_id, binding_id, credential_id)
    WHERE deleted = 0 AND binding_id IS NOT NULL;

ALTER TABLE ap_model_route_policy
    ADD CONSTRAINT fk_ap_model_route_model FOREIGN KEY (model_id) REFERENCES ap_model(id),
    ADD CONSTRAINT fk_ap_model_route_version FOREIGN KEY (model_version_id) REFERENCES ap_model_version(id);
ALTER TABLE ap_model_route_target
    ADD CONSTRAINT fk_ap_model_route_binding FOREIGN KEY (binding_id) REFERENCES ap_model_channel_binding(id),
    ADD CONSTRAINT fk_ap_model_route_credential FOREIGN KEY (credential_id) REFERENCES ap_model_credential(id);

-- 数据库兜底基础数值与时间边界，价格重叠由应用在映射行锁内检查。
ALTER TABLE ap_model_version ADD CONSTRAINT ck_ap_model_version_tokens CHECK (
    (context_window IS NULL OR context_window >= 0)
    AND (max_input_tokens IS NULL OR max_input_tokens >= 0)
    AND (max_output_tokens IS NULL OR max_output_tokens >= 0)
    AND (context_window IS NULL OR max_input_tokens IS NULL OR max_input_tokens <= context_window)
    AND (context_window IS NULL OR max_output_tokens IS NULL OR max_output_tokens <= context_window));
ALTER TABLE ap_model_channel ADD CONSTRAINT ck_ap_model_channel_timeout
    CHECK (request_timeout_ms > 0 AND stream_timeout_ms > 0);
ALTER TABLE ap_model_channel_binding ADD CONSTRAINT ck_ap_model_binding_capacity
    CHECK (default_weight > 0 AND priority >= 0 AND max_concurrency >= 0);
ALTER TABLE ap_model_visibility_grant ADD CONSTRAINT ck_ap_model_grant_period
    CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_to > valid_from);
ALTER TABLE ap_model_version_capability ADD CONSTRAINT ck_ap_model_capability_supported
    CHECK (supported IN (0, 1));
ALTER TABLE ap_model_channel_price ADD CONSTRAINT ck_ap_model_price_values
    CHECK (tier_start >= 0 AND (tier_end IS NULL OR tier_end >= tier_start)
        AND unit_scale > 0 AND unit_price >= 0
        AND (effective_to IS NULL OR effective_to > effective_from));

ALTER TABLE ap_model_account_runtime_state
    ADD COLUMN IF NOT EXISTS last_error_class VARCHAR(64),
    ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMP(6),
    ADD COLUMN IF NOT EXISTS in_flight INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN ap_model_account_runtime_state.last_error_class IS '最近一次失败类别';
COMMENT ON COLUMN ap_model_account_runtime_state.last_error_at IS '最近一次失败时间';
COMMENT ON COLUMN ap_model_account_runtime_state.in_flight IS '当前进行中的请求数';

ALTER TABLE ap_model_validation_run
    ADD COLUMN IF NOT EXISTS model_version_id BIGINT,
    ADD COLUMN IF NOT EXISTS binding_id BIGINT;

COMMENT ON COLUMN ap_model_validation_run.model_version_id IS '待验证的模型版本 ID';
COMMENT ON COLUMN ap_model_validation_run.binding_id IS '待验证的模型渠道映射 ID';

ALTER TABLE ap_model_invocation
    ADD COLUMN IF NOT EXISTS model_id BIGINT,
    ADD COLUMN IF NOT EXISTS model_version_id BIGINT,
    ADD COLUMN IF NOT EXISTS channel_id BIGINT,
    ADD COLUMN IF NOT EXISTS binding_id BIGINT,
    ADD COLUMN IF NOT EXISTS route_policy_id BIGINT,
    ADD COLUMN IF NOT EXISTS route_target_id BIGINT,
    ADD COLUMN IF NOT EXISTS credential_id BIGINT,
    ADD COLUMN IF NOT EXISTS user_id BIGINT,
    ADD COLUMN IF NOT EXISTS failure_detail TEXT;

COMMENT ON COLUMN ap_model_invocation.model_id IS '请求解析出的逻辑模型 ID';
COMMENT ON COLUMN ap_model_invocation.model_version_id IS '实际调用的模型版本 ID';
COMMENT ON COLUMN ap_model_invocation.channel_id IS '实际调用的供应商渠道 ID';
COMMENT ON COLUMN ap_model_invocation.binding_id IS '实际使用的模型渠道映射 ID';
COMMENT ON COLUMN ap_model_invocation.route_policy_id IS '实际命中的路由策略 ID';
COMMENT ON COLUMN ap_model_invocation.route_target_id IS '实际选中的路由目标 ID';
COMMENT ON COLUMN ap_model_invocation.credential_id IS '实际使用的凭证 ID';
COMMENT ON COLUMN ap_model_invocation.user_id IS '发起模型调用的用户 ID';
COMMENT ON COLUMN ap_model_invocation.failure_detail IS '脱敏后的失败详情，禁止写入凭证明文和用户敏感内容';

CREATE INDEX IF NOT EXISTS idx_ap_model_binding_model
    ON ap_model_channel_binding (tenant_id, model_version_id, status, deleted);
CREATE INDEX IF NOT EXISTS idx_ap_model_channel_provider
    ON ap_model_channel (tenant_id, provider_id, status, deleted);
CREATE INDEX IF NOT EXISTS idx_ap_model_visibility_scope
    ON ap_model_visibility_grant (tenant_id, scope_type, scope_id, deleted);
CREATE INDEX IF NOT EXISTS idx_ap_model_credential_status
    ON ap_model_credential (tenant_id, channel_id, status, deleted);
CREATE INDEX IF NOT EXISTS idx_ap_model_price_effective
    ON ap_model_channel_price (tenant_id, binding_id, billing_dimension, effective_from, effective_to);

COMMENT ON TABLE ap_model_provider IS '模型供应商目录，描述官方、云平台、企业网关和本地推理服务';
COMMENT ON COLUMN ap_model_provider.id IS '模型供应商主键 ID';
COMMENT ON COLUMN ap_model_provider.provider_code IS '租户范围内唯一的供应商编码';
COMMENT ON COLUMN ap_model_provider.provider_name IS '供应商展示名称';
COMMENT ON COLUMN ap_model_provider.endpoint IS '供应商默认服务地址，具体渠道可覆盖';
COMMENT ON COLUMN ap_model_provider.status IS '供应商启用状态：1 启用，0 停用';
COMMENT ON COLUMN ap_model_provider.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_provider.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_provider.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_provider.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_provider.updated_at IS '最后更新时间';

COMMENT ON TABLE ap_custom_model_registration IS '旧版自定义模型注册表，迁移后由逻辑模型、渠道和可见性授权替代';
COMMENT ON COLUMN ap_custom_model_registration.id IS '旧版自定义模型注册主键 ID';
COMMENT ON COLUMN ap_custom_model_registration.model_code IS '旧版自定义模型编码';
COMMENT ON COLUMN ap_custom_model_registration.provider_id IS '关联的供应商 ID';
COMMENT ON COLUMN ap_custom_model_registration.visibility IS '旧版模型可见范围';
COMMENT ON COLUMN ap_custom_model_registration.approval_status IS '旧版审批状态';
COMMENT ON COLUMN ap_custom_model_registration.endpoint IS '旧版模型服务地址';
COMMENT ON COLUMN ap_custom_model_registration.key_ref IS '旧版凭证引用';
COMMENT ON COLUMN ap_custom_model_registration.key_fingerprint IS '旧版凭证指纹';
COMMENT ON COLUMN ap_custom_model_registration.status IS '旧版启用状态：1 启用，0 停用';
COMMENT ON COLUMN ap_custom_model_registration.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_custom_model_registration.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_custom_model_registration.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_custom_model_registration.created_at IS '创建时间';
COMMENT ON COLUMN ap_custom_model_registration.updated_at IS '最后更新时间';

COMMENT ON TABLE ap_model_key IS '旧版模型密钥元数据表，迁移后由加密凭证表替代';
COMMENT ON COLUMN ap_model_key.id IS '旧版模型密钥主键 ID';
COMMENT ON COLUMN ap_model_key.key_name IS '旧版密钥名称';
COMMENT ON COLUMN ap_model_key.key_ref IS '旧版密钥存储引用';
COMMENT ON COLUMN ap_model_key.key_fingerprint IS '旧版密钥指纹';
COMMENT ON COLUMN ap_model_key.status IS '旧版密钥状态：ACTIVE、REVOKED、EXPIRED';
COMMENT ON COLUMN ap_model_key.expires_at IS '旧版密钥过期时间';
COMMENT ON COLUMN ap_model_key.last_rotated_at IS '旧版密钥最近轮换时间';
COMMENT ON COLUMN ap_model_key.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_key.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_key.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_key.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_key.updated_at IS '最后更新时间';

COMMENT ON TABLE ap_routing_rule IS '旧版模型主备路由规则，迁移后由路由策略和路由目标替代';
COMMENT ON COLUMN ap_routing_rule.id IS '旧版路由规则主键 ID';
COMMENT ON COLUMN ap_routing_rule.rule_name IS '旧版路由规则名称';
COMMENT ON COLUMN ap_routing_rule.primary_model IS '旧版主模型编码';
COMMENT ON COLUMN ap_routing_rule.fallback_model IS '旧版备用模型编码';
COMMENT ON COLUMN ap_routing_rule.priority IS '旧版路由优先级';
COMMENT ON COLUMN ap_routing_rule.fallback_condition IS '旧版降级条件';
COMMENT ON COLUMN ap_routing_rule.cost_owner IS '旧版成本归属';
COMMENT ON COLUMN ap_routing_rule.status IS '旧版路由规则状态：1 启用，0 停用';
COMMENT ON COLUMN ap_routing_rule.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_routing_rule.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_routing_rule.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_routing_rule.created_at IS '创建时间';
COMMENT ON COLUMN ap_routing_rule.updated_at IS '最后更新时间';

COMMENT ON TABLE ap_model_access_account IS '旧版模型访问账户表，迁移期间保留，最终由模型渠道映射和凭证表替代';
COMMENT ON COLUMN ap_model_access_account.id IS '旧版模型访问账户主键 ID';
COMMENT ON COLUMN ap_model_access_account.provider_id IS '旧版关联的供应商 ID';
COMMENT ON COLUMN ap_model_access_account.provider_code IS '旧版供应商编码';
COMMENT ON COLUMN ap_model_access_account.model_code IS '旧版模型编码';
COMMENT ON COLUMN ap_model_access_account.account_name IS '旧版账户名称';
COMMENT ON COLUMN ap_model_access_account.endpoint IS '旧版访问地址';
COMMENT ON COLUMN ap_model_access_account.model_key_id IS '旧版模型密钥 ID';
COMMENT ON COLUMN ap_model_access_account.key_fingerprint IS '旧版密钥指纹';
COMMENT ON COLUMN ap_model_access_account.configured_weight IS '旧版配置权重';
COMMENT ON COLUMN ap_model_access_account.max_concurrency IS '旧版最大并发数，0 表示不限制';
COMMENT ON COLUMN ap_model_access_account.balance IS '旧版账户余额';
COMMENT ON COLUMN ap_model_access_account.low_balance_threshold IS '旧版低余额降权阈值';
COMMENT ON COLUMN ap_model_access_account.hard_stop_balance_threshold IS '旧版余额硬停止阈值';
COMMENT ON COLUMN ap_model_access_account.status IS '旧版账户状态';
COMMENT ON COLUMN ap_model_access_account.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_access_account.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_access_account.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_access_account.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_access_account.updated_at IS '最后更新时间';

COMMENT ON TABLE ap_model_route_policy IS '模型路由策略，决定指定范围内的模型选择、重试和降级规则';
COMMENT ON COLUMN ap_model_route_policy.id IS '模型路由策略主键 ID';
COMMENT ON COLUMN ap_model_route_policy.provider_code IS '旧版供应商编码，迁移完成后由模型和渠道映射替代';
COMMENT ON COLUMN ap_model_route_policy.model_code IS '请求模型编码或逻辑模型编码';
COMMENT ON COLUMN ap_model_route_policy.scope_type IS '路由范围类型：PLATFORM、TENANT、PROJECT、USER';
COMMENT ON COLUMN ap_model_route_policy.scope_id IS '路由范围对象 ID，平台范围使用空字符串';
COMMENT ON COLUMN ap_model_route_policy.selection_algorithm IS '目标选择算法，例如加权随机或平滑加权轮询';
COMMENT ON COLUMN ap_model_route_policy.max_attempts IS '一次请求允许的最大路由尝试次数';
COMMENT ON COLUMN ap_model_route_policy.connect_timeout_ms IS '连接超时时间，单位毫秒';
COMMENT ON COLUMN ap_model_route_policy.response_timeout_ms IS '非流式响应超时时间，单位毫秒';
COMMENT ON COLUMN ap_model_route_policy.stream_idle_timeout_ms IS '流式响应空闲超时时间，单位毫秒';
COMMENT ON COLUMN ap_model_route_policy.circuit_failure_threshold IS '触发熔断所需的连续失败次数';
COMMENT ON COLUMN ap_model_route_policy.circuit_window_seconds IS '熔断失败统计窗口，单位秒';
COMMENT ON COLUMN ap_model_route_policy.circuit_open_seconds IS '熔断打开持续时间，单位秒';
COMMENT ON COLUMN ap_model_route_policy.retryable_failure_classes IS '可重试失败类别列表';
COMMENT ON COLUMN ap_model_route_policy.fallback_chain IS '降级模型链路配置';
COMMENT ON COLUMN ap_model_route_policy.enabled IS '策略是否启用：1 启用，0 停用';
COMMENT ON COLUMN ap_model_route_policy.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_route_policy.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_route_policy.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_route_policy.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_route_policy.updated_at IS '最后更新时间';

COMMENT ON TABLE ap_model_route_target IS '模型路由目标，关联可调用的供应商账户或模型渠道映射';
COMMENT ON COLUMN ap_model_route_target.id IS '模型路由目标主键 ID';
COMMENT ON COLUMN ap_model_route_target.route_policy_id IS '所属路由策略 ID';
COMMENT ON COLUMN ap_model_route_target.provider_id IS '旧版供应商 ID';
COMMENT ON COLUMN ap_model_route_target.model_code IS '目标模型编码';
COMMENT ON COLUMN ap_model_route_target.model_key_id IS '旧版模型密钥 ID';
COMMENT ON COLUMN ap_model_route_target.endpoint_override IS '目标专用 Endpoint 覆盖地址';
COMMENT ON COLUMN ap_model_route_target.configured_weight IS '目标配置权重';
COMMENT ON COLUMN ap_model_route_target.max_concurrency IS '目标最大并发数，0 表示不限制';
COMMENT ON COLUMN ap_model_route_target.priority IS '目标优先级，数值越小越优先';
COMMENT ON COLUMN ap_model_route_target.status IS '目标状态：ACTIVE、DRAINING、DISABLED、REVOKED';
COMMENT ON COLUMN ap_model_route_target.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_route_target.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_route_target.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_route_target.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_route_target.updated_at IS '最后更新时间';

COMMENT ON TABLE ap_model_account_runtime_state IS '模型路由目标运行时健康、熔断、延迟和负载状态';
COMMENT ON COLUMN ap_model_account_runtime_state.id IS '运行时状态主键 ID';
COMMENT ON COLUMN ap_model_account_runtime_state.target_id IS '关联的路由目标 ID';
COMMENT ON COLUMN ap_model_account_runtime_state.circuit_state IS '熔断状态：CLOSED、OPEN、HALF_OPEN';
COMMENT ON COLUMN ap_model_account_runtime_state.effective_weight IS '结合健康、余额和负载后的有效权重';
COMMENT ON COLUMN ap_model_account_runtime_state.health_score IS '目标健康评分，范围通常为 0 到 1';
COMMENT ON COLUMN ap_model_account_runtime_state.latency_ewma IS '延迟指数加权移动平均值，单位毫秒';
COMMENT ON COLUMN ap_model_account_runtime_state.rolling_request_count IS '统计窗口内请求总数';
COMMENT ON COLUMN ap_model_account_runtime_state.rolling_success_count IS '统计窗口内成功请求数';
COMMENT ON COLUMN ap_model_account_runtime_state.rolling_failure_count IS '统计窗口内失败请求数';
COMMENT ON COLUMN ap_model_account_runtime_state.rolling_rate_limit_count IS '统计窗口内限流次数';
COMMENT ON COLUMN ap_model_account_runtime_state.consecutive_failures IS '连续失败次数';
COMMENT ON COLUMN ap_model_account_runtime_state.cooldown_until IS '目标冷却结束时间';
COMMENT ON COLUMN ap_model_account_runtime_state.last_balance IS '最近一次观测到的账户余额';
COMMENT ON COLUMN ap_model_account_runtime_state.last_balance_checked_at IS '最近一次余额检查时间';
COMMENT ON COLUMN ap_model_account_runtime_state.state_version IS '运行时状态并发更新版本';
COMMENT ON COLUMN ap_model_account_runtime_state.last_error_class IS '最近一次失败类别';
COMMENT ON COLUMN ap_model_account_runtime_state.last_error_at IS '最近一次失败时间';
COMMENT ON COLUMN ap_model_account_runtime_state.in_flight IS '当前进行中的请求数';
COMMENT ON COLUMN ap_model_account_runtime_state.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_account_runtime_state.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_account_runtime_state.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_account_runtime_state.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_account_runtime_state.updated_at IS '最后更新时间';

COMMENT ON TABLE ap_model_balance_snapshot IS '模型渠道或账户余额观测快照';
COMMENT ON COLUMN ap_model_balance_snapshot.id IS '余额快照主键 ID';
COMMENT ON COLUMN ap_model_balance_snapshot.target_id IS '关联的路由目标 ID';
COMMENT ON COLUMN ap_model_balance_snapshot.provider_code IS '供应商编码';
COMMENT ON COLUMN ap_model_balance_snapshot.balance IS '观测到的余额';
COMMENT ON COLUMN ap_model_balance_snapshot.currency IS '余额币种';
COMMENT ON COLUMN ap_model_balance_snapshot.balance_status IS '余额状态：UNKNOWN、NORMAL、LOW、DEPLETED、ERROR';
COMMENT ON COLUMN ap_model_balance_snapshot.source IS '余额来源：MANUAL、PROVIDER_API、IMPORT';
COMMENT ON COLUMN ap_model_balance_snapshot.observed_at IS '余额观测时间';
COMMENT ON COLUMN ap_model_balance_snapshot.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_balance_snapshot.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_balance_snapshot.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_balance_snapshot.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_balance_snapshot.updated_at IS '最后更新时间';

COMMENT ON TABLE ap_model_invocation IS '模型调用明细，用于审计、用量统计、成本核算和故障分析';
COMMENT ON COLUMN ap_model_invocation.id IS '模型调用记录主键 ID';
COMMENT ON COLUMN ap_model_invocation.request_id IS '请求唯一标识';
COMMENT ON COLUMN ap_model_invocation.trace_id IS '调用链 Trace ID';
COMMENT ON COLUMN ap_model_invocation.project_id IS '发起调用的项目 ID';
COMMENT ON COLUMN ap_model_invocation.requested_model IS '请求方提供的模型编码';
COMMENT ON COLUMN ap_model_invocation.effective_model IS '实际调用的模型编码';
COMMENT ON COLUMN ap_model_invocation.provider_code IS '实际调用的供应商编码';
COMMENT ON COLUMN ap_model_invocation.target_id IS '旧版实际路由目标 ID';
COMMENT ON COLUMN ap_model_invocation.key_fingerprint IS '实际使用凭证指纹';
COMMENT ON COLUMN ap_model_invocation.attempt_no IS '本次请求的路由尝试序号';
COMMENT ON COLUMN ap_model_invocation.stream IS '是否为流式调用：1 是，0 否';
COMMENT ON COLUMN ap_model_invocation.status IS '调用结果状态：SUCCESS、FAILED、CANCELLED、TIMEOUT';
COMMENT ON COLUMN ap_model_invocation.failure_class IS '失败类别';
COMMENT ON COLUMN ap_model_invocation.fallback_reason IS '触发降级的原因';
COMMENT ON COLUMN ap_model_invocation.input_tokens IS '输入 Token 数';
COMMENT ON COLUMN ap_model_invocation.output_tokens IS '输出 Token 数';
COMMENT ON COLUMN ap_model_invocation.total_tokens IS '总 Token 数';
COMMENT ON COLUMN ap_model_invocation.latency_ms IS '调用延迟，单位毫秒';
COMMENT ON COLUMN ap_model_invocation.amount IS '本次调用成本金额';
COMMENT ON COLUMN ap_model_invocation.request_hash IS '脱敏请求摘要，用于幂等和排查';
COMMENT ON COLUMN ap_model_invocation.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_invocation.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_invocation.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_invocation.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_invocation.updated_at IS '最后更新时间';

COMMENT ON TABLE ap_model_event_outbox IS '模型治理和运行时领域事件发件箱';
COMMENT ON COLUMN ap_model_event_outbox.id IS '模型事件主键 ID';
COMMENT ON COLUMN ap_model_event_outbox.event_type IS '事件类型';
COMMENT ON COLUMN ap_model_event_outbox.aggregate_id IS '事件聚合根 ID';
COMMENT ON COLUMN ap_model_event_outbox.payload IS '事件负载 JSON，不得保存凭证明文';
COMMENT ON COLUMN ap_model_event_outbox.status IS '事件状态：PENDING、PROCESSING、PUBLISHED、FAILED';
COMMENT ON COLUMN ap_model_event_outbox.retry_count IS '事件发布重试次数';
COMMENT ON COLUMN ap_model_event_outbox.next_retry_at IS '下次重试时间';
COMMENT ON COLUMN ap_model_event_outbox.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_event_outbox.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_event_outbox.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_event_outbox.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_event_outbox.updated_at IS '最后更新时间';

COMMENT ON TABLE ap_model_validation_run IS '模型版本或模型渠道映射的异步验证任务';
COMMENT ON COLUMN ap_model_validation_run.id IS '模型验证任务主键 ID';
COMMENT ON COLUMN ap_model_validation_run.model_id IS '兼容旧结构的模型定义 ID';
COMMENT ON COLUMN ap_model_validation_run.model_version_id IS '待验证的模型版本 ID';
COMMENT ON COLUMN ap_model_validation_run.binding_id IS '待验证的模型渠道映射 ID';
COMMENT ON COLUMN ap_model_validation_run.status IS '验证任务状态：PENDING、RUNNING、PASSED、FAILED、CANCELLED';
COMMENT ON COLUMN ap_model_validation_run.progress IS '验证进度百分比，范围 0 到 100';
COMMENT ON COLUMN ap_model_validation_run.retry_count IS '验证任务重试次数';
COMMENT ON COLUMN ap_model_validation_run.failure_reason IS '验证失败原因';
COMMENT ON COLUMN ap_model_validation_run.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_validation_run.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_validation_run.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_validation_run.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_validation_run.updated_at IS '最后更新时间';

COMMENT ON TABLE ap_model_validation_check IS '模型验证任务的单项检查结果';
COMMENT ON COLUMN ap_model_validation_check.id IS '验证检查项主键 ID';
COMMENT ON COLUMN ap_model_validation_check.run_id IS '所属验证任务 ID';
COMMENT ON COLUMN ap_model_validation_check.check_code IS '检查项编码';
COMMENT ON COLUMN ap_model_validation_check.status IS '检查状态：PENDING、RUNNING、PASSED、FAILED、SKIPPED';
COMMENT ON COLUMN ap_model_validation_check.failure_reason IS '检查失败原因';
COMMENT ON COLUMN ap_model_validation_check.result_json IS '检查结果 JSON，不得保存密钥和用户敏感内容';
COMMENT ON COLUMN ap_model_validation_check.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_model_validation_check.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_model_validation_check.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_model_validation_check.created_at IS '创建时间';
COMMENT ON COLUMN ap_model_validation_check.updated_at IS '最后更新时间';

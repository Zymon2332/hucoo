-- Shared dictionaries and typed configuration. Existing settings data is intentionally retained.

CREATE TABLE ap_common_dictionary_type (
    id BIGINT NOT NULL PRIMARY KEY,
    dictionary_code VARCHAR(128) NOT NULL,
    dictionary_name VARCHAR(128) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    remarks VARCHAR(512),
    tenant_id VARCHAR(64) NOT NULL,
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_common_dictionary_type_owner UNIQUE (id, tenant_id)
);
CREATE UNIQUE INDEX uk_ap_common_dictionary_type_active ON ap_common_dictionary_type (tenant_id, dictionary_code) WHERE deleted = 0;
COMMENT ON TABLE ap_common_dictionary_type IS '通用字典类型';
COMMENT ON COLUMN ap_common_dictionary_type.id IS '雪花主键';
COMMENT ON COLUMN ap_common_dictionary_type.dictionary_code IS '字典类型编码';
COMMENT ON COLUMN ap_common_dictionary_type.dictionary_name IS '字典类型名称';
COMMENT ON COLUMN ap_common_dictionary_type.enabled IS '是否启用；租户禁用记录屏蔽平台默认值';
COMMENT ON COLUMN ap_common_dictionary_type.remarks IS '备注';
COMMENT ON COLUMN ap_common_dictionary_type.tenant_id IS '归属租户；000000 为平台默认';
COMMENT ON COLUMN ap_common_dictionary_type.version IS '乐观锁版本';
COMMENT ON COLUMN ap_common_dictionary_type.deleted IS '逻辑删除标记';
COMMENT ON COLUMN ap_common_dictionary_type.created_at IS '创建时间';
COMMENT ON COLUMN ap_common_dictionary_type.updated_at IS '更新时间';

CREATE TABLE ap_common_dictionary_item (
    id BIGINT NOT NULL PRIMARY KEY,
    type_id BIGINT NOT NULL,
    item_label VARCHAR(128) NOT NULL,
    item_value VARCHAR(128) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    remarks VARCHAR(512),
    tenant_id VARCHAR(64) NOT NULL,
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_common_dictionary_item_owner FOREIGN KEY (type_id, tenant_id) REFERENCES ap_common_dictionary_type (id, tenant_id)
);
CREATE UNIQUE INDEX uk_ap_common_dictionary_item_active ON ap_common_dictionary_item (tenant_id, type_id, item_value) WHERE deleted = 0;
COMMENT ON TABLE ap_common_dictionary_item IS '通用字典项';
COMMENT ON COLUMN ap_common_dictionary_item.id IS '雪花主键';
COMMENT ON COLUMN ap_common_dictionary_item.type_id IS '本作用域字典类型 ID';
COMMENT ON COLUMN ap_common_dictionary_item.item_label IS '字典项标签';
COMMENT ON COLUMN ap_common_dictionary_item.item_value IS '字典项值';
COMMENT ON COLUMN ap_common_dictionary_item.sort_order IS '排序值';
COMMENT ON COLUMN ap_common_dictionary_item.enabled IS '是否启用；租户禁用记录屏蔽平台默认值';
COMMENT ON COLUMN ap_common_dictionary_item.remarks IS '备注';
COMMENT ON COLUMN ap_common_dictionary_item.tenant_id IS '归属租户；000000 为平台默认';
COMMENT ON COLUMN ap_common_dictionary_item.version IS '乐观锁版本';
COMMENT ON COLUMN ap_common_dictionary_item.deleted IS '逻辑删除标记';
COMMENT ON COLUMN ap_common_dictionary_item.created_at IS '创建时间';
COMMENT ON COLUMN ap_common_dictionary_item.updated_at IS '更新时间';

CREATE TABLE ap_common_config (
    id BIGINT NOT NULL PRIMARY KEY,
    config_key VARCHAR(128) NOT NULL,
    config_name VARCHAR(128) NOT NULL,
    config_group VARCHAR(128) NOT NULL,
    value_type VARCHAR(16) NOT NULL CHECK (value_type IN ('STRING', 'NUMBER', 'BOOLEAN', 'JSON')),
    value_json TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    remarks VARCHAR(512),
    tenant_id VARCHAR(64) NOT NULL,
    version INT NOT NULL DEFAULT 0,
    deleted INT NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uk_ap_common_config_active ON ap_common_config (tenant_id, config_key) WHERE deleted = 0;
COMMENT ON TABLE ap_common_config IS '通用参数配置';
COMMENT ON COLUMN ap_common_config.id IS '雪花主键';
COMMENT ON COLUMN ap_common_config.config_key IS '配置键';
COMMENT ON COLUMN ap_common_config.config_name IS '配置名称';
COMMENT ON COLUMN ap_common_config.config_group IS '配置分组';
COMMENT ON COLUMN ap_common_config.value_type IS '配置值类型';
COMMENT ON COLUMN ap_common_config.value_json IS 'JSON 编码的配置值';
COMMENT ON COLUMN ap_common_config.enabled IS '是否启用；租户禁用记录屏蔽平台默认值';
COMMENT ON COLUMN ap_common_config.remarks IS '备注';
COMMENT ON COLUMN ap_common_config.tenant_id IS '归属租户；000000 为平台默认';
COMMENT ON COLUMN ap_common_config.version IS '乐观锁版本';
COMMENT ON COLUMN ap_common_config.deleted IS '逻辑删除标记';
COMMENT ON COLUMN ap_common_config.created_at IS '创建时间';
COMMENT ON COLUMN ap_common_config.updated_at IS '更新时间';

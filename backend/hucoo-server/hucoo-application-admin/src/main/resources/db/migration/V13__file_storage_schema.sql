-- 文件模块：元数据、上传会话、分片、分享链接与存储配置
-- 设计见 doc/FILE_MODULE.md

CREATE TABLE IF NOT EXISTS ap_file_object (
    id              BIGINT       NOT NULL PRIMARY KEY,
    storage_type    VARCHAR(16)  NOT NULL,
    bucket_name     VARCHAR(128) NOT NULL,
    object_key      VARCHAR(512) NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    display_name    VARCHAR(255),
    extension       VARCHAR(32),
    content_type    VARCHAR(128),
    size_bytes      BIGINT       DEFAULT 0,
    sha256          VARCHAR(64),
    etag            VARCHAR(128),
    visibility      VARCHAR(16)  DEFAULT 'PRIVATE',
    status          VARCHAR(16)  DEFAULT 'NORMAL',
    scan_status     VARCHAR(16)  DEFAULT 'SKIPPED',
    scan_result     VARCHAR(512),
    biz_type        VARCHAR(64),
    biz_id          VARCHAR(64),
    owner_id        BIGINT,
    owner_name      VARCHAR(64),
    source          VARCHAR(32),
    ref_count       INT          DEFAULT 1,
    download_count  BIGINT       DEFAULT 0,
    metadata        TEXT,
    last_access_at  TIMESTAMP(6),
    expires_at      TIMESTAMP(6),
    tenant_id       VARCHAR(64)  DEFAULT '000000',
    version         INT          DEFAULT 0,
    deleted         INT          DEFAULT 0,
    created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 逻辑删除下必须使用部分唯一索引，否则回收站记录会与同 key 新记录冲突
CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_file_object_key
    ON ap_file_object (tenant_id, bucket_name, object_key) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_ap_file_object_biz
    ON ap_file_object (tenant_id, biz_type, biz_id);
CREATE INDEX IF NOT EXISTS idx_ap_file_object_sha
    ON ap_file_object (tenant_id, sha256, size_bytes);
CREATE INDEX IF NOT EXISTS idx_ap_file_object_owner
    ON ap_file_object (tenant_id, owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ap_file_object_status
    ON ap_file_object (tenant_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS ap_file_upload_session (
    id                 BIGINT       NOT NULL PRIMARY KEY,
    upload_id          VARCHAR(128) NOT NULL,
    storage_type       VARCHAR(16)  NOT NULL,
    bucket_name        VARCHAR(128) NOT NULL,
    object_key         VARCHAR(512) NOT NULL,
    external_upload_id VARCHAR(256),
    file_name          VARCHAR(255) NOT NULL,
    content_type       VARCHAR(128),
    size_bytes         BIGINT       DEFAULT 0,
    sha256             VARCHAR(64),
    part_size          BIGINT       DEFAULT 8388608,
    part_count         INT          DEFAULT 0,
    uploaded_parts     INT          DEFAULT 0,
    biz_type           VARCHAR(64),
    biz_id             VARCHAR(64),
    visibility         VARCHAR(16),
    file_object_id     BIGINT,
    status             VARCHAR(16)  DEFAULT 'INIT',
    expires_at         TIMESTAMP(6),
    operator_id        BIGINT,
    operator_name      VARCHAR(64),
    tenant_id          VARCHAR(64)  DEFAULT '000000',
    version            INT          DEFAULT 0,
    deleted            INT          DEFAULT 0,
    created_at         TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_file_upload_session_upload_id
    ON ap_file_upload_session (upload_id) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_ap_file_upload_session_status
    ON ap_file_upload_session (tenant_id, status, expires_at);

CREATE TABLE IF NOT EXISTS ap_file_upload_part (
    id          BIGINT       NOT NULL PRIMARY KEY,
    upload_id   VARCHAR(128) NOT NULL,
    part_number INT          NOT NULL,
    etag        VARCHAR(128),
    size_bytes  BIGINT       DEFAULT 0,
    checksum    VARCHAR(128),
    tenant_id   VARCHAR(64)  DEFAULT '000000',
    version     INT          DEFAULT 0,
    deleted     INT          DEFAULT 0,
    created_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_file_upload_part
    ON ap_file_upload_part (upload_id, part_number) WHERE deleted = 0;

CREATE TABLE IF NOT EXISTS ap_file_share_token (
    id             BIGINT       NOT NULL PRIMARY KEY,
    token          VARCHAR(128) NOT NULL,
    file_id        BIGINT       NOT NULL,
    mode           VARCHAR(16)  DEFAULT 'DOWNLOAD',
    password_hash  VARCHAR(128),
    max_downloads  INT          DEFAULT 0,
    download_count INT          DEFAULT 0,
    expires_at     TIMESTAMP(6) NOT NULL,
    status         INT          DEFAULT 1,
    created_by     BIGINT,
    tenant_id      VARCHAR(64)  DEFAULT '000000',
    version        INT          DEFAULT 0,
    deleted        INT          DEFAULT 0,
    created_at     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_file_share_token
    ON ap_file_share_token (token) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_ap_file_share_token_file
    ON ap_file_share_token (tenant_id, file_id);

CREATE TABLE IF NOT EXISTS ap_file_storage_config (
    id                 BIGINT       NOT NULL PRIMARY KEY,
    config_code        VARCHAR(64)  NOT NULL,
    config_name        VARCHAR(128) NOT NULL,
    provider           VARCHAR(32)  NOT NULL,
    endpoint           VARCHAR(256),
    public_endpoint    VARCHAR(256),
    region             VARCHAR(64),
    bucket_name        VARCHAR(128),
    access_key         VARCHAR(256),
    secret_key         VARCHAR(512),
    path_style_access  BOOLEAN      DEFAULT TRUE,
    local_root         VARCHAR(512),
    max_file_size      BIGINT       DEFAULT 209715200,
    allowed_extensions VARCHAR(1024),
    default_visibility VARCHAR(16)  DEFAULT 'PRIVATE',
    is_default         BOOLEAN      DEFAULT FALSE,
    last_check_at      TIMESTAMP(6),
    last_check_status  VARCHAR(16),
    last_check_message VARCHAR(512),
    status             INT          DEFAULT 1,
    tenant_id          VARCHAR(64)  DEFAULT '000000',
    version            INT          DEFAULT 0,
    deleted            INT          DEFAULT 0,
    created_at         TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_ap_file_storage_config_code
    ON ap_file_storage_config (tenant_id, config_code) WHERE deleted = 0;

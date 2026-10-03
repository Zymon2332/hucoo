-- Identity, organization and approval schema.

CREATE TABLE IF NOT EXISTS ap_organization (
    id          BIGINT       NOT NULL PRIMARY KEY COMMENT '主键 ID',
    parent_id   BIGINT COMMENT '父组织 ID',
    org_code    VARCHAR(64)  NOT NULL COMMENT '组织编码',
    org_name    VARCHAR(128) NOT NULL COMMENT '组织名称',
    org_type    VARCHAR(32) COMMENT '组织类型',
    owner_id    BIGINT COMMENT '组织负责人 ID',
    status      INT          DEFAULT 1 COMMENT '状态：1 启用，0 停用',
    tenant_id   VARCHAR(64)  DEFAULT '000000' COMMENT '租户隔离标识',
    version     INT          DEFAULT 0 COMMENT '乐观锁版本号',
    deleted     INT          DEFAULT 0 COMMENT '逻辑删除标记：0 未删除，1 已删除',
    created_at  DATETIME COMMENT '创建时间',
    updated_at  DATETIME COMMENT '更新时间',
    UNIQUE KEY uk_ap_organization_tenant_code (tenant_id, org_code)
) COMMENT='组织架构表';

CREATE TABLE IF NOT EXISTS ap_role (
    id          BIGINT       NOT NULL PRIMARY KEY COMMENT '主键 ID',
    role_code   VARCHAR(64)  NOT NULL COMMENT '角色编码',
    role_name   VARCHAR(128) NOT NULL COMMENT '角色名称',
    scope       VARCHAR(32) COMMENT '角色作用域',
    role_level  INT          DEFAULT 0 COMMENT '角色等级',
    is_system   INT          DEFAULT 0 COMMENT '是否系统角色：1 是，0 否',
    status      INT          DEFAULT 1 COMMENT '状态：1 启用，0 停用',
    tenant_id   VARCHAR(64)  DEFAULT '000000' COMMENT '租户隔离标识',
    version     INT          DEFAULT 0 COMMENT '乐观锁版本号',
    deleted     INT          DEFAULT 0 COMMENT '逻辑删除标记：0 未删除，1 已删除',
    created_at  DATETIME COMMENT '创建时间',
    updated_at  DATETIME COMMENT '更新时间',
    UNIQUE KEY uk_ap_role_tenant_code (tenant_id, role_code)
) COMMENT='角色表';

CREATE TABLE IF NOT EXISTS ap_permission (
    id              BIGINT       NOT NULL PRIMARY KEY COMMENT '主键 ID',
    permission_code VARCHAR(128) NOT NULL COMMENT '权限编码',
    permission_name VARCHAR(128) NOT NULL COMMENT '权限名称',
    resource_type   VARCHAR(64) COMMENT '资源类型',
    action          VARCHAR(64) COMMENT '操作动作',
    description     VARCHAR(512) COMMENT '权限描述',
    status          INT          DEFAULT 1 COMMENT '状态：1 启用，0 停用',
    tenant_id       VARCHAR(64)  DEFAULT '000000' COMMENT '租户隔离标识',
    version         INT          DEFAULT 0 COMMENT '乐观锁版本号',
    deleted         INT          DEFAULT 0 COMMENT '逻辑删除标记：0 未删除，1 已删除',
    created_at      DATETIME COMMENT '创建时间',
    updated_at      DATETIME COMMENT '更新时间',
    UNIQUE KEY uk_ap_permission_tenant_code (tenant_id, permission_code)
) COMMENT='权限定义表';

CREATE TABLE IF NOT EXISTS ap_user_role (
    id          BIGINT      NOT NULL PRIMARY KEY COMMENT '主键 ID',
    user_id     BIGINT      NOT NULL COMMENT '用户 ID',
    role_id     BIGINT      NOT NULL COMMENT '角色 ID',
    tenant_id   VARCHAR(64) DEFAULT '000000' COMMENT '租户隔离标识',
    version     INT         DEFAULT 0 COMMENT '乐观锁版本号',
    deleted     INT         DEFAULT 0 COMMENT '逻辑删除标记：0 未删除，1 已删除',
    created_at  DATETIME COMMENT '创建时间',
    updated_at  DATETIME COMMENT '更新时间',
    UNIQUE KEY uk_ap_user_role (tenant_id, user_id, role_id)
) COMMENT='用户角色关联表';

CREATE TABLE IF NOT EXISTS ap_role_permission (
    id            BIGINT      NOT NULL PRIMARY KEY COMMENT '主键 ID',
    role_id       BIGINT      NOT NULL COMMENT '角色 ID',
    permission_id BIGINT      NOT NULL COMMENT '权限 ID',
    tenant_id     VARCHAR(64) DEFAULT '000000' COMMENT '租户隔离标识',
    version       INT         DEFAULT 0 COMMENT '乐观锁版本号',
    deleted       INT         DEFAULT 0 COMMENT '逻辑删除标记：0 未删除，1 已删除',
    created_at    DATETIME COMMENT '创建时间',
    updated_at    DATETIME COMMENT '更新时间',
    UNIQUE KEY uk_ap_role_permission (tenant_id, role_id, permission_id)
) COMMENT='角色权限关联表';

CREATE TABLE IF NOT EXISTS ap_approval (
    id            BIGINT       NOT NULL PRIMARY KEY COMMENT '主键 ID',
    approval_type VARCHAR(64)  NOT NULL COMMENT '审批类型',
    resource_type VARCHAR(64)  COMMENT '资源类型',
    resource_id   VARCHAR(128) COMMENT '资源标识',
    applicant_id  BIGINT       COMMENT '申请人 ID',
    status        VARCHAR(32)  DEFAULT 'PENDING' COMMENT '审批状态',
    reason        VARCHAR(1024) COMMENT '申请原因',
    submitted_at  DATETIME COMMENT '提交时间',
    completed_at  DATETIME COMMENT '完成时间',
    tenant_id     VARCHAR(64)  DEFAULT '000000' COMMENT '租户隔离标识',
    version       INT          DEFAULT 0 COMMENT '乐观锁版本号',
    deleted       INT          DEFAULT 0 COMMENT '逻辑删除标记：0 未删除，1 已删除',
    created_at    DATETIME COMMENT '创建时间',
    updated_at    DATETIME COMMENT '更新时间'
) COMMENT='审批申请表';

CREATE TABLE IF NOT EXISTS ap_approval_step (
    id           BIGINT      NOT NULL PRIMARY KEY COMMENT '主键 ID',
    approval_id  BIGINT      NOT NULL COMMENT '审批申请 ID',
    step_no      INT         NOT NULL COMMENT '审批步骤序号',
    approver_id  BIGINT      COMMENT '审批人 ID',
    status       VARCHAR(32) DEFAULT 'PENDING' COMMENT '步骤状态',
    action       VARCHAR(32) COMMENT '审批动作',
    comment      VARCHAR(1024) COMMENT '审批意见',
    acted_at     DATETIME COMMENT '处理时间',
    tenant_id    VARCHAR(64) DEFAULT '000000' COMMENT '租户隔离标识',
    version      INT         DEFAULT 0 COMMENT '乐观锁版本号',
    deleted      INT         DEFAULT 0 COMMENT '逻辑删除标记：0 未删除，1 已删除',
    created_at   DATETIME COMMENT '创建时间',
    updated_at   DATETIME COMMENT '更新时间',
    UNIQUE KEY uk_ap_approval_step (tenant_id, approval_id, step_no)
) COMMENT='审批步骤表';

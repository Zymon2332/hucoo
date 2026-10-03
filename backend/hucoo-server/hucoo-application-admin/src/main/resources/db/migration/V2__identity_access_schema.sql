-- Identity, organization and approval schema.

CREATE TABLE IF NOT EXISTS ap_organization (
    id          BIGINT       NOT NULL PRIMARY KEY,
    parent_id   BIGINT,
    org_code    VARCHAR(64)  NOT NULL,
    org_name    VARCHAR(128) NOT NULL,
    org_type    VARCHAR(32),
    owner_id    BIGINT,
    status      INT          DEFAULT 1,
    tenant_id   VARCHAR(64)  DEFAULT '000000',
    version     INT          DEFAULT 0,
    deleted     INT          DEFAULT 0,
    created_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_organization_tenant_code UNIQUE (tenant_id, org_code)
);

CREATE TABLE IF NOT EXISTS ap_role (
    id          BIGINT       NOT NULL PRIMARY KEY,
    role_code   VARCHAR(64)  NOT NULL,
    role_name   VARCHAR(128) NOT NULL,
    scope       VARCHAR(32),
    role_level  INT          DEFAULT 0,
    is_system   INT          DEFAULT 0,
    status      INT          DEFAULT 1,
    tenant_id   VARCHAR(64)  DEFAULT '000000',
    version     INT          DEFAULT 0,
    deleted     INT          DEFAULT 0,
    created_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_role_tenant_code UNIQUE (tenant_id, role_code)
);

CREATE TABLE IF NOT EXISTS ap_permission (
    id              BIGINT       NOT NULL PRIMARY KEY,
    permission_code VARCHAR(128) NOT NULL,
    permission_name VARCHAR(128) NOT NULL,
    resource_type   VARCHAR(64),
    action          VARCHAR(64),
    description     VARCHAR(512),
    status          INT          DEFAULT 1,
    tenant_id       VARCHAR(64)  DEFAULT '000000',
    version         INT          DEFAULT 0,
    deleted         INT          DEFAULT 0,
    created_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_permission_tenant_code UNIQUE (tenant_id, permission_code)
);

CREATE TABLE IF NOT EXISTS ap_user_role (
    id          BIGINT      NOT NULL PRIMARY KEY,
    user_id     BIGINT      NOT NULL,
    role_id     BIGINT      NOT NULL,
    tenant_id   VARCHAR(64) DEFAULT '000000',
    version     INT         DEFAULT 0,
    deleted     INT         DEFAULT 0,
    created_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_user_role UNIQUE (tenant_id, user_id, role_id)
);

CREATE TABLE IF NOT EXISTS ap_role_permission (
    id            BIGINT      NOT NULL PRIMARY KEY,
    role_id       BIGINT      NOT NULL,
    permission_id BIGINT      NOT NULL,
    tenant_id     VARCHAR(64) DEFAULT '000000',
    version       INT         DEFAULT 0,
    deleted       INT         DEFAULT 0,
    created_at    TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_role_permission UNIQUE (tenant_id, role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS ap_approval (
    id            BIGINT       NOT NULL PRIMARY KEY,
    approval_type VARCHAR(64)  NOT NULL,
    resource_type VARCHAR(64),
    resource_id   VARCHAR(128),
    applicant_id  BIGINT,
    status        VARCHAR(32)  DEFAULT 'PENDING',
    reason        VARCHAR(1024),
    submitted_at  TIMESTAMP(6),
    completed_at  TIMESTAMP(6),
    tenant_id     VARCHAR(64)  DEFAULT '000000',
    version       INT          DEFAULT 0,
    deleted       INT          DEFAULT 0,
    created_at    TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ap_approval_step (
    id           BIGINT      NOT NULL PRIMARY KEY,
    approval_id  BIGINT      NOT NULL,
    step_no      INT         NOT NULL,
    approver_id  BIGINT,
    status       VARCHAR(32) DEFAULT 'PENDING',
    action       VARCHAR(32),
    comment      VARCHAR(1024),
    acted_at     TIMESTAMP(6),
    tenant_id    VARCHAR(64) DEFAULT '000000',
    version      INT         DEFAULT 0,
    deleted      INT         DEFAULT 0,
    created_at   TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_ap_approval_step UNIQUE (tenant_id, approval_id, step_no)
);

COMMENT ON TABLE ap_organization IS '组织架构表';
COMMENT ON TABLE ap_role IS '角色表';
COMMENT ON TABLE ap_permission IS '权限定义表';
COMMENT ON TABLE ap_user_role IS '用户角色关联表';
COMMENT ON TABLE ap_role_permission IS '角色权限关联表';
COMMENT ON TABLE ap_approval IS '审批申请表';
COMMENT ON TABLE ap_approval_step IS '审批步骤表';

COMMENT ON COLUMN ap_organization.id IS '主键 ID';
COMMENT ON COLUMN ap_organization.parent_id IS '父组织 ID';
COMMENT ON COLUMN ap_organization.org_code IS '组织编码';
COMMENT ON COLUMN ap_organization.org_name IS '组织名称';
COMMENT ON COLUMN ap_organization.org_type IS '组织类型';
COMMENT ON COLUMN ap_organization.owner_id IS '组织负责人 ID';
COMMENT ON COLUMN ap_organization.status IS '状态：1 启用，0 停用';
COMMENT ON COLUMN ap_organization.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_organization.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_organization.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_organization.created_at IS '创建时间';
COMMENT ON COLUMN ap_organization.updated_at IS '更新时间';

COMMENT ON COLUMN ap_role.id IS '主键 ID';
COMMENT ON COLUMN ap_role.role_code IS '角色编码';
COMMENT ON COLUMN ap_role.role_name IS '角色名称';
COMMENT ON COLUMN ap_role.scope IS '角色作用域';
COMMENT ON COLUMN ap_role.role_level IS '角色等级';
COMMENT ON COLUMN ap_role.is_system IS '是否系统角色：1 是，0 否';
COMMENT ON COLUMN ap_role.status IS '状态：1 启用，0 停用';
COMMENT ON COLUMN ap_role.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_role.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_role.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_role.created_at IS '创建时间';
COMMENT ON COLUMN ap_role.updated_at IS '更新时间';

COMMENT ON COLUMN ap_permission.id IS '主键 ID';
COMMENT ON COLUMN ap_permission.permission_code IS '权限编码';
COMMENT ON COLUMN ap_permission.permission_name IS '权限名称';
COMMENT ON COLUMN ap_permission.resource_type IS '资源类型';
COMMENT ON COLUMN ap_permission.action IS '操作动作';
COMMENT ON COLUMN ap_permission.description IS '权限描述';
COMMENT ON COLUMN ap_permission.status IS '状态：1 启用，0 停用';
COMMENT ON COLUMN ap_permission.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_permission.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_permission.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_permission.created_at IS '创建时间';
COMMENT ON COLUMN ap_permission.updated_at IS '更新时间';

COMMENT ON COLUMN ap_user_role.id IS '主键 ID';
COMMENT ON COLUMN ap_user_role.user_id IS '用户 ID';
COMMENT ON COLUMN ap_user_role.role_id IS '角色 ID';
COMMENT ON COLUMN ap_user_role.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_user_role.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_user_role.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_user_role.created_at IS '创建时间';
COMMENT ON COLUMN ap_user_role.updated_at IS '更新时间';

COMMENT ON COLUMN ap_role_permission.id IS '主键 ID';
COMMENT ON COLUMN ap_role_permission.role_id IS '角色 ID';
COMMENT ON COLUMN ap_role_permission.permission_id IS '权限 ID';
COMMENT ON COLUMN ap_role_permission.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_role_permission.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_role_permission.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_role_permission.created_at IS '创建时间';
COMMENT ON COLUMN ap_role_permission.updated_at IS '更新时间';

COMMENT ON COLUMN ap_approval.id IS '主键 ID';
COMMENT ON COLUMN ap_approval.approval_type IS '审批类型';
COMMENT ON COLUMN ap_approval.resource_type IS '资源类型';
COMMENT ON COLUMN ap_approval.resource_id IS '资源标识';
COMMENT ON COLUMN ap_approval.applicant_id IS '申请人 ID';
COMMENT ON COLUMN ap_approval.status IS '审批状态';
COMMENT ON COLUMN ap_approval.reason IS '申请原因';
COMMENT ON COLUMN ap_approval.submitted_at IS '提交时间';
COMMENT ON COLUMN ap_approval.completed_at IS '完成时间';
COMMENT ON COLUMN ap_approval.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_approval.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_approval.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_approval.created_at IS '创建时间';
COMMENT ON COLUMN ap_approval.updated_at IS '更新时间';

COMMENT ON COLUMN ap_approval_step.id IS '主键 ID';
COMMENT ON COLUMN ap_approval_step.approval_id IS '审批申请 ID';
COMMENT ON COLUMN ap_approval_step.step_no IS '审批步骤序号';
COMMENT ON COLUMN ap_approval_step.approver_id IS '审批人 ID';
COMMENT ON COLUMN ap_approval_step.status IS '步骤状态';
COMMENT ON COLUMN ap_approval_step.action IS '审批动作';
COMMENT ON COLUMN ap_approval_step.comment IS '审批意见';
COMMENT ON COLUMN ap_approval_step.acted_at IS '处理时间';
COMMENT ON COLUMN ap_approval_step.tenant_id IS '租户隔离标识';
COMMENT ON COLUMN ap_approval_step.version IS '乐观锁版本号';
COMMENT ON COLUMN ap_approval_step.deleted IS '逻辑删除标记：0 未删除，1 已删除';
COMMENT ON COLUMN ap_approval_step.created_at IS '创建时间';
COMMENT ON COLUMN ap_approval_step.updated_at IS '更新时间';

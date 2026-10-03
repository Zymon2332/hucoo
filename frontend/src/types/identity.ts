import type { ID, QuotaSnapshot, RiskLevel, StatusTone } from "./common";

export type TenantPlan = "free" | "team" | "business" | "enterprise";
export type TenantStatus = "active" | "trial" | "suspended" | "expired" | "provisioning";

export interface Tenant {
  id: ID;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  region: string;
  ownerName: string;
  ownerEmail: string;
  seats: number;
  userCount: number;
  projectCount: number;
  agentCount: number;
  monthlyCalls: number;
  monthlyTokens: number;
  monthlyCost: number;
  expiresAt: string;
  createdAt: string;
  ssoEnabled: boolean;
  allowCustomModels: boolean;
  allowByok: boolean;
  allowLocalModels: boolean;
  allowSharedModels: boolean;
  tags: string[];
  quota: QuotaSnapshot;
}

export type OrganizationType = "company" | "department" | "team";

export interface Organization {
  id: ID;
  tenantId: ID;
  tenantName: string;
  /** 组织编码，用于对外展示与检索 */
  code: string;
  name: string;
  type: OrganizationType;
  parentId: ID | null;
  owner: string;
  description: string;
  /** 直属成员数（不含下级组织） */
  memberCount: number;
  projectCount: number;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export type OrgMemberStatus = "active" | "invited" | "pending" | "disabled" | "locked";

export interface OrgMember {
  id: ID;
  name: string;
  email: string;
  title: string;
  status: OrgMemberStatus;
  source: UserSource;
  mfaEnabled: boolean;
  joinedAt: string;
  lastActiveAt: string;
}

export type UserStatus = "active" | "invited" | "pending" | "disabled" | "locked";

export type UserSource =
  | "sso-oidc"
  | "sso-saml"
  | "ldap"
  | "scim"
  | "invite"
  | "local"
  | "wecom"
  | "feishu"
  | "dingtalk";

export interface User {
  id: ID;
  name: string;
  email: string;
  phone: string;
  tenantId: ID;
  tenantName: string;
  orgId: ID;
  orgName: string;
  department: string;
  title: string;
  roles: ID[];
  roleNames: string[];
  status: UserStatus;
  source: UserSource;
  mfaEnabled: boolean;
  lastLoginAt: string;
  createdAt: string;
  apiKeyCount: number;
  deviceCount: number;
}

export interface Role {
  id: ID;
  code: string;
  name: string;
  description: string;
  scope: "platform" | "tenant" | "organization" | "project";
  level: number;
  isSystem: boolean;
  userCount: number;
  permissions: string[];
  updatedAt: string;
}

export type PermissionAction = "read" | "write" | "delete" | "approve" | "execute" | "admin";

export interface Permission {
  id: ID;
  code: string;
  name: string;
  module: string;
  resource: string;
  action: PermissionAction;
  description: string;
  roles: ID[];
  sensitive: boolean;
}

export interface PermissionSimulation {
  userId: ID;
  userName: string;
  roleNames: string[];
  allowed: Permission[];
  denied: Permission[];
  restrictions: string[];
}

export type ApprovalType =
  | "model-onboarding"
  | "production-access"
  | "sensitive-tool"
  | "high-spend"
  | "temp-permission"
  | "tool-registration"
  | "agent-publish";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "escalated" | "cancelled";

export interface ApprovalStep {
  id: ID;
  order: number;
  approver: string;
  role: string;
  status: "pending" | "approved" | "rejected" | "skipped";
  decidedAt: string | null;
  comment: string | null;
}

export interface Approval {
  id: ID;
  code: string;
  type: ApprovalType;
  title: string;
  applicant: string;
  applicantEmail: string;
  tenantId: ID;
  tenantName: string;
  riskLevel: RiskLevel;
  status: ApprovalStatus;
  reason: string;
  amount: number | null;
  targetType: string;
  targetName: string;
  submittedAt: string;
  slaDueAt: string;
  currentStep: number;
  chain: ApprovalStep[];
}

export interface SsoConfig {
  id: ID;
  provider: "oidc" | "saml" | "ldap" | "wecom" | "feishu" | "dingtalk";
  name: string;
  status: "enabled" | "disabled" | "error" | "configuring";
  domain: string;
  issuer: string;
  clientId: string;
  metadataUrl: string;
  scimEnabled: boolean;
  jitProvisioning: boolean;
  enforced: boolean;
  syncedUsers: number;
  lastSyncAt: string;
  syncStatus: "success" | "running" | "failed" | "idle";
}

export interface ServiceAccount {
  id: ID;
  name: string;
  type: "service-account" | "machine-identity";
  tenantName: string;
  owner: string;
  scopes: string[];
  status: "active" | "disabled" | "expired";
  keyCount: number;
  lastUsedAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface ApiKeyRecord {
  id: ID;
  name: string;
  prefix: string;
  owner: string;
  tenantName: string;
  scopes: string[];
  status: "active" | "revoked" | "expired" | "rotating";
  rateLimit: string;
  callCount: number;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

export interface AuditLog {
  id: ID;
  at: string;
  actorName: string;
  actorEmail: string;
  actorType: "user" | "service-account" | "system" | "api-key";
  tenantName: string;
  action: string;
  actionLabel: string;
  resourceType: string;
  resourceName: string;
  result: "success" | "failure" | "denied";
  ip: string;
  location: string;
  userAgent: string;
  riskLevel: RiskLevel;
  detail: string;
}

export const TENANT_PLAN_LABEL: Record<TenantPlan, string> = {
  free: "免费版",
  team: "团队版",
  business: "商业版",
  enterprise: "企业版",
};

export const TENANT_STATUS_TONE: Record<TenantStatus, StatusTone> = {
  active: "success",
  trial: "info",
  suspended: "warning",
  expired: "danger",
  provisioning: "processing",
};

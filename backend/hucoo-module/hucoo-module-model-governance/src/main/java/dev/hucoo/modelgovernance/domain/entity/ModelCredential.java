package dev.hucoo.modelgovernance.domain.entity;

import java.time.LocalDateTime;

import lombok.Data;
import lombok.EqualsAndHashCode;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "ap_model_credential", autoResultMap = true)
public class ModelCredential extends BaseEntity {
    /**
     * 凭证所属供应商渠道 ID
     */
    @TableField(value = "channel_id")
    private Long channelId;

    /**
     * 凭证展示名称
     */
    @TableField(value = "credential_name")
    private String credentialName;

    /**
     * 凭证类型：API_KEY、OAUTH2、MTLS、NONE
     */
    @TableField(value = "credential_type")
    private String credentialType;

    @lombok.ToString.Exclude
    /** 平台加密后的凭证密文，禁止保存明文 */
    @TableField(value = "secret_ciphertext")
    private String secretCiphertext;

    @lombok.ToString.Exclude
    /** 凭证加密使用的随机 Nonce */
    @TableField(value = "secret_nonce")
    private String secretNonce;

    @lombok.ToString.Exclude
    /** 用于解密的主密钥标识 */
    @TableField(value = "encryption_key_id")
    private String encryptionKeyId;

    @lombok.ToString.Exclude
    /** 用于解密的主密钥版本 */
    @TableField(value = "encryption_key_version")
    private String encryptionKeyVersion;

    /**
     * 凭证指纹，用于去重和审计，不可还原明文
     */
    @TableField(value = "secret_fingerprint")
    private String secretFingerprint;

    /**
     * 凭证脱敏展示值，例如 ****abcd
     */
    @TableField(value = "masked_value")
    private String maskedValue;

    /**
     * 凭证所有权范围：PLATFORM、TENANT、PROJECT、USER
     */
    @TableField(value = "owner_scope_type")
    private String ownerScopeType;

    /**
     * 凭证所有权范围对象 ID
     */
    @TableField(value = "owner_scope_id")
    private String ownerScopeId;

    /**
     * 凭证状态：ACTIVE、EXPIRED、ROTATING、REVOKED、DISABLED
     */
    @TableField(value = "status")
    private String status;

    /**
     * 凭证过期时间
     */
    @TableField(value = "expires_at", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private LocalDateTime expiresAt;

    /**
     * 最近一次轮换时间
     */
    @TableField(value = "last_rotated_at")
    private LocalDateTime lastRotatedAt;

    /**
     * 最近一次凭证验证时间
     */
    @TableField(value = "last_verified_at", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS)
    private LocalDateTime lastVerifiedAt;

}

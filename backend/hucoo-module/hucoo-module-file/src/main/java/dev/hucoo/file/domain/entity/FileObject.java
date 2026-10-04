package dev.hucoo.file.domain.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import dev.hucoo.component.database.entity.BaseEntity;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 文件对象元数据。对象内容在对象存储（S3 兼容 / 本地）中，本表只存元信息。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_file_object")
public class FileObject extends BaseEntity {

    private static final long serialVersionUID = 1L;

    /** 存储驱动：S3 / LOCAL。 */
    @TableField("storage_type")
    private String storageType;

    @TableField("bucket_name")
    private String bucketName;

    /** 对象 key，由 StorageKeyGenerator 生成，不含原始文件名。 */
    @TableField("object_key")
    private String objectKey;

    /** 上传时的原始文件名。 */
    @TableField("file_name")
    private String fileName;

    /** 展示名，重命名只改该字段，不移动对象。 */
    @TableField("display_name")
    private String displayName;

    @TableField("extension")
    private String extension;

    @TableField("content_type")
    private String contentType;

    @TableField("size_bytes")
    private Long sizeBytes;

    @TableField("sha256")
    private String sha256;

    @TableField("etag")
    private String etag;

    /** 可见性：PRIVATE / TENANT / PUBLIC。 */
    @TableField("visibility")
    private String visibility;

    /** 状态：NORMAL / RECYCLING / PURGED / QUARANTINED。 */
    @TableField("status")
    private String status;

    /** 安全扫描状态：SKIPPED / PENDING / CLEAN / INFECTED。 */
    @TableField("scan_status")
    private String scanStatus;

    @TableField("scan_result")
    private String scanResult;

    /** 业务归属类型，例如 AGENT_TEMPLATE / MCP_PACKAGE / PROJECT / BILLING_EXPORT。 */
    @TableField("biz_type")
    private String bizType;

    @TableField("biz_id")
    private String bizId;

    @TableField("owner_id")
    private Long ownerId;

    @TableField("owner_name")
    private String ownerName;

    @TableField("source")
    private String source;

    @TableField("ref_count")
    private Integer refCount;

    @TableField("download_count")
    private Long downloadCount;

    /** JSON 扩展字段。 */
    @TableField("metadata")
    private String metadata;

    @TableField("last_access_at")
    private java.time.LocalDateTime lastAccessAt;

    @TableField("expires_at")
    private java.time.LocalDateTime expiresAt;
}

package dev.hucoo.file.application.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.commons.util.CryptoUtil;
import dev.hucoo.commons.util.StringUtil;
import dev.hucoo.component.storage.PresignedUrl;
import dev.hucoo.component.storage.StorageClient;
import dev.hucoo.component.storage.config.StorageProperties;
import dev.hucoo.file.api.dto.FileObjectDTO;
import dev.hucoo.file.api.dto.FileUrlDTO;
import dev.hucoo.file.application.support.FileAuditSupport;
import dev.hucoo.file.application.support.FileContent;
import dev.hucoo.file.application.support.StorageResource;
import dev.hucoo.file.config.FileModuleProperties;
import dev.hucoo.file.domain.enums.FileScanStatus;
import dev.hucoo.file.domain.enums.FileStatus;

/**
 * 下载应用服务。
 *
 * <p>两种驱动对上层提供同一套语义：
 * <ul>
 *     <li>S3 兼容驱动：返回预签名直链（{@code PRESIGNED}），浏览器直连对象存储；</li>
 *     <li>本地驱动：返回后端签名代理地址（{@code PROXY}），由本服务校验 HMAC 后流式转发。</li>
 * </ul>
 * 无论哪种方式，内容都由服务端授权，匿名入口只认签名 token。
 */
@Service
public class FileDownloadService {

    private static final String TOKEN_SEPARATOR = ".";
    private static final String MODE_PRESIGNED = "PRESIGNED";
    private static final String MODE_PROXY = "PROXY";

    private final ObjectProvider<StorageClient> storageClientProvider;
    private final ObjectProvider<StorageProperties> storagePropertiesProvider;
    private final FileModuleProperties moduleProperties;
    private final FileObjectApplicationService fileObjectApplicationService;
    private final FileAuditSupport auditSupport;

    public FileDownloadService(ObjectProvider<StorageClient> storageClientProvider,
                               ObjectProvider<StorageProperties> storagePropertiesProvider,
                               FileModuleProperties moduleProperties,
                               FileObjectApplicationService fileObjectApplicationService,
                               FileAuditSupport auditSupport) {
        this.storageClientProvider = storageClientProvider;
        this.storagePropertiesProvider = storagePropertiesProvider;
        this.moduleProperties = moduleProperties;
        this.fileObjectApplicationService = fileObjectApplicationService;
        this.auditSupport = auditSupport;
    }

    /** 登录态下载：受租户与权限约束。 */
    public FileContent openContent(Long id) {
        return open(fileObjectApplicationService.getDto(id), true);
    }

    /** 匿名签名下载：租户条件由 token 自身保证。 */
    public FileContent openByToken(String token) {
        Long fileId = verifyToken(token);
        FileObjectDTO file = fileObjectApplicationService.getDtoIgnoreTenant(fileId);
        FileContent content = open(file, false);
        // 匿名请求的租户上下文是系统租户，计数与审计都必须以文件记录自身的租户为准
        fileObjectApplicationService.markDownloadedIgnoreTenant(fileId);
        if (moduleProperties.isDownloadAuditEnabled()) {
            auditSupport.publish("FILE_DOWNLOAD_SHARE", String.valueOf(fileId), 1, file.getTenantId());
        }
        return content;
    }

    /** 生成下载地址：驱动支持预签名时给直链，否则给后端签名代理地址。 */
    public FileUrlDTO createUrl(Long id, Duration ttl) {
        FileObjectDTO file = fileObjectApplicationService.getDto(id);
        ensureDownloadable(file);
        Duration effectiveTtl = resolveTtl(ttl);

        StorageClient storageClient = storageClientProvider.getIfAvailable();
        if (storageClient != null && storageClient.capabilities().presignedGet()) {
            PresignedUrl presigned = storageClient.presignGet(resolveBucket(file), file.getObjectKey(),
                    effectiveTtl, file.getDisplayName() == null ? file.getFileName() : file.getDisplayName());
            return new FileUrlDTO(presigned.url(), presigned.method(),
                    LocalDateTime.ofInstant(presigned.expiresAt(), ZoneId.systemDefault()), MODE_PRESIGNED);
        }
        String token = createToken(id, effectiveTtl);
        String url = signedUrlBase() + PlatformConstants.API_PREFIX + "/files/download/" + token;
        return new FileUrlDTO(url, "GET",
                LocalDateTime.ofInstant(Instant.now().plus(effectiveTtl), ZoneId.systemDefault()), MODE_PROXY);
    }

    public String createToken(Long fileId, Duration ttl) {
        long expiresAt = Instant.now().plus(ttl).getEpochSecond();
        String payload = fileId + TOKEN_SEPARATOR + expiresAt;
        return payload + TOKEN_SEPARATOR + sign(payload);
    }

    /** 校验签名与有效期，返回文件 ID。 */
    public Long verifyToken(String token) {
        if (StringUtil.isBlank(token)) {
            throw new BusinessException(CommonErrorCode.FILE_SHARE_EXPIRED, "下载链接无效");
        }
        String[] parts = token.split("\\" + TOKEN_SEPARATOR);
        if (parts.length != 3) {
            throw new BusinessException(CommonErrorCode.FILE_SHARE_EXPIRED, "下载链接无效");
        }
        String payload = parts[0] + TOKEN_SEPARATOR + parts[1];
        if (!CryptoUtil.secureEquals(sign(payload), parts[2])) {
            throw new BusinessException(CommonErrorCode.FILE_SHARE_EXPIRED, "下载链接签名校验失败");
        }
        long expiresAt;
        long fileId;
        try {
            fileId = Long.parseLong(parts[0]);
            expiresAt = Long.parseLong(parts[1]);
        } catch (NumberFormatException e) {
            throw new BusinessException(CommonErrorCode.FILE_SHARE_EXPIRED, "下载链接无效");
        }
        if (Instant.now().getEpochSecond() > expiresAt) {
            throw new BusinessException(CommonErrorCode.FILE_SHARE_EXPIRED, "下载链接已过期");
        }
        return fileId;
    }

    private FileContent open(FileObjectDTO file, boolean audit) {
        ensureDownloadable(file);
        StorageClient storageClient = requireStorageClient();
        String bucket = resolveBucket(file);
        StorageResource resource = new StorageResource(storageClient, bucket, file.getObjectKey(),
                file.getSizeBytes() == null ? -1L : file.getSizeBytes(), file.getFileName());
        if (audit) {
            fileObjectApplicationService.markDownloaded(file.getId());
            if (moduleProperties.isDownloadAuditEnabled()) {
                auditSupport.publish("FILE_DOWNLOAD", String.valueOf(file.getId()), 1);
            }
        }
        return new FileContent(file.getId(), file.getFileName(),
                StringUtil.isBlank(file.getContentType()) ? "application/octet-stream" : file.getContentType(),
                file.getSizeBytes() == null ? -1L : file.getSizeBytes(), resource);
    }

    private void ensureDownloadable(FileObjectDTO file) {
        FileStatus status = FileStatus.of(file.getStatus());
        if (status == FileStatus.QUARANTINED
                || FileScanStatus.INFECTED.name().equalsIgnoreCase(file.getScanStatus())) {
            throw new BusinessException(CommonErrorCode.FILE_QUARANTINED, "文件未通过安全检查，暂不可下载");
        }
        if (status != FileStatus.NORMAL) {
            throw new BusinessException(CommonErrorCode.FILE_OPERATION_NOT_ALLOWED,
                    "当前文件状态不允许下载: " + file.getStatus());
        }
        if (file.getExpiresAt() != null && file.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(CommonErrorCode.FILE_OPERATION_NOT_ALLOWED, "文件已过期");
        }
    }

    private StorageClient requireStorageClient() {
        StorageClient storageClient = storageClientProvider.getIfAvailable();
        if (storageClient == null) {
            throw new BusinessException(CommonErrorCode.FILE_STORAGE_UNAVAILABLE,
                    "对象存储未启用（agent-platform.storage.enabled=false）");
        }
        return storageClient;
    }

    private String resolveBucket(FileObjectDTO file) {
        if (StringUtil.isNotBlank(file.getBucketName())) {
            return file.getBucketName();
        }
        return storagePropertiesProvider.getIfAvailable(StorageProperties::new).getDefaultBucket();
    }

    private Duration resolveTtl(Duration ttl) {
        if (ttl == null || ttl.isZero() || ttl.isNegative()) {
            return moduleProperties.getSignedUrlTtl();
        }
        return ttl;
    }

    private String signedUrlBase() {
        String base = moduleProperties.getSignedUrlBase();
        if (StringUtil.isBlank(base)) {
            return "";
        }
        return base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
    }

    private String sign(String payload) {
        return CryptoUtil.hmacSha256Base64Url(payload, moduleProperties.getSignedUrlSecret());
    }
}

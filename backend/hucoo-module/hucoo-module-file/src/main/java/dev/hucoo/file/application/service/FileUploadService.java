package dev.hucoo.file.application.service;

import java.io.InputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.commons.util.StringUtil;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.component.security.context.CurrentUserContext;
import dev.hucoo.component.storage.StorageClient;
import dev.hucoo.component.storage.StorageErrorCode;
import dev.hucoo.component.storage.StorageException;
import dev.hucoo.component.storage.StoragePutRequest;
import dev.hucoo.component.storage.config.StorageProperties;
import dev.hucoo.file.api.dto.FileObjectDTO;
import dev.hucoo.file.application.support.FileAuditSupport;
import dev.hucoo.file.config.FileModuleProperties;
import dev.hucoo.file.domain.entity.FileObject;
import dev.hucoo.file.domain.enums.FileScanStatus;
import dev.hucoo.file.domain.enums.FileSource;
import dev.hucoo.file.domain.enums.FileStatus;
import dev.hucoo.file.domain.enums.FileVisibility;
import dev.hucoo.file.domain.service.StorageKeyGenerator;

/**
 * 上传应用服务（服务端代理，两种驱动行为一致）。
 *
 * <p>流程：策略校验 → 单遍流式写入对象存储并同时计算 SHA-256 → 落元数据 → 审计。
 * 全程不把文件读进内存，也不落应用侧临时文件。
 *
 * <p>与其它模块的 Mock/持久化双实现共享：元数据存取统一走 {@link FileObjectApplicationService}，
 * 因此内存模式与数据库模式下的上传行为完全一致。
 */
@Service
public class FileUploadService {

    private static final Logger log = LoggerFactory.getLogger(FileUploadService.class);

    private final ObjectProvider<StorageClient> storageClientProvider;
    private final ObjectProvider<StorageProperties> storagePropertiesProvider;
    private final FileModuleProperties moduleProperties;
    private final FileObjectApplicationService fileObjectApplicationService;
    private final StorageKeyGenerator storageKeyGenerator;
    private final FileAuditSupport auditSupport;

    public FileUploadService(ObjectProvider<StorageClient> storageClientProvider,
                             ObjectProvider<StorageProperties> storagePropertiesProvider,
                             FileModuleProperties moduleProperties,
                             FileObjectApplicationService fileObjectApplicationService,
                             StorageKeyGenerator storageKeyGenerator,
                             FileAuditSupport auditSupport) {
        this.storageClientProvider = storageClientProvider;
        this.storagePropertiesProvider = storagePropertiesProvider;
        this.moduleProperties = moduleProperties;
        this.fileObjectApplicationService = fileObjectApplicationService;
        this.storageKeyGenerator = storageKeyGenerator;
        this.auditSupport = auditSupport;
    }

    public FileObjectDTO upload(FileUploadCommand command) {
        validate(command);
        StorageClient storageClient = requireStorageClient();
        StorageProperties storageProperties = storagePropertiesProvider.getIfAvailable(StorageProperties::new);

        String fileName = StringUtil.isBlank(command.fileName()) ? "unnamed" : command.fileName();
        String extension = storageKeyGenerator.resolveExtension(fileName);
        String tenantId = CurrentTenantContext.getTenantId();
        String bucket = storageProperties.getDefaultBucket();
        String objectKey = storageKeyGenerator.generate(tenantId, command.bizType(), fileName);

        MessageDigest digest = sha256();
        try (InputStream content = new DigestInputStream(command.content(), digest)) {
            storageClient.put(StoragePutRequest.of(bucket, objectKey, command.contentType(), command.contentLength()),
                    content);
        } catch (StorageException e) {
            auditSupport.publish("FILE_UPLOAD", objectKey, 0);
            throw e;
        } catch (java.io.IOException e) {
            throw new StorageException(StorageErrorCode.STORAGE_IO_FAILED, "上传流读取失败: " + fileName, e);
        }

        FileObject entity = new FileObject();
        entity.setStorageType(storageClient.provider().toUpperCase());
        entity.setBucketName(bucket);
        entity.setObjectKey(objectKey);
        entity.setFileName(fileName);
        entity.setDisplayName(StringUtil.isBlank(command.displayName()) ? fileName : command.displayName());
        entity.setExtension(extension);
        entity.setContentType(command.contentType());
        entity.setSizeBytes(command.contentLength());
        entity.setSha256(HexFormat.of().formatHex(digest.digest()));
        entity.setVisibility(resolveVisibility(command.visibility()));
        entity.setStatus(FileStatus.NORMAL.name());
        entity.setScanStatus(FileScanStatus.SKIPPED.name());
        entity.setBizType(command.bizType());
        entity.setBizId(command.bizId());
        entity.setOwnerId(CurrentUserContext.userId());
        entity.setOwnerName(CurrentUserContext.username());
        entity.setSource(StringUtil.isBlank(command.source()) ? FileSource.UPLOAD.name() : command.source());
        entity.setRefCount(1);
        entity.setDownloadCount(0L);

        fileObjectApplicationService.save(entity);
        auditSupport.publish("FILE_UPLOAD", String.valueOf(entity.getId()), 1);
        log.info("file uploaded: id={}, key={}, size={}, provider={}",
                entity.getId(), objectKey, command.contentLength(), storageClient.provider());
        return fileObjectApplicationService.converter().toDto(entity);
    }

    private void validate(FileUploadCommand command) {
        if (command.content() == null) {
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "上传内容不能为空");
        }
        if (command.contentLength() < 0) {
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "上传内容长度未知，无法流式写入");
        }
        long limit = Math.min(moduleProperties.maxFileSizeBytes(),
                storagePropertiesProvider.getIfAvailable(StorageProperties::new).maxFileSizeBytes());
        if (command.contentLength() > limit) {
            throw new BusinessException(CommonErrorCode.FILE_TOO_LARGE,
                    "文件大小 %d 字节超过上限 %d 字节".formatted(command.contentLength(), limit));
        }
        String extension = storageKeyGenerator.resolveExtension(command.fileName());
        if (!moduleProperties.isExtensionAllowed(extension)) {
            throw new BusinessException(CommonErrorCode.FILE_TYPE_NOT_ALLOWED,
                    "文件类型不允许上传: " + extension);
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

    private static String resolveVisibility(String visibility) {
        FileVisibility resolved = FileVisibility.of(visibility);
        return resolved == null ? FileVisibility.PRIVATE.name() : resolved.name();
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    /** 便于其它模块判断当前是否具备上传能力。 */
    public boolean storageAvailable() {
        return storageClientProvider.getIfAvailable() != null;
    }

    /** 当前驱动标识，用于审计与诊断。 */
    public String provider() {
        StorageClient client = storageClientProvider.getIfAvailable();
        return client == null ? "none" : client.provider();
    }
}

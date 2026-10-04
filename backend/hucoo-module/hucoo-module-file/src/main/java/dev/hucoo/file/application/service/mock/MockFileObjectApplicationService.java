package dev.hucoo.file.application.service.mock;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.util.IdGenerator;
import dev.hucoo.commons.util.StringUtil;
import dev.hucoo.file.api.dto.FileObjectDTO;
import dev.hucoo.file.api.dto.FileObjectQueryRequest;
import dev.hucoo.file.application.converter.FileObjectConverter;
import dev.hucoo.file.application.service.FileObjectApplicationService;
import dev.hucoo.file.domain.entity.FileObject;
import dev.hucoo.file.domain.enums.FileScanStatus;
import dev.hucoo.file.domain.enums.FileSource;
import dev.hucoo.file.domain.enums.FileStatus;
import dev.hucoo.file.domain.enums.FileVisibility;
import dev.hucoo.file.infrastructure.mapper.FileObjectMapper;

/**
 * 内存实现（{@code agent-platform.persistence.enabled=false}，默认）。
 *
 * <p>元数据放在内存里，示例数据的对象内容并不存在，因此示例文件不可下载；
 * 上传产生的文件会真实写入 {@code StorageClient}，本地 profile 下走本地目录，可端到端验证。
 */
@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled",
        havingValue = "false", matchIfMissing = true)
public class MockFileObjectApplicationService extends ServiceImpl<FileObjectMapper, FileObject>
        implements FileObjectApplicationService {

    private final Map<Long, FileObject> store = new ConcurrentHashMap<>();
    private final FileObjectConverter fileObjectConverter;

    public MockFileObjectApplicationService(FileObjectConverter fileObjectConverter) {
        this.fileObjectConverter = fileObjectConverter;
        seed();
    }

    @Override
    public FileObjectConverter converter() {
        return fileObjectConverter;
    }

    private void seed() {
        seedOne("需求说明书.pdf", "pdf", "application/pdf", 2_048_000L, "PROJECT", "1001");
        seedOne("架构设计.docx", "docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                512_000L, "AGENT_TEMPLATE", "2001");
        seedOne("账单导出-2026-09.xlsx", "xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                128_000L, "BILLING_EXPORT", "3001");
    }

    private void seedOne(String fileName, String extension, String contentType, long size,
                         String bizType, String bizId) {
        FileObject sample = new FileObject();
        sample.setId(IdGenerator.nextId());
        sample.setTenantId(PlatformConstants.SYSTEM_TENANT_ID);
        sample.setStorageType("LOCAL");
        sample.setBucketName("hucoo-files");
        sample.setObjectKey("files/%s/%s/demo/%d.%s".formatted(PlatformConstants.SYSTEM_TENANT_ID,
                bizType, sample.getId(), extension));
        sample.setFileName(fileName);
        sample.setDisplayName(fileName);
        sample.setExtension(extension);
        sample.setContentType(contentType);
        sample.setSizeBytes(size);
        sample.setVisibility(FileVisibility.PRIVATE.name());
        sample.setStatus(FileStatus.NORMAL.name());
        sample.setScanStatus(FileScanStatus.SKIPPED.name());
        sample.setBizType(bizType);
        sample.setBizId(bizId);
        sample.setOwnerId(1001L);
        sample.setOwnerName("admin");
        sample.setSource(FileSource.UPLOAD.name());
        sample.setRefCount(1);
        sample.setDownloadCount(0L);
        sample.setCreatedAt(LocalDateTime.now().minusDays(1));
        sample.setUpdatedAt(LocalDateTime.now().minusDays(1));
        sample.setDeleted(0);
        sample.setVersion(0);
        store.put(sample.getId(), sample);
    }

    @Override
    public List<FileObject> list() {
        return new ArrayList<>(store.values());
    }

    @Override
    public FileObject getById(Serializable id) {
        return id == null ? null : store.get(Long.valueOf(String.valueOf(id)));
    }

    @Override
    public boolean save(FileObject entity) {
        if (entity.getId() == null) {
            entity.setId(IdGenerator.nextId());
        }
        if (entity.getTenantId() == null) {
            entity.setTenantId(PlatformConstants.SYSTEM_TENANT_ID);
        }
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());
        entity.setDeleted(0);
        entity.setVersion(entity.getVersion() == null ? 0 : entity.getVersion());
        store.put(entity.getId(), entity);
        return true;
    }

    @Override
    public boolean updateById(FileObject entity) {
        if (entity.getId() == null || !store.containsKey(entity.getId())) {
            return false;
        }
        entity.setUpdatedAt(LocalDateTime.now());
        store.put(entity.getId(), entity);
        return true;
    }

    @Override
    public boolean removeById(Serializable id) {
        return id != null && store.remove(Long.valueOf(String.valueOf(id))) != null;
    }

    @Override
    public long count() {
        return store.size();
    }

    @Override
    public <E extends IPage<FileObject>> E page(E page) {
        List<FileObject> all = list().stream()
                .sorted(Comparator.comparing(FileObject::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        long current = page.getCurrent();
        long size = page.getSize();
        int from = (int) Math.max(0L, (current - 1) * size);
        int to = (int) Math.min(all.size(), from + size);
        page.setTotal(all.size());
        page.setRecords(from >= all.size() ? List.of() : all.subList(from, to));
        return page;
    }

    @Override
    public PageResult<FileObjectDTO> pageDtos(FileObjectQueryRequest request) {
        List<FileObject> matched = list().stream()
                .filter(entity -> matches(entity, request))
                .sorted(Comparator.comparing(FileObject::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        long pageNum = request.resolvePageNum();
        long pageSize = request.resolvePageSize();
        int from = (int) Math.max(0L, (pageNum - 1) * pageSize);
        int to = (int) Math.min(matched.size(), from + pageSize);
        List<FileObjectDTO> items = (from >= matched.size() ? List.<FileObject>of() : matched.subList(from, to))
                .stream().map(fileObjectConverter::toDto).toList();
        return PageResult.of(items, matched.size(), pageNum, pageSize);
    }

    private static boolean matches(FileObject entity, FileObjectQueryRequest request) {
        String keyword = request.getKeyword();
        if (StringUtil.isNotBlank(keyword)) {
            boolean hit = contains(entity.getFileName(), keyword)
                    || contains(entity.getDisplayName(), keyword)
                    || contains(entity.getObjectKey(), keyword);
            if (!hit) {
                return false;
            }
        }
        return equalsIfPresent(entity.getExtension(), request.getExtension())
                && equalsIfPresent(entity.getBizType(), request.getBizType())
                && equalsIfPresent(entity.getBizId(), request.getBizId())
                && equalsIfPresent(entity.getStatus(), request.getStatus())
                && equalsIfPresent(entity.getVisibility(), request.getVisibility())
                && equalsIfPresent(entity.getStorageType(), request.getStorageType())
                && (request.getOwnerId() == null || request.getOwnerId().equals(entity.getOwnerId()))
                && (request.getMinSize() == null || entity.getSizeBytes() >= request.getMinSize())
                && (request.getMaxSize() == null || entity.getSizeBytes() <= request.getMaxSize())
                && (request.getCreatedFrom() == null || !entity.getCreatedAt().isBefore(request.getCreatedFrom()))
                && (request.getCreatedTo() == null || !entity.getCreatedAt().isAfter(request.getCreatedTo()));
    }

    private static boolean contains(String value, String keyword) {
        return value != null && value.toLowerCase().contains(keyword.toLowerCase());
    }

    private static boolean equalsIfPresent(String value, String expected) {
        return StringUtil.isBlank(expected) || expected.equalsIgnoreCase(value);
    }

    /** 内存模式下所有单据都在同一个"租户"视角里，匿名查询与普通查询等价。 */
    @Override
    public FileObjectDTO getDtoIgnoreTenant(Long id) {
        return getDto(id);
    }
}

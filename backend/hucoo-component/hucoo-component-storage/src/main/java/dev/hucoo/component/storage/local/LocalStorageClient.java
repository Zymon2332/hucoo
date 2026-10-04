package dev.hucoo.component.storage.local;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.nio.file.attribute.PosixFilePermission;
import java.security.DigestOutputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import dev.hucoo.component.storage.PresignedUrl;
import dev.hucoo.component.storage.StorageCapabilities;
import dev.hucoo.component.storage.StorageClient;
import dev.hucoo.component.storage.StorageErrorCode;
import dev.hucoo.component.storage.StorageException;
import dev.hucoo.component.storage.StorageListResult;
import dev.hucoo.component.storage.StorageMultipartInit;
import dev.hucoo.component.storage.StorageObjectMetadata;
import dev.hucoo.component.storage.StoragePartRef;
import dev.hucoo.component.storage.StoragePartResult;
import dev.hucoo.component.storage.StoragePutRequest;

/**
 * 本地文件系统驱动。
 *
 * <p>写入采用「同目录临时文件 + 原子搬迁」，避免读到半成品文件；分片上传用
 * {@code {root}/.uploads/{uploadId}/} 临时目录，语义与 S3 分片保持一致。
 */
public class LocalStorageClient implements StorageClient {

    private static final Logger log = LoggerFactory.getLogger(LocalStorageClient.class);

    private static final Set<PosixFilePermission> FILE_PERMISSIONS = Set.of(
            PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE);
    private static final Set<PosixFilePermission> DIR_PERMISSIONS = Set.of(
            PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE, PosixFilePermission.OWNER_EXECUTE);

    private final LocalStorageProperties properties;
    private final LocalStoragePathResolver resolver;

    public LocalStorageClient(LocalStorageProperties properties) {
        this.properties = properties;
        Path root = properties.resolveRoot();
        if (properties.isCreateDirs()) {
            createDirectories(root);
        }
        // 先建目录再构造解析器：真实路径需要在根目录存在（或可达）时解析
        this.resolver = new LocalStoragePathResolver(root);
        log.info("local storage initialized: root={}", resolver.root());
    }

    public LocalStoragePathResolver resolver() {
        return resolver;
    }

    @Override
    public String provider() {
        return "local";
    }

    @Override
    public StorageCapabilities capabilities() {
        return StorageCapabilities.LOCAL;
    }

    @Override
    public void put(StoragePutRequest request, InputStream content) {
        Path target = resolver.resolve(request.bucket(), request.key());
        createDirectories(target.getParent());
        Path temp = target.resolveSibling("." + target.getFileName() + ".tmp");
        long written = 0L;
        try {
            try (FileChannel channel = FileChannel.open(temp, StandardOpenOption.CREATE,
                    StandardOpenOption.WRITE, StandardOpenOption.TRUNCATE_EXISTING);
                 OutputStream out = java.nio.channels.Channels.newOutputStream(channel)) {
                written = content.transferTo(out);
                out.flush();
                channel.force(true);
            }
            if (request.contentLength() >= 0 && written != request.contentLength()) {
                throw StorageException.ioFailed("写入字节数与声明长度不一致: 期望 %d, 实际 %d"
                        .formatted(request.contentLength(), written), null);
            }
            applyPermissions(temp, FILE_PERMISSIONS);
            moveAtomically(temp, target);
        } catch (IOException e) {
            deleteQuietly(temp);
            throw StorageException.ioFailed("写入本地对象失败: " + target, e);
        }
    }

    @Override
    public StorageObjectMetadata stat(String bucket, String key) {
        Path target = resolver.resolve(bucket, key);
        if (!Files.isRegularFile(target)) {
            throw StorageException.notFound(bucket, key);
        }
        try {
            BasicFileAttributes attributes = Files.readAttributes(target, BasicFileAttributes.class);
            return new StorageObjectMetadata(bucket, key, attributes.size(), probeContentType(target),
                    etag(attributes), attributes.lastModifiedTime().toInstant(), Map.of());
        } catch (IOException e) {
            throw StorageException.ioFailed("读取本地对象元信息失败: " + target, e);
        }
    }

    @Override
    public boolean exists(String bucket, String key) {
        return Files.isRegularFile(resolver.resolve(bucket, key));
    }

    @Override
    public InputStream get(String bucket, String key) {
        Path target = resolver.resolve(bucket, key);
        if (!Files.isRegularFile(target)) {
            throw StorageException.notFound(bucket, key);
        }
        try {
            return Files.newInputStream(target, StandardOpenOption.READ);
        } catch (IOException e) {
            throw StorageException.ioFailed("读取本地对象失败: " + target, e);
        }
    }

    @Override
    public void get(String bucket, String key, OutputStream target) {
        Path path = resolver.resolve(bucket, key);
        if (!Files.isRegularFile(path)) {
            throw StorageException.notFound(bucket, key);
        }
        try {
            Files.copy(path, target);
            target.flush();
        } catch (IOException e) {
            throw StorageException.ioFailed("写出本地对象失败: " + path, e);
        }
    }

    @Override
    public void delete(String bucket, String key) {
        Path target = resolver.resolve(bucket, key);
        try {
            Files.deleteIfExists(target);
            if (properties.isCleanEmptyDirs()) {
                cleanEmptyParents(target.getParent(), resolver.root().resolve(bucket));
            }
        } catch (IOException e) {
            throw StorageException.ioFailed("删除本地对象失败: " + target, e);
        }
    }

    @Override
    public StorageListResult list(String bucket, String prefix, String continuationToken, int limit) {
        Path bucketRoot = resolver.root().resolve(bucket);
        if (!Files.isDirectory(bucketRoot)) {
            return StorageListResult.empty();
        }
        int effectiveLimit = limit <= 0 ? 100 : limit;
        Path base = prefix == null || prefix.isBlank() ? bucketRoot : resolver.resolve(bucket, prefix);
        if (!Files.isDirectory(base)) {
            base = base.getParent();
        }
        if (base == null || !Files.isDirectory(base)) {
            return StorageListResult.empty();
        }
        List<StorageListResult.StorageObjectSummary> items = new ArrayList<>();
        String nextToken = null;
        try (Stream<Path> stream = Files.walk(base)) {
            List<Path> files = stream
                    .filter(Files::isRegularFile)
                    .filter(path -> !path.getFileName().toString().startsWith("."))
                    .filter(path -> !path.startsWith(resolver.root().resolve(properties.getTempDir())))
                    .sorted(Comparator.comparing(Path::toString))
                    .toList();
            for (Path file : files) {
                String objectKey = bucketRoot.relativize(file).toString().replace('\\', '/');
                if (prefix != null && !prefix.isBlank() && !objectKey.startsWith(prefix)) {
                    continue;
                }
                if (continuationToken != null && !continuationToken.isBlank()
                        && objectKey.compareTo(continuationToken) <= 0) {
                    continue;
                }
                if (items.size() >= effectiveLimit) {
                    nextToken = items.get(items.size() - 1).key();
                    break;
                }
                BasicFileAttributes attributes = Files.readAttributes(file, BasicFileAttributes.class);
                items.add(new StorageListResult.StorageObjectSummary(objectKey, attributes.size(),
                        etag(attributes), attributes.lastModifiedTime().toInstant()));
            }
        } catch (IOException e) {
            throw StorageException.ioFailed("列举本地对象失败: " + bucket, e);
        }
        return new StorageListResult(items, nextToken);
    }

    @Override
    public PresignedUrl presignGet(String bucket, String key, Duration ttl, String downloadFileName) {
        throw StorageException.unsupported("本地存储驱动不支持预签名下载，请使用后端签名代理下载");
    }

    @Override
    public PresignedUrl presignPut(String bucket, String key, Duration ttl, String contentType) {
        throw StorageException.unsupported("本地存储驱动不支持预签名上传，请使用服务端代理上传");
    }

    @Override
    public String initMultipart(StorageMultipartInit request) {
        resolver.validateBucket(request.bucket());
        resolver.validateKey(request.key());
        String uploadId = java.util.UUID.randomUUID().toString().replace("-", "");
        createDirectories(resolver.tempDir(properties.getTempDir(), uploadId));
        return uploadId;
    }

    @Override
    public StoragePartResult uploadPart(String bucket, String key, String uploadId,
                                        int partNumber, InputStream content, long contentLength) {
        if (partNumber < 1) {
            throw StorageException.invalidKey("分片序号非法: " + partNumber);
        }
        Path partFile = resolver.tempDir(properties.getTempDir(), uploadId).resolve(partNumber + ".part");
        createDirectories(partFile.getParent());
        long written = 0L;
        try (OutputStream out = Files.newOutputStream(partFile, StandardOpenOption.CREATE,
                StandardOpenOption.WRITE, StandardOpenOption.TRUNCATE_EXISTING)) {
            written = content.transferTo(out);
            out.flush();
        } catch (IOException e) {
            throw StorageException.ioFailed("写入分片失败: " + partFile, e);
        }
        if (contentLength >= 0 && written != contentLength) {
            throw StorageException.ioFailed("分片字节数与声明长度不一致: 期望 %d, 实际 %d"
                    .formatted(contentLength, written), null);
        }
        return new StoragePartResult(partNumber, partEtag(partFile, written), written);
    }

    @Override
    public StorageObjectMetadata completeMultipart(String bucket, String key, String uploadId,
                                                   List<StoragePartRef> parts) {
        Path target = resolver.resolve(bucket, key);
        createDirectories(target.getParent());
        Path temp = target.resolveSibling("." + target.getFileName() + ".merge");
        Path uploadDir = resolver.tempDir(properties.getTempDir(), uploadId);
        MessageDigest digest = sha256();
        long total = 0L;
        List<StoragePartRef> ordered = parts == null ? List.of() : parts.stream()
                .sorted(Comparator.comparingInt(StoragePartRef::partNumber))
                .toList();
        try {
            try (OutputStream fileOut = Files.newOutputStream(temp, StandardOpenOption.CREATE,
                    StandardOpenOption.WRITE, StandardOpenOption.TRUNCATE_EXISTING);
                 DigestOutputStream digestOut = new DigestOutputStream(fileOut, digest)) {
                for (StoragePartRef part : ordered) {
                    Path partFile = uploadDir.resolve(part.partNumber() + ".part");
                    if (!Files.isRegularFile(partFile)) {
                        throw new StorageException(StorageErrorCode.STORAGE_IO_FAILED,
                                "分片缺失: " + part.partNumber());
                    }
                    total += Files.copy(partFile, digestOut);
                }
                digestOut.flush();
            }
            if (total <= 0) {
                throw new StorageException(StorageErrorCode.STORAGE_IO_FAILED, "合并分片失败: 没有可用分片");
            }
            applyPermissions(temp, FILE_PERMISSIONS);
            moveAtomically(temp, target);
            deleteRecursively(uploadDir);
            BasicFileAttributes attributes = Files.readAttributes(target, BasicFileAttributes.class);
            return new StorageObjectMetadata(bucket, key, attributes.size(), probeContentType(target),
                    etag(attributes), attributes.lastModifiedTime().toInstant(),
                    Map.of("sha256", HexFormat.of().formatHex(digest.digest())));
        } catch (IOException e) {
            deleteQuietly(temp);
            throw StorageException.ioFailed("合并分片失败: " + target, e);
        }
    }

    @Override
    public void abortMultipart(String bucket, String key, String uploadId) {
        deleteRecursively(resolver.tempDir(properties.getTempDir(), uploadId));
    }

    @Override
    public void ensureBucket(String bucket) {
        resolver.validateBucket(bucket);
        createDirectories(resolver.root().resolve(bucket));
    }

    @Override
    public void deleteBucket(String bucket) {
        resolver.validateBucket(bucket);
        deleteRecursively(resolver.root().resolve(bucket));
    }

    // ------------------------------------------------------------------

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private static String partEtag(Path partFile, long size) {
        try (InputStream in = Files.newInputStream(partFile)) {
            MessageDigest digest = sha256();
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
            return HexFormat.of().formatHex(digest.digest()).substring(0, 32);
        } catch (IOException e) {
            throw StorageException.ioFailed("计算分片摘要失败: " + partFile, e);
        }
    }

    private static String etag(BasicFileAttributes attributes) {
        return "%x-%x".formatted(attributes.size(), attributes.lastModifiedTime().toMillis());
    }

    private static String probeContentType(Path path) {
        try {
            return Files.probeContentType(path);
        } catch (IOException e) {
            return null;
        }
    }

    private void createDirectories(Path dir) {
        if (dir == null) {
            return;
        }
        try {
            Files.createDirectories(dir);
            applyPermissions(dir, DIR_PERMISSIONS);
        } catch (IOException e) {
            throw StorageException.ioFailed("创建本地存储目录失败: " + dir, e);
        }
    }

    private void moveAtomically(Path source, Path target) throws IOException {
        try {
            Files.move(source, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
        } catch (java.nio.file.AtomicMoveNotSupportedException e) {
            Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private static void applyPermissions(Path path, Set<PosixFilePermission> permissions) {
        try {
            if (Files.getFileStore(path).supportsFileAttributeView(java.nio.file.attribute.PosixFileAttributeView.class)) {
                Files.setPosixFilePermissions(path, permissions);
            }
        } catch (IOException | UnsupportedOperationException e) {
            // 非 POSIX 文件系统（Windows）忽略即可
        }
    }

    private void cleanEmptyParents(Path dir, Path stopAt) {
        Path current = dir;
        while (current != null && current.startsWith(stopAt) && !current.equals(stopAt)) {
            try (Stream<Path> children = Files.list(current)) {
                if (children.findAny().isPresent()) {
                    return;
                }
            } catch (IOException e) {
                return;
            }
            try {
                Files.deleteIfExists(current);
            } catch (IOException e) {
                return;
            }
            current = current.getParent();
        }
    }

    private void deleteRecursively(Path dir) {
        if (dir == null || !Files.exists(dir)) {
            return;
        }
        try (Stream<Path> stream = Files.walk(dir)) {
            List<Path> paths = stream.sorted(Comparator.reverseOrder()).toList();
            for (Path path : paths) {
                Files.deleteIfExists(path);
            }
        } catch (IOException e) {
            log.warn("clean local storage directory failed: {}", dir, e);
        }
    }

    private void deleteQuietly(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.debug("delete temp file failed: {}", path, e);
        }
    }

    /** 供维护任务使用：暴露根目录下的临时分片目录。 */
    public Path tempRoot() {
        return resolver.root().resolve(properties.getTempDir());
    }

    /** 供维护任务使用：列出临时分片目录下的会话。 */
    public List<String> listMultipartSessions() {
        Path temp = tempRoot();
        if (!Files.isDirectory(temp)) {
            return List.of();
        }
        try (Stream<Path> stream = Files.list(temp)) {
            return stream.filter(Files::isDirectory).map(path -> path.getFileName().toString()).sorted().toList();
        } catch (IOException e) {
            return List.of();
        }
    }

    /** 供维护任务使用：临时会话的最后修改时间。 */
    public Instant sessionLastModified(String uploadId) {
        try {
            return Files.getLastModifiedTime(resolver.tempDir(properties.getTempDir(), uploadId)).toInstant();
        } catch (IOException e) {
            return Instant.EPOCH;
        }
    }
}

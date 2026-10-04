package dev.hucoo.component.storage.local;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.regex.Pattern;

import dev.hucoo.component.storage.StorageException;

/**
 * 本地存储路径解析与越权防护。
 *
 * <p>对象 key 完全由服务端生成，但仍按不可信输入处理：拒绝 {@code ..}、绝对路径、控制字符与
 * 反斜杠，归一化后必须落在 root 之内；对已存在的路径再用 {@code toRealPath()} 复核一次，
 * 防止符号链接逃逸。
 */
public class LocalStoragePathResolver {

    private static final Pattern BUCKET_PATTERN = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]{0,127}");
    private static final int MAX_KEY_LENGTH = 512;

    private final Path root;
    private final Path realRoot;

    public LocalStoragePathResolver(Path root) {
        this.root = root.toAbsolutePath().normalize();
        this.realRoot = resolveRealRoot(this.root);
    }

    /**
     * 计算根目录的真实路径。
     *
     * <p>根目录可能尚不存在（首次启动），此时不能直接对根目录取 realPath，
     * 而要向上找到最近的存在祖先再拼回剩余层级。否则在 macOS 这类
     * {@code /var -> /private/var} 的符号链接环境下，no-follow 的根路径与
     * 解析后的真实路径前缀不一致，会把所有访问误判为越权。
     */
    private static Path resolveRealRoot(Path root) {
        Path current = root;
        Path remainder = null;
        while (current != null && !Files.exists(current, LinkOption.NOFOLLOW_LINKS)) {
            Path name = current.getFileName();
            remainder = remainder == null ? name : name.resolve(remainder);
            current = current.getParent();
        }
        if (current == null) {
            return root;
        }
        try {
            Path real = current.toRealPath();
            return remainder == null ? real : real.resolve(remainder);
        } catch (IOException e) {
            return root;
        }
    }

    public Path root() {
        return root;
    }

    /** 解析对象在磁盘上的绝对路径。 */
    public Path resolve(String bucket, String key) {
        validateBucket(bucket);
        validateKey(key);
        Path target = root.resolve(bucket).resolve(key).normalize();
        if (!target.startsWith(root)) {
            throw StorageException.invalidKey(key);
        }
        assertNoSymlinkEscape(target);
        return target;
    }

    /** 分片上传的临时目录。 */
    public Path tempDir(String tempDirName, String uploadId) {
        validateKey(uploadId);
        Path dir = root.resolve(tempDirName).resolve(uploadId).normalize();
        if (!dir.startsWith(root)) {
            throw StorageException.invalidKey(uploadId);
        }
        return dir;
    }

    public void validateBucket(String bucket) {
        if (bucket == null || !BUCKET_PATTERN.matcher(bucket).matches() || bucket.contains("..")) {
            throw StorageException.invalidKey(String.valueOf(bucket));
        }
    }

    public void validateKey(String key) {
        if (key == null || key.isBlank() || key.length() > MAX_KEY_LENGTH) {
            throw StorageException.invalidKey(String.valueOf(key));
        }
        if (key.startsWith("/") || key.startsWith("\\") || key.contains("\\")
                || key.contains("..") || key.indexOf('\0') >= 0) {
            throw StorageException.invalidKey(key);
        }
        for (int i = 0; i < key.length(); i++) {
            char c = key.charAt(i);
            if (c < 0x20 || c == 0x7f) {
                throw StorageException.invalidKey(key);
            }
        }
    }

    /**
     * 逐级检查 root 之下已存在的路径组件：只要某个组件是符号链接且解析后落在 root 之外就拒绝。
     *
     * <p>只在「存在」的组件上做 realPath 校验：根目录或中间目录尚未创建时不存在逃逸面，
     * 直接跳过即可，否则会把首次启动的正常写入误判为越权。
     */
    private void assertNoSymlinkEscape(Path target) {
        Path current = root;
        for (Path name : root.relativize(target)) {
            current = current.resolve(name);
            if (!Files.exists(current, LinkOption.NOFOLLOW_LINKS)) {
                return;
            }
            if (!Files.isSymbolicLink(current)) {
                continue;
            }
            try {
                if (!current.toRealPath().startsWith(realRoot)) {
                    throw StorageException.invalidKey(target.toString());
                }
            } catch (IOException e) {
                throw StorageException.ioFailed("解析本地存储路径失败: " + target, e);
            }
        }
    }
}

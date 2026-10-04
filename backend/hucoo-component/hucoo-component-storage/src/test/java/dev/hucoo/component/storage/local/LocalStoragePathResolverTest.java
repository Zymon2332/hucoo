package dev.hucoo.component.storage.local;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import dev.hucoo.component.storage.StorageException;
import dev.hucoo.component.test.BaseUnitTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LocalStoragePathResolverTest extends BaseUnitTest {

    @TempDir
    Path root;

    private LocalStoragePathResolver resolver() {
        return new LocalStoragePathResolver(root);
    }

    @Test
    void shouldResolveKeyUnderRoot() {
        Path resolved = resolver().resolve("hucoo-files", "files/000000/2026/10/02/a.txt");
        assertTrue(resolved.startsWith(root.toAbsolutePath().normalize()));
        assertEquals("a.txt", resolved.getFileName().toString());
    }

    @Test
    void shouldRejectParentTraversal() {
        assertThrows(StorageException.class, () -> resolver().resolve("hucoo-files", "../escape.txt"));
        assertThrows(StorageException.class, () -> resolver().resolve("hucoo-files", "a/../../escape.txt"));
    }

    @Test
    void shouldRejectAbsolutePathAndBackslash() {
        assertThrows(StorageException.class, () -> resolver().resolve("hucoo-files", "/etc/passwd"));
        assertThrows(StorageException.class, () -> resolver().resolve("hucoo-files", "a\\b.txt"));
    }

    @Test
    void shouldRejectControlCharactersAndBlank() {
        assertThrows(StorageException.class, () -> resolver().resolve("hucoo-files", "a\u0000b.txt"));
        assertThrows(StorageException.class, () -> resolver().resolve("hucoo-files", "a\nb.txt"));
        assertThrows(StorageException.class, () -> resolver().resolve("hucoo-files", "   "));
        assertThrows(StorageException.class, () -> resolver().resolve("hucoo-files", null));
    }

    @Test
    void shouldRejectInvalidBucket() {
        assertThrows(StorageException.class, () -> resolver().resolve("../etc", "a.txt"));
        assertThrows(StorageException.class, () -> resolver().resolve("a/b", "a.txt"));
        assertThrows(StorageException.class, () -> resolver().resolve("", "a.txt"));
    }

    @Test
    void shouldRejectSymlinkEscape() throws IOException {
        Path outside = Files.createTempDirectory("hucoo-outside");
        Path link = root.resolve("hucoo-files").resolve("link");
        Files.createDirectories(link.getParent());
        Files.createSymbolicLink(link, outside);
        try {
            assertThrows(StorageException.class, () -> resolver().resolve("hucoo-files", "link/evil.txt"));
        } finally {
            Files.deleteIfExists(link);
            Files.deleteIfExists(outside);
        }
    }

    @Test
    void shouldResolveRootThatDoesNotExistYetUnderSymlinkedParent() throws IOException {
        Path real = Files.createTempDirectory("hucoo-real");
        Path linkParent = Files.createTempDirectory("hucoo-link-parent");
        Path link = linkParent.resolve("link");
        Files.createSymbolicLink(link, real);
        Path absentRoot = link.resolve("nested/root");
        try {
            LocalStoragePathResolver resolver = new LocalStoragePathResolver(absentRoot);
            Path resolved = resolver.resolve("hucoo-files", "a/b.txt");
            assertTrue(resolved.startsWith(absentRoot), () -> "resolved=" + resolved);

            LocalStorageProperties properties = new LocalStorageProperties();
            properties.setRoot(absentRoot.toString());
            LocalStorageClient client = new LocalStorageClient(properties);
            byte[] payload = "hello".getBytes(java.nio.charset.StandardCharsets.UTF_8);
            client.put(dev.hucoo.component.storage.StoragePutRequest.of("hucoo-files", "a/b.txt", "text/plain",
                    payload.length), new java.io.ByteArrayInputStream(payload));
            assertTrue(client.exists("hucoo-files", "a/b.txt"));
        } finally {
            Files.deleteIfExists(link);
            Files.deleteIfExists(linkParent);
            deleteRecursively(real);
        }
    }

    private static void deleteRecursively(Path dir) throws IOException {
        if (!Files.exists(dir)) {
            return;
        }
        try (java.util.stream.Stream<Path> stream = Files.walk(dir)) {
            for (Path path : stream.sorted(java.util.Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(path);
            }
        }
    }
}

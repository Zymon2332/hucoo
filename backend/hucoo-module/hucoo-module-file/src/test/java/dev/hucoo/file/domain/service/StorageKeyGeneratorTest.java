package dev.hucoo.file.domain.service;

import org.junit.jupiter.api.Test;

import dev.hucoo.component.storage.config.StorageProperties;
import dev.hucoo.component.test.BaseUnitTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StorageKeyGeneratorTest extends BaseUnitTest {

    private final StorageKeyGenerator generator = new StorageKeyGenerator(new StorageProperties());

    @Test
    void shouldGenerateKeyWithTenantBizTypeDateAndExtension() {
        String key = generator.generate("000000", "PROJECT", "报表.xlsx");
        assertTrue(key.startsWith("files/000000/PROJECT/"), key);
        assertTrue(key.endsWith(".xlsx"), key);
        assertTrue(key.matches("files/000000/PROJECT/\\d{4}/\\d{2}/\\d{2}/[0-9a-f]{2}/\\d+\\.xlsx"), key);
    }

    @Test
    void shouldNotContainOriginalFileName() {
        String key = generator.generate("000000", null, "机密 报告 v2.pdf");
        assertFalse(key.contains("机密"), key);
        assertFalse(key.contains(" "), key);
        assertTrue(key.contains("/COMMON/"), key);
    }

    @Test
    void shouldSanitizeTenantAndBizType() {
        String key = generator.generate("../../etc", "a/b", "x.txt");
        assertFalse(key.contains(".."), key);
        assertFalse(key.contains("//"), key);
        assertTrue(key.startsWith("files/"), key);
    }

    @Test
    void shouldFallbackToBinForIllegalExtension() {
        assertEquals("bin", generator.resolveExtension("archive.tar.gz.exe "));
        assertEquals("bin", generator.resolveExtension("noext"));
        assertEquals("bin", generator.resolveExtension((String) null));
        assertEquals("bin", generator.resolveExtension("evil.p n g"));
        assertEquals("gz", generator.resolveExtension("a.TAR.GZ"));
    }

    @Test
    void shouldKeepUniqueKeysForSameInput() {
        String first = generator.generate("000000", "PROJECT", "same.txt");
        String second = generator.generate("000000", "PROJECT", "same.txt");
        assertFalse(first.equals(second), "同一文件重复上传也必须生成不同 key");
    }
}

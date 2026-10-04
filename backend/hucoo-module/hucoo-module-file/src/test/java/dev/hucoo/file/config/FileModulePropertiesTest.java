package dev.hucoo.file.config;

import org.junit.jupiter.api.Test;

import dev.hucoo.component.test.BaseUnitTest;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FileModulePropertiesTest extends BaseUnitTest {

    private final FileModuleProperties properties = new FileModuleProperties();

    @Test
    void shouldRejectBlockedExtensionEvenIfWhitelisted() {
        properties.setAllowedExtensions(java.util.List.of("exe", "txt"));
        assertFalse(properties.isExtensionAllowed("exe"));
        assertTrue(properties.isExtensionAllowed("txt"));
    }

    @Test
    void shouldAllowAnythingWhenWhitelistEmpty() {
        properties.setAllowedExtensions(java.util.List.of());
        assertTrue(properties.isExtensionAllowed("log"));
        assertFalse(properties.isExtensionAllowed("sh"));
    }

    @Test
    void shouldRejectBlankExtension() {
        assertFalse(properties.isExtensionAllowed(null));
        assertFalse(properties.isExtensionAllowed(" "));
    }

    @Test
    void shouldBeCaseInsensitive() {
        assertTrue(properties.isExtensionAllowed("PDF"));
        assertFalse(properties.isExtensionAllowed("EXE"));
    }
}

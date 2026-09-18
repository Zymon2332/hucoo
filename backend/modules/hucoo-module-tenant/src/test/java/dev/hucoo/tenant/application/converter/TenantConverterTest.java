package dev.hucoo.tenant.application.converter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.Test;

import dev.hucoo.tenant.api.dto.TenantCreateRequest;
import dev.hucoo.tenant.api.dto.TenantDTO;
import dev.hucoo.tenant.domain.entity.Tenant;

class TenantConverterTest {

    private final TenantConverter converter = new TenantConverterImpl();

    @Test
    void shouldMapEntityToDto() {
        Tenant entity = new Tenant();
        entity.setId(1001L);
        entity.setTenantCode("TENANT-001");
        entity.setTenantName("示例租户");
        entity.setStatus(1);

        TenantDTO dto = converter.toDto(entity);

        assertNotNull(dto);
        assertEquals(1001L, dto.getId());
        assertEquals("TENANT-001", dto.getTenantCode());
        assertEquals("示例租户", dto.getTenantName());
    }

    @Test
    void shouldMapCreateRequestToEntity() {
        TenantCreateRequest request = new TenantCreateRequest();
        request.setTenantCode("TENANT-002");
        request.setTenantName("新租户");
        request.setStatus(1);

        Tenant entity = converter.toEntity(request);

        assertNotNull(entity);
        assertEquals("TENANT-002", entity.getTenantCode());
        assertEquals("新租户", entity.getTenantName());
    }
}

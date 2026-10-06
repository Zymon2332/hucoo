package dev.hucoo.common.api;

import java.util.List;

import dev.hucoo.common.api.dto.DictionaryItemDTO;

/**
 * Reads effective dictionaries in the trusted current tenant context.
 */
public interface DictionaryFacade {
    List<DictionaryItemDTO> options(String code);
}

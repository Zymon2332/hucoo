package dev.hucoo.modelgovernance.client.dto;

import java.io.Serializable;
import java.util.List;

public record PublicModelCatalogDTO(String catalogVersion, String policyVersion,
                                    List<PublicModelProviderGroupDTO> providers) implements Serializable {
    public PublicModelCatalogDTO {
        providers = List.copyOf(providers);
    }
}

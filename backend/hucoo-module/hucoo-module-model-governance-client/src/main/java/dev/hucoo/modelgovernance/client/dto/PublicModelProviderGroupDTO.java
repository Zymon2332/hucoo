package dev.hucoo.modelgovernance.client.dto;

import java.io.Serializable;
import java.util.List;

public record PublicModelProviderGroupDTO(String providerCode, String providerName,
                                          List<PublicModelDTO> models) implements Serializable {
    public PublicModelProviderGroupDTO {
        models = List.copyOf(models);
    }
}

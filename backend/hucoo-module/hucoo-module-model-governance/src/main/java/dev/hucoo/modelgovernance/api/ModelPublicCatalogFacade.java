package dev.hucoo.modelgovernance.api;

import dev.hucoo.modelgovernance.api.dto.PublicModelCatalogQuery;
import dev.hucoo.modelgovernance.client.dto.PublicModelCatalogDTO;

public interface ModelPublicCatalogFacade {
    PublicModelCatalogDTO catalog(PublicModelCatalogQuery query);
}

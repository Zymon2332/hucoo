package dev.hucoo.common.api.dto;

import dev.hucoo.commons.dto.PageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;
import jakarta.validation.constraints.Size;

@Data
@EqualsAndHashCode(callSuper = true)
public class CommonQuery extends PageQuery {
    private CommonScope scope = CommonScope.TENANT;
    private Boolean enabled;
    @Size(max = 128)
    private String group;
}

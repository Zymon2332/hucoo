package dev.hucoo.identity.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PermissionMatrixRowDTO {

    private Long roleId;
    private Long permissionId;
    private Boolean granted;
}

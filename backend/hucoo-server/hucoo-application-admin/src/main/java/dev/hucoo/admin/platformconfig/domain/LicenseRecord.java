package dev.hucoo.admin.platformconfig.domain;
import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
@Data @EqualsAndHashCode(callSuper = true) @TableName("ap_license")
public class LicenseRecord extends BaseEntity {
    @TableField("license_key_ref") private String licenseKeyRef;
    @TableField("status") private String status;
    @TableField("expires_at") private java.time.LocalDateTime expiresAt;
    @TableField("seat_limit") private Integer seatLimit;
}

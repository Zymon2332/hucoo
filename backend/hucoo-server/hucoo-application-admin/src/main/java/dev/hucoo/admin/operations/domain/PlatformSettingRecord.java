package dev.hucoo.admin.operations.domain;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_platform_setting")
public class PlatformSettingRecord extends BaseEntity {
    @TableField("setting_group") private String settingGroup;
    @TableField("setting_key") private String settingKey;
    @TableField("setting_value") private String settingValue;
    @TableField("default_value") private String defaultValue;
    @TableField("version_no") private Integer versionNo;
}

package dev.hucoo.common.domain.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.TableField;
import lombok.Data;
import lombok.EqualsAndHashCode;
import dev.hucoo.common.api.dto.ConfigValueType;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "ap_common_config", autoResultMap = true)
public class SystemConfig extends CommonRecord {
    @TableField("config_key")
    private String key;
    @TableField("config_name")
    private String name;
    @TableField("config_group")
    private String group;
    @TableField("value_type")
    private ConfigValueType valueType;
    @TableField("value_json")
    private String valueJson;
}

package dev.hucoo.common.domain.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.TableField;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "ap_common_dictionary_type", autoResultMap = true)
public class DictionaryType extends CommonRecord {
    @TableField("dictionary_code")
    private String code;
    @TableField("dictionary_name")
    private String name;
}

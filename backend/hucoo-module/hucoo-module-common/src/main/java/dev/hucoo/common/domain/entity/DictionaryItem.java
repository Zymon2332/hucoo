package dev.hucoo.common.domain.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.TableField;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "ap_common_dictionary_item", autoResultMap = true)
public class DictionaryItem extends CommonRecord {
    @TableField("type_id")
    private Long typeId;
    @TableField("item_label")
    private String label;
    @TableField("item_value")
    private String value;
    @TableField("sort_order")
    private Integer sortOrder;
}

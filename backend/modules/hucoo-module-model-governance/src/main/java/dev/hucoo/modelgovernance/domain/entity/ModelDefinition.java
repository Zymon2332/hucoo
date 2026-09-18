package dev.hucoo.modelgovernance.domain.entity;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_model_definition")
public class ModelDefinition extends BaseEntity {

    private static final long serialVersionUID = 1L;

    @TableField("model_code")
    private String modelCode;

    @TableField("model_name")
    private String modelName;

    @TableField("provider")
    private String provider;

    @TableField("model_type")
    private String modelType;

    @TableField("endpoint")
    private String endpoint;

    @TableField("status")
    private Integer status;

}

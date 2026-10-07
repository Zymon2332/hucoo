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

    /** 旧版模型编码，迁移期间作为兼容查询键。 */
    @TableField("model_code")
    private String modelCode;

    /** 旧版模型展示名称。 */
    @TableField("model_name")
    private String modelName;

    /** 旧版模型提供方名称或编码。 */
    @TableField("provider")
    private String provider;

    /** 旧版模型类型，例如 CHAT、EMBEDDING。 */
    @TableField("model_type")
    private String modelType;

    /** 旧版模型服务地址。 */
    @TableField("endpoint")
    private String endpoint;

    /** 旧版模型启用状态：1 启用，0 停用。 */
    @TableField("status")
    private Integer status;

}

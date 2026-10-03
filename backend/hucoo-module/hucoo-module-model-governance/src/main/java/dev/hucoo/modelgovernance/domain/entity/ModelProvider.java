package dev.hucoo.modelgovernance.domain.entity;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_model_provider")
public class ModelProvider extends BaseEntity {
    @TableField("provider_code") private String providerCode;
    @TableField("provider_name") private String providerName;
    @TableField("endpoint") private String endpoint;
    @TableField("status") private Integer status;
}

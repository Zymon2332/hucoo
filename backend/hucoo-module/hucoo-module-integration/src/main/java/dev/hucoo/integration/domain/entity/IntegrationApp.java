package dev.hucoo.integration.domain.entity;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_integration_app")
public class IntegrationApp extends BaseEntity {

    private static final long serialVersionUID = 1L;

    @TableField("app_code")
    private String appCode;

    @TableField("app_name")
    private String appName;

    @TableField("integration_type")
    private String integrationType;

    @TableField("webhook_url")
    private String webhookUrl;

    @TableField("oauth_client_id")
    private String oauthClientId;

    @TableField("status")
    private Integer status;

}

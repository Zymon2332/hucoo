package dev.hucoo.modelgovernance.domain.entity;

import java.time.LocalDateTime;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import dev.hucoo.component.database.entity.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "ap_model_channel", autoResultMap = true)
public class ModelChannel extends BaseEntity {

    @TableField("provider_id") private Long providerId;
    @TableField("channel_code") private String channelCode;
    @TableField("channel_name") private String channelName;
    @TableField("protocol_type") private String protocolType;
    @TableField("endpoint") private String endpoint;
    @TableField(value = "base_path", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS) private String basePath;
    @TableField(value = "region", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS) private String region;
    @TableField(value = "network_zone", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS) private String networkZone;
    @TableField("auth_type") private String authType;
    @TableField(value = "protocol_config_json", typeHandler = dev.hucoo.modelgovernance.infrastructure.typehandler.PostgresJsonTypeHandler.class, updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS) private String protocolConfigJson;
    @TableField("request_timeout_ms") private Long requestTimeoutMs;
    @TableField("stream_timeout_ms") private Long streamTimeoutMs;
    @TableField(value = "network_policy_id", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS) private Long networkPolicyId;
    @TableField("status") private String status;
    @TableField("approval_status") private String approvalStatus;
    @TableField("health_status") private String healthStatus;
    @TableField(value = "last_health_checked_at", updateStrategy = com.baomidou.mybatisplus.annotation.FieldStrategy.ALWAYS) private LocalDateTime lastHealthCheckedAt;
}

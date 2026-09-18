package dev.hucoo.agent.domain.entity;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_agent_template")
public class AgentTemplate extends BaseEntity {

    private static final long serialVersionUID = 1L;

    @TableField("agent_code")
    private String agentCode;

    @TableField("agent_name")
    private String agentName;

    @TableField("category")
    private String category;

    @TableField("description")
    private String description;

    @TableField("latest_version")
    private String latestVersion;

    @TableField("review_status")
    private Integer reviewStatus;

}

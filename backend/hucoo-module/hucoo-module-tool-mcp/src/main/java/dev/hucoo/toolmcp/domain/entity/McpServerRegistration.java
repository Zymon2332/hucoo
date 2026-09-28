package dev.hucoo.toolmcp.domain.entity;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_mcp_server")
public class McpServerRegistration extends BaseEntity {

    private static final long serialVersionUID = 1L;

    @TableField("server_code")
    private String serverCode;

    @TableField("server_name")
    private String serverName;

    @TableField("endpoint")
    private String endpoint;

    @TableField("transport")
    private String transport;

    @TableField("review_status")
    private Integer reviewStatus;

    @TableField("network_policy")
    private String networkPolicy;

}

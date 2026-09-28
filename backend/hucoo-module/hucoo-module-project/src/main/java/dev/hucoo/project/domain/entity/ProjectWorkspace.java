package dev.hucoo.project.domain.entity;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_project_workspace")
public class ProjectWorkspace extends BaseEntity {

    private static final long serialVersionUID = 1L;

    @TableField("project_code")
    private String projectCode;

    @TableField("project_name")
    private String projectName;

    @TableField("owner_id")
    private Long ownerId;

    @TableField("workspace_policy")
    private String workspacePolicy;

    @TableField("repository_url")
    private String repositoryUrl;

    @TableField("status")
    private Integer status;

}

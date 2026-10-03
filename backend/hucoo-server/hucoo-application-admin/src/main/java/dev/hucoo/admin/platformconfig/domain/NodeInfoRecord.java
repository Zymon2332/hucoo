package dev.hucoo.admin.platformconfig.domain;
import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;
@Data @EqualsAndHashCode(callSuper = true) @TableName("ap_node_info")
public class NodeInfoRecord extends BaseEntity {
    @TableField("node_id") private String nodeId;
    @TableField("node_name") private String nodeName;
    @TableField("node_status") private String nodeStatus;
    @TableField("last_heartbeat") private java.time.LocalDateTime lastHeartbeat;
    @TableField("metadata_json") private String metadataJson;
}

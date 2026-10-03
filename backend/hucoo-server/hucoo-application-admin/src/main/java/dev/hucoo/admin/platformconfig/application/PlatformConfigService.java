package dev.hucoo.admin.platformconfig.application;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import dev.hucoo.admin.operations.domain.PlatformSettingRecord;
import dev.hucoo.admin.operations.infrastructure.PlatformSettingMapper;
import dev.hucoo.admin.platformconfig.domain.LicenseRecord;
import dev.hucoo.admin.platformconfig.domain.NodeInfoRecord;
import dev.hucoo.admin.platformconfig.infrastructure.LicenseMapper;
import dev.hucoo.admin.platformconfig.infrastructure.NodeInfoMapper;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.commons.util.JsonUtil;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class PlatformConfigService implements PlatformConfigFacade {
    private final PlatformSettingMapper settings;
    private final LicenseMapper licenses;
    private final NodeInfoMapper nodes;
    public PlatformConfigService(PlatformSettingMapper settings, LicenseMapper licenses, NodeInfoMapper nodes) {
        this.settings = settings; this.licenses = licenses; this.nodes = nodes;
    }
    public Map<String, Object> getGroup(String group) {
        Map<String, Object> result = new LinkedHashMap<>(); result.put("group", group);
        Map<String, Object> items = new LinkedHashMap<>();
        settings.selectList(new QueryWrapper<PlatformSettingRecord>().eq("setting_group", group)).forEach(s -> items.put(s.getSettingKey(), s.getSettingValue()));
        result.put("items", items); return result;
    }
    public Map<String, Object> license() {
        LicenseRecord l = licenses.selectList(new QueryWrapper<LicenseRecord>().orderByDesc("created_at").last("LIMIT 1")).stream().findFirst().orElse(null);
        Map<String, Object> result = new LinkedHashMap<>(); result.put("status", l == null ? "UNKNOWN" : l.getStatus());
        result.put("licenseKeyRef", l == null ? null : l.getLicenseKeyRef()); result.put("expiresAt", l == null ? null : l.getExpiresAt());
        result.put("seatLimit", l == null ? null : l.getSeatLimit()); return result;
    }
    public Map<String, Object> nodes() {
        List<Map<String, Object>> result = nodes.selectList(new QueryWrapper<NodeInfoRecord>().orderByDesc("last_heartbeat")).stream().map(this::node).toList();
        return Map.of("nodes", result);
    }
    public void update(String group, String key, Map<String, Object> value) {
        PlatformSettingRecord s = settings.selectOne(new QueryWrapper<PlatformSettingRecord>().eq("setting_group", group).eq("setting_key", key));
        if (s == null) { s = new PlatformSettingRecord(); s.setSettingGroup(group); s.setSettingKey(key); s.setDefaultValue("{}"); s.setVersionNo(1); }
        s.setSettingValue(JsonUtil.toJson(value == null ? Map.of() : value)); s.setVersionNo((s.getVersionNo() == null ? 0 : s.getVersionNo()) + 1);
        if (s.getId() == null) settings.insert(s); else settings.updateById(s);
    }
    public void restore(String group, String key) {
        PlatformSettingRecord s = settings.selectOne(new QueryWrapper<PlatformSettingRecord>().eq("setting_group", group).eq("setting_key", key));
        if (s == null) throw new ResourceNotFoundException("PlatformSetting", group + "/" + key);
        s.setSettingValue(s.getDefaultValue()); s.setVersionNo((s.getVersionNo() == null ? 0 : s.getVersionNo()) + 1); settings.updateById(s);
    }
    private Map<String, Object> node(NodeInfoRecord n) { Map<String, Object> m = new LinkedHashMap<>(); m.put("id", n.getId()); m.put("nodeId", n.getNodeId()); m.put("nodeName", n.getNodeName()); m.put("status", n.getNodeStatus()); m.put("lastHeartbeat", n.getLastHeartbeat()); m.put("metadata", n.getMetadataJson()); return m; }
}

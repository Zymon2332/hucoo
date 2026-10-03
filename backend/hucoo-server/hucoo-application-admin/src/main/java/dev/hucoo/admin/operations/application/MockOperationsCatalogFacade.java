package dev.hucoo.admin.operations.application;

import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import dev.hucoo.commons.dto.PageResult;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "false", matchIfMissing = true)
public class MockOperationsCatalogFacade implements OperationsCatalogFacade {
    public PageResult<Map<String, Object>> announcements() { return PageResult.empty(1, 20); }
    public PageResult<Map<String, Object>> tickets() { return PageResult.empty(1, 20); }
    public PageResult<Map<String, Object>> coupons() { return PageResult.empty(1, 20); }
    public void publishAnnouncement(Long id) { }
    public void addTicketMessage(Long id, Map<String, Object> request) { }
    public void activateCoupon(Long id) { }
}

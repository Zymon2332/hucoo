package dev.hucoo.admin.operations.application;

import java.util.Map;
import dev.hucoo.commons.dto.PageResult;

public interface OperationsCatalogFacade {
    PageResult<Map<String, Object>> announcements();
    PageResult<Map<String, Object>> tickets();
    PageResult<Map<String, Object>> coupons();
    void publishAnnouncement(Long id);
    void addTicketMessage(Long id, Map<String, Object> request);
    void activateCoupon(Long id);
}

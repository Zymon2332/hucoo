package dev.hucoo.admin.operations.application;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

import dev.hucoo.admin.operations.domain.AnnouncementRecord;
import dev.hucoo.admin.operations.domain.CouponRecord;
import dev.hucoo.admin.operations.domain.TicketMessageRecord;
import dev.hucoo.admin.operations.domain.TicketRecord;
import dev.hucoo.admin.operations.infrastructure.AnnouncementMapper;
import dev.hucoo.admin.operations.infrastructure.CouponMapper;
import dev.hucoo.admin.operations.infrastructure.TicketMapper;
import dev.hucoo.admin.operations.infrastructure.TicketMessageMapper;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.commons.util.JsonUtil;

@Service
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class OperationsCatalogService implements OperationsCatalogFacade {
    private final AnnouncementMapper announcements;
    private final TicketMapper tickets;
    private final TicketMessageMapper messages;
    private final CouponMapper coupons;

    public OperationsCatalogService(AnnouncementMapper announcements, TicketMapper tickets,
                                    TicketMessageMapper messages, CouponMapper coupons) {
        this.announcements = announcements;
        this.tickets = tickets;
        this.messages = messages;
        this.coupons = coupons;
    }

    public PageResult<Map<String, Object>> announcements() {
        Page<AnnouncementRecord> page = announcements.selectPage(new Page<>(1, 20), new QueryWrapper<AnnouncementRecord>()
                .orderByDesc("created_at"));
        return page(page.getRecords().stream().map(this::announcement).toList(), page.getTotal());
    }

    public PageResult<Map<String, Object>> tickets() {
        Page<TicketRecord> page = tickets.selectPage(new Page<>(1, 20), new QueryWrapper<TicketRecord>()
                .orderByDesc("created_at"));
        return page(page.getRecords().stream().map(this::ticket).toList(), page.getTotal());
    }

    public PageResult<Map<String, Object>> coupons() {
        Page<CouponRecord> page = coupons.selectPage(new Page<>(1, 20), new QueryWrapper<CouponRecord>()
                .orderByDesc("created_at"));
        return page(page.getRecords().stream().map(this::coupon).toList(), page.getTotal());
    }

    public void publishAnnouncement(Long id) {
        AnnouncementRecord record = announcements.selectById(id);
        if (record == null) throw new ResourceNotFoundException("Announcement", id);
        record.setStatus("PUBLISHED");
        record.setPublishedAt(java.time.LocalDateTime.now());
        announcements.updateById(record);
    }

    public void addTicketMessage(Long id, Map<String, Object> request) {
        if (tickets.selectById(id) == null) throw new ResourceNotFoundException("Ticket", id);
        TicketMessageRecord message = new TicketMessageRecord();
        message.setTicketId(id);
        message.setContent(String.valueOf(request == null ? "" : request.getOrDefault("content", "")));
        messages.insert(message);
    }

    public void activateCoupon(Long id) {
        CouponRecord record = coupons.selectById(id);
        if (record == null) throw new ResourceNotFoundException("Coupon", id);
        record.setStatus("ACTIVE");
        coupons.updateById(record);
    }

    private PageResult<Map<String, Object>> page(List<Map<String, Object>> items, long total) {
        return PageResult.of(items, total, 1, 20);
    }

    private Map<String, Object> announcement(AnnouncementRecord r) {
        Map<String, Object> m = base(r); m.put("title", r.getTitle()); m.put("content", r.getContent());
        m.put("status", r.getStatus()); m.put("publishedAt", r.getPublishedAt()); return m;
    }
    private Map<String, Object> ticket(TicketRecord r) {
        Map<String, Object> m = base(r); m.put("ticketNo", r.getTicketNo()); m.put("title", r.getTitle());
        m.put("description", r.getDescription()); m.put("priority", r.getPriority()); m.put("status", r.getStatus());
        m.put("assigneeId", r.getAssigneeId()); return m;
    }
    private Map<String, Object> coupon(CouponRecord r) {
        Map<String, Object> m = base(r); m.put("couponCode", r.getCouponCode()); m.put("couponType", r.getCouponType());
        m.put("discountValue", r.getDiscountValue()); m.put("status", r.getStatus()); m.put("startsAt", r.getStartsAt());
        m.put("endsAt", r.getEndsAt()); return m;
    }
    private Map<String, Object> base(dev.hucoo.component.database.entity.BaseEntity r) {
        Map<String, Object> m = new LinkedHashMap<>(); m.put("id", r.getId()); m.put("createdAt", r.getCreatedAt());
        m.put("updatedAt", r.getUpdatedAt()); return m;
    }
}

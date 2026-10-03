package dev.hucoo.admin.operations.domain;

import dev.hucoo.component.database.entity.BaseEntity;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("ap_coupon")
public class CouponRecord extends BaseEntity {
    @TableField("coupon_code") private String couponCode;
    @TableField("coupon_type") private String couponType;
    @TableField("discount_value") private java.math.BigDecimal discountValue;
    @TableField("status") private String status;
    @TableField("starts_at") private java.time.LocalDateTime startsAt;
    @TableField("ends_at") private java.time.LocalDateTime endsAt;
}

package dev.hucoo.component.database.handler;

import java.time.LocalDateTime;

import org.apache.ibatis.reflection.MetaObject;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import dev.hucoo.component.database.tenant.CurrentTenantContext;

public class DefaultMetaObjectHandler implements MetaObjectHandler {

    private static final String CREATED_AT = "createdAt";
    private static final String UPDATED_AT = "updatedAt";
    private static final String DELETED = "deleted";
    private static final String VERSION = "version";
    private static final String TENANT_ID = "tenantId";

    @Override
    public void insertFill(MetaObject metaObject) {
        LocalDateTime now = LocalDateTime.now();
        this.strictInsertFill(metaObject, CREATED_AT, LocalDateTime.class, now);
        this.strictInsertFill(metaObject, UPDATED_AT, LocalDateTime.class, now);
        this.strictInsertFill(metaObject, DELETED, Integer.class, 0);
        this.strictInsertFill(metaObject, VERSION, Integer.class, 0);
        this.strictInsertFill(metaObject, TENANT_ID, String.class, CurrentTenantContext.getTenantId());
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        this.strictUpdateFill(metaObject, UPDATED_AT, LocalDateTime.class, LocalDateTime.now());
    }
}

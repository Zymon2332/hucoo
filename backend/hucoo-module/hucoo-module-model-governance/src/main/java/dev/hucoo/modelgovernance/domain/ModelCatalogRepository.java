package dev.hucoo.modelgovernance.domain;

import java.util.List;
import dev.hucoo.component.database.entity.BaseEntity;

/** 所有操作必须在当前租户下执行，不能通过实体参数改变归属。 */
public interface ModelCatalogRepository {
    default <T> T inTransaction(java.util.function.Supplier<T> operation) { return operation.get(); }
    <T extends BaseEntity> T find(Class<T> type, Long id);
    /** 在事务中锁定父记录，用于串行检查同一接入映射的价格区间。 */
    <T extends BaseEntity> T lock(Class<T> type, Long id);
    <T extends BaseEntity> List<T> list(Class<T> type);
    <T extends BaseEntity> T save(T entity);
    <T extends BaseEntity> void delete(Class<T> type, Long id);
}

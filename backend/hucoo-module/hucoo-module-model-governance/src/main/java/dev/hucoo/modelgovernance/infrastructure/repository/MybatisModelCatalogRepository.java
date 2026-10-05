package dev.hucoo.modelgovernance.infrastructure.repository;

import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Repository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import dev.hucoo.commons.exception.BusinessException;
import dev.hucoo.commons.exception.CommonErrorCode;
import dev.hucoo.commons.exception.ResourceNotFoundException;
import dev.hucoo.component.database.entity.BaseEntity;
import dev.hucoo.component.database.tenant.CurrentTenantContext;
import dev.hucoo.modelgovernance.domain.ModelCatalogRepository;
import dev.hucoo.modelgovernance.domain.entity.*;
import dev.hucoo.modelgovernance.infrastructure.mapper.*;

@Repository
@ConditionalOnProperty(prefix = "agent-platform.persistence", name = "enabled", havingValue = "true")
public class MybatisModelCatalogRepository implements ModelCatalogRepository {
    private final Map<Class<?>, BaseMapper<?>> mappers;
    private final org.springframework.transaction.support.TransactionTemplate transactions;

    public MybatisModelCatalogRepository(org.springframework.transaction.PlatformTransactionManager transactionManager, LogicalModelMapper logicalModel, ModelVersionMapper modelVersion, ModelChannelBindingMapper modelChannelBinding, ModelVersionCapabilityMapper modelVersionCapability, ModelChannelPriceMapper modelChannelPrice, ModelVisibilityGrantMapper modelVisibilityGrant, ModelCredentialMapper modelCredential, ModelCredentialRotationMapper modelCredentialRotation, ModelChannelMapper modelChannel, ModelProviderMapper modelProvider, ModelRoutePolicyMapper modelRoutePolicy, ModelRouteTargetMapper modelRouteTarget) {
        transactions = new org.springframework.transaction.support.TransactionTemplate(transactionManager);
        mappers = Map.ofEntries(
                Map.entry(LogicalModel.class, logicalModel),
                Map.entry(ModelVersion.class, modelVersion),
                Map.entry(ModelChannelBinding.class, modelChannelBinding),
                Map.entry(ModelVersionCapability.class, modelVersionCapability),
                Map.entry(ModelChannelPrice.class, modelChannelPrice),
                Map.entry(ModelVisibilityGrant.class, modelVisibilityGrant),
                Map.entry(ModelCredential.class, modelCredential),
                Map.entry(ModelCredentialRotation.class, modelCredentialRotation),
                Map.entry(ModelChannel.class, modelChannel),
                Map.entry(ModelProvider.class, modelProvider),
                Map.entry(ModelRouteTarget.class, modelRouteTarget),
                Map.entry(ModelRoutePolicy.class, modelRoutePolicy));
    }

    @Override
    public <T> T inTransaction(java.util.function.Supplier<T> operation) { return transactions.execute(status -> operation.get()); }

    @SuppressWarnings("unchecked")
    private <T extends BaseEntity> BaseMapper<T> mapper(Class<T> type) {
        BaseMapper<?> mapper = mappers.get(type);
        if (mapper == null) throw new IllegalArgumentException("未注册模型目录实体：" + type.getSimpleName());
        return (BaseMapper<T>) mapper;
    }

    @Override
    public <T extends BaseEntity> T find(Class<T> type, Long id) {
        T entity = mapper(type).selectById(id);
        return entity != null && CurrentTenantContext.getTenantId().equals(entity.getTenantId()) ? entity : null;
    }

    @Override
    public <T extends BaseEntity> T lock(Class<T> type, Long id) {
        return mapper(type).selectOne(new QueryWrapper<T>().eq("id", id)
                .eq("tenant_id", CurrentTenantContext.getTenantId()).last("FOR UPDATE"));
    }

    @Override
    public <T extends BaseEntity> List<T> list(Class<T> type) {
        return mapper(type).selectList(new QueryWrapper<T>().eq("tenant_id", CurrentTenantContext.getTenantId()).orderByAsc("id"));
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T extends BaseEntity> T save(T entity) {
        BaseMapper<T> mapper = mapper((Class<T>) entity.getClass());
        if (entity.getId() == null) {
            entity.setTenantId(CurrentTenantContext.getTenantId());
            mapper.insert(entity);
        } else {
            if (find(entity.getClass(), entity.getId()) == null) throw new ResourceNotFoundException(entity.getClass().getSimpleName(), entity.getId());
            entity.setTenantId(CurrentTenantContext.getTenantId());
            if (mapper.updateById(entity) == 0) throw new BusinessException(CommonErrorCode.CONFLICT, "配置已被修改，请重新读取后操作");
        }
        return entity;
    }

    @Override
    public <T extends BaseEntity> void delete(Class<T> type, Long id) {
        if (find(type, id) == null) throw new ResourceNotFoundException(type.getSimpleName(), id);
        mapper(type).deleteById(id);
    }
}

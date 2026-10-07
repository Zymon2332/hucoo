package dev.hucoo.modelgovernance;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import org.h2.jdbcx.JdbcDataSource;
import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.config.GlobalConfig;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.spring.MybatisSqlSessionFactoryBean;
import dev.hucoo.component.database.config.MybatisPlusConfig;
import dev.hucoo.component.database.handler.DefaultMetaObjectHandler;
import dev.hucoo.component.database.entity.BaseEntity;
import dev.hucoo.modelgovernance.domain.ModelCatalogRepository;
import dev.hucoo.modelgovernance.domain.entity.*;
import dev.hucoo.modelgovernance.infrastructure.mapper.*;
import dev.hucoo.modelgovernance.infrastructure.repository.MybatisModelCatalogRepository;

/** 使用真实 Mapper 和租户拦截器验证仓储行为，不模拟 SQL 返回结果。 */
final class CatalogTestDatabase implements AutoCloseable {
    final DataSource dataSource;
    final ModelCatalogRepository repository;

    CatalogTestDatabase() throws Exception {
        JdbcDataSource ds = new JdbcDataSource();
        ds.setURL("jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1");
        dataSource = ds;
        var configuration = new MybatisConfiguration();
        configuration.setMapUnderscoreToCamelCase(true);
        List<Class<? extends BaseEntity>> types = List.of(LogicalModel.class, ModelVersion.class, ModelProvider.class,
                ModelChannel.class, ModelChannelBinding.class, ModelVersionCapability.class, ModelVisibilityGrant.class,
                ModelCredential.class, ModelCredentialRotation.class, ModelChannelPrice.class, ModelValidationRun.class,
                ModelRoutePolicy.class, ModelRouteTarget.class);
        var factory = new MybatisSqlSessionFactoryBean();
        factory.setDataSource(ds); factory.setConfiguration(configuration);
        factory.setGlobalConfig(new GlobalConfig().setMetaObjectHandler(new DefaultMetaObjectHandler()));
        factory.setPlugins(new MybatisPlusConfig().mybatisPlusInterceptor());
        var sessionFactory = factory.getObject();
        for (var type : types) {
            configuration.addMapper(Class.forName("dev.hucoo.modelgovernance.infrastructure.mapper." + type.getSimpleName() + "Mapper"));
        }
        // H2 只作为测试存储；表结构取实体映射，业务筛选通过与内存仓储相同的验收场景验证。
        var jdbc = new JdbcTemplate(ds);
        for (var type : types) {
            var table = TableInfoHelper.getTableInfo(type);
            StringBuilder ddl = new StringBuilder("CREATE TABLE ").append(table.getTableName()).append(" (id BIGINT PRIMARY KEY");
            for (var field : table.getFieldList()) {
                ddl.append(", ").append(field.getColumn()).append(' ').append(sqlType(field.getPropertyType()));
            }
            jdbc.execute(ddl.append(')').toString());
        }
        var sql = new SqlSessionTemplate(sessionFactory);
        var tx = new DataSourceTransactionManager(ds);
        var target = new MybatisModelCatalogRepository(tx, sql.getMapper(LogicalModelMapper.class),
                sql.getMapper(ModelVersionMapper.class), sql.getMapper(ModelChannelBindingMapper.class),
                sql.getMapper(ModelVersionCapabilityMapper.class), sql.getMapper(ModelChannelPriceMapper.class),
                sql.getMapper(ModelVisibilityGrantMapper.class), sql.getMapper(ModelCredentialMapper.class),
                sql.getMapper(ModelCredentialRotationMapper.class), sql.getMapper(ModelChannelMapper.class),
                sql.getMapper(ModelProviderMapper.class), sql.getMapper(ModelRoutePolicyMapper.class),
                sql.getMapper(ModelRouteTargetMapper.class), sql.getMapper(ModelValidationRunMapper.class));
        var proxy = new ProxyFactory(target);
        proxy.addAdvice(new TransactionInterceptor(tx, new AnnotationTransactionAttributeSource()));
        repository = (ModelCatalogRepository) proxy.getProxy();
    }

    private String sqlType(Class<?> type) {
        if (type == Long.class) return "BIGINT";
        if (type == Integer.class) return "INTEGER";
        if (type == LocalDateTime.class) return "TIMESTAMP";
        if (type == BigDecimal.class) return "DECIMAL(30,10)";
        return "VARCHAR(8192)";
    }

    @Override
    public void close() { new JdbcTemplate(dataSource).execute("SHUTDOWN"); }
}

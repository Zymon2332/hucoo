package dev.hucoo.admin.operations.infrastructure;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;
import dev.hucoo.admin.operations.domain.ExperimentRecord;
@Mapper public interface ExperimentMapper extends BaseMapper<ExperimentRecord> {}

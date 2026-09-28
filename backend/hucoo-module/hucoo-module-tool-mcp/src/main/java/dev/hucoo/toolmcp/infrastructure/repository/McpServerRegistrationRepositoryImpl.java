package dev.hucoo.toolmcp.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import dev.hucoo.toolmcp.domain.entity.McpServerRegistration;
import dev.hucoo.toolmcp.infrastructure.mapper.McpServerRegistrationMapper;
import dev.hucoo.commons.util.StringUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;

@Repository
public class McpServerRegistrationRepositoryImpl implements McpServerRegistrationRepository {

    private final McpServerRegistrationMapper mcpServerRegistrationMapper;

    public McpServerRegistrationRepositoryImpl(McpServerRegistrationMapper mcpServerRegistrationMapper) {
        this.mcpServerRegistrationMapper = mcpServerRegistrationMapper;
    }

    @Override
    public Optional<McpServerRegistration> findById(Long id) {
        return Optional.ofNullable(mcpServerRegistrationMapper.selectById(id));
    }

    @Override
    public List<McpServerRegistration> listAll() {
        return mcpServerRegistrationMapper.selectList(new LambdaQueryWrapper<>());
    }

    @Override
    public boolean save(McpServerRegistration entity) {
        return mcpServerRegistrationMapper.insert(entity) > 0;
    }

    @Override
    public boolean updateById(McpServerRegistration entity) {
        return mcpServerRegistrationMapper.updateById(entity) > 0;
    }

    @Override
    public boolean removeById(Long id) {
        return mcpServerRegistrationMapper.deleteById(id) > 0;
    }

    @Override
    public IPage<McpServerRegistration> page(long pageNum, long pageSize, String keyword) {
        LambdaQueryWrapper<McpServerRegistration> wrapper = new LambdaQueryWrapper<>();
        if (StringUtil.isNotBlank(keyword)) {
            wrapper.like(McpServerRegistration::getServerCode, keyword);
        }
        wrapper.orderByDesc(McpServerRegistration::getServerCode);
        return mcpServerRegistrationMapper.selectPage(new Page<>(pageNum, pageSize), wrapper);
    }

    @Override
    public long count() {
        return mcpServerRegistrationMapper.selectCount(new LambdaQueryWrapper<>());
    }
}

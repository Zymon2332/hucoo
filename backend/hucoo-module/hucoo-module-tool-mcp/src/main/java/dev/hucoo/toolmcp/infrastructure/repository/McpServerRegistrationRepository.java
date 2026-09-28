package dev.hucoo.toolmcp.infrastructure.repository;

import java.util.List;
import java.util.Optional;

import dev.hucoo.toolmcp.domain.entity.McpServerRegistration;
import com.baomidou.mybatisplus.core.metadata.IPage;

public interface McpServerRegistrationRepository {

    Optional<McpServerRegistration> findById(Long id);

    List<McpServerRegistration> listAll();

    boolean save(McpServerRegistration entity);

    boolean updateById(McpServerRegistration entity);

    boolean removeById(Long id);

    IPage<McpServerRegistration> page(long pageNum, long pageSize, String keyword);

    long count();
}

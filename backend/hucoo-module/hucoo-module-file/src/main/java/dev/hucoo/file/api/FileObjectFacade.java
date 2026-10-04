package dev.hucoo.file.api;

import dev.hucoo.commons.api.ModuleFacade;
import dev.hucoo.commons.dto.PageResult;
import dev.hucoo.file.api.dto.FileObjectDTO;
import dev.hucoo.file.api.dto.FileObjectQueryRequest;
import dev.hucoo.file.api.dto.FileObjectUpdateRequest;
import dev.hucoo.file.api.dto.FileRegisterRequest;

/**
 * 文件模块对外契约。
 *
 * <p>其它模块只依赖本接口（不依赖实现，也不依赖文件模块的内部包）。
 */
public interface FileObjectFacade extends ModuleFacade {

    PageResult<FileObjectDTO> pageDtos(FileObjectQueryRequest request);

    FileObjectDTO getDto(Long id);

    FileObjectDTO update(Long id, FileObjectUpdateRequest request);

    boolean remove(Long id);

    /** 登记一个已落存储的文件（内容由调用方写入）。 */
    FileObjectDTO register(FileRegisterRequest request);

    @Override
    default String moduleName() {
        return "hucoo-module-file";
    }
}

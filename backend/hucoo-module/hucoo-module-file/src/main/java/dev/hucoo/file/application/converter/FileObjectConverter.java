package dev.hucoo.file.application.converter;

import java.util.List;

import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

import dev.hucoo.file.api.dto.FileObjectDTO;
import dev.hucoo.file.api.dto.FileObjectUpdateRequest;
import dev.hucoo.file.domain.entity.FileObject;

@Mapper(componentModel = "spring")
public interface FileObjectConverter {

    FileObjectDTO toDto(FileObject entity);

    List<FileObjectDTO> toDtoList(List<FileObject> entities);

    /** PATCH 语义：仅覆盖请求中显式给出的字段。 */
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void update(FileObjectUpdateRequest request, @MappingTarget FileObject entity);
}

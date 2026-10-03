package dev.hucoo.component.swagger.config;

import org.springdoc.core.customizers.GlobalOpenApiCustomizer;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnClass(OpenAPI.class)
@ConditionalOnProperty(prefix = "agent-platform.swagger", name = "enabled", havingValue = "true", matchIfMissing = true)
@EnableConfigurationProperties(SwaggerProperties.class)
public class SwaggerAutoConfiguration {

    private static final String SECURITY_SCHEME_NAME = "bearerAuth";

    @Bean
    @ConditionalOnMissingBean
    public OpenAPI agentPlatformOpenApi(SwaggerProperties properties) {
        return new OpenAPI()
                .info(new Info()
                        .title(properties.getTitle())
                        .description(properties.getDescription())
                        .version(properties.getVersion())
                        .contact(new Contact()
                                .name(properties.getContactName())
                                .email(properties.getContactEmail()))
                        .license(new License().name(properties.getLicenseName())))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSchemas("ErrorResponse", new Schema<>().type("object")
                                .addProperty("code", new Schema<>().type("integer"))
                                .addProperty("message", new Schema<>().type("string"))
                                .addProperty("traceId", new Schema<>().type("string"))
                                .addProperty("timestamp", new Schema<>().type("integer")))
                        .addResponses("BadRequest", errorResponse("请求参数不合法"))
                        .addResponses("Unauthorized", errorResponse("未认证或凭证已过期"))
                        .addResponses("Forbidden", errorResponse("无权访问该资源"))
                        .addResponses("NotFound", errorResponse("资源不存在"))
                        .addResponses("Conflict", errorResponse("数据冲突"))
                        .addResponses("InternalError", errorResponse("系统内部错误"))
                        .addSecuritySchemes(SECURITY_SCHEME_NAME, new SecurityScheme()
                                .name(SECURITY_SCHEME_NAME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("管理端 JWT Bearer 鉴权")));
    }

    @Bean
    @ConditionalOnMissingBean(name = "commonErrorResponsesCustomizer")
    public GlobalOpenApiCustomizer commonErrorResponsesCustomizer() {
        return openApi -> openApi.getPaths().values()
                .forEach(pathItem -> pathItem.readOperations().forEach(this::addCommonResponses));
    }

    private void addCommonResponses(Operation operation) {
        operation.getResponses().putIfAbsent("400", new ApiResponse().$ref("#/components/responses/BadRequest"));
        operation.getResponses().putIfAbsent("401", new ApiResponse().$ref("#/components/responses/Unauthorized"));
        operation.getResponses().putIfAbsent("403", new ApiResponse().$ref("#/components/responses/Forbidden"));
        operation.getResponses().putIfAbsent("404", new ApiResponse().$ref("#/components/responses/NotFound"));
        operation.getResponses().putIfAbsent("409", new ApiResponse().$ref("#/components/responses/Conflict"));
        operation.getResponses().putIfAbsent("500", new ApiResponse().$ref("#/components/responses/InternalError"));
    }

    private ApiResponse errorResponse(String description) {
        return new ApiResponse().description(description)
                .content(new Content().addMediaType("application/json",
                        new MediaType().schema(new Schema<>().$ref("#/components/schemas/ErrorResponse"))));
    }
}

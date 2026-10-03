package dev.hucoo.identity.controller;

import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.hucoo.commons.api.PlatformConstants;
import dev.hucoo.commons.dto.Result;
import dev.hucoo.component.security.annotation.RequirePermission;
import dev.hucoo.identity.api.AuthenticationFacade;
import dev.hucoo.identity.api.dto.AuthCurrentUserDTO;
import dev.hucoo.identity.api.dto.AuthLoginRequest;
import dev.hucoo.identity.api.dto.AuthOAuthAuthorizeResponse;
import dev.hucoo.identity.api.dto.AuthOAuthCallbackRequest;
import dev.hucoo.identity.api.dto.AuthOAuthCallbackResponse;
import dev.hucoo.identity.api.dto.AuthProviderDTO;
import dev.hucoo.identity.api.dto.AuthRefreshRequest;
import dev.hucoo.identity.api.dto.AuthRegisterRequest;
import dev.hucoo.identity.api.dto.AuthSessionDTO;
import dev.hucoo.identity.api.dto.AuthTokenResponse;
import dev.hucoo.identity.api.dto.AuthVerificationCodeRequest;
import dev.hucoo.identity.application.auth.AuthenticationApplicationService;
import dev.hucoo.identity.domain.auth.entity.AuthIdentityUser;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "统一认证")
@RestController
@RequestMapping(PlatformConstants.API_PREFIX + "/auth")
@RequiredArgsConstructor
@ConditionalOnBean(AuthenticationApplicationService.class)
public class AuthenticationController {

    private final AuthenticationApplicationService authenticationService;

    @Operation(summary = "注册待激活账号")
    @PostMapping("/register")
    public Result<AuthenticationFacade.AuthRegisterResult> register(@Valid @RequestBody AuthRegisterRequest request) {
        return Result.ok(authenticationService.register(request));
    }

    @Operation(summary = "登录")
    @PostMapping("/login")
    public Result<AuthTokenResponse> login(@Valid @RequestBody AuthLoginRequest request) {
        return Result.ok(authenticationService.login(request));
    }

    @Operation(summary = "刷新访问令牌")
    @PostMapping("/refresh")
    public Result<AuthTokenResponse> refresh(@Valid @RequestBody AuthRefreshRequest request) {
        return Result.ok(authenticationService.refresh(request));
    }

    @Operation(summary = "发送验证码")
    @PostMapping("/verification-codes")
    public Result<Void> verificationCode(@Valid @RequestBody AuthVerificationCodeRequest request) {
        authenticationService.sendVerificationCode(request);
        return Result.ok();
    }

    @Operation(summary = "查询可用认证方式")
    @GetMapping("/providers")
    public Result<List<AuthProviderDTO>> providers() {
        return Result.ok(authenticationService.providers());
    }

    @Operation(summary = "获取第三方登录授权地址")
    @GetMapping("/oauth/{provider}/authorize")
    public Result<AuthOAuthAuthorizeResponse> oauthAuthorize(@PathVariable String provider,
                                                              @RequestParam String clientId,
                                                              @RequestParam String redirectUri) {
        return Result.ok(authenticationService.oauthAuthorize(provider, clientId, redirectUri));
    }

    @Operation(summary = "处理第三方登录回调")
    @PostMapping("/oauth/{provider}/callback")
    public Result<AuthOAuthCallbackResponse> oauthCallback(@PathVariable String provider,
                                                            @Valid @RequestBody AuthOAuthCallbackRequest request) {
        return Result.ok(authenticationService.oauthCallback(provider, request));
    }

    @Operation(summary = "当前用户")
    @GetMapping("/me")
    public Result<AuthCurrentUserDTO> me() {
        AuthIdentityUser user = authenticationService.currentUser();
        return Result.ok(AuthCurrentUserDTO.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .status(user.getStatus())
                .build());
    }

    @Operation(summary = "退出当前会话")
    @PostMapping("/logout")
    public Result<Void> logout(@RequestParam(required = false) String refreshToken) {
        authenticationService.logout(refreshToken);
        return Result.ok();
    }

    @Operation(summary = "查询当前用户会话")
    @GetMapping("/sessions")
    public Result<List<AuthSessionDTO>> sessions() {
        return Result.ok(authenticationService.sessions());
    }

    @Operation(summary = "撤销当前用户的指定会话")
    @DeleteMapping("/sessions/{sessionId}")
    public Result<Void> revokeSession(@PathVariable Long sessionId) {
        authenticationService.revokeSession(sessionId);
        return Result.ok();
    }

    @Operation(summary = "管理员激活用户并加入租户")
    @PostMapping("/admin/users/{userId}/activate")
    @RequirePermission("user:update")
    public Result<Void> activate(@PathVariable Long userId, @RequestParam String tenantId) {
        authenticationService.activate(userId, tenantId);
        return Result.ok();
    }
}

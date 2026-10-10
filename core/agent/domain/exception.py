"""业务异常封装。

业务层通过抛出 ``ServiceError`` 表达**可预期**的失败，异常经由 ``main`` 中注册的
全局异常处理器统一转换为 ``ServiceResponse`` 信封，避免各控制器手写错误响应、
也避免把错误码散落在业务逻辑里。
"""

from __future__ import annotations

from constants.error_code import ErrorCode
from domain.response import ServiceResponse


class ServiceError(Exception):
    """携带 ``ErrorCode`` 的业务异常。

    Attributes:
        code: 错误码（``ErrorCode``）。
        message: 对外的错误信息；未显式提供时取 ``code.msg``。
    """

    def __init__(self, code: ErrorCode, message: str | None = None) -> None:
        self.code = code
        self.message = message if message is not None else code.msg
        super().__init__(self.message)

    def to_response(self) -> ServiceResponse:
        """转换为统一响应信封。"""
        return ServiceResponse(code=self.code, message=self.message)

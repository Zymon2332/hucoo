from enum import Enum


class ErrorCode(Enum):

    Success = (0, "OK")

    # 请求 / 参数
    ParameterInvalid = (1003, "Parameter invalid")

    # 会话
    SessionNotFound = (2001, "Session not found")

    @property
    def code(self):
        return self.value[0]

    @property
    def msg(self):
        return self.value[1]
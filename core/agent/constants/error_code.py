from enum import Enum


class ErrorCode(Enum):

    ParameterInvalid = (1003, "Parameter invalid")

    @property
    def code(self):
        return self.value[0]

    @property
    def msg(self):
        return self.value[1]
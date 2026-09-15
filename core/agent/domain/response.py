from typing import Any, Optional

from pydantic import BaseModel

from constants.error_code import ErrorCode

SUCCESS_CODE = 0


class ServiceResponse(BaseModel):
    code: int
    message: str
    data: Optional[Any] = None

    def __init__(self, code: ErrorCode, message: Optional[str] = None, data: Optional[Any] = None,
                 **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.code = code.code
        self.message = message if message is not None else code.msg
        self.data = data

    def is_success(self):
        return self.code == SUCCESS_CODE

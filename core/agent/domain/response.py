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
        super().__init__(
            code=code.code,
            message=message if message is not None else code.msg,
            data=data,
            **kwargs,
        )

    def is_success(self):
        return self.code == SUCCESS_CODE

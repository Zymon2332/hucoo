"""会话校验与创建中间件。

在 agent 执行前（``abefore_agent``）依据消息与业务表判定会话状态：

- 跳过**前导**系统消息后，若仅剩一条用户消息（首次对话）：会话不存在则创建
  （``title`` 置空，由 ``TitleMiddleware`` 生成）。
- 非首次对话（用户消息 ≥ 2）但会话不存在：抛 ``SessionNotFoundError``。
- 会话已存在：更新 ``updated_at`` 后放行。

判定结果通过自定义状态字段 ``first_turn`` 传递给后续中间件（如
``TitleMiddleware``）；该字段随图状态持久化，故每轮都显式写回，避免陈旧值。
"""

from __future__ import annotations

from typing import Any

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import HumanMessage
from langgraph.config import get_config
from langgraph.runtime import Runtime
from typing_extensions import NotRequired, override

from db.session_repository import SessionRepository
from harness.message_utils import first_business_index


class SessionInputError(RuntimeError):
    """输入不合法（无用户消息，或首条非系统消息不是用户消息）。"""


class SessionNotFoundError(RuntimeError):
    """非首次对话但会话不存在时抛出。"""


class SessionState(AgentState):
    """SessionMiddleware 注入的状态字段。"""

    first_turn: NotRequired[bool]
    """本次 run 是否用户首轮对话。"""


class SessionMiddleware(AgentMiddleware[SessionState, Any, Any]):
    """在 agent 执行前创建/校验会话。"""

    state_schema = SessionState

    def __init__(self, session_repo: SessionRepository) -> None:
        super().__init__()
        self._session_repo = session_repo

    @override
    async def abefore_agent(
        self, state: Any, runtime: Runtime[Any]
    ) -> dict[str, Any] | None:
        config = get_config()
        thread_id = config.get("configurable", {}).get("thread_id")
        if thread_id is None:
            raise ValueError(
                "Thread ID is required in runtime context or config.configurable"
            )
        if not isinstance(thread_id, str):
            thread_id = str(thread_id)

        messages = state.get("messages", []) or []
        start = first_business_index(messages)
        if start >= len(messages):
            raise SessionInputError("no user message in input")
        if not isinstance(messages[start], HumanMessage):
            raise SessionInputError("first message must be a user message")

        first_turn = len(messages) - start == 1
        if await self._session_repo.exists(thread_id):
            await self._session_repo.touch(thread_id)
            return {"first_turn": first_turn}

        if first_turn:
            user_id = getattr(runtime.context, "user_id", None)
            if not user_id:
                raise ValueError("user_id is required in runtime context")
            await self._session_repo.create(thread_id, str(user_id))
            return {"first_turn": True}

        raise SessionNotFoundError(f"session not found: {thread_id}")

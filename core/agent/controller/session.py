"""会话查询控制器。

按 ``thread_id`` 从 checkpointer 读取该会话持久化的 ``messages`` 通道，组装为
面向聊天的消息列表（按轮聚合，见 ``harness.domain.chat_message``）。
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Path, Query
from langchain_core.messages import BaseMessage
from langchain_core.runnables import RunnableConfig
from pydantic import BaseModel, Field

from constants.error_code import ErrorCode
from controller.deps import CheckpointerDep, SessionRepoDep
from domain.exception import ServiceError
from domain.response import ServiceResponse
from harness.domain.chat_message import assemble_chat_messages

session_router = APIRouter(
    prefix="/session",
    tags=["session"],
)


class SessionSummary(BaseModel):
    """会话列表中的单条摘要（业务元数据）。"""

    session_id: str = Field(description="会话 id")
    title: str | None = Field(default=None, description="会话标题")
    created_at: datetime = Field(description="创建时间")
    updated_at: datetime = Field(description="更新时间")


async def _load_messages(
    checkpointer: CheckpointerDep, thread_id: str
) -> list[BaseMessage]:
    """从 checkpointer 读取指定会话最新 checkpoint 中的消息列表。"""
    config: RunnableConfig = {"configurable": {"thread_id": thread_id}}
    checkpoint_tuple = await checkpointer.aget_tuple(config)
    if checkpoint_tuple is None:
        return []
    channel_values = checkpoint_tuple.checkpoint.get("channel_values", {}) or {}
    return list(channel_values.get("messages", []) or [])


@session_router.get(
    "/{thread_id}/messages",
    response_model=ServiceResponse,
    summary="获取会话消息列表",
)
async def get_session_messages(
    checkpointer: CheckpointerDep,
    session_repo: SessionRepoDep,
    thread_id: Annotated[
        str, Path(description="会话 id，与 checkpointer 的 thread_id 一致")
    ],
) -> ServiceResponse:
    """按 ``thread_id`` 获取会话的消息列表。

    Args:
        checkpointer: 应用级 checkpointer（依赖注入）。
        session_repo: 应用级会话业务表 repository（依赖注入）。
        thread_id: 会话 id。

    Returns:
        ServiceResponse: ``data`` 为按轮聚合的 ``ChatMessage`` 列表（按时间顺序）；
        会话存在但无持久化消息时返回空列表。

    Raises:
        ServiceError: 会话不存在（``ErrorCode.SessionNotFound``）。
    """
    if not await session_repo.exists(thread_id):
        raise ServiceError(ErrorCode.SessionNotFound)

    messages = await _load_messages(checkpointer, thread_id)
    data = [
        message.model_dump(exclude_none=True)
        for message in assemble_chat_messages(messages)
    ]
    return ServiceResponse(code=ErrorCode.Success, data=data)


@session_router.get(
    "",
    response_model=ServiceResponse,
    summary="获取会话列表",
)
async def list_sessions(
    session_repo: SessionRepoDep,
    user_id: Annotated[str, Query(min_length=1, description="用户 id")],
) -> ServiceResponse:
    """按 ``user_id`` 获取该用户的会话列表。

    Args:
        session_repo: 应用级会话业务表 repository（依赖注入）。
        user_id: 用户 id（必填 query）。

    Returns:
        ServiceResponse: ``data`` 为 ``SessionSummary`` 列表（``updated_at`` 倒序）；
        无会话时为 ``[]``。
    """
    sessions = await session_repo.list_by_user(user_id)
    data = [
        SessionSummary(
            session_id=session.thread_id,
            title=session.title,
            created_at=session.created_at,
            updated_at=session.updated_at,
        ).model_dump()
        for session in sessions
    ]
    return ServiceResponse(code=ErrorCode.Success, data=data)

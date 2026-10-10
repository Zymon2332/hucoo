"""会话业务表数据访问。"""

from __future__ import annotations

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from db.models.session import AgentSession


class SessionRepository:
    """``agent_session`` 表的读写封装。"""

    def __init__(self, sessionmaker: async_sessionmaker[AsyncSession]) -> None:
        self._sessionmaker = sessionmaker

    async def exists(self, thread_id: str) -> bool:
        """判断会话是否存在。"""
        async with self._sessionmaker() as session:
            result = await session.execute(
                select(AgentSession.thread_id).where(
                    AgentSession.thread_id == thread_id
                )
            )
            return result.scalar_one_or_none() is not None

    async def create(
        self, thread_id: str, user_id: str, title: str | None = None
    ) -> None:
        """创建会话；已存在则忽略（幂等）。"""
        async with self._sessionmaker() as session:
            stmt = (
                pg_insert(AgentSession)
                .values(thread_id=thread_id, user_id=user_id, title=title)
                .on_conflict_do_nothing(index_elements=["thread_id"])
            )
            await session.execute(stmt)
            await session.commit()

    async def touch(self, thread_id: str) -> None:
        """刷新会话更新时间。"""
        async with self._sessionmaker() as session:
            await session.execute(
                update(AgentSession)
                .where(AgentSession.thread_id == thread_id)
                .values(updated_at=func.now())
            )
            await session.commit()

    async def update_title(self, thread_id: str, title: str) -> None:
        """更新会话标题。"""
        async with self._sessionmaker() as session:
            await session.execute(
                update(AgentSession)
                .where(AgentSession.thread_id == thread_id)
                .values(title=title)
            )
            await session.commit()

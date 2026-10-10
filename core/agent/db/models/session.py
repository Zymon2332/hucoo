"""会话业务表 ORM 模型。"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, SmallInteger, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


class AgentSession(Base):
    """会话业务表：记录 agent 会话（thread）的业务元数据。"""

    __tablename__ = "agent_session"

    thread_id: Mapped[str] = mapped_column(Text, primary_key=True)
    """会话 id，与 checkpointer 的 ``thread_id`` 一致。"""

    user_id: Mapped[str] = mapped_column(Text, nullable=False)
    """所属用户 id。"""

    title: Mapped[str | None] = mapped_column(Text)
    """会话标题，默认取首条用户消息。"""

    status: Mapped[int] = mapped_column(
        SmallInteger, server_default="1", nullable=False
    )
    """状态：1 正常。"""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    """创建时间。"""

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    """更新时间。"""

"""SQLAlchemy 异步 engine 与 session 工厂。

业务表使用独立的 SQLAlchemy engine 池；checkpointer / store 走各自共享的
psycopg 池（见 ``harness.resources``），二者互不影响。

``DATABASE_URL`` 以 ``postgresql://`` 形式提供（psycopg 连接串规范），
这里转换为 SQLAlchemy 的 psycopg3 异步方言 ``postgresql+psycopg://``。
"""

from __future__ import annotations

from sqlalchemy import URL, make_url
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from config.database_config import DatabaseConfig

_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def to_sqlalchemy_url(url: str) -> URL:
    """把 ``postgresql://`` 连接串转换为 psycopg3 异步方言 URL。"""
    parsed = make_url(url)
    if parsed.drivername in {"postgresql", "postgres"}:
        parsed = parsed.set(drivername="postgresql+psycopg")
    return parsed


def create_engine(cfg: DatabaseConfig) -> AsyncEngine:
    """创建（并缓存）SQLAlchemy 异步 engine。"""
    global _engine
    engine = _engine
    if engine is None:
        if not cfg.url:
            msg = "DATABASE_URL is required for session storage"
            raise ValueError(msg)
        engine = create_async_engine(
            to_sqlalchemy_url(cfg.url),
            pool_pre_ping=True,
            pool_size=cfg.engine_pool_size,
            max_overflow=cfg.engine_max_overflow,
            echo=cfg.echo,
        )
        _engine = engine
    return engine


def get_sessionmaker(cfg: DatabaseConfig) -> async_sessionmaker[AsyncSession]:
    """获取（并缓存）异步 session 工厂。"""
    global _sessionmaker
    sessionmaker = _sessionmaker
    if sessionmaker is None:
        sessionmaker = async_sessionmaker(
            bind=create_engine(cfg),
            expire_on_commit=False,
        )
        _sessionmaker = sessionmaker
    return sessionmaker


async def dispose_engine() -> None:
    """释放 engine 连接池（应用关闭时调用）。"""
    global _engine, _sessionmaker
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _sessionmaker = None

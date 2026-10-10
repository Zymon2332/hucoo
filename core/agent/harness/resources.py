"""应用级资源构建。

在 ``main.py`` 的 lifespan 中按配置构建 checkpointer 与 store。
checkpointer 与 store **共享同一个 psycopg 异步连接池**，由调用方在应用关闭时
负责 ``pool.close()``。
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.store.base import BaseStore

from config.checkpointer_config import CheckpointerConfig
from config.database_config import DatabaseConfig
from config.store_config import StoreConfig

if TYPE_CHECKING:
    from psycopg_pool import AsyncConnectionPool


async def build_pool(cfg: DatabaseConfig) -> AsyncConnectionPool[Any]:
    """构建 checkpointer 与 store 共享的 psycopg 异步连接池。

    连接池参数取自统一的 ``DATABASE_*`` 配置。
    """
    if not cfg.url:
        msg = "DATABASE_URL is required for postgres backend"
        raise ValueError(msg)

    from psycopg.rows import dict_row
    from psycopg_pool import AsyncConnectionPool

    pool = AsyncConnectionPool(
        conninfo=cfg.url,
        min_size=cfg.pool_min_size,
        max_size=cfg.pool_max_size,
        open=False,
        kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
    )
    await pool.open()
    return pool


async def build_checkpointer(
    cfg: CheckpointerConfig,
    pool: AsyncConnectionPool[Any],
) -> BaseCheckpointSaver:
    """根据配置与共享连接池构建 checkpointer。"""
    if cfg.backend == "postgres":
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

        checkpointer = AsyncPostgresSaver(pool)
        if cfg.auto_setup:
            await checkpointer.setup()
        return checkpointer

    msg = f"Unsupported checkpointer backend: {cfg.backend}"
    raise ValueError(msg)


async def build_store(
    cfg: StoreConfig,
    pool: AsyncConnectionPool[Any],
) -> BaseStore:
    """根据配置与共享连接池构建 store。"""
    if cfg.backend == "postgres":
        from langgraph.store.postgres.aio import AsyncPostgresStore

        store = AsyncPostgresStore(pool)
        if cfg.auto_setup:
            await store.setup()
        return store

    msg = f"Unsupported store backend: {cfg.backend}"
    raise ValueError(msg)

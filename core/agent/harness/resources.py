"""应用级资源构建。

在 ``main.py`` 的 lifespan 中按配置构建 checkpointer 与 store。
返回的连接池由调用方在应用关闭时负责 ``close()``。
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.store.base import BaseStore
from langgraph.store.memory import InMemoryStore

from config.checkpointer_config import CheckpointerConfig
from config.store_config import StoreConfig

if TYPE_CHECKING:
    from psycopg_pool import AsyncConnectionPool


async def _open_pool(db_uri: str, min_size: int, max_size: int) -> AsyncConnectionPool[Any]:
    """打开 psycopg 异步连接池（autocommit + dict row）。"""
    from psycopg.rows import dict_row
    from psycopg_pool import AsyncConnectionPool

    pool = AsyncConnectionPool(
        conninfo=db_uri,
        min_size=min_size,
        max_size=max_size,
        open=False,
        kwargs={"autocommit": True, "prepare_threshold": 0, "row_factory": dict_row},
    )
    await pool.open()
    return pool


async def build_checkpointer(
    cfg: CheckpointerConfig,
) -> tuple[BaseCheckpointSaver, AsyncConnectionPool[Any] | None]:
    """根据配置构建 checkpointer。

    Returns:
        ``(checkpointer, pool)``，``memory`` 后端时 pool 为 ``None``。
    """
    if cfg.backend == "memory":
        return InMemorySaver(), None

    if cfg.backend == "postgres":
        if not cfg.db_uri:
            msg = "CHECKPOINTER_DB_URI is required when CHECKPOINTER_BACKEND=postgres"
            raise ValueError(msg)
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

        pool = await _open_pool(cfg.db_uri, cfg.pool_min_size, cfg.pool_max_size)
        checkpointer = AsyncPostgresSaver(pool)
        if cfg.auto_setup:
            await checkpointer.setup()
        return checkpointer, pool

    msg = f"Unsupported checkpointer backend: {cfg.backend}"
    raise ValueError(msg)


async def build_store(cfg: StoreConfig) -> tuple[BaseStore, AsyncConnectionPool[Any] | None]:
    """根据配置构建 store。

    Returns:
        ``(store, pool)``，``memory`` 后端时 pool 为 ``None``。
    """
    if cfg.backend == "memory":
        return InMemoryStore(), None

    if cfg.backend == "postgres":
        if not cfg.db_uri:
            msg = "STORE_DB_URI is required when STORE_BACKEND=postgres"
            raise ValueError(msg)
        from langgraph.store.postgres.aio import AsyncPostgresStore

        pool = await _open_pool(cfg.db_uri, cfg.pool_min_size, cfg.pool_max_size)
        store = AsyncPostgresStore(pool)
        if cfg.auto_setup:
            await store.setup()
        return store, pool

    msg = f"Unsupported store backend: {cfg.backend}"
    raise ValueError(msg)

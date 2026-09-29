"""checkpointer 配置。

对应环境变量前缀 ``CHECKPOINTER_``，例如 ``CHECKPOINTER_BACKEND``。

- ``memory``：``InMemorySaver``，仅用于本地开发/测试，进程重启即丢。
- ``postgres``：``AsyncPostgresSaver``，生产使用，按 ``thread_id`` 持久化会话状态。
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import SettingsConfigDict

from config.base import BaseConfig


class CheckpointerConfig(BaseConfig):
    """会话状态持久化（checkpointer）配置。"""

    model_config = SettingsConfigDict(extra="ignore", env_prefix="CHECKPOINTER_")

    backend: Literal["memory", "postgres"] = "memory"
    """存储后端。"""

    db_uri: str | None = None
    """Postgres 连接串，``backend=postgres`` 时必填。"""

    pool_min_size: int = 1
    """连接池最小连接数。"""

    pool_max_size: int = 10
    """连接池最大连接数。"""

    auto_setup: bool = True
    """启动时是否自动建表/执行迁移。"""


@lru_cache
def get_checkpointer_config() -> CheckpointerConfig:
    """获取 checkpointer 配置（进程内缓存）。"""
    return CheckpointerConfig()

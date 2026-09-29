"""store 配置。

对应环境变量前缀 ``STORE_``，例如 ``STORE_BACKEND``。

- ``memory``：``InMemoryStore``，仅用于本地开发/测试。
- ``postgres``：``AsyncPostgresStore``，跨会话长期记忆。
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import SettingsConfigDict

from config.base import BaseConfig


class StoreConfig(BaseConfig):
    """跨会话长期记忆（store）配置。"""

    model_config = SettingsConfigDict(extra="ignore", env_prefix="STORE_")

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
def get_store_config() -> StoreConfig:
    """获取 store 配置（进程内缓存）。"""
    return StoreConfig()

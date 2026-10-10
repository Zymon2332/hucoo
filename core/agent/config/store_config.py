"""store 配置。

对应环境变量前缀 ``STORE_``，例如 ``STORE_BACKEND``。

- ``postgres``：``AsyncPostgresStore``，跨会话长期记忆。
  连接串统一由 ``DATABASE_URL`` 提供（见 ``config.database_config``）。
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import SettingsConfigDict

from config.base import BaseConfig


class StoreConfig(BaseConfig):
    """跨会话长期记忆（store）配置。"""

    model_config = SettingsConfigDict(extra="ignore", env_prefix="STORE_")

    backend: Literal["postgres"] = "postgres"
    """存储后端。"""

    auto_setup: bool = True
    """启动时是否自动建表/执行迁移。"""


@lru_cache
def get_store_config() -> StoreConfig:
    """获取 store 配置（进程内缓存）。"""
    return StoreConfig()

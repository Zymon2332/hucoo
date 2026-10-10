"""checkpointer 配置。

对应环境变量前缀 ``CHECKPOINTER_``，例如 ``CHECKPOINTER_BACKEND``。

- ``postgres``：``AsyncPostgresSaver``，按 ``thread_id`` 持久化会话状态。
  连接串统一由 ``DATABASE_URL`` 提供（见 ``config.database_config``）。
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import SettingsConfigDict

from config.base import BaseConfig


class CheckpointerConfig(BaseConfig):
    """会话状态持久化（checkpointer）配置。"""

    model_config = SettingsConfigDict(extra="ignore", env_prefix="CHECKPOINTER_")

    backend: Literal["postgres"] = "postgres"
    """存储后端。"""

    auto_setup: bool = True
    """启动时是否自动建表/执行迁移。"""


@lru_cache
def get_checkpointer_config() -> CheckpointerConfig:
    """获取 checkpointer 配置（进程内缓存）。"""
    return CheckpointerConfig()

"""数据库配置。

对应环境变量前缀 ``DATABASE_``，例如 ``DATABASE_URL``。

checkpointer / store / 业务表共用同一个 ``DATABASE_URL``：

- ``pool_min_size`` / ``pool_max_size``：checkpointer 与 store 共享的 psycopg 异步池参数。
- ``engine_pool_size`` / ``engine_max_overflow``：SQLAlchemy 业务表 engine 的池参数。
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import SettingsConfigDict

from config.base import BaseConfig


class DatabaseConfig(BaseConfig):
    """统一数据库配置。"""

    model_config = SettingsConfigDict(extra="ignore", env_prefix="DATABASE_")

    url: str | None = None
    """Postgres 连接串，``postgresql://...``。"""

    pool_min_size: int = 1
    """psycopg 共享池最小连接数（checkpointer + store）。"""

    pool_max_size: int = 10
    """psycopg 共享池最大连接数（checkpointer + store）。"""

    engine_pool_size: int = 5
    """SQLAlchemy engine 池大小。"""

    engine_max_overflow: int = 10
    """SQLAlchemy engine 池溢出上限。"""

    echo: bool = False
    """是否打印 SQLAlchemy SQL。"""


@lru_cache
def get_database_config() -> DatabaseConfig:
    """获取数据库配置（进程内缓存）。"""
    return DatabaseConfig()

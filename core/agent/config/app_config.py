"""应用级配置。

对应环境变量前缀 ``APP_``，例如 ``APP_SERVICE_PORT`` / ``APP_WORKERS``。
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import SettingsConfigDict

from config.base import BaseConfig


class AppConfig(BaseConfig):
    """服务运行配置。"""

    model_config = SettingsConfigDict(extra="ignore", env_prefix="APP_")

    service_port: int = 2000
    """服务监听端口。"""

    workers: int = 1
    """uvicorn worker 数量。"""

    log_level: str = "info"
    """uvicorn 日志级别（loguru 另有 ``LOG_LEVEL``）。"""

    env: str = "dev"
    """运行环境标记：``dev`` / ``test`` / ``prod``。"""


@lru_cache
def get_app_config() -> AppConfig:
    """获取应用配置（进程内缓存）。"""
    return AppConfig()

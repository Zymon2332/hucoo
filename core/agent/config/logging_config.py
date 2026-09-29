"""日志配置。

对应环境变量前缀 ``LOG_``：``LOG_LEVEL`` / ``LOG_FILE`` / ``LOG_INTERCEPT_STDLIB``。
"""

from __future__ import annotations

import logging
import sys
from functools import lru_cache

from loguru import logger
from pydantic_settings import SettingsConfigDict

from config.base import BaseConfig


class LoggingConfig(BaseConfig):
    """loguru 日志配置。"""

    model_config = SettingsConfigDict(extra="ignore", env_prefix="LOG_")

    level: str = "INFO"
    """日志级别。"""

    file: str | None = None
    """可选的文件输出路径，为空时仅输出到 stderr。"""

    intercept_stdlib: bool = True
    """是否把标准库 logging（uvicorn 等）转发到 loguru。"""


@lru_cache
def get_logging_config() -> LoggingConfig:
    """获取日志配置（进程内缓存）。"""
    return LoggingConfig()


class _InterceptHandler(logging.Handler):
    """把标准库 logging 记录转发到 loguru。"""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            level: str | int = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = logging.currentframe(), 2
        while frame is not None and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())


def configure_logging(cfg: LoggingConfig | None = None) -> None:
    """按配置初始化 loguru。"""
    cfg = cfg or get_logging_config()

    logger.remove()
    logger.add(sys.stderr, level=cfg.level.upper(), enqueue=True)
    if cfg.file:
        logger.add(
            cfg.file,
            level=cfg.level.upper(),
            rotation="10 MB",
            retention=7,
            encoding="utf-8",
            enqueue=True,
        )
    if cfg.intercept_stdlib:
        logging.basicConfig(handlers=[_InterceptHandler()], level=0, force=True)

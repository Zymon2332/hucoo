"""Alembic 迁移环境（异步 engine）。

连接串统一来自 ``DATABASE_URL``（``config.database_config``），并转换为
SQLAlchemy 的 psycopg3 异步方言。
"""

from __future__ import annotations

import asyncio
from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from config.database_config import get_database_config
from db import models  # noqa: F401  确保模型被导入以收集 metadata
from db.base import Base
from db.engine import to_sqlalchemy_url

load_dotenv()

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

_database_url = get_database_config().url
if not _database_url:
    msg = "DATABASE_URL is required to run migrations"
    raise ValueError(msg)
config.set_main_option(
    "sqlalchemy.url",
    to_sqlalchemy_url(_database_url).render_as_string(hide_password=False),
)


def run_migrations_offline() -> None:
    """离线模式：仅生成 SQL，不连接数据库。"""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

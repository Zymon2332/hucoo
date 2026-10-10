"""SQLAlchemy 声明式基类。

统一约束命名约定，保证 Alembic autogenerate 生成的迁移稳定可复现。
"""

from __future__ import annotations

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

_NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """所有业务表 ORM 模型的基类。"""

    metadata = MetaData(naming_convention=_NAMING_CONVENTION)

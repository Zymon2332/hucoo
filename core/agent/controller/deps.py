"""FastAPI 依赖：从 app.state 取出应用级资源并附加类型。

``app.state`` 是动态容器（``State.__getattr__`` 返回 ``Any``），直接访问没有
类型提示。把访问收敛到带返回类型的 getter，再通过 ``Depends`` 注入接口，
调用方即可获得自动补全与类型检查。
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.store.base import BaseStore

from db.session_repository import SessionRepository


def get_checkpointer(request: Request) -> BaseCheckpointSaver:
    """取出 lifespan 中构建的 checkpointer。"""
    return request.app.state.checkpointer


def get_store(request: Request) -> BaseStore:
    """取出 lifespan 中构建的 store。"""
    return request.app.state.store


def get_session_repo(request: Request) -> SessionRepository:
    """取出 lifespan 中构建的会话业务表 repository。"""
    return request.app.state.session_repo


CheckpointerDep = Annotated[BaseCheckpointSaver, Depends(get_checkpointer)]
StoreDep = Annotated[BaseStore, Depends(get_store)]
SessionRepoDep = Annotated[SessionRepository, Depends(get_session_repo)]

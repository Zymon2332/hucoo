"""Agent middleware 构建。

``build_middleware`` 聚合 agent 使用的中间件列表：lead agent 的默认集合、
会话校验中间件与标题生成中间件，后续在此追加外部/配置注入的中间件。

顺序即执行顺序：``SessionMiddleware`` 先创建/校验会话，``TitleMiddleware``
随后回填标题。
"""

from __future__ import annotations

from typing import Any

from langchain.agents.middleware import AgentMiddleware
from langchain_core.language_models import BaseChatModel

from db.session_repository import SessionRepository
from harness.middleware.session_middleware import SessionMiddleware
from harness.middleware.title_middleware import TitleMiddleware


def _build_lead_default_middleware() -> list[AgentMiddleware[Any, Any, Any]]:
    """构建 lead agent 的默认 middleware 列表。

    暂未接入具体中间件，返回空列表；后续按需接入记忆压缩、
    任务规划、人工确认等默认中间件。
    """
    return []


def build_middleware(
    session_repo: SessionRepository | None = None,
    model: BaseChatModel | None = None,
) -> list[AgentMiddleware[Any, Any, Any]]:
    """聚合 agent 使用的 middleware 列表。

    当前 = lead 默认中间件 + 会话校验中间件（提供 repo 时）+
    标题生成中间件（同时提供 repo 与 model 时）。
    """
    middleware: list[AgentMiddleware[Any, Any, Any]] = [
        *_build_lead_default_middleware(),
    ]
    if session_repo is not None:
        middleware.append(SessionMiddleware(session_repo))
        if model is not None:
            middleware.append(TitleMiddleware(session_repo, model))
    return middleware

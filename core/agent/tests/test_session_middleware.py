"""SessionMiddleware 单元测试（不依赖真实 PG）。"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables.config import var_child_runnable_config

from harness.middleware.session_middleware import (
    SessionInputError,
    SessionMiddleware,
    SessionNotFoundError,
)
from service.agent_service import RuntimeContext


class FakeSessionRepository:
    """内存版会话 repository。"""

    def __init__(self) -> None:
        self.sessions: dict[str, dict[str, Any]] = {}
        self.touched: list[str] = []

    async def exists(self, thread_id: str) -> bool:
        return thread_id in self.sessions

    async def create(
        self, thread_id: str, user_id: str, title: str | None = None
    ) -> None:
        self.sessions.setdefault(thread_id, {"user_id": user_id, "title": title})

    async def touch(self, thread_id: str) -> None:
        self.touched.append(thread_id)


@pytest.fixture
def config_context():
    """在 runnable 上下文中注入 thread_id。"""
    token = var_child_runnable_config.set(
        {"configurable": {"thread_id": "thread-1"}}
    )
    try:
        yield
    finally:
        var_child_runnable_config.reset(token)


def _runtime(user_id: str = "user-1") -> Any:
    return SimpleNamespace(
        context=RuntimeContext(user_id=user_id, trace_id="trace-1")
    )


def _middleware(repo: FakeSessionRepository) -> SessionMiddleware:
    return SessionMiddleware(repo)  # type: ignore[arg-type]


async def test_first_turn_single_user_message_creates(config_context):
    repo = FakeSessionRepository()
    result = await _middleware(repo).abefore_agent(
        {"messages": [HumanMessage(content="hello world")]},
        _runtime(),
    )

    assert result == {"first_turn": True}
    assert repo.sessions["thread-1"] == {"user_id": "user-1", "title": None}
    assert repo.touched == []


async def test_system_then_user_treated_as_first_turn(config_context):
    repo = FakeSessionRepository()
    result = await _middleware(repo).abefore_agent(
        {
            "messages": [
                SystemMessage(content="you are a bot"),
                HumanMessage(content="hi there"),
            ]
        },
        _runtime(),
    )

    assert result == {"first_turn": True}
    assert repo.sessions["thread-1"]["user_id"] == "user-1"


async def test_first_turn_is_idempotent(config_context):
    repo = FakeSessionRepository()
    middleware = _middleware(repo)
    state = {"messages": [HumanMessage(content="first")]}

    first = await middleware.abefore_agent(state, _runtime())
    second = await middleware.abefore_agent(state, _runtime())

    assert first == {"first_turn": True}
    assert second == {"first_turn": True}
    assert len(repo.sessions) == 1


async def test_user_then_user_without_session_raises(config_context):
    repo = FakeSessionRepository()
    state = {
        "messages": [
            HumanMessage(content="first"),
            HumanMessage(content="second"),
        ]
    }
    with pytest.raises(SessionNotFoundError):
        await _middleware(repo).abefore_agent(state, _runtime())


async def test_existing_session_touches(config_context):
    repo = FakeSessionRepository()
    repo.sessions["thread-1"] = {"user_id": "user-1", "title": "old"}
    state = {
        "messages": [
            HumanMessage(content="first"),
            AIMessage(content="answer"),
            HumanMessage(content="second"),
        ]
    }
    result = await _middleware(repo).abefore_agent(state, _runtime())

    assert result == {"first_turn": False}
    assert repo.touched == ["thread-1"]


async def test_existing_session_with_single_message_touches_only(config_context):
    repo = FakeSessionRepository()
    repo.sessions["thread-1"] = {"user_id": "user-1", "title": "old"}
    result = await _middleware(repo).abefore_agent(
        {"messages": [HumanMessage(content="retry")]}, _runtime()
    )

    assert result == {"first_turn": True}
    assert repo.touched == ["thread-1"]
    assert repo.sessions["thread-1"]["title"] == "old"


async def test_empty_messages_raises(config_context):
    repo = FakeSessionRepository()
    with pytest.raises(SessionInputError):
        await _middleware(repo).abefore_agent({"messages": []}, _runtime())


async def test_first_message_not_user_raises(config_context):
    repo = FakeSessionRepository()
    with pytest.raises(SessionInputError):
        await _middleware(repo).abefore_agent(
            {"messages": [AIMessage(content="hi")]}, _runtime()
        )


async def test_missing_user_id_raises(config_context):
    repo = FakeSessionRepository()
    with pytest.raises(ValueError):
        await _middleware(repo).abefore_agent(
            {"messages": [HumanMessage(content="hi")]}, _runtime(user_id="")
        )


async def test_missing_thread_id_raises():
    repo = FakeSessionRepository()
    token = var_child_runnable_config.set({"configurable": {}})
    try:
        with pytest.raises(ValueError):
            await _middleware(repo).abefore_agent(
                {"messages": [HumanMessage(content="hi")]}, _runtime()
            )
    finally:
        var_child_runnable_config.reset(token)

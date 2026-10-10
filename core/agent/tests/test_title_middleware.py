"""TitleMiddleware 单元测试（不依赖真实模型/数据库）。"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables.config import var_child_runnable_config

from harness.middleware.title_middleware import TitleMiddleware, clean_title


class FakeTitleRepository:
    def __init__(self) -> None:
        self.titles: dict[str, str] = {}

    async def update_title(self, thread_id: str, title: str) -> None:
        self.titles[thread_id] = title


class FakeModel:
    def __init__(self, content: str = "", error: Exception | None = None) -> None:
        self.content = content
        self.error = error
        self.calls = 0

    async def ainvoke(self, _messages: Any) -> Any:
        self.calls += 1
        if self.error is not None:
            raise self.error
        return SimpleNamespace(content=self.content)


@pytest.fixture
def config_context():
    token = var_child_runnable_config.set(
        {"configurable": {"thread_id": "thread-1"}}
    )
    try:
        yield
    finally:
        var_child_runnable_config.reset(token)


def _runtime() -> Any:
    return SimpleNamespace(context=None)


def _middleware(repo: FakeTitleRepository, model: FakeModel) -> TitleMiddleware:
    return TitleMiddleware(repo, model)  # type: ignore[arg-type]


def _state(messages: list[Any], first_turn: bool | None = True) -> dict[str, Any]:
    state: dict[str, Any] = {"messages": messages}
    if first_turn is not None:
        state["first_turn"] = first_turn
    return state


async def test_generates_title_on_first_turn(config_context):
    repo = FakeTitleRepository()
    model = FakeModel(content="北京天气查询")
    result = await _middleware(repo, model).aafter_model(
        _state([HumanMessage(content="北京天气怎么样？")]), _runtime()
    )

    assert result == {"session_title": "北京天气查询"}
    assert repo.titles["thread-1"] == "北京天气查询"
    assert model.calls == 1


async def test_skips_when_not_first_turn(config_context):
    repo = FakeTitleRepository()
    model = FakeModel(content="新标题")
    result = await _middleware(repo, model).aafter_model(
        _state([HumanMessage(content="hi")], first_turn=False), _runtime()
    )

    assert result is None
    assert model.calls == 0
    assert "thread-1" not in repo.titles


async def test_skips_when_first_turn_missing(config_context):
    repo = FakeTitleRepository()
    model = FakeModel(content="新标题")
    await _middleware(repo, model).aafter_model(
        _state([HumanMessage(content="hi")], first_turn=None), _runtime()
    )

    assert model.calls == 0
    assert "thread-1" not in repo.titles


async def test_same_run_only_handles_once(config_context):
    repo = FakeTitleRepository()
    model = FakeModel(content="北京天气查询")
    middleware = _middleware(repo, model)
    state = _state([HumanMessage(content="北京天气怎么样？")])

    await middleware.aafter_model(state, _runtime())
    await middleware.aafter_model(state, _runtime())

    assert model.calls == 1
    assert repo.titles["thread-1"] == "北京天气查询"


async def test_model_error_falls_back_to_user_text(config_context):
    repo = FakeTitleRepository()
    model = FakeModel(error=TimeoutError("boom"))
    await _middleware(repo, model).aafter_model(
        _state([HumanMessage(content="北京天气怎么样")]), _runtime()
    )

    assert repo.titles["thread-1"] == "北京天气怎么样"


async def test_long_user_text_fallback_truncated(config_context):
    repo = FakeTitleRepository()
    model = FakeModel(error=RuntimeError("boom"))
    long_text = "一二三四五六七八九十一二三四五六七八九十一二三四五"
    await _middleware(repo, model).aafter_model(
        _state([HumanMessage(content=long_text)]), _runtime()
    )

    assert repo.titles["thread-1"] == long_text[:19] + "…"


async def test_empty_user_text_falls_back_to_placeholder(config_context):
    repo = FakeTitleRepository()
    model = FakeModel(content="")
    await _middleware(repo, model).aafter_model(
        _state([HumanMessage(content="   ")]), _runtime()
    )

    assert repo.titles["thread-1"] == "New Chat"


async def test_system_then_user_uses_first_user(config_context):
    repo = FakeTitleRepository()
    model = FakeModel(content="问候")
    await _middleware(repo, model).aafter_model(
        _state(
            [
                SystemMessage(content="you are a bot"),
                HumanMessage(content="你好"),
            ]
        ),
        _runtime(),
    )

    assert repo.titles["thread-1"] == "问候"


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ('"北京天气"', "北京天气"),
        ("“北京天气”", "北京天气"),
        ("北京\n天气", "北京 天气"),
        ("a" * 25, "a" * 19 + "…"),
    ],
)
def test_clean_title(raw: str, expected: str) -> None:
    assert clean_title(raw) == expected


def test_clean_title_does_not_split_combining_mark() -> None:
    assert clean_title("a" * 18 + "\u0301" + "a" * 5) == "a" * 18 + "…"

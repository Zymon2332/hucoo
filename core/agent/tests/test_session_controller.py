"""会话列表接口测试（不依赖真实 PG）。"""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from controller.session import SessionSummary
from db.models.session import AgentSession
from main import create_app


class FakeSessionRepository:
    """内存版会话 repository；只实现列表接口所需方法。"""

    def __init__(self, sessions: list[AgentSession]) -> None:
        self._sessions = sessions
        self.calls: list[str] = []

    async def list_by_user(self, user_id: str) -> list[AgentSession]:
        self.calls.append(user_id)
        return [s for s in self._sessions if s.user_id == user_id]


def _session(
    thread_id: str, user_id: str, title: str | None, updated_at: datetime
) -> AgentSession:
    return AgentSession(
        thread_id=thread_id,
        user_id=user_id,
        title=title,
        status=1,
        created_at=updated_at,
        updated_at=updated_at,
    )


@asynccontextmanager
async def _noop_lifespan(_app):
    """跳过真实 lifespan（避免连 PG）；session_repo 由测试注入。"""
    yield


def _client(repo: FakeSessionRepository) -> TestClient:
    app = create_app()
    app.router.lifespan_context = _noop_lifespan
    app.state.session_repo = repo
    return TestClient(app)


def test_list_sessions_returns_only_requested_user():
    t1 = datetime(2026, 10, 1, tzinfo=timezone.utc)
    t2 = datetime(2026, 10, 2, tzinfo=timezone.utc)
    repo = FakeSessionRepository(
        [_session("t1", "u1", "hello", t1), _session("t2", "u2", "other", t2)]
    )
    with _client(repo) as client:
        resp = client.get("/session", params={"user_id": "u1"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert [item["session_id"] for item in body["data"]] == ["t1"]
    item = body["data"][0]
    assert item["title"] == "hello"
    assert "created_at" in item and "updated_at" in item
    assert repo.calls == ["u1"]


def test_list_sessions_empty_returns_empty_data():
    repo = FakeSessionRepository([])
    with _client(repo) as client:
        resp = client.get("/session", params={"user_id": "nobody"})

    body = resp.json()
    assert resp.status_code == 200
    assert body["code"] == 0
    assert body["data"] == []


def test_list_sessions_missing_user_id_returns_parameter_invalid():
    repo = FakeSessionRepository([])
    with _client(repo) as client:
        resp = client.get("/session")

    body = resp.json()
    assert body["code"] == 1003


def test_session_summary_title_defaults_none():
    now = datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc)
    summary = SessionSummary(session_id="t1", created_at=now, updated_at=now)
    assert summary.title is None


def test_session_summary_json_mode_isoformat_datetime():
    now = datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc)
    data = SessionSummary(
        session_id="t1", title="hello", created_at=now, updated_at=now
    ).model_dump(mode="json")
    assert data["session_id"] == "t1"
    assert data["title"] == "hello"
    assert data["created_at"].startswith("2026-10-01T12:00:00")

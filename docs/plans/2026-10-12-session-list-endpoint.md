# 会话列表接口 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 新增 `GET /session?user_id=<str>`，返回该用户 `status=1` 的会话摘要列表（`updated_at` 倒序）。

**Architecture:** 在 `controller/session.py` 内定义 `SessionSummary` 作为响应模型；`SessionRepository.list_by_user` 负责 SQL（过滤 + 排序）；`controller/session.py` 新增路由做映射与统一响应封装。测试用 fake repo + `TestClient`，不依赖真实 PG。

**Tech Stack:** Python 3.11+ · FastAPI 0.141 · SQLAlchemy async (psycopg3) · pydantic v2 · pytest（asyncio auto）。

**Design:** `docs/plans/2026-10-12-session-list-endpoint-design.md`

**所有命令均在 `core/agent` 目录执行。**

---

### Task 1: `SessionSummary` 响应模型

**Files:**
- Modify: `core/agent/controller/session.py`
- Test: `core/agent/tests/test_session_controller.py`（模型单测与接口测试同文件）

> `SessionSummary` 是端点专用响应 DTO，与路由同址定义在 `controller/session.py`；
> `session_id` 映射自内部 `agent_session.thread_id`（前端无 `thread_id` 概念）。

**Step 1: 写失败测试** — 在 `core/agent/tests/test_session_controller.py` 增加：

```python
from controller.session import SessionSummary


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
```

**Step 2: 运行，确认失败**

Run: `uv run pytest tests/test_session_controller.py -q`
Expected: FAIL（`ImportError: cannot import name 'SessionSummary'`）

**Step 3: 实现** — 在 `core/agent/controller/session.py` 的 `session_router` 定义之后、
`_load_messages` 之前加入：

```python
class SessionSummary(BaseModel):
    """会话列表中的单条摘要（业务元数据）。"""

    session_id: str = Field(description="会话 id")
    title: str | None = Field(default=None, description="会话标题")
    created_at: datetime = Field(description="创建时间")
    updated_at: datetime = Field(description="更新时间")
```

（需补 `from datetime import datetime`、`from pydantic import BaseModel, Field` 导入。）

**Step 4: 运行，确认通过**

Run: `uv run pytest tests/test_session_controller.py -q`
Expected: PASS（2 passed）

**Step 5: Commit**

```bash
git add core/agent/controller/session.py core/agent/tests/test_session_controller.py
git commit -m "feat(agent): 新增会话摘要响应模型 SessionSummary"
```

---

### Task 2: `GET /session` 路由

**Files:**
- Modify: `core/agent/controller/session.py`
- Test: `core/agent/tests/test_session_controller.py`

**Step 1: 写失败测试**

在同一测试文件 `core/agent/tests/test_session_controller.py` 追加以下接口用例（文件已含 Task 1 的模型单测）：

```python
"""会话列表接口测试（不依赖真实 PG）。"""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi.testclient import TestClient

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
```

**Step 2: 运行，确认失败**

Run: `uv run pytest tests/test_session_controller.py -q`
Expected: FAIL（`/session` 返回 404，`body["code"]` KeyError / 断言失败）

**Step 3: 实现**

修改 `core/agent/controller/session.py`：

imports 区把 `Query` 加入 `fastapi` 导入（`SessionSummary` 已在本模块内定义）：

```python
from fastapi import APIRouter, Path, Query
```

文件末尾新增路由：

```python
@session_router.get(
    "",
    response_model=ServiceResponse,
    summary="获取会话列表",
)
async def list_sessions(
    session_repo: SessionRepoDep,
    user_id: Annotated[str, Query(min_length=1, description="用户 id")],
) -> ServiceResponse:
    """按 ``user_id`` 获取该用户的会话列表。

    Args:
        session_repo: 应用级会话业务表 repository（依赖注入）。
        user_id: 用户 id（必填 query）。

    Returns:
        ServiceResponse: ``data`` 为 ``SessionSummary`` 列表（``updated_at`` 倒序）；
        无会话时为 ``[]``。
    """
    sessions = await session_repo.list_by_user(user_id)
    data = [
        SessionSummary(
            session_id=session.thread_id,
            title=session.title,
            created_at=session.created_at,
            updated_at=session.updated_at,
        ).model_dump()
        for session in sessions
    ]
    return ServiceResponse(code=ErrorCode.Success, data=data)
```

（`Annotated`、`APIRouter`、`ErrorCode`、`ServiceResponse`、`SessionRepoDep` 已在文件中导入；
`Path` 也已导入。只需补 `Query` 导入。）

**Step 4: 运行，确认通过**

Run: `uv run pytest tests/test_session_controller.py -q`
Expected: PASS（3 passed）

**Step 5: Commit**

```bash
git add core/agent/controller/session.py core/agent/tests/test_session_controller.py
git commit -m "feat(agent): 新增 GET /session 会话列表接口"
```

---

### Task 3: `SessionRepository.list_by_user`

**Files:**
- Modify: `core/agent/db/session_repository.py`

> 该方法是 SQLAlchemy 数据访问，项目约定不为其写离线单测（现有 `exists/create/touch`
> 同样无直连测试，由 fake repo 在业务层替代）。行为正确性由 Task 2 的接口测试（映射/信封）
> 与代码 review 共同保证。

**Step 1: 实现**

在 `core/agent/db/session_repository.py` 的 `SessionRepository` 中，`exists` 之后新增：

```python
    async def list_by_user(self, user_id: str) -> list[AgentSession]:
        """按用户列出正常状态（status=1）会话，按更新时间倒序。"""
        async with self._sessionmaker() as session:
            result = await session.execute(
                select(AgentSession)
                .where(
                    AgentSession.user_id == user_id,
                    AgentSession.status == 1,
                )
                .order_by(AgentSession.updated_at.desc())
            )
            return list(result.scalars().all())
```

（`select`、`AgentSession` 已在文件中导入。）

**Step 2: 确认可导入、无语法错误**

Run: `uv run python -c "import db.session_repository"`
Expected: 无输出（成功）

**Step 3: 全量测试**

Run: `uv run pytest -q`
Expected: 全部通过（含新增 5 个用例）

**Step 4: Commit**

```bash
git add core/agent/db/session_repository.py
git commit -m "feat(agent): SessionRepository 支持按 user_id 列出会话"
```

---

### Task 4: 收尾验证

**Step 1: 全量测试**

Run: `uv run pytest -q`
Expected: 全部通过

**Step 2: 路由自查（可选）**

Run: `uv run python -c "import main; main.create_app()"`
Expected: 无导入错误

---

## 风险与备注

- **路由路径**：`session_router` 前缀为 `/session`，空路径即 `GET /session`，与既有
  `GET /session/{thread_id}/messages` 不冲突。
- **失败路径**：缺 `user_id` 由 FastAPI 触发 `RequestValidationError`，经 `main.py`
  既有 handler 转为 `code=1003`（HTTP 200 信封）。
- **离线覆盖边界**：`status=1` 过滤与 `updated_at` 排序在 SQL 层，离线 fake 覆盖不到；
  如需 DB 级验证可另加 testcontainers 集成测试（本次不做）。
- **schema**：本次不加 `(user_id, status, updated_at)` 索引（YAGNI）。

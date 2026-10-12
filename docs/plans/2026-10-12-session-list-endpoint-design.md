# 会话列表接口设计

- 日期：2026-10-12
- 目标目录：`core/agent`
- 状态：已评审通过，进入实现
- 端点：`GET /session`

## 1. 目标

按 `user_id` 返回该用户的会话列表（业务元数据），供前端侧边栏「最近/全部会话」
使用。只读 `agent_session` 业务表，不触碰 checkpointer。

## 2. 接口契约

```
GET /session?user_id=<str>
→ 200 ServiceResponse{ code: 0, message: "OK", data: [SessionSummary, ...] }
```

- `user_id`：必填 query 参数，`min_length=1`。
  - 缺失 / 空：由现有 `RequestValidationError` 全局处理器转
    `code: 1003 ParameterInvalid`。
- 仅返回 `status = 1`（正常）的会话。
- 排序：`updated_at` 倒序（最近活跃在前）。
- 无会话：`data: []`，非错误；无分页。
- `user_id` 仅作为过滤条件，不出现在返回项中。

## 3. 响应模型

在 `controller/session.py` 内定义 `SessionSummary`——它是端点专用响应 DTO，
与路由同址（只有 controller 消费，无跨层复用；跨层共享的模型才放 `domain/`）：

```python
class SessionSummary(BaseModel):
    session_id: str
    title: str | None = None
    created_at: datetime
    updated_at: datetime
```

`session_id` 映射自内部 `agent_session.thread_id`；对前端统一暴露 `session_id`
（前端无 `thread_id` 概念）。`datetime` 由 pydantic 序列化为 ISO 字符串。

## 4. 分层与改动点

```
controller/session.py   SessionSummary 定义 + GET /session -> 映射 -> ServiceResponse
db/session_repository.py list_by_user(user_id) -> list[AgentSession]
```

1. **`db/session_repository.py`** 新增：

   ```python
   async def list_by_user(self, user_id: str) -> list[AgentSession]:
       async with self._sessionmaker() as session:
           result = await session.execute(
               select(AgentSession)
               .where(AgentSession.user_id == user_id, AgentSession.status == 1)
               .order_by(AgentSession.updated_at.desc())
           )
           return list(result.scalars().all())
   ```

   `sessionmaker` 为 `expire_on_commit=False`，session 关闭后读取列安全。

2. **`controller/session.py`** 新增路由（router 前缀 `/session`，空路径即 `/session`）：

   ```python
   @session_router.get("", response_model=ServiceResponse, summary="获取会话列表")
   async def list_sessions(
       session_repo: SessionRepoDep,
       user_id: Annotated[str, Query(min_length=1, description="用户 id")],
   ) -> ServiceResponse:
       sessions = await session_repo.list_by_user(user_id)
       data = [
        SessionSummary(
            session_id=s.thread_id,
            title=s.title,
            created_at=s.created_at,
            updated_at=s.updated_at,
        ).model_dump()
        for s in sessions
    ]
    return ServiceResponse(code=ErrorCode.Success, data=data)
```

与既有 `GET /session/{thread_id}/messages` 无路由冲突。

3. **`controller/session.py`** 内定义 `SessionSummary`（`session_id` 字段）。

## 5. 测试

新增 `tests/test_session_controller.py`，不依赖真实 PG：

- 用 `create_app()` 构造 app，手工设置 `app.state.session_repo`（fake repo，
  实现 `list_by_user`），经 `TestClient` 发起请求；不使用 `with`（避免触发
  lifespan 连 DB，`session_repo` 由测试注入）。
- 用例：
  - 正常：返回 `code=0`，`data` 含对应 `session_id/title/created_at/updated_at`。
  - 空：无会话 → `data == []`，`code=0`。
  - 缺 `user_id` → `RequestValidationError` handler → `code=1003`。

**边界**：`status=1` 过滤与 `updated_at` 排序由 SQL 实现，离线 fake 覆盖不到，
由 review / 集成保证。

## 6. 明确不做（YAGNI）

- 不加 `(user_id, status, updated_at)` 索引迁移（待有性能需求再加）。
- 不返回最后消息预览 / 消息数（需逐个读 checkpointer，N 次 IO）。
- 不做分页 / 搜索（前端已有本地搜索与分组）。
- 不返回 `status` 字段（服务端已过滤为正常）。

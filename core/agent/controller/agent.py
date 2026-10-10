"""Agent 流式对话控制器。

本层只做接口适配与编排：接收已解析的 ``ModelConfig``，从 ``app.state`` 注入
checkpointer / store，构造 agent，然后把 ``stream_agent_events`` 产出的领域事件
逐条编码为 ``ServerSentEvent`` 交给 FastAPI 路由层。

事件契约见 ``harness/domain/agent_event.py``，SSE 编码见
``harness/streaming/sse.py``。
"""

from __future__ import annotations

import uuid
from typing import Annotated, Any, AsyncIterator

from fastapi import APIRouter
from fastapi.params import Header
from fastapi.sse import EventSourceResponse, ServerSentEvent
from langchain_core.tools import tool
from langgraph.prebuilt import ToolRuntime
from pydantic import BaseModel, Field

from controller.deps import CheckpointerDep, SessionRepoDep, StoreDep
from domain.model_config import ModelConfig
from harness.streaming.agent_stream import stream_agent_events
from harness.streaming.sse import to_sse
from service.agent_service import create_lead_agent, RuntimeContext

agent_router = APIRouter(
    prefix="/agent/v1",
    tags=["agent"],
)


class StreamPayload(BaseModel):
    user_id: str = Field(description="user id")
    input: str = Field(description="input provided by the user to the agent")
    thread_id: str = Field(
        description="The session ID is used as the primary key by the checkpointer to restore/save the session state.")
    model_conf: ModelConfig = Field(description="model configuration provided by the agent runtime")


@tool(description="获取指定城市的天气情况")
def get_weather(city: str, runtime: ToolRuntime):
    """FIXME 仅用于测试的工具"""
    return f"It's always sunny in the {city}"


def _normalize_input(user_input: str) -> dict[str, Any]:
    return {
        "messages": [
            {
                "role": "user",
                "content": user_input
            }
        ]
    }


@agent_router.post("/chat/stream", response_class=EventSourceResponse)
async def stream_chat(
        payload: StreamPayload,
        checkpointer: CheckpointerDep,
        store: StoreDep,
        session_repo: SessionRepoDep,
        x_trace_id: Annotated[str | None, Header()] = None,
) -> AsyncIterator[ServerSentEvent]:
    """流式对话（SSE）。

    Args:
        payload (StreamPayload): 对话请求
        checkpointer: 应用级 checkpointer（依赖注入）。
        store: 应用级长期记忆 store（依赖注入）。
        session_repo: 应用级会话业务表 repository（依赖注入）。
        x_trace_id: trace id

    Yields:
        ServerSentEvent: 领域事件按 SSE 编码后逐条下发，事件类型见事件契约。
    """
    agent = create_lead_agent(
        payload.model_conf,
        [get_weather],
        checkpointer=checkpointer,
        store=store,
        session_repo=session_repo,
    )

    trace_id = x_trace_id or uuid.uuid4().hex

    config = {
        "configurable": {"thread_id": payload.thread_id},
        "metadata": {"trace_id": trace_id},
    }

    async for event in stream_agent_events(
            agent,
            _normalize_input(payload.input),
            config=config,
            context=RuntimeContext(user_id=payload.user_id, trace_id=trace_id),
            model=payload.model_conf.model,
    ):
        yield to_sse(event)

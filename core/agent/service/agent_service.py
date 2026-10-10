from __future__ import annotations

from typing import Any

from typing_extensions import NotRequired, Required

from langchain.agents import AgentState, create_agent
from langchain.chat_models import init_chat_model
from langchain_core.language_models import BaseChatModel
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.store.base import BaseStore
from pydantic import BaseModel

from db.session_repository import SessionRepository
from domain.model_config import ModelConfig
from harness.middleware.builder import build_middleware


# 可持久化的运行时状态
class RuntimeState(AgentState):
    # 记忆压缩类：summary
    # 业务产出类：citations（rag 引用来源）、artifacts（生成的文件产物等）、plan/todos（任务规划进度）
    # 统计类：token_usage、turn_count、latency
    # 流程控制类：当前阶段、是否需要人工确认、retry_count
    token_usage: NotRequired[dict]
    call_count: Required[int]  # 循环调用次数


# 贯穿整个 agent 链路的只读上下文
class RuntimeContext(BaseModel):
    user_id: str
    # 租户 id？
    # request_id: str
    trace_id: str
    # 运行时的依赖，例如 db、redis、http_client、retriever 等
    # 调用参数：locale/language、feature_flags、quota


def create_lead_agent(
        model_config: ModelConfig,
        tools: list | None = None,
        *,
        checkpointer: BaseCheckpointSaver[Any] | None = None,
        store: BaseStore | None = None,
        session_repo: SessionRepository | None = None,
        debug: bool = False,
):
    # 仅透传显式提供的可选参数，避免把 None 传给 provider 构造函数（如 base_url=None）。
    optional_kwargs = {
        "api_key": model_config.api_key,
        "base_url": model_config.base_url,
        "temperature": model_config.temperature,
        "max_tokens": model_config.max_tokens,
        "timeout": model_config.timeout,
        "max_retries": model_config.max_retries,
    }
    model_kwargs: dict[str, Any] = {
        "model": model_config.model,
        "model_provider": model_config.model_provider,
        **{k: v for k, v in optional_kwargs.items() if v is not None},
        **model_config.extra,  # top_p、reasoning_effort 等透传
    }

    model: BaseChatModel = init_chat_model(**model_kwargs)

    return create_agent(  # type: ignore[call-overload]
        model=model,
        tools=tools or [],
        system_prompt="",
        context_schema=RuntimeContext,
        state_schema=RuntimeState,
        checkpointer=checkpointer,
        store=store,
        debug=debug,
        middleware=build_middleware(session_repo, model),
    )

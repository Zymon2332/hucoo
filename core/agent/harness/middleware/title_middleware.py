"""会话标题生成中间件。

用户首轮对话时，用**当前对话的模型**根据首条用户消息生成标题并回填到
``agent_session.title``；模型失败或输出为空则退化为首条用户消息的截断文本，
用户消息也为空时使用占位标题 ``New Chat``。

在 ``aafter_model`` 触发：首轮第一次模型调用后即生成，且不阻塞用户响应。
"是否首轮"来自 SessionMiddleware 写入的状态字段 ``first_turn``；再用实例内
``_handled`` 保证同一 run 内多个 model step 只处理一次。生成结果同时写入状态
字段 ``session_title``，供后续中间件/节点消费。
"""

from __future__ import annotations

import unicodedata
from typing import Any

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_config
from langgraph.runtime import Runtime
from loguru import logger
from typing_extensions import NotRequired, override

from db.session_repository import SessionRepository
from harness.message_utils import first_user_text, text_of

_TITLE_MAX_LEN = 20
_FALLBACK_TITLE = "New Chat"
_ELLIPSIS = "…"
_QUOTE_PAIRS = {
    '"': '"',
    "'": "'",
    "“": "”",
    "‘": "’",
    "「": "」",
    "『": "』",
    "《": "》",
}
_ZERO_WIDTH = {"\u200b", "\u200d", "\ufe0f"}

_TITLE_PROMPT = (
    "You are a conversation title generator. Based on the user's first message, "
    "produce a concise title that summarizes the topic. "
    "Write the title in the same language as the user's message. "
    f"Keep it within {_TITLE_MAX_LEN} characters, with no trailing punctuation "
    "and no surrounding quotes. Output only the title text itself, without any "
    "label or prefix such as 'Title:'."
)


def _normalize(text: str) -> str:
    """折叠所有空白（含换行）为单个空格。"""
    return " ".join(text.split())


def _strip_quotes(text: str) -> str:
    """剥离首尾成对的包裹引号。"""
    while (
        len(text) >= 2
        and text[0] in _QUOTE_PAIRS
        and text[-1] == _QUOTE_PAIRS[text[0]]
    ):
        text = text[1:-1].strip()
    return text


def _truncate(text: str, limit: int) -> str:
    """按字符截断并追加省略号，避免截到组合字符/零宽字符中间。"""
    if len(text) <= limit:
        return text
    cut = text[: limit - 1]  # 预留 1 位给省略号
    while cut and (unicodedata.combining(cut[-1]) or cut[-1] in _ZERO_WIDTH):
        cut = cut[:-1]
    return cut.rstrip() + _ELLIPSIS


def clean_title(raw: str) -> str:
    """规整标题文本：折叠空白、去成对引号，并截断。"""
    return _truncate(_strip_quotes(_normalize(raw)), _TITLE_MAX_LEN)


class TitleState(AgentState):
    """TitleMiddleware 注入的状态字段。"""

    session_title: NotRequired[str]
    """本次 run 生成的会话标题。"""


class TitleMiddleware(AgentMiddleware[Any, Any, Any]):
    """首次对话时生成会话标题。"""

    state_schema = TitleState

    def __init__(
        self, session_repo: SessionRepository, model: BaseChatModel
    ) -> None:
        super().__init__()
        self._session_repo = session_repo
        self._model = model
        # 本次实例（= 本次请求/run）已处理的 thread_id。
        self._handled: set[str] = set()

    @override
    async def aafter_model(
        self, state: Any, runtime: Runtime[Any]
    ) -> dict[str, Any] | None:
        config = get_config()
        thread_id = config.get("configurable", {}).get("thread_id")
        if not isinstance(thread_id, str) or not thread_id:
            return None
        if thread_id in self._handled:
            return None
        self._handled.add(thread_id)

        if not state.get("first_turn"):
            return None

        messages = state.get("messages", []) or []
        user_text = first_user_text(messages)
        title = await self._generate_title(user_text)
        await self._session_repo.update_title(thread_id, title)
        return {"session_title": title}

    async def _generate_title(self, user_text: str | None) -> str:
        fallback = clean_title(user_text or "") or _FALLBACK_TITLE
        if not user_text or not user_text.strip():
            return fallback
        try:
            response = await self._model.ainvoke(
                [
                    SystemMessage(content=_TITLE_PROMPT),
                    HumanMessage(content=user_text),
                ]
            )
            title = clean_title(text_of(getattr(response, "content", None)))
        except Exception as exc:  # noqa: BLE001
            logger.warning("Title generation failed, fallback used: {}", exc)
            return fallback
        return title or fallback

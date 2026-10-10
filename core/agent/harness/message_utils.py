"""消息工具函数（middleware / streaming 共用）。"""

from __future__ import annotations

from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage


def text_of(content: object) -> str:
    """把消息 content 规整为纯文本。"""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and isinstance(block.get("text"), str):
                parts.append(block["text"])
        return "".join(parts)
    return ""


def first_business_index(messages: list[Any]) -> int:
    """返回首个非系统消息的下标；全为系统消息时返回列表长度。"""
    index = 0
    while index < len(messages) and isinstance(messages[index], SystemMessage):
        index += 1
    return index


def first_user_text(messages: list[Any]) -> str | None:
    """取首条用户消息文本（跳过前导系统消息）；无则返回 None。"""
    start = first_business_index(messages)
    if start < len(messages) and isinstance(messages[start], HumanMessage):
        return text_of(getattr(messages[start], "content", None)) or None
    return None

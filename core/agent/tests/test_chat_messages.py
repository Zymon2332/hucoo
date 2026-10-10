"""会话消息组装测试（不依赖真实 PG / provider）。"""

from __future__ import annotations

from typing import Any, cast

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig

from harness.domain.chat_message import assemble_chat_messages
from harness.streaming.agent_stream import stream_agent_events
from service.agent_service import RuntimeContext
from tests.fakes import build_reasoning_every_call_agent


def test_assemble_merges_reasoning_tool_calls_and_result():
    messages = [
        HumanMessage(content="北京天气怎么样？", id="u1"),
        AIMessage(
            content="",
            id="a1",
            additional_kwargs={"reasoning_content": "需要调用天气工具"},
            tool_calls=[
                {
                    "name": "get_weather",
                    "args": {"city": "Beijing"},
                    "id": "call_1",
                    "type": "tool_call",
                }
            ],
        ),
        ToolMessage(
            content="Beijing: sunny, 25C", tool_call_id="call_1", name="get_weather"
        ),
        AIMessage(
            content="北京今天晴，25℃。", id="a2", additional_kwargs={"reasoning_content": "汇总结果"}
        ),
    ]

    out = [m.model_dump(exclude_none=True) for m in assemble_chat_messages(messages)]

    assert out[0] == {"role": "user", "id": "u1", "content": "北京天气怎么样？"}
    assert out[1]["role"] == "assistant"
    assert out[1]["content"] == "北京今天晴，25℃。"
    assert out[1]["reasoning"] == "需要调用天气工具\n汇总结果"
    assert out[1]["tool_calls"] == [
        {
            "id": "call_1",
            "name": "get_weather",
            "args": {"city": "Beijing"},
            "result": "Beijing: sunny, 25C",
            "is_error": False,
        }
    ]


def test_assemble_skips_system_messages():
    out = assemble_chat_messages(
        [
            SystemMessage(content="you are a bot", id="s1"),
            HumanMessage(content="hi", id="u1"),
        ]
    )

    assert [m.role for m in out] == ["user"]


def test_assemble_omits_empty_optional_fields():
    out = assemble_chat_messages([HumanMessage(content="hi", id="u1")])

    assert out[0].model_dump(exclude_none=True) == {
        "role": "user",
        "id": "u1",
        "content": "hi",
    }
    assert out[0].reasoning is None
    assert out[0].tool_calls is None


async def test_assemble_from_scripted_agent_run():
    agent = build_reasoning_every_call_agent()
    config: dict[str, Any] = {
        "configurable": {"thread_id": "t-chat"},
        "metadata": {"trace_id": "x"},
    }
    async for _ in stream_agent_events(
        agent,
        {"messages": [{"role": "user", "content": "北京天气怎么样？"}]},
        config=config,
        context=RuntimeContext(user_id="u1", trace_id="tr1"),
        model="test",
    ):
        pass

    state = await agent.aget_state(cast(RunnableConfig, config))
    out = [
        m.model_dump(exclude_none=True)
        for m in assemble_chat_messages(state.values["messages"])
    ]

    assert len(out) == 2
    assert out[0]["role"] == "user"
    assert out[0]["content"] == "北京天气怎么样？"

    assistant = out[1]
    assert assistant["role"] == "assistant"
    assert assistant["content"] == "done"
    assert assistant["reasoning"] == "thinking-1\nthinking-2"
    assert len(assistant["tool_calls"]) == 1
    call = assistant["tool_calls"][0]
    assert call["name"] == "get_weather"
    assert call["args"] == {"city": "Beijing"}
    assert call["result"] == "Beijing: sunny, 25C"
    assert call["is_error"] is False

"""领域事件 -> SSE 传输对象。

这是**唯一** import ``fastapi.sse`` 的层：领域层保持框架无关，
控制器只需 ``yield to_sse(ev)``，FastAPI 路由层负责把 ``ServerSentEvent``
序列化进 ``text/event-stream`` 的 ``event:`` / ``data:`` / ``id:`` 字段。
"""

from __future__ import annotations

import itertools
import time
from typing import TypeVar

from fastapi.sse import ServerSentEvent

from harness.domain.agent_event import BaseEvent

E = TypeVar("E", bound=BaseEvent)


def to_sse(event: BaseEvent) -> ServerSentEvent:
    """把领域事件编码为 SSE 传输对象。

    Args:
        event: 领域事件。

    Returns:
        ``ServerSentEvent``：``event`` 取判别字段 ``type``，``id`` 取 ``seq``，
        ``data`` 直接传模型实例（routing 会走 ``model_dump_json()``）。
    """
    return ServerSentEvent(event=event.type, data=event, id=str(event.seq))


class EventFactory:
    """集中分配信封字段（``run_id`` / ``seq`` / ``ts``）并构造领域事件。

    asyncio 单线程，``next(counter)`` 天然有序，无需加锁。
    """

    def __init__(self, run_id: str) -> None:
        self.run_id = run_id
        self._seq = itertools.count(1)

    def emit(self, cls: type[E], **fields: object) -> E:
        """构造一个事件，自动填充 run_id / seq / ts。"""
        return cls(
            run_id=self.run_id,
            seq=next(self._seq),
            ts=int(time.time() * 1000),
            **fields,
        )

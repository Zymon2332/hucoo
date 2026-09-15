from typing import AsyncIterator

from fastapi import APIRouter

agent_router = APIRouter(
    prefix="/agent/v1",
    tags=["agent"],
)


# @agent_router.get('/chat')
# async def stream_chat(query: str) -> AsyncIterator[]:
#     pass

import json
from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.routing import iter_route_contexts
from loguru import logger
from starlette.responses import JSONResponse

from config.app_config import get_app_config
from config.checkpointer_config import get_checkpointer_config
from config.database_config import get_database_config
from config.logging_config import configure_logging, get_logging_config
from config.store_config import get_store_config
from constants.error_code import ErrorCode
from controller.agent import agent_router
from controller.session import session_router
from db.engine import dispose_engine, get_sessionmaker
from db.session_repository import SessionRepository
from domain.exception import ServiceError
from domain.response import ServiceResponse
from harness.resources import build_checkpointer, build_pool, build_store

load_dotenv()


async def print_routes(app: FastAPI):
    route_infos = []
    for route_context in iter_route_contexts(app.routes):
        route_infos.append(
            {
                "path": route_context.path,
                "name": route_context.name,
                "methods": (
                    sorted(route_context.methods) if route_context.methods else []
                ),
            }
        )
    logger.info("Registered routes:")
    for route_info in route_infos:
        logger.info(json.dumps(route_info, ensure_ascii=False))


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(get_logging_config())
    await print_routes(app)

    checkpointer_config = get_checkpointer_config()
    store_config = get_store_config()
    database_config = get_database_config()

    pool = await build_pool(database_config)
    checkpointer = await build_checkpointer(checkpointer_config, pool)
    store = await build_store(store_config, pool)
    session_repo = SessionRepository(get_sessionmaker(database_config))

    app.state.checkpointer = checkpointer
    app.state.store = store
    app.state.session_repo = session_repo
    logger.info(
        "Resources ready: checkpointer={}, store={}",
        checkpointer_config.backend,
        store_config.backend,
    )

    try:
        yield
    finally:
        await pool.close()
        await dispose_engine()
        logger.info("Resources released")


def create_app() -> FastAPI:
    logger.info(" AGENT SERVER START ")
    app = FastAPI(lifespan=lifespan)

    app.include_router(agent_router)
    app.include_router(session_router)

    @app.exception_handler(RequestValidationError)
    def validation_exception_handler(_request: Request, exc: RequestValidationError):
        error_details = [
            f"field: {'.'.join(map(str, err['loc']))}, message: {err['msg']}"
            for err in exc.errors()
        ]
        service_response = ServiceResponse(
            code=ErrorCode.ParameterInvalid,
            message=f"Request parameter error: {error_details}",
        )

        return JSONResponse(content=service_response.model_dump())

    @app.exception_handler(ServiceError)
    def service_error_handler(_request: Request, exc: ServiceError) -> JSONResponse:
        return JSONResponse(content=exc.to_response().model_dump())

    return app


if __name__ == "__main__":
    app_config = get_app_config()
    uvicorn.run(
        app="main:create_app",
        host="0.0.0.0",
        port=app_config.service_port,
        workers=app_config.workers,
        reload=False,
        log_level=app_config.log_level,
    )

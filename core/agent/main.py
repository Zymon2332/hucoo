import json
import os
from contextlib import asynccontextmanager
from urllib.request import Request

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from loguru import logger
from starlette.responses import JSONResponse

from constants.error_code import ErrorCode
from controller.api import agent_router
from domain.response import ServiceResponse

load_dotenv()

async def print_routes(app: FastAPI):
    route_infos = []
    for route in app.routes:
        route_infos.append(
            {
                "path": getattr(route, "path", str(route)),
                "name": getattr(route, "name", type(route).__name__),
                "methods": (
                    list(route.methods) if hasattr(route, "methods") else "chat"
                ),
            }
        )
    logger.info("Registered routes:")
    print("Registered routes:")
    for route_info in route_infos:
        logger.info(json.dumps(route_info, ensure_ascii=False))
        print(json.dumps(route_info, ensure_ascii=False))

@asynccontextmanager
async def lifespan(app: FastAPI):
    await print_routes(app)
    yield
    # TODO 这里做一些回收工作


def create_app() -> FastAPI:
    logger.info(" AGENT SERVER START ")
    app = FastAPI(lifespan=lifespan)

    app.include_router(agent_router)

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

    return app


if __name__ == "__main__":
    uvicorn.run(
        app="main:create_app",
        host="0.0.0.0",
        port=int(os.environ.get("SERVICE_PORT", 2000)),
        workers=int(os.environ.get("WORKERS", 1)),
        reload=False,
        log_level="info",
    )

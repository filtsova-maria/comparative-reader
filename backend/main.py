import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers.search import router as search_router
from backend.routers.testimonies import router as testimonies_router

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


def get_cors_origins() -> list[str]:
    configured_origins = os.getenv("CORS_ORIGINS")
    if configured_origins is None:
        return DEFAULT_CORS_ORIGINS
    return [
        origin.strip()
        for origin in configured_origins.split(",")
        if origin.strip()
    ]


app = FastAPI(title="Comparative Reader API", version="0.3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.include_router(testimonies_router)
app.include_router(search_router)

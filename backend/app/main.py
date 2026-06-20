"""FastAPI application entrypoint.

Run locally from the backend folder:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Interactive API docs are then at http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CURRENCY
from .database import Base, engine
from .routers import alerts, auth, favorites, lists, products, stores

# Create tables on startup if they don't exist (simple approach for an MVP).
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pickly API", version="0.1.0")

# Allow the mobile app (and local dev) to call the API.
# For production, replace "*" with your real app/website origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(stores.router)
app.include_router(lists.router)
app.include_router(favorites.router)
app.include_router(alerts.router)


@app.get("/")
def root():
    return {"app": "Pickly API", "status": "ok", "currency": CURRENCY, "docs": "/docs"}

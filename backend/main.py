from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from backend.api import players, clubs, scouting, dashboard, model

app = FastAPI(title="PlayerValue API")

# Configure middleware
from starlette.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok"}

# Include routers
app.include_router(players.router, prefix="/api")
app.include_router(clubs.router, prefix="/api")
app.include_router(scouting.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(model.router, prefix="/api")

# Mount static files (frontend) last
frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {"message": "Frontend not found, API running."}

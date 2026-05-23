from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from config.database import Base, engine
from auth.auth_routes import router as auth_router
from auth import auth_models
from modules.inputJob.career_route import router as career_router
from modules.inputJob import career_model
from modules.analysis.analysis_router import router as analysis_router
from modules.analysis import analysis_model
from modules.interviewQuestions.question_router import router as interview_questions_router
from modules.interviewQuestions import question_model
from modules.resources.resources_router import router as resources_router
from modules.resources import resources_model
from modules.atsResume.ats_resume_router import router as ats_resume_router
from modules.atsResume import ats_resume_model

app = FastAPI(title="CLAI")

# Ensure auth tables exist
Base.metadata.create_all(bind=engine)

import os

origins_env = os.getenv("CORS_ORIGINS")
if origins_env:
    origins = [origin.strip() for origin in origins_env.split(",") if origin.strip()]
else:
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

# Add CORS middleware FIRST so it wraps all routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler to ensure CORS headers are sent even on errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all exceptions and return CORS-enabled error responses."""
    import logging
    logger = logging.getLogger(__name__)
    logger.exception("Unhandled exception: %s", exc)
    
    origin_header = "http://localhost:3000"
    req_origin = request.headers.get("origin")
    if req_origin and req_origin in origins:
        origin_header = req_origin
    elif origins and "*" in origins:
        origin_header = "*"
    elif origins:
        origin_header = origins[0]
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": origin_header,
            "Access-Control-Allow-Credentials": "true",
        },
    )

app.include_router(auth_router)
app.include_router(career_router)
app.include_router(analysis_router)
app.include_router(interview_questions_router)
app.include_router(resources_router)
app.include_router(ats_resume_router)


@app.get("/health")
def health():
    return {"message": "Welcome to CLAI"}

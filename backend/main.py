from fastapi import FastAPI

from config.database import Base, engine
from auth.auth_routes import router as auth_router
from auth import auth_models
from modules.inputJob.career_route import router as career_router
from modules.inputJob import career_model
from modules.analysis.analysis_router import router as analysis_router
from modules.analysis import analysis_model
from modules.interviewQuestions.question_router import router as interview_questions_router
from modules.interviewQuestions import question_model
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="CLAI")

# Ensure auth tables exist
Base.metadata.create_all(bind=engine)

origins=[
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(career_router)
app.include_router(analysis_router)
app.include_router(interview_questions_router)


@app.get("/health")
def health():
    return {"message": "Welcome to CLAI"}

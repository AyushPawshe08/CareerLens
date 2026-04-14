# CLAUDE.md — CareerLensAI Project Guide

## Project Name

CareerLensAI

---

# Project Overview

CareerLensAI is an AI-powered career analysis platform that helps users analyze their resumes against job descriptions.

The system provides:

* Resume vs Job Description analysis
* Skill gap detection
* Match score calculation
* Interview question generation
* ATS-friendly resume generation
* Full history of past analyses
* Resume version management

The platform is designed as a scalable backend-first AI SaaS system.

---

# Core System Goals

The system must:

1. Allow users to upload multiple resumes
2. Allow users to add multiple job descriptions
3. Run AI-based analysis between resume and job description
4. Generate:

   * Skill gaps
   * Suggestions
   * Interview questions
   * ATS-friendly resumes
5. Store all analysis results permanently
6. Provide full history access
7. Support asynchronous background processing
8. Be scalable for multiple users

---

# Tech Stack

## Backend Framework

FastAPI

Used For:

* REST API creation
* Request handling
* File uploads
* Authentication endpoints

---

## Database

SQLite (Development)
PostgreSQL (Production)

Used For:

* Users
* Resumes
* Job Descriptions
* Analysis History
* Interview Questions
* ATS Resumes

---

## ORM

SQLAlchemy

Used For:

* Database interaction
* Model definitions
* Query handling

---

## Migration Tool

Alembic

Used For:

* Database schema versioning
* Safe database updates

---

## Background Processing

Celery

Used For:

* Resume parsing
* AI processing
* Question generation
* ATS resume generation

---

## Message Broker / Cache

Redis

Used For:

* Celery task queue
* Caching
* Performance optimization

---

## Resume Processing

Libraries:

* PyMuPDF → PDF parsing
* python-docx → DOCX parsing

Used For:

* Extract resume text
* Store extracted text

---

## AI Integration

Planned:

* Direct LLM API OR
* LangChain

Used For:

* Skill gap analysis
* Resume optimization
* Interview question generation

---

## Deployment (Later Phase)

* Docker
* Nginx
* Cloud Provider (AWS/GCP)

---

# System Architecture

Frontend → FastAPI → Redis → Celery → Database

Full Flow:

User
↓
Upload Resume
↓
FastAPI
↓
Redis Queue
↓
Celery Worker
↓
AI Processing
↓
SQLite/PostgreSQL
↓
User Views Results

---

# Project Folder Structure

```
careerlens-ai/

├── app/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── resume.py
│   │   │   ├── analysis.py
│   │   │   ├── history.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── security.py
│   │
│   ├── models/
│   │   ├── user.py
│   │   ├── resume.py
│   │   ├── job_description.py
│   │   ├── analysis.py
│   │   ├── interview_questions.py
│   │   ├── ats_resume.py
│   │
│   ├── schemas/
│   │   ├── user.py
│   │   ├── resume.py
│   │   ├── analysis.py
│   │
│   ├── services/
│   │   ├── resume_parser.py
│   │   ├── ai_service.py
│   │   ├── scoring_service.py
│   │
│   ├── workers/
│   │   ├── celery_worker.py
│   │   ├── tasks.py
│   │
│   ├── main.py
│
├── migrations/
├── uploads/
├── tests/
├── .env
├── alembic.ini
├── requirements.txt
├── CLAUDE.md
```

---

# Database Design

## users

Stores registered users.

Fields:

* id (Primary Key)
* email
* password_hash
* created_at

---

## resumes

Stores uploaded resume files.

Fields:

* id
* user_id
* file_name
* file_path
* extracted_text
* uploaded_at

Relationship:

User → Many Resumes

---

## job_descriptions

Stores job targets.

Fields:

* id
* user_id
* title
* company_name
* content
* created_at

Relationship:

User → Many JobDescriptions

---

## analyses (Core Table)

Stores main analysis results.

Fields:

* id
* user_id
* resume_id
* job_description_id
* skill_gaps
* suggestions
* match_score
* status
* created_at

Status Values:

* pending
* processing
* completed
* failed

This table drives the history system.

---

## interview_questions

Stores generated questions.

Fields:

* id
* analysis_id
* question_type
* questions_json
* created_at

Supports:

* Technical questions
* Behavioral questions
* HR questions

---

## ats_resumes

Stores generated ATS resumes.

Fields:

* id
* analysis_id
* generated_resume_text
* file_path
* created_at

---

# Analysis Workflow

Step-by-step process:

1. User uploads resume
2. Resume saved to uploads folder
3. Resume record stored in database
4. User adds job description
5. User runs analysis
6. Analysis task sent to Redis
7. Celery worker processes AI
8. Results stored in:

   * analyses
   * interview_questions
   * ats_resumes
9. User views results
10. Results appear in history

---

# API Endpoints

## Authentication

POST /auth/register
POST /auth/login

---

## Resume

POST /resume/upload
GET /resume/list

---

## Job Description

POST /job/create
GET /job/list

---

## Analysis

POST /analysis/run
GET /analysis/history
GET /analysis/{analysis_id}

---

## ATS Resume

GET /ats/{analysis_id}

---

# Redis Usage Strategy

Redis is used in two places:

## Task Queue

Stores Celery tasks.

Examples:

* extract_resume_text
* run_analysis
* generate_questions
* generate_ats_resume

---

## Caching

Used for:

* Resume extracted text
* Frequently accessed history
* AI responses

Purpose:

Improve performance.

---

# Celery Tasks

These run in background:

* parse_resume_task
* analysis_task
* question_generation_task
* ats_resume_task

Each task:

1. Receives analysis_id
2. Processes data
3. Stores results

---

# Authentication Design

Uses:

JWT Tokens

Flow:

User Login → JWT issued → Token used for API calls

Later Add:

OAuth login (Google, GitHub)

---

# Upload Handling

Uploads stored in:

```
uploads/
```

File naming:

```
resume_{user_id}_{timestamp}.pdf
```

---

# History System Design

History is generated from:

analyses table.

Query:

Get all analyses by user.

Sorted by:

created_at DESC

Each record links to:

* Resume
* Job Description
* Questions
* ATS Resume

---

# Future Improvements

Planned features:

* Resume version comparison
* Skill tracking over time
* Dashboard analytics
* Export reports
* AI interview simulation
* Multi-language resume support

---

# Testing Strategy

Use:

pytest

Test Types:

* API tests
* Database tests
* Worker tests

---

# Development Phases

Phase 1:
Project setup
Database models

Phase 2:
Authentication
Resume upload

Phase 3:
Analysis engine

Phase 4:
Background processing

Phase 5:
History UI

Phase 6:
Caching optimization

Phase 7:
Deployment

---

# Coding Guidelines

Rules:

1. Use modular architecture
2. Separate logic into services
3. Use background workers for heavy tasks
4. Always store analysis results
5. Avoid blocking API responses
6. Use environment variables
7. Validate all inputs

---

# Environment Variables (.env)

Example:

```
DATABASE_URL=sqlite:///./careerlens.db
REDIS_URL=redis://localhost:6379
SECRET_KEY=supersecretkey
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

---

# Design Philosophy

CareerLensAI must be:

* Scalable
* Modular
* Maintainable
* AI-first
* Production-ready

All features should support:

* History tracking
* Multiple resume versions
* Asynchronous processing

---

# Important Engineering Principles

1. Never overwrite past analyses
2. Always log processing status
3. Store results immediately
4. Use background workers for AI
5. Cache frequently used results
6. Design for future scaling

---

# Final Objective

Build a production-grade AI career assistant system capable of handling:

* Multiple users
* Multiple resumes
* Multiple analyses
* Persistent history
* Fast responses
* Background processing

This system architecture mirrors real-world AI SaaS backend systems.

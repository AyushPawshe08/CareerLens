# CareerLens Token Optimization Roadmap

## 1. Current Architecture Overview

CareerLens backend is a FastAPI application with PostgreSQL via SQLAlchemy, Redis-backed Celery for async work, and Groq-hosted LLM calls through a shared utility.

### Route Structure

- `backend/main.py`
  - Creates FastAPI app, initializes SQLAlchemy tables with `Base.metadata.create_all(bind=engine)`, adds CORS, and mounts routers.
- `backend/auth/auth_routes.py`
  - `/auth/register`, `/auth/verify-user`, `/auth/login`, `/auth/logout`, `/auth/get-current-user`.
- `backend/modules/inputJob/career_route.py`
  - `POST /career-inputs/`: accepts `job_description`, optional `self_description`, optional PDF `resume`; creates `CareerInput`; auto-triggers analysis.
  - `GET /career-inputs/`: lists user career inputs.
  - `GET /career-inputs/{career_input_id}`: returns one owned input.
- `backend/modules/analysis/analysis_router.py`
  - `POST /career-analysis/{career_input_id}`: queues analysis.
  - `GET /career-analysis/status/{task_id}`: polls Celery and persists result.
  - `GET /career-analysis/{career_input_id}`: fetches persisted analysis.
  - `POST /career-analysis/sync/{career_input_id}`: synchronous dev fallback.
- `backend/modules/interviewQuestions/question_router.py`
  - `POST /interview-questions/{career_input_id}`: queues interview question generation.
  - `GET /interview-questions/status/{task_id}`: polls and persists.
  - `GET /interview-questions/{career_input_id}`: fetches persisted questions.
- `backend/modules/resources/resources_router.py`
  - `POST /resources/{career_input_id}`: queues learning resource generation from missing skills.
  - `GET /resources/status/{task_id}`: polls and persists.
  - `GET /resources/{career_input_id}`: fetches persisted resources.
- `backend/modules/atsResume/ats_resume_router.py`
  - `POST /ats-resume/{career_input_id}`: queues ATS resume rewrite.
  - `GET /ats-resume/status/{task_id}`: polls and persists.
  - `GET /ats-resume/{career_input_id}`: fetches persisted rewrite.

### Service Layer Structure

- Auth business logic: `backend/auth/auth_handler.py`.
- Input ingestion: `backend/modules/inputJob/carrer_handler.py`.
- Analysis orchestration: `backend/modules/analysis/analysis_handler.py`.
- Analysis LLM services:
  - `backend/services/analysis/summaryAndImprovements.py`
  - `backend/services/analysis/skillService.py`
  - `backend/services/analysis/role_service.py`
  - `backend/services/analysis/scoring_service.py`
- Interview LLM services:
  - `backend/services/interviewQuestions/technicalQ_service.py`
  - `backend/services/interviewQuestions/behavourialQ_service.py`
  - `backend/services/interviewQuestions/hrQ_service.py`
- Resource LLM service: `backend/services/resources/resources_service.py`.
- ATS LLM service: `backend/services/atsResume/ats_resume_service.py`.
- Shared LLM helper: `backend/utils/callLLM.py`.
- Shared JSON parsing/list clamping: `backend/services/analysis/_llm_utils.py`.

### Models and Database Relationships

- `User` in `backend/auth/auth_models.py`
  - One-to-many relationship to `CareerInput` through `career_inputs`.
- `CareerInput` in `backend/modules/inputJob/career_model.py`
  - Stores `job_description`, `self_description`, `resume_file_path`, `resume_text`, `processing_status`.
  - `user_id` references `users.id`.
  - Check constraint requires either `self_description` or `resume_text`.
- `AnalysisModel` in `backend/modules/analysis/analysis_model.py`
  - References `career_inputs.id` and `users.id`.
  - Stores summary, missing skills, matched skills, role suggestions, resume suggestions, score.
- `InterviewQuestion` in `backend/modules/interviewQuestions/question_model.py`
  - One row per `career_input_id`.
  - Stores technical, behavioural, and HR questions as JSON arrays.
- `ResourceModel` in `backend/modules/resources/resources_model.py`
  - One row per `career_input_id`.
  - Stores resource objects as JSON.
- `ATSResumeModel` in `backend/modules/atsResume/ats_resume_model.py`
  - One row per `career_input_id`.
  - Stores rewritten resume text.

There are foreign keys, but most downstream models do not define SQLAlchemy relationships back to `CareerInput` or `User`. The code relies on explicit queries.

### Schemas

- `CareerInputResponse`: returns raw/stored input fields, including `resume_text`.
- `AnalysisResponse`, `AnalysisTriggerResponse`, `AnalysisStatusResponse`.
- `InterviewQuestionResponse`, `InterviewQuestionTriggerResponse`, `InterviewQuestionStatusResponse`.
- `ResourcesResponse`, `ResourcesTriggerResponse`, `ResourcesStatusResponse`.
- `ATSResumeResponse`, `ATSResumeTriggerResponse`, `ATSResumeStatusResponse`.
- Auth schemas for register/login/verification/current user.

### Utility Modules

- `backend/utils/extractPDF.py`
  - Already performs zero-token PDF text extraction using `pypdf`.
- `backend/utils/callLLM.py`
  - Central Groq chat completion wrapper.
  - Hard-coded system message: "You are an expert resume analyzer and career advisor."
  - Default model: `llama-3.1-8b-instant`.
- `backend/utils/celery_worker.py`
  - Central Celery app with Redis broker/result backend.
  - Explicitly imports analysis, interview, resource, and ATS task modules.
- `backend/config/database.py`
  - SQLAlchemy engine/session factory.
- `backend/config/redis.py`
  - Direct Redis client configured from `REDIS_URL` or host/port.
  - Currently not used for explicit app-level caching in the audited pipeline.

### Celery and Redis Integration

- Redis is used as Celery broker/result backend through `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND`.
- Celery uses JSON serialization, result expiry of 3600 seconds, thread worker pool, concurrency 8.
- Task modules:
  - `backend/modules/analysis/analysis_tasks.py`
  - `backend/modules/interviewQuestions/question_tasks.py`
  - `backend/modules/resources/resources_tasks.py`
  - `backend/modules/atsResume/ats_resume_tasks.py`
- Current pattern is fire-and-poll:
  - Route validates ownership.
  - Handler validates prerequisites and queues a Celery task.
  - Status endpoint polls `AsyncResult`.
  - On `SUCCESS`, handler persists result to PostgreSQL.

## 2. Existing Resume Processing Flow

1. User calls `POST /career-inputs/` with multipart form data.
2. `career_route.py` accepts:
   - Required `job_description`.
   - Optional `self_description`.
   - Optional `resume` upload.
3. Upload validation currently accepts only `application/pdf` and `application/octet-stream`.
4. `carrer_handler.create_career_input()` validates required text and at least one candidate source.
5. If `resume_bytes` exists:
   - `utils.extractPDF.extract_text_from_pdf()` extracts text using `pypdf`.
   - `_save_pdf_to_disk()` stores raw PDF under `backend/uploads/{user_id}/`.
6. A `CareerInput` row is created with job description, optional self description, resume file path, and extracted resume text.
7. `career_route.py` tries to auto-trigger analysis with `trigger_analysis()`.
8. Analysis uses `career_input.resume_text or career_input.self_description` as the candidate profile.

Important current behavior:

- PDF extraction is already zero-token.
- DOCX upload/extraction does not exist.
- Resume text from PDF is not centrally truncated or compressed before LLM calls.
- Job description and self-description currently have a 500-word trimming helper in `carrer_handler.py`; this is useful but incomplete because `resume_text` can still be large and downstream services still accept arbitrary text if called directly.
- Raw resume text is returned in API responses, which may become large and costly for frontend bandwidth.

## 3. Existing LLM Pipeline Flow

### Analysis Pipeline

Trigger path:

1. `POST /career-analysis/{career_input_id}` or auto-trigger from career input creation.
2. `analysis_handler.trigger_analysis()` loads `CareerInput`.
3. It chooses `resume_text = career_input.resume_text or career_input.self_description`.
4. It queues `task_run_full_analysis(career_input_id, job_description, resume_text)`.
5. `analysis_tasks.task_run_full_analysis()` runs a Celery group with 4 parallel LLM tasks:
   - Summary/suggestions.
   - Missing/matched skills.
   - Perfect roles.
   - Resume score.
6. Poll endpoint persists an `AnalysisModel`.

### Interview Question Pipeline

Trigger path:

1. `POST /interview-questions/{career_input_id}`.
2. Requires completed analysis.
3. `question_handler.trigger_interview_questions()` passes:
   - Full stored job description.
   - Full resume text/self description.
   - Analysis matched skills.
   - Analysis missing skills.
4. `question_tasks.task_generate_interview_questions()` runs 3 parallel LLM tasks:
   - Technical questions: JD + matched/missing skills.
   - Behavioural questions: JD + resume text.
   - HR questions: JD + resume text.
5. Poll endpoint persists an `InterviewQuestion`.

### Resources Pipeline

Trigger path:

1. `POST /resources/{career_input_id}`.
2. Requires completed analysis.
3. `resources_handler.trigger_resources()` passes only `analysis.missing_skills`.
4. `resources_tasks.task_generate_resources()` calls one LLM prompt for all missing skills.
5. Poll endpoint persists `ResourceModel`.

### ATS Generation Pipeline

Trigger path:

1. `POST /ats-resume/{career_input_id}`.
2. Requires completed analysis.
3. `ats_resume_handler.trigger_ats_resume()` passes:
   - Full stored job description.
   - Full resume text/self description.
   - Missing skills from analysis.
4. `ats_resume_tasks.task_generate_ats_resume()` calls one LLM prompt.
5. Poll endpoint persists `ATSResumeModel`.

## 4. Token Usage Bottlenecks

### LLM Call Audit

| # | File | Function | Prompt Source | Input Size Today | Potential Waste | Optimization |
|---|------|----------|---------------|------------------|-----------------|--------------|
| 1 | `services/analysis/summaryAndImprovements.py` | `get_summary_and_suggestions()` | Inline f-string | Full JD + full resume/self description | Repeats same large context used by skills and score calls | Use compressed context, truncate JD/resume, reuse precomputed skills, reduce instruction text |
| 2 | `services/analysis/skillService.py` | `get_missing_and_matched_skills()` | Inline f-string | Full JD + full resume/self description | LLM is used for extraction/comparison that can be partly deterministic | Add deterministic skill extraction first; only use LLM for ambiguous/semantic cleanup |
| 3 | `services/analysis/role_service.py` | `get_perfect_job_roles()` | Inline f-string | Full resume/self description | Full resume often unnecessary for role suggestion | Use extracted title/skills/seniority summary instead of raw resume |
| 4 | `services/analysis/scoring_service.py` | `get_resume_score()` | Inline f-string | Full JD + full resume/self description | LLM used for numeric scoring, costly and nondeterministic | Replace with TF-IDF/cosine score plus skill coverage score |
| 5 | `services/interviewQuestions/technicalQ_service.py` | `generate_technical_questions_llm()` | Inline f-string | Full JD + matched/missing skills | Full JD often unnecessary once skills are available | Pass role title/seniority/top requirements + skills only |
| 6 | `services/interviewQuestions/behavourialQ_service.py` | `generate_behavioural_questions_llm()` | Inline f-string | Full JD + full resume/self description | Behavioural questions do not need full resume; prompt has verbose rules | Use compressed profile and role context |
| 7 | `services/interviewQuestions/hrQ_service.py` | `generate_hr_questions_llm()` | Inline f-string | Full JD + full resume/self description | Same large context repeated from behavioural | Use compressed profile and role context |
| 8 | `services/resources/resources_service.py` | `generate_resources_llm()` | Inline f-string | Missing skills list only | Usually modest; can grow if missing skills list is large | Cap missing skills and use deterministic resource templates for common skills |
| 9 | `services/atsResume/ats_resume_service.py` | `generate_ats_resume_llm()` | Inline f-string | Full JD + full resume + missing skills | Highest per-call token need; but prompt is verbose and can include irrelevant resume/JD text | Use structured compressed JD + structured resume facts; cap context; preserve raw resume only if necessary |

### Bottleneck Summary

- The same JD/resume pair is sent repeatedly across analysis tasks.
- `get_resume_score()` should not require an LLM.
- `get_missing_and_matched_skills()` can be substantially reduced through deterministic skill extraction.
- Interview generation repeats context that analysis already produced.
- ATS rewrite is inherently LLM-heavy, but it can be fed compressed facts instead of raw text.
- No central token budget utility exists; each service builds prompts independently.
- No prompt length telemetry exists, so cost regressions are invisible.
- Redis is only used for Celery, not for cached preprocessing artifacts or LLM response caching.

## 5. Proposed Architecture

Introduce a preprocessing layer between input ingestion and all LLM services:

1. Document extraction stage
   - PDF: continue using `pypdf`.
   - DOCX: add `python-docx` extraction.
   - Normalize whitespace, remove repeated blank lines, strip obvious boilerplate.

2. Context preparation stage
   - Build bounded artifacts:
     - `jd_excerpt`
     - `resume_excerpt`
     - `jd_skills`
     - `resume_skills`
     - `matched_skills`
     - `missing_skills`
     - `tfidf_similarity_score`
     - `compressed_profile`
     - `compressed_role_context`

3. Deterministic analysis first
   - Use TF-IDF/cosine similarity for base resume-vs-JD score.
   - Use deterministic skill extraction to identify matched and missing skills.
   - Use LLM only for human-readable summary, suggestions, role ideas, interview questions, and ATS rewrite.

4. LLM prompt layer
   - Services should receive prepared context, not raw unrestricted text.
   - Add central truncation safeguards before every LLM call.
   - Reduce repeated instructions and use compact JSON schemas.

5. Caching layer
   - Cache preprocessing results by hash of normalized JD + normalized resume.
   - Cache LLM results where output is deterministic enough: analysis summary, skills cleanup, role suggestions.
   - Prefer PostgreSQL for durable completed artifacts and Redis for short-lived task/result/preprocessing caches.

Recommended direction:

- Keep `CareerInput` as the raw input record.
- Add a derived "prepared context" concept, either in a new table or generated/cached artifact.
- Make Celery tasks pass `career_input_id` and load prepared context inside workers, rather than serializing large text through Redis task messages.

## 6. New Components Required

### Document Extraction

- DOCX extractor using `python-docx`.
- Unified document extraction dispatcher based on MIME type and/or filename.
- File type validation for:
  - `application/pdf`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - Conservative fallback for `application/octet-stream` only when extension is trusted.

### Text Normalization and Truncation

- Central text budget utility:
  - Normalize whitespace.
  - Limit by characters, words, or approximate tokens.
  - Provide named budgets, for example:
    - JD excerpt: 2500-3000 characters.
    - Resume excerpt: 3000-5000 characters.
    - Interview profile context: 1200-2000 characters.
    - ATS context: larger but bounded.

### Skill Extraction

- Deterministic skill extractor:
  - Start with curated skill taxonomy in code or JSON.
  - Match normalized aliases, case-insensitive.
  - Extract skills from both JD and resume.
  - Compute matched/missing with set operations.
- Optional LLM cleanup can be a later phase, but initial savings come from avoiding the skills LLM call or shrinking it.

### TF-IDF Similarity Scoring

- Local scoring service:
  - Use scikit-learn `TfidfVectorizer` + cosine similarity, or a lightweight in-house implementation if avoiding dependency.
  - Combine text similarity with skill coverage:
    - Example weighting: 60% skill coverage, 40% TF-IDF similarity.
  - Replace `services/analysis/scoring_service.py` LLM implementation.

### Context Compression

- Deterministic compression first:
  - Extract first N relevant sections.
  - Keep role title, requirements, skills, responsibilities.
  - Keep candidate skills, projects, experience, education.
- Optional LLM compression is not recommended initially because it adds cost before savings. If added, cache aggressively and call it once per career input.

### Observability

- Add prompt size logging before `call_llm()`.
- Track:
  - prompt character count,
  - approximate token count,
  - model,
  - max output tokens,
  - calling service/function.
- Add per-career-input token budget warnings.

## 7. Files To Modify

No code should be modified until this roadmap is approved. When approved, likely files to modify are:

### Input and Extraction

- `backend/modules/inputJob/career_route.py`
  - Accept DOCX uploads and validate MIME/extension.
- `backend/modules/inputJob/carrer_handler.py`
  - Use unified extraction dispatcher.
  - Apply central text normalization/truncation.
  - Optionally create prepared context after saving raw input.
- `backend/utils/extractPDF.py`
  - Keep existing PDF extraction.
  - Possibly rename/generalize after adding DOCX support.
- `backend/requirements.txt`
  - Add `python-docx`.
  - Add `scikit-learn` if selected for TF-IDF.

### Analysis

- `backend/modules/analysis/analysis_handler.py`
  - Load or create prepared context.
  - Avoid passing large raw strings to Celery.
- `backend/modules/analysis/analysis_tasks.py`
  - Replace or reduce LLM subtasks.
  - Make scoring deterministic.
  - Potentially make skills deterministic.
- `backend/services/analysis/scoring_service.py`
  - Replace LLM scoring with TF-IDF/skill coverage.
- `backend/services/analysis/skillService.py`
  - Use deterministic skill extraction or use LLM only for cleanup.
- `backend/services/analysis/summaryAndImprovements.py`
  - Use compressed context.
- `backend/services/analysis/role_service.py`
  - Use compressed candidate profile.
- `backend/services/analysis/_llm_utils.py`
  - Add shared prompt/context helpers if kept inside analysis services.

### Interview

- `backend/modules/interviewQuestions/question_handler.py`
  - Pass prepared context instead of raw resume/JD.
- `backend/modules/interviewQuestions/question_tasks.py`
  - Adjust task payloads to use compressed context.
- `backend/services/interviewQuestions/technicalQ_service.py`
  - Use role requirements + matched/missing skills instead of full JD.
- `backend/services/interviewQuestions/behavourialQ_service.py`
  - Use compressed profile.
- `backend/services/interviewQuestions/hrQ_service.py`
  - Use compressed profile.

### ATS and Resources

- `backend/modules/atsResume/ats_resume_handler.py`
  - Pass prepared context or IDs.
- `backend/modules/atsResume/ats_resume_tasks.py`
  - Load prepared context in worker if task payload is changed.
- `backend/services/atsResume/ats_resume_service.py`
  - Use bounded structured context.
- `backend/services/resources/resources_service.py`
  - Cap missing skill count and optionally use deterministic resources for common skills.

### Shared Infrastructure

- `backend/utils/callLLM.py`
  - Add prompt-size telemetry and last-resort truncation safeguard.
- `backend/config/redis.py`
  - Use existing client for preprocessing/LLM cache if Redis caching is implemented.
- `backend/utils/celery_worker.py`
  - Register any new Celery tasks if preprocessing becomes async.

## 8. New Files To Create

Potential new files after approval:

- `backend/utils/extractDOCX.py`
  - DOCX text extraction with `python-docx`.
- `backend/utils/document_extraction.py`
  - MIME/extension dispatcher for PDF/DOCX extraction.
- `backend/utils/text_budget.py`
  - Central normalization and truncation helpers.
- `backend/services/preprocessing/context_builder.py`
  - Builds compressed JD/resume/profile artifacts.
- `backend/services/preprocessing/skill_extractor.py`
  - Deterministic skill extraction and alias matching.
- `backend/services/preprocessing/similarity_service.py`
  - TF-IDF/cosine similarity and combined score.
- `backend/services/preprocessing/cache.py`
  - Redis/PostgreSQL-backed cache access.
- Optional migration file if schema changes are approved.

## 9. Migration Strategy

### Option A: No DB Schema Change, Lowest Risk

- Store raw `CareerInput` as today.
- Compute prepared context on demand and cache in Redis by content hash.
- Persist final outputs in existing tables.
- Pros:
  - Fastest path.
  - No migration.
  - Low deployment risk.
- Cons:
  - Prepared artifacts vanish when Redis expires.
  - Recomputes after cache misses.
  - Less auditable.

### Option B: Add Prepared Context Table, Recommended Medium-Term

Add a new table, conceptually `career_input_contexts`, with:

- `id`
- `career_input_id`
- `input_hash`
- `jd_excerpt`
- `resume_excerpt`
- `compressed_role_context`
- `compressed_profile`
- `jd_skills`
- `resume_skills`
- `matched_skills`
- `missing_skills`
- `tfidf_similarity_score`
- `created_at`
- `updated_at`

Pros:

- Durable preprocessing.
- Easier to debug token usage.
- Avoids repeated extraction/compression work.
- Makes Celery payloads smaller by passing IDs.

Cons:

- Requires migration.
- Requires invalidation rules if career inputs become editable.

### Option C: Add Columns to `career_inputs`

- Add prepared fields directly to `career_inputs`.
- This is simpler than a new table but mixes raw input with derived artifacts.
- Not recommended if preprocessing evolves.

Recommendation:

- Phase 1 with Option A for rapid cost reduction.
- Phase 2 with Option B once the context shape stabilizes.

## 10. Risk Assessment

### Functional Risks

- Over-truncation may remove important resume or JD details.
- Deterministic skill extraction may miss uncommon skills without a strong taxonomy.
- TF-IDF scoring may disagree with user expectations if not blended with skill coverage.
- ATS rewrite quality may degrade if compressed context removes achievements.
- DOCX extraction can produce odd ordering for complex documents.

### Operational Risks

- Passing large strings through Celery currently inflates Redis payloads; changing task signatures requires careful compatibility rollout.
- Redis cache misses may create inconsistent latency unless preprocessing is cheap.
- Adding scikit-learn increases dependency size and deployment footprint.
- `Base.metadata.create_all()` does not manage schema migrations; real migrations need Alembic or a controlled SQL migration process.

### Data and Privacy Risks

- Caching resume/JD text in Redis duplicates sensitive user data.
- Cache keys should use hashes, and values should have TTLs.
- Avoid logging raw prompt text; log only sizes and hashes.

### Current Code Risks Observed

- `CareerInputResponse` returns full `resume_text`; large resumes may increase response size and expose more user data than needed.
- `analysis_handler.py` references `AsyncResult` in a type annotation without importing it; this may not break at runtime in current Python behavior if annotations are not eagerly evaluated, but it is fragile.
- Several poll handlers persist results only when the client polls after success; if the client never polls, Celery result expiry may lose the generated output.
- Route comments/docstrings contain mojibake characters, which is not token-related but signals encoding hygiene issues.

## 11. Estimated Token Savings

These are directional estimates based on the current prompt shapes:

- PDF extraction:
  - Already zero-token.
  - No new savings unless fallback OCR/LLM extraction was planned.
- DOCX extraction:
  - 100% savings versus any future LLM-based DOCX parsing.
- TF-IDF score replacing `get_resume_score()` LLM:
  - Saves one full JD + resume prompt per analysis.
  - Estimated analysis token reduction: 20-30%.
- Deterministic skill extraction replacing or shrinking `skillService` LLM:
  - Saves another full JD + resume prompt.
  - Estimated analysis token reduction: 20-30%.
- Shared compressed context for summary/roles/interview/ATS:
  - Estimated 30-60% reduction for remaining LLM calls, depending on resume length.
- Interview prompt compression:
  - Technical questions can avoid full resume entirely and use skills.
  - Behavioural/HR can use compact profile.
  - Estimated interview token reduction: 40-70%.
- ATS prompt compression:
  - Highest quality sensitivity, so savings should be conservative.
  - Estimated ATS token reduction: 25-50%.
- Resource prompt:
  - Already only missing skills.
  - Estimated savings: 0-20% from skill cap/templates.

Overall expected cost reduction after full rollout:

- Conservative: 35-45%.
- Likely: 50-65%.
- Aggressive with cached deterministic skills, no LLM score, and compact ATS context: 65-75%.

## 12. Implementation Order

1. Add measurement first.
   - Instrument `call_llm()` to log prompt size, approximate tokens, model, and caller.
   - Do not log raw prompts.

2. Centralize text budgets.
   - Add reusable normalization/truncation utilities.
   - Apply last-resort safeguards before every LLM call.

3. Add DOCX extraction.
   - Add `python-docx`.
   - Add upload validation and extraction dispatcher.

4. Add deterministic skill extraction.
   - Build skill taxonomy and alias normalization.
   - Extract JD skills and resume skills.
   - Compute matched/missing before LLM calls.

5. Replace resume score LLM.
   - Add TF-IDF/cosine similarity.
   - Blend with skill coverage into 0-100 score.
   - Remove `get_resume_score()` LLM dependency.

6. Build prepared context.
   - Generate `compressed_role_context` and `compressed_profile`.
   - Use deterministic extraction first; avoid LLM compression initially.

7. Refactor analysis tasks.
   - Avoid passing large raw strings through Celery.
   - Use prepared context.
   - Keep only LLM calls that add qualitative value.

8. Refactor interview prompts.
   - Technical: use skills + compact role requirements.
   - Behavioural/HR: use compact profile + role seniority/domain.

9. Refactor ATS prompt.
   - Use structured compressed context.
   - Keep enough factual resume detail to avoid fabrication.
   - Add stricter output length limits.

10. Add caching.
    - Start with Redis TTL cache keyed by normalized input hash.
    - Promote to PostgreSQL prepared-context table if stable.

11. Reduce API response payloads.
    - Consider excluding full `resume_text` from list responses.
    - Keep a detail endpoint if full extracted text is needed.

12. Add tests.
    - Unit tests for PDF/DOCX extraction, text budgeting, skill extraction, TF-IDF scoring.
    - Service tests to assert prompt inputs stay under configured budgets.
    - Integration tests for analysis/interview/ATS trigger flows.

---

Approval checkpoint: no implementation should begin until this roadmap is reviewed and approved.

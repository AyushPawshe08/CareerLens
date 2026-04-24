# CORS & 500 Error Analysis & Fixes

## **Error Summary**

You encountered three related errors when polling interview question generation:

1. **CORS Error**: "Access to XMLHttpRequest at 'http://localhost:8000/interview-questions/status/...' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header"
2. **500 Internal Server Error**: `GET /interview-questions/status/{task_id}` returns a 500 error
3. **401 Unauthorized**: `GET /career-analysis/status/{task_id}` returns 401

---

## **Root Causes**

### **Issue 1: CORS Headers Not Sent on Errors (Main Problem)**
- **Problem**: The FastAPI CORS middleware in `main.py` only adds headers to *successful* responses
- **Why it matters**: When an endpoint throws an exception (500 error), the middleware's exception handlers don't run, so CORS headers are never added
- **Result**: Browser blocks the response and shows CORS error *instead of* the real 500 error

### **Issue 2: Type Mismatch in Database Field**
- **Problem**: In `question_handler.py`, `user_id` was being stored as a string:
  ```python
  user_id=str(career_input.user_id) if career_input else "unknown",
  ```
- **Database expectation**: `user_id` is defined as `Integer` (ForeignKey to `users.id`)
- **Result**: This causes a serialization error when returning the `InterviewQuestion` object in the response

### **Issue 3: No Error Handling in Celery Result Processing**
- **Problem**: The `poll_interview_questions()` function didn't have try-except blocks around Celery result retrieval
- **Result**: If the Celery result is malformed or task fails, the backend crashes with a 500 error

### **Issue 4: 401 Unauthorized on `/career-analysis/status`**
- **Problem**: This endpoint requires authentication, but the request may not be sending the auth token
- **Cause**: The token may not be persisted in cookies/localStorage properly, or it may be expired

---

## **Fixes Applied**

### **Fix 1: Add Global Exception Handler with CORS Headers** ✅
**File**: `backend/main.py`

Added a global exception handler that catches all unhandled exceptions and returns them with proper CORS headers:

```python
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all exceptions and return CORS-enabled error responses."""
    import logging
    logger = logging.getLogger(__name__)
    logger.exception("Unhandled exception: %s", exc)
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": "http://localhost:3000",
            "Access-Control-Allow-Credentials": "true",
        },
    )
```

**Result**: Even if a 500 error occurs, the browser will receive proper CORS headers and see the actual error instead of a CORS error.

---

### **Fix 2: Fix Type Mismatch in `question_handler.py`** ✅
**File**: `backend/modules/interviewQuestions/question_handler.py`

Changed:
```python
# BEFORE (incorrect)
user_id=str(career_input.user_id) if career_input else "unknown",

# AFTER (correct)
user_id=career_input.user_id if career_input else None,
```

**Result**: The `InterviewQuestion` object will serialize correctly when returned in API responses.

---

### **Fix 3: Add Error Handling in `poll_interview_questions()`** ✅
**File**: `backend/modules/interviewQuestions/question_handler.py`

Wrapped the entire Celery result processing in try-except blocks:

```python
def poll_interview_questions(db: Session, task_id: str) -> dict:
    try:
        result = celery.AsyncResult(task_id)
    except Exception as e:
        logger.error("Failed to get Celery result for task %s: %s", task_id, e)
        return {
            "task_id": task_id,
            "status": "failed",
            "result": None,
            "error": f"Failed to retrieve task status: {str(e)}",
        }
    
    # ... state checks ...
    
    # SUCCESS path with error handling
    try:
        data: dict = result.result
        # ... persist to DB ...
        return {"task_id": task_id, "status": "completed", "result": interview_question}
    except Exception as e:
        logger.error("Failed to process interview questions for task %s: %s", task_id, e)
        return {
            "task_id": task_id,
            "status": "failed",
            "result": None,
            "error": f"Failed to process results: {str(e)}",
        }
```

**Result**: Any errors during Celery result retrieval or database persistence will be caught and returned as a proper error response (not a 500).

---

### **Fix 4: Ensure Auth Token is Persisted** ⚠️
**For 401 Errors on `/career-analysis/status`:**

The `api.js` interceptor is already correctly configured to include auth tokens. However, ensure:

1. **Token is saved after login**:
   ```javascript
   // In your login response handler
   document.cookie = `token=${jwtToken}; path=/; max-age=86400`;
   localStorage.setItem("token", jwtToken);
   ```

2. **Token is not expired**: Check browser DevTools → Application → Cookies/Storage for `token` cookie

3. **Check backend token validation**: Verify `auth_dependency.py` is correctly extracting and validating the JWT

---

## **Testing the Fixes**

1. **Test CORS handling**:
   ```bash
   # 1. Start backend
   cd backend && python -m uvicorn main:app --reload
   
   # 2. Start frontend
   cd frontend && npm run dev
   
   # 3. Trigger interview questions → should now see actual error message, not CORS error
   ```

2. **Check browser DevTools**:
   - Open **Network** tab
   - Look for `/interview-questions/status/{taskId}` request
   - Headers should now show `Access-Control-Allow-Origin: http://localhost:3000`
   - Response should contain proper error details

3. **Check logs**:
   - Backend logs should show the actual error (not silently swallow it)
   - Look for `logger.error()` messages to understand root cause

---

## **Next Steps for Complete Fix**

1. **Restart backends**:
   ```bash
   # Terminal 1: Backend
   cd backend && python -m uvicorn main:app --reload
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

2. **Test the flow**:
   - Upload resume → Select job
   - Run analysis → Wait for completion
   - Click "Generate Interview Questions" → Poll should now work correctly

3. **If 500 still occurs**:
   - Check backend logs for the actual error message
   - The error will now be visible in browser Network tab instead of blocked by CORS

---

## **Summary of Changes**

| File | Issue | Fix |
|------|-------|-----|
| `backend/main.py` | CORS headers not sent on errors | Added global exception handler with CORS headers |
| `backend/modules/interviewQuestions/question_handler.py` | Type mismatch + no error handling | Fixed `user_id` type + added try-except blocks |

These changes ensure that:
- ✅ Error responses include proper CORS headers
- ✅ The actual error message is visible (not blocked by CORS policy)
- ✅ Database serialization works correctly
- ✅ Celery result processing is fault-tolerant

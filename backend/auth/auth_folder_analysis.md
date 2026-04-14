# Auth Folder Analysis

This document explains the functionality of each file inside the `backend/auth` directory in simple terms. The `auth` folder is responsible for user registration, OTP verification, secure login/logout, and protecting your API routes using JSON Web Tokens (JWT).

---

## 1. `auth_models.py` (The Database Tables)
**What it does:** This file defines the structure of the database tables related to authentication using the SQLAlchemy library. It tells the PostgreSQL database exactly what columns to create and what type of data they will hold.

**Key Components:**
- `User`: The main table storing verified users (email, secure hashed password, verification status).
- `PendingRegistration`: A temporary table to store users who have just registered and are waiting to verify their OTP (One-Time Password) sent to their email.
- `BlacklistedToken`: Stores generated JWT tokens when someone logs out, ensuring old session tokens can never be reused by hackers.

**Code Example:**
```python
from sqlalchemy import Column, Integer, String, Boolean
from config.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_verified = Column(Boolean, default=True)
```

---

## 2. `auth_schema.py` (The Data Validator)
**What it does:** This file uses Pydantic to ensure all the data sent from the frontend (like the login form or registration form) is perfectly formatted before our backend ever processes it. It acts like a strict bouncer for incoming internet requests.

**Key Components:**
- `UserCreate`: Checks that a registration request contains an email in a valid format (e.g. `user@gmail.com`) and a password.
- `LoginRequest`: Validates the structure of the sign-in payload.
- `TokenResponse`: Formats exactly how the authentication token will be sent back upon a successful login.

**Code Example:**
```python
from pydantic import BaseModel, EmailStr

# Validates info when user is trying to register
class UserCreate(BaseModel):
    email: EmailStr  # Automatically checks if it has an '@' and valid domain
    password: str
```

---

## 3. `auth_handler.py` (The Business Logic Engine)
**What it does:** This is the core "brain" behind user authentication. It performs all the heavy lifting instead of just processing internet requests. When an API route is hit, it calls a function from this file to actually write to the database, generate tokens, and verify math.

**Key Components:**
- `register_user`: Generates an OTP, hashes new passwords securely using `bcrypt`, and triggers an email to the user.
- `login_user`: Scans the database, checks if passwords align with the secure hash, and mints an encrypted JSON Web Token (JWT).
- `logout_user`: Adds the user's active session token to the `BlacklistedToken` table to officially block access.

**Code Example:**
```python
def login_user(email: str, password: str, db: Session) -> dict:
    user = db.query(User).filter(User.email == email).first()
    
    # Checks if user exists, and if password matches the hash
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generates a JWT Session String on success
    access_token = create_access_token({"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}
```

---

## 4. `auth_routes.py` (The API Gateways)
**What it does:** This file registers the standard FastAPI endpoints (the designated URLs your frontend calls). It receives the network request, passes the data through the `auth_schema` validator, runs the `auth_handler` logic, and outputs the final message to the client.

**Key Components:**
- `@router.post("/register")`: Listens for new signups.
- `@router.post("/verify-user")`: Validates a typed OTP against the database.
- `@router.post("/login")`: Listens for login events to dispatch tokens.

**Code Example:**
```python
from fastapi import APIRouter, Depends
from .auth_schema import LoginRequest, TokenResponse
from .auth_handler import login_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
async def user_login(user: LoginRequest, db: Session = Depends(get_db)):
    # Passes validated incoming `user` data down into the handler logic
    return login_user(user.email, user.password, db)
```

---

## 5. `auth_dependency.py` (The Security Guard)
**What it does:** It creates a highly reusable component called `get_authenticated_user`. You can attach this component to *any* other API route in your app (like viewing private profile data). It stops unauthenticated users immediately.

**Key Components:**
- `get_authenticated_user`: Whenever someone accesses a protected route, this function steps in. It intercepts the `Authorization` header, reads the token, verifies it hasn't expired and isn't blacklisted, and extracts the correct `User` object for the route to use.

**Code Example:**
```python
from fastapi import Depends
from .auth_handler import get_current_user

# Attaching this to a route forces the visitor to be logged in
def get_authenticated_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    # Automatically throws a 401 Unauthorized if the token is missing or fake
    return get_current_user(token=token, db=db)

# Look at auth_dependency.py line 7-9 for an example of how this is consumed by routers.
```

---

## 6. `__init__.py` (The Package Initializer)
**What it does:** An empty (or nearly empty) file used universally in Python. Its only job is to tell Python that this `auth` folder is an official grouping of modules, enabling you to use `from auth import auth_routes` anywhere in your application.

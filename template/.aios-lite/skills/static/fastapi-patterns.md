# FastAPI Conventions

> Async by default, typed by contract. If it's not typed, it's not FastAPI.

---

## Project structure

```
myproject/
├── main.py                  # app entrypoint
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── router.py    # aggregates all v1 routes
│   │   │   ├── users.py
│   │   │   └── orders.py
│   ├── core/
│   │   ├── config.py        # settings via pydantic-settings
│   │   ├── database.py      # async engine + session
│   │   └── security.py      # password hashing, JWT
│   ├── models/
│   │   └── user.py          # SQLAlchemy ORM models
│   ├── schemas/
│   │   └── user.py          # Pydantic request/response models
│   ├── services/
│   │   └── user_service.py  # business logic
│   └── repositories/
│       └── user_repo.py     # DB queries (optional for SMALL+)
├── tests/
│   ├── conftest.py
│   └── test_users.py
├── alembic/                 # migrations
└── requirements.txt
```

---

## App bootstrap

```python
# main.py
from fastapi import FastAPI
from app.api.v1.router import router as v1_router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
)

app.include_router(v1_router, prefix="/api/v1")

@app.get("/health")
async def health():
    return {"status": "ok"}
```

---

## Settings (pydantic-settings)

```python
# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "My App"
    DEBUG: bool = False
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
```

**Never hardcode secrets.** Always read from environment via `pydantic-settings`.

---

## Database (SQLAlchemy async)

```python
# app/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

```python
# app/models/user.py
from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

---

## Schemas (Pydantic)

```python
# app/schemas/user.py
from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    model_config = {"from_attributes": True}  # pydantic v2

class UserLogin(BaseModel):
    email: EmailStr
    password: str
```

**Rules:**
- Separate schemas for input (`UserCreate`) and output (`UserResponse`)
- Use `EmailStr` for email fields — free format validation
- `model_config = {"from_attributes": True}` to convert from ORM models

---

## Routers — thin, delegate to services

```python
# app/api/v1/users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.user import UserCreate, UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    user = await service.create(payload)
    if not user:
        raise HTTPException(status_code=409, detail="Email already registered")
    return user

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    service = UserService(db)
    user = await service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

---

## Services — business logic

```python
# app/services/user_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import hash_password

class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, payload: UserCreate) -> User | None:
        existing = await self.db.execute(select(User).where(User.email == payload.email))
        if existing.scalar_one_or_none():
            return None

        user = User(
            email=payload.email,
            hashed_password=hash_password(payload.password)
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
```

---

## Authentication (JWT)

```python
# app/core/security.py
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": subject, "exp": expire}, settings.SECRET_KEY, algorithm="HS256")

# Dependency for protected routes
from fastapi import Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: AsyncSession = Depends(get_db)
):
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await UserService(db).get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
```

---

## Dependency injection pattern

```python
# Reuse db dependency across all routes
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
```

---

## Migrations (Alembic)

```bash
alembic init alembic
# Set sqlalchemy.url in alembic.ini or use env.py to read from config
alembic revision --autogenerate -m "create users table"
alembic upgrade head
```

```python
# alembic/env.py — connect to async engine
from app.models.user import Base
target_metadata = Base.metadata
```

---

## Tests (pytest + httpx)

```python
# tests/conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.database import get_db
from app.models.user import Base
from main import app

TEST_DB_URL = "sqlite+aiosqlite:///./test.db"

@pytest.fixture
async def db():
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def client(db):
    app.dependency_overrides[get_db] = lambda: db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()

# tests/test_users.py
import pytest

@pytest.mark.anyio
async def test_create_user(client):
    response = await client.post("/api/v1/users/", json={"email": "a@test.com", "password": "pass123"})
    assert response.status_code == 201
    assert response.json()["email"] == "a@test.com"

@pytest.mark.anyio
async def test_create_user_duplicate(client):
    await client.post("/api/v1/users/", json={"email": "a@test.com", "password": "pass123"})
    response = await client.post("/api/v1/users/", json={"email": "a@test.com", "password": "pass123"})
    assert response.status_code == 409
```

---

## Hard rules

- All route handlers must be `async def` — never mix sync I/O in async routes
- Business logic goes in `services/`, not in route handlers
- Always use Pydantic schemas for both input validation and response serialization
- Always use `response_model` in route decorators — never return raw dicts
- Use `Depends()` for all cross-cutting concerns (auth, db, rate limiting)
- Use `select_related` equivalent (`selectinload`/`joinedload`) to avoid N+1
- Never catch bare `Exception` — catch specific error types

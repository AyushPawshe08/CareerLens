import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in the environment variables.")

# pool_pre_ping   — test each connection before use; discards stale ones
#                   (fixes "SSL connection has been closed unexpectedly" on Neon)
# pool_recycle    — recycle connections after 300 s to avoid Neon idle-timeout
# pool_size       — max persistent connections in pool
# max_overflow    — extra connections allowed beyond pool_size under load
# connect_args    — TCP keepalive so the socket stays alive through Neon's
#                   idle-connection pruning (Linux / Windows both honour these)
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
    connect_args={
        "keepalives":           1,
        "keepalives_idle":      60,
        "keepalives_interval":  10,
        "keepalives_count":     5,
        "connect_timeout":      10,
    },
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

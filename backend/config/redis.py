import os
import redis
from dotenv import load_dotenv

load_dotenv()

# Prefer a full REDIS_URL (supports rediss:// for Upstash TLS).
# Fallback to legacy host/port env vars for local dev.
REDIS_URL = os.getenv("REDIS_URL")

if REDIS_URL:
    redis_client = redis.from_url(
        REDIS_URL,
        decode_responses=True,
        ssl_cert_reqs=None,   # required for Upstash / self-signed certs
    )
else:
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        decode_responses=True,
    )

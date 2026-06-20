"""Central place for all configuration, read from environment variables."""
import os
from dotenv import load_dotenv

# Load variables from a .env file if it exists (for local development).
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pickly.db")
# Some hosts (Render, Heroku) hand out the legacy "postgres://" scheme, which
# SQLAlchemy no longer accepts. Normalize it to the modern "postgresql://".
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))

# Currency for this deployment (Australia).
CURRENCY = os.getenv("CURRENCY", "AUD")

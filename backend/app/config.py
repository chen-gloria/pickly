"""Central place for all configuration, read from environment variables."""
import os
from dotenv import load_dotenv

# Load variables from a .env file if it exists (for local development).
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pickly.db")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))

# Currency for this deployment (Australia).
CURRENCY = os.getenv("CURRENCY", "AUD")

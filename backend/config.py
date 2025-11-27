# config.py
import logging
import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    # dotenv is optional; Flask will still run without it.
    pass

basedir = Path(__file__).resolve().parent
default_db_path = os.environ.get("GASMAPS_DB_PATH") or basedir / "instance" / "gasmaps.sqlite"

# Server-side Google Maps Platform key (never expose to the client)
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
if not GOOGLE_MAPS_API_KEY:
    logging.getLogger(__name__).warning("GOOGLE_MAPS_API_KEY is not set; Google Directions calls will fail.")


class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or f"sqlite:///{default_db_path}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False

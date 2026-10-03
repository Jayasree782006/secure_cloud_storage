"""
SentinelVault Enterprise Configuration Module.

Provides robust, production-grade configuration profiles with zero-trust
security defaults, environment variable overrides, and modular storage paths
designed for localhost simulation and future AWS S3 drop-in compatibility.
"""

import os
from pathlib import Path
from typing import Dict, Any

# Root folder of SentinelVault repository
BASE_DIR = Path(__file__).resolve().parent


class Config:
    """Base Enterprise Configuration Class."""

    # Security & Secret Key management
    SECRET_KEY: str = os.environ.get(
        "SECRET_KEY",
        "sentinelvault-enterprise-zero-trust-secret-key-3f8a9e2d1c0b4a76",
    )
    JWT_SECRET_KEY: str = os.environ.get(
        "JWT_SECRET_KEY",
        "sentinelvault-jwt-zero-trust-signing-key-9c2b4a8e1d7f0022",
    )

    # SQLAlchemy Database Settings
    SQLALCHEMY_DATABASE_URI: str = os.environ.get(
        "DATABASE_URI",
        f"sqlite:///{BASE_DIR / 'database.db'}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS: Dict[str, Any] = {
        "pool_pre_ping": True,
    }

    # Storage Paths (Local storage with AWS S3 compatibility abstraction)
    UPLOAD_FOLDER: str = str(BASE_DIR / "uploads")
    ENCRYPTED_FOLDER: str = str(BASE_DIR / "encrypted")
    DECRYPTED_FOLDER: str = str(BASE_DIR / "decrypted")
    SHARED_FOLDER: str = str(BASE_DIR / "shared")
    LOGS_FOLDER: str = str(BASE_DIR / "logs")

    # Maximum file upload size: 100 MB
    MAX_CONTENT_LENGTH: int = 100 * 1024 * 1024

    # Security Cookie Hardening
    SESSION_COOKIE_SECURE: bool = os.environ.get("SESSION_COOKIE_SECURE", "False").lower() == "true"
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "Lax"

    # Rate Limiting & Threat Mitigation
    RATELIMIT_DEFAULT: str = "200 per day;50 per hour"
    RATELIMIT_STORAGE_URL: str = "memory://"


class DevelopmentConfig(Config):
    """Development Environment Profile."""
    DEBUG: bool = True
    TESTING: bool = False


class ProductionConfig(Config):
    """Production Environment Profile."""
    DEBUG: bool = False
    TESTING: bool = False
    SESSION_COOKIE_SECURE: bool = True


class TestingConfig(Config):
    """Testing Environment Profile using In-Memory SQLite."""
    TESTING: bool = True
    DEBUG: bool = True
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///:memory:"
    WTF_CSRF_ENABLED: bool = False


config_by_name: Dict[str, Any] = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}

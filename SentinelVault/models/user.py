"""
User, Role, and Permission ORM Models for SentinelVault RBAC & Zero-Trust.
"""

from datetime import datetime, timezone
from typing import Optional
import bcrypt
from flask_login import UserMixin
from .base import db

# Association Table between Roles and Permissions
role_permissions = db.Table(
    "role_permissions",
    db.Column("role_id", db.Integer, db.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    db.Column("permission_id", db.Integer, db.ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class Permission(db.Model):
    """Granular Permission definitions (e.g., UPLOAD_FILE, DELETE_ANY_FILE)."""
    __tablename__ = "permissions"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False, index=True)
    description = db.Column(db.String(255), nullable=True)

    def __repr__(self) -> str:
        return f"<Permission {self.name}>"


class Role(db.Model):
    """Enterprise Role definitions (e.g., SuperAdmin, SecurityAuditor, EnterpriseUser)."""
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False, index=True)
    description = db.Column(db.String(255), nullable=True)

    permissions = db.relationship(
        "Permission",
        secondary=role_permissions,
        lazy="subquery",
        backref=db.backref("roles", lazy=True),
    )

    def has_permission(self, perm_name: str) -> bool:
        """Check if this role possesses a specific permission."""
        return any(p.name == perm_name for p in self.permissions)

    def __repr__(self) -> str:
        return f"<Role {self.name}>"


class User(db.Model, UserMixin):
    """Enterprise User Account with zero-trust clearance level and bcrypt password security."""
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False)
    role = db.relationship("Role", backref=db.backref("users", lazy="dynamic"))

    clearance_level = db.Column(db.Integer, default=1, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_email_verified = db.Column(db.Boolean, default=True, nullable=False)
    
    trust_score = db.Column(db.Float, default=95.0, nullable=False)
    mfa_secret = db.Column(db.String(64), nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    def set_password(self, plaintext_password: str) -> None:
        """Securely hash plaintext password using bcrypt with salt factor 12."""
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(plaintext_password.encode("utf-8"), salt)
        self.password_hash = hashed.decode("utf-8")

    def check_password(self, plaintext_password: str) -> bool:
        """Verify candidate password against stored bcrypt hash."""
        return bcrypt.checkpw(
            plaintext_password.encode("utf-8"),
            self.password_hash.encode("utf-8")
        )

    def has_permission(self, perm_name: str) -> bool:
        """Check if user role grants specific permission or if SuperAdmin."""
        if self.role and self.role.name == "SuperAdmin":
            return True
        return bool(self.role and self.role.has_permission(perm_name))

    def __repr__(self) -> str:
        return f"<User {self.username} (Clearance: L{self.clearance_level})>"

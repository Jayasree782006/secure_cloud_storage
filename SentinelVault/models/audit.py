"""
Audit Logs, Lightweight Blockchain Ledger, Risk Events, and History Models.
"""

from datetime import datetime, timezone
from .base import db


class BlockchainBlock(db.Model):
    """Immutable Merkle Ledger block recording cryptographic audit actions."""
    __tablename__ = "blockchain"

    id = db.Column(db.Integer, primary_key=True)
    block_index = db.Column(db.Integer, unique=True, nullable=False, index=True)
    timestamp = db.Column(db.String(64), nullable=False)
    username = db.Column(db.String(64), nullable=False)
    action = db.Column(db.String(128), nullable=False)
    details = db.Column(db.Text, nullable=True)
    prev_hash = db.Column(db.String(64), nullable=False)
    current_hash = db.Column(db.String(64), nullable=False, unique=True)
    nonce = db.Column(db.Integer, default=0, nullable=False)
    integrity_status = db.Column(db.String(32), default="VALID", nullable=False)

    def __repr__(self) -> str:
        return f"<BlockchainBlock #{self.block_index} ({self.action})>"


class AuditLog(db.Model):
    """Operational Audit Log for fast filtering and administrative queries."""
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    username = db.Column(db.String(64), nullable=False)
    action_type = db.Column(db.String(64), nullable=False, index=True)
    resource_id = db.Column(db.String(128), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    details = db.Column(db.Text, nullable=True)

    def __repr__(self) -> str:
        return f"<AuditLog {self.action_type} by {self.username}>"


class LoginHistory(db.Model):
    """Detailed Login behavior tracking for AI Anomaly Detection feature extraction."""
    __tablename__ = "login_history"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    ip_address = db.Column(db.String(45), nullable=False)
    device_info = db.Column(db.String(255), nullable=True)
    browser_info = db.Column(db.String(255), nullable=True)
    location_city = db.Column(db.String(64), default="Localhost")
    status = db.Column(db.String(32), default="SUCCESS")
    risk_score = db.Column(db.Float, default=5.0)

    def __repr__(self) -> str:
        return f"<LoginHistory {self.user_id} - {self.status}>"


class DownloadHistory(db.Model):
    """File download behavior tracking for data exfiltration analysis."""
    __tablename__ = "download_history"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    file_id = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    ip_address = db.Column(db.String(45), nullable=False)
    status = db.Column(db.String(32), default="SUCCESS")

    def __repr__(self) -> str:
        return f"<DownloadHistory User {self.user_id} File {self.file_id}>"


class RiskEvent(db.Model):
    """Anomalous events flagged by Isolation Forest & Zero-Trust Engine."""
    __tablename__ = "risk_events"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    event_type = db.Column(db.String(64), nullable=False)
    risk_score = db.Column(db.Float, nullable=False)
    risk_classification = db.Column(db.String(32), nullable=False)  # Normal, Medium Risk, High Risk
    details = db.Column(db.Text, nullable=True)
    resolved = db.Column(db.Boolean, default=False)

    def __repr__(self) -> str:
        return f"<RiskEvent {self.event_type} ({self.risk_classification})>"


class Notification(db.Model):
    """User and SOC alert system notifications."""
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    title = db.Column(db.String(128), nullable=False)
    message = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(32), default="INFO")  # INFO, WARNING, CRITICAL
    is_read = db.Column(db.Boolean, default=False)

    def __repr__(self) -> str:
        return f"<Notification {self.title}>"

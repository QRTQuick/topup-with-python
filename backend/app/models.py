from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    payments: Mapped[list["Payment"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    analytics_events: Mapped[list["AnalyticsEvent"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    reference: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="NGN", nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="pending", nullable=False)
    provider: Mapped[str] = mapped_column(String(24), default="opay", nullable=False)
    mode: Mapped[str] = mapped_column(String(24), default="demo", nullable=False)
    order_no: Mapped[str | None] = mapped_column(String(64), nullable=True)
    checkout_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="payments")


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    event_name: Mapped[str] = mapped_column(String(64), index=True)
    page: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tutorial_slug: Mapped[str | None] = mapped_column(String(128), nullable=True)
    properties: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped[User | None] = relationship(back_populates="analytics_events")

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


USERNAME_PATTERN = r"^[A-Za-z0-9_]{3,24}$"


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=24)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        import re

        if not re.fullmatch(USERNAME_PATTERN, value):
            raise ValueError("Username must be 3-24 characters using letters, numbers, or underscores.")
        return value.lower()


class UserLogin(BaseModel):
    identifier: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class UserPublic(BaseModel):
    id: int
    username: str
    email: EmailStr
    is_premium: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class TutorialItem(BaseModel):
    slug: str
    title: str
    section: str
    level: str
    is_premium: bool
    is_locked: bool
    duration: str
    summary: str
    tags: list[str]


class TutorialSection(BaseModel):
    name: str
    description: str
    tutorials: list[TutorialItem]


class TutorialDetail(TutorialItem):
    body: list[str]


class PaymentCreateRequest(BaseModel):
    amount: int | None = Field(default=None, ge=100)
    pay_method: str | None = Field(default=None, max_length=24)


class PaymentPublic(BaseModel):
    id: int
    reference: str
    amount: int
    currency: str
    status: str
    provider: str
    mode: str
    checkout_url: str | None
    order_no: str | None
    date: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentCreateResponse(BaseModel):
    payment: PaymentPublic
    checkout_url: str
    mode: str
    message: str


class AnalyticsEventCreate(BaseModel):
    event_name: str = Field(min_length=2, max_length=64)
    page: str | None = Field(default=None, max_length=255)
    tutorial_slug: str | None = Field(default=None, max_length=128)
    properties: dict[str, Any] | None = None


class AnalyticsSummary(BaseModel):
    total_users: int
    premium_users: int
    payment_attempts: int
    successful_payments: int
    recorded_events: int


class MessageResponse(BaseModel):
    message: str


class CallbackPayload(BaseModel):
    amount: str | None = None
    channel: str | None = None
    country: str | None = None
    currency: str | None = None
    displayedFailure: str | None = None
    fee: str | None = None
    feeCurrency: str | None = None
    instrumentType: str | None = None
    reference: str
    refunded: bool | str | None = None
    status: str
    timestamp: str | None = None
    token: str | None = None
    transactionId: str | None = None
    updated_at: str | None = None


class OPayCallback(BaseModel):
    payload: CallbackPayload
    sha512: str | None = None
    type: str | None = None


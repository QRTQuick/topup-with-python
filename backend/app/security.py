from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from .config import get_settings
from .database import get_db
from .models import User


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        subject = payload.get("sub")
        if not subject:
            raise ValueError("Token subject missing.")
        return str(subject)
    except (jwt.InvalidTokenError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        ) from exc


def _find_user_from_token(token: str, db: Session) -> User:
    subject = decode_token(token)
    user = db.get(User, int(subject))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return user


def get_current_user(
    authorization: str = Header(..., alias="Authorization"),
    db: Session = Depends(get_db),
) -> User:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    return _find_user_from_token(token, db)


def get_optional_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> User | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    try:
        return _find_user_from_token(token, db)
    except HTTPException:
        return None


def authenticate_user(identifier: str, password: str, db: Session) -> User | None:
    normalized = identifier.strip().lower()
    user = db.scalar(
        select(User).where(
            or_(
                User.username == normalized,
                User.email == normalized,
            )
        )
    )
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

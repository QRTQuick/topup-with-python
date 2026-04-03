from contextlib import asynccontextmanager
from secrets import token_hex

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import get_settings
from .content import get_tutorial_by_slug, list_tutorial_sections
from .database import Base, engine, get_db
from .models import AnalyticsEvent, Payment, User
from .schemas import (
    AnalyticsEventCreate,
    AnalyticsSummary,
    AuthResponse,
    MessageResponse,
    OPayCallback,
    PaymentCreateRequest,
    PaymentCreateResponse,
    PaymentPublic,
    TutorialDetail,
    TutorialItem,
    TutorialSection,
    UserCreate,
    UserLogin,
    UserPublic,
)
from .security import authenticate_user, create_access_token, get_current_user, get_optional_user, get_password_hash
from .services.opay import opay_service


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_name,
    description="Premium Python learning platform with FastAPI, React, Neon-ready auth, and OPay checkout support.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def normalize_payment_status(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized in {"success", "successful", "paid"}:
        return "success"
    if normalized in {"initial", "pending"}:
        return "pending"
    if normalized in {"close", "closed", "cancelled", "canceled"}:
        return "cancelled"
    return "failed"


def serialize_tutorial(tutorial: dict, current_user: User | None) -> TutorialItem:
    is_locked = tutorial["is_premium"] and not (current_user and current_user.is_premium)
    return TutorialItem(**{**tutorial, "is_locked": is_locked})


def get_frontend_base_url(request: Request) -> str:
    if settings.public_app_url:
        return settings.public_app_url.rstrip("/")

    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip("/")

    forwarded_host = request.headers.get("x-forwarded-host")
    forwarded_proto = request.headers.get("x-forwarded-proto", "https")
    if forwarded_host:
        return f"{forwarded_proto}://{forwarded_host}"

    return str(request.base_url).rstrip("/")


def create_payment_reference() -> str:
    return f"TOPUP-{token_hex(6).upper()}"


def apply_payment_success(payment: Payment, user: User) -> None:
    payment.status = "success"
    user.is_premium = True


@app.get("/health", response_model=MessageResponse)
def healthcheck():
    return MessageResponse(message="API is healthy.")


@app.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.scalar(
        select(User).where((User.username == payload.username) | (User.email == payload.email.lower()))
    )
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists.")

    user = User(
        username=payload.username,
        email=payload.email.lower(),
        hashed_password=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id))
    return AuthResponse(access_token=token, user=UserPublic.model_validate(user))


@app.post("/auth/login", response_model=AuthResponse)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(payload.identifier, payload.password, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid login details.")

    token = create_access_token(str(user.id))
    return AuthResponse(access_token=token, user=UserPublic.model_validate(user))


@app.get("/auth/me", response_model=UserPublic)
def get_me(current_user: User = Depends(get_current_user)):
    return UserPublic.model_validate(current_user)


@app.get("/tutorials", response_model=list[TutorialSection])
def list_tutorials(current_user: User | None = Depends(get_optional_user)):
    sections = []
    for section in list_tutorial_sections():
        sections.append(
            TutorialSection(
                name=section["name"],
                description=section["description"],
                tutorials=[serialize_tutorial(tutorial, current_user) for tutorial in section["tutorials"]],
            )
        )
    return sections


@app.get("/tutorials/{slug}", response_model=TutorialDetail)
def tutorial_detail(slug: str, current_user: User | None = Depends(get_optional_user)):
    tutorial = get_tutorial_by_slug(slug)
    if not tutorial:
        raise HTTPException(status_code=404, detail="Tutorial not found.")

    is_locked = tutorial["is_premium"] and not (current_user and current_user.is_premium)
    if is_locked:
        raise HTTPException(status_code=403, detail="Premium access required for this tutorial.")

    return TutorialDetail(**{**tutorial, "is_locked": False})


@app.post("/analytics/events", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def record_analytics_event(
    payload: AnalyticsEventCreate,
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    event = AnalyticsEvent(
        user_id=current_user.id if current_user else None,
        event_name=payload.event_name,
        page=payload.page,
        tutorial_slug=payload.tutorial_slug,
        properties=payload.properties,
    )
    db.add(event)
    db.commit()
    return MessageResponse(message="Analytics event recorded.")


@app.get("/analytics/summary", response_model=AnalyticsSummary)
def analytics_summary(db: Session = Depends(get_db)):
    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    premium_users = db.scalar(select(func.count()).select_from(User).where(User.is_premium.is_(True))) or 0
    payment_attempts = db.scalar(select(func.count()).select_from(Payment)) or 0
    successful_payments = db.scalar(
        select(func.count()).select_from(Payment).where(Payment.status == "success")
    ) or 0
    recorded_events = db.scalar(select(func.count()).select_from(AnalyticsEvent)) or 0

    return AnalyticsSummary(
        total_users=total_users,
        premium_users=premium_users,
        payment_attempts=payment_attempts,
        successful_payments=successful_payments,
        recorded_events=recorded_events,
    )


@app.post("/payments/opay/create", response_model=PaymentCreateResponse, status_code=status.HTTP_201_CREATED)
def create_opay_payment(
    payload: PaymentCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.is_premium:
        raise HTTPException(status_code=400, detail="This account already has premium access.")

    reference = create_payment_reference()
    frontend_base = get_frontend_base_url(request)
    return_url = f"{frontend_base}/payment-return.html?reference={reference}"
    cancel_url = f"{frontend_base}/payment-return.html?reference={reference}&cancelled=1"
    demo_checkout_url = f"{frontend_base}/demo-checkout.html?reference={reference}"
    callback_url = str(request.url_for("opay_callback"))

    payment = Payment(
        user_id=current_user.id,
        reference=reference,
        amount=payload.amount or settings.premium_price_minor,
        currency=settings.opay_currency,
        status="pending",
        provider="opay",
        mode="demo" if not settings.opay_enabled else "opay",
    )
    db.add(payment)
    db.flush()

    try:
        session = opay_service.create_checkout_session(
            amount=payment.amount,
            reference=payment.reference,
            username=current_user.username,
            email=current_user.email,
            return_url=return_url,
            cancel_url=cancel_url,
            callback_url=callback_url,
            demo_checkout_url=demo_checkout_url,
            pay_method=payload.pay_method,
            client_ip=request.client.host if request.client else None,
        )
        payment.mode = session.mode
        payment.checkout_url = session.checkout_url
        payment.order_no = session.order_no
        payment.last_payload = session.raw_response
        db.commit()
        db.refresh(payment)
        return PaymentCreateResponse(
            payment=PaymentPublic.model_validate(payment),
            checkout_url=session.checkout_url,
            mode=session.mode,
            message=session.message,
        )
    except Exception as exc:
        payment.status = "failed"
        payment.last_payload = {"error": str(exc)}
        db.commit()
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/payments/history", response_model=list[PaymentPublic])
def payment_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    payments = db.scalars(
        select(Payment).where(Payment.user_id == current_user.id).order_by(Payment.date.desc())
    ).all()
    return [PaymentPublic.model_validate(payment) for payment in payments]


@app.get("/payments/{reference}", response_model=PaymentPublic)
def payment_detail(reference: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    payment = db.scalar(select(Payment).where(Payment.reference == reference, Payment.user_id == current_user.id))
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found.")
    return PaymentPublic.model_validate(payment)


@app.post("/payments/demo/complete/{reference}", response_model=PaymentPublic)
def complete_demo_payment(
    reference: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payment = db.scalar(select(Payment).where(Payment.reference == reference, Payment.user_id == current_user.id))
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found.")
    if payment.mode != "demo":
        raise HTTPException(status_code=400, detail="This endpoint only completes demo-mode payments.")

    outcome = request.query_params.get("status", "success")
    payment.status = normalize_payment_status(outcome)
    payment.last_payload = {"provider": "demo", "status": outcome}
    if payment.status == "success":
        apply_payment_success(payment, current_user)

    db.commit()
    db.refresh(payment)
    return PaymentPublic.model_validate(payment)


@app.post("/payments/opay/callback", response_model=MessageResponse)
def opay_callback(payload: OPayCallback, db: Session = Depends(get_db)):
    payment = db.scalar(select(Payment).where(Payment.reference == payload.payload.reference))
    if not payment:
        return MessageResponse(message="Callback acknowledged.")

    payment.last_payload = payload.model_dump(mode="json")
    payment.order_no = payload.payload.transactionId or payment.order_no

    verified = opay_service.verify_callback_signature(payload)
    upstream_status = None
    if payment.mode == "opay":
        try:
            upstream_status = opay_service.query_payment_status(payment.reference)
        except Exception:
            upstream_status = None

    status_candidate = None
    if upstream_status:
        status_candidate = upstream_status.get("status")
        payment.last_payload = {
            "callback": payload.model_dump(mode="json"),
            "status_query": upstream_status,
            "verified_signature": verified,
        }
    else:
        status_candidate = payload.payload.status

    payment.status = normalize_payment_status(status_candidate)
    if payment.status == "success":
        user = db.get(User, payment.user_id)
        if user:
            apply_payment_success(payment, user)

    db.commit()
    return MessageResponse(message="Callback acknowledged.")

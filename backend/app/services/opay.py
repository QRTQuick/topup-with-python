import hashlib
import hmac
import json
from dataclasses import dataclass

import httpx

from ..config import get_settings
from ..schemas import OPayCallback


settings = get_settings()


@dataclass
class CheckoutSession:
    mode: str
    checkout_url: str
    message: str
    order_no: str | None = None
    raw_response: dict | None = None


class OpayService:
    def __init__(self) -> None:
        self.settings = settings

    def _headers(self, authorization_value: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {authorization_value}",
            "MerchantId": self.settings.opay_merchant_id or "",
            "Content-Type": "application/json",
        }

    @staticmethod
    def _json_compact(payload: dict) -> str:
        return json.dumps(payload, separators=(",", ":"), ensure_ascii=False)

    def create_checkout_session(
        self,
        *,
        amount: int,
        reference: str,
        username: str,
        email: str,
        return_url: str,
        cancel_url: str,
        callback_url: str,
        demo_checkout_url: str,
        pay_method: str | None = None,
        client_ip: str | None = None,
    ) -> CheckoutSession:
        if not self.settings.opay_enabled:
            return CheckoutSession(
                mode="demo",
                checkout_url=demo_checkout_url,
                message="Demo mode enabled. Complete the simulated OPay checkout to unlock premium access.",
                raw_response={"provider": "demo"},
            )

        payload = {
            "amount": {
                "currency": self.settings.opay_currency,
                "total": amount,
            },
            "callbackUrl": callback_url,
            "cancelUrl": cancel_url,
            "country": self.settings.opay_country,
            "customerVisitSource": "WEB",
            "evokeOpay": True,
            "expireAt": 30,
            "payMethod": pay_method,
            "product": {
                "name": "TOPUP with python Premium",
                "description": "Premium Python lessons and project walkthroughs.",
            },
            "reference": reference,
            "returnUrl": return_url,
            "userInfo": {
                "userId": username,
                "userName": username,
                "userEmail": email,
            },
        }
        if not pay_method:
            payload.pop("payMethod")
        if client_ip:
            payload["userClientIP"] = client_ip

        with httpx.Client(timeout=20.0) as client:
            response = client.post(
                f"{self.settings.opay_base_url}/cashier/create",
                headers=self._headers(self.settings.opay_public_key or ""),
                json=payload,
            )
        response.raise_for_status()
        data = response.json()
        if data.get("code") != "00000":
            raise ValueError(data.get("message", "Unable to create OPay checkout session."))

        return CheckoutSession(
            mode="opay",
            checkout_url=data["data"]["cashierUrl"],
            order_no=data["data"].get("orderNo"),
            message="Redirect the user to the hosted OPay cashier page.",
            raw_response=data,
        )

    def query_payment_status(self, reference: str) -> dict | None:
        if not self.settings.opay_enabled:
            return None

        payload = {"country": self.settings.opay_country, "reference": reference}
        signature = hmac.new(
            (self.settings.opay_private_key or "").encode("utf-8"),
            self._json_compact(payload).encode("utf-8"),
            hashlib.sha512,
        ).hexdigest()

        with httpx.Client(timeout=20.0) as client:
            response = client.post(
                f"{self.settings.opay_base_url}/cashier/status",
                headers=self._headers(signature),
                json=payload,
            )
        response.raise_for_status()
        data = response.json()
        if data.get("code") != "00000":
            return None
        return data.get("data")

    def verify_callback_signature(self, callback: OPayCallback) -> bool:
        if not self.settings.opay_enabled or not callback.sha512:
            return False

        payload_json = self._json_compact(callback.payload.model_dump(exclude_none=True))
        expected = hmac.new(
            (self.settings.opay_private_key or "").encode("utf-8"),
            payload_json.encode("utf-8"),
            hashlib.sha3_512,
        ).hexdigest()
        return hmac.compare_digest(expected.lower(), callback.sha512.lower())


opay_service = OpayService()

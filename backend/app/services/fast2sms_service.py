import json
import logging
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional, Tuple
from app.core.config import settings

logger = logging.getLogger("borkonya.fast2sms")


def clean_indian_phone(phone: str) -> str:
    """Normalize phone number to 10 digits."""
    cleaned = phone.strip().replace(" ", "").replace("-", "")
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    return cleaned


class Fast2SMSService:
    @staticmethod
    def is_configured() -> bool:
        """Check if Fast2SMS authorization key is provided."""
        return bool(settings.FAST2SMS_AUTH_KEY and settings.FAST2SMS_AUTH_KEY.strip())

    @classmethod
    def send_whatsapp_otp(
        cls,
        phone_number: str,
        otp_code: str,
    ) -> Tuple[bool, Optional[str]]:
        """
        Sends OTP verification code to recipient's WhatsApp number using Fast2SMS WhatsApp API.
        Returns: (success: bool, error_message: Optional[str])
        """
        if not cls.is_configured():
            logger.error("Fast2SMS authorization key is not configured.")
            return False, "Fast2SMS WhatsApp service is not configured on the server."

        target_phone = clean_indian_phone(phone_number)
        if len(target_phone) != 10 or not target_phone.isdigit():
            return False, f"Invalid phone number format: {phone_number}. Expected 10-digit mobile number."

        params = urllib.parse.urlencode({
            "message_id": settings.FAST2SMS_WHATSAPP_MESSAGE_ID,
            "phone_number_id": settings.FAST2SMS_WHATSAPP_PHONE_NUMBER_ID,
            "numbers": target_phone,
            "variables_values": otp_code,
        })
        url = f"https://www.fast2sms.com/dev/whatsapp?{params}"

        req = urllib.request.Request(url, method="GET")
        req.add_header("authorization", settings.FAST2SMS_AUTH_KEY.strip())
        req.add_header("User-Agent", "BorKoniya-Backend/1.0")

        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                resp_text = resp.read().decode("utf-8", errors="ignore")
                try:
                    data = json.loads(resp_text)
                except Exception:
                    data = {"raw": resp_text}

                # Fast2SMS WhatsApp response check
                if data.get("return") is True or data.get("status") is True:
                    logger.info(f"WhatsApp OTP delivered successfully to ...{target_phone[-4:]}")
                    return True, None

                error_msg = cls._extract_error(data)
                logger.warning(f"Fast2SMS WhatsApp response returned false: {error_msg}")
                return False, error_msg

        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            try:
                data = json.loads(err_body)
                error_msg = cls._extract_error(data)
            except Exception:
                error_msg = err_body or str(e)
            logger.error(f"Fast2SMS WhatsApp HTTP Error {e.code}: {error_msg}")
            return False, error_msg

        except Exception as e:
            logger.exception(f"Unexpected error communicating with Fast2SMS: {e}")
            return False, f"Failed to connect to WhatsApp OTP service: {str(e)}"

    @classmethod
    def test_connection(cls) -> Dict[str, Any]:
        """Diagnostic check of Fast2SMS credentials and wallet balance."""
        if not cls.is_configured():
            return {
                "status": "NOT_CONFIGURED",
                "message": "FAST2SMS_AUTH_KEY is not configured.",
            }

        req = urllib.request.Request("https://www.fast2sms.com/dev/wallet")
        req.add_header("authorization", settings.FAST2SMS_AUTH_KEY.strip())
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return {
                    "status": "CONNECTED" if data.get("return") else "ERROR",
                    "wallet_balance": data.get("wallet"),
                    "sms_count": data.get("sms_count"),
                    "sender_name": settings.FAST2SMS_SENDER_NAME,
                    "phone_number_id": settings.FAST2SMS_WHATSAPP_PHONE_NUMBER_ID,
                    "message_id": settings.FAST2SMS_WHATSAPP_MESSAGE_ID,
                }
        except Exception as e:
            return {
                "status": "CONNECTION_FAILED",
                "error": str(e),
            }

    @staticmethod
    def _extract_error(data: Dict[str, Any]) -> str:
        """Extract clean human-readable error from Fast2SMS response dict."""
        if not data:
            return "Unknown error from Fast2SMS service."

        # Check for message list or string
        msg = data.get("message")
        if isinstance(msg, list) and len(msg) > 0:
            return str(msg[0])
        elif isinstance(msg, str) and msg.strip():
            return msg

        # Check for errors dict
        errors = data.get("errors")
        if isinstance(errors, dict):
            first_key = next(iter(errors), None)
            if first_key and isinstance(errors[first_key], list) and len(errors[first_key]) > 0:
                return str(errors[first_key][0])

        return json.dumps(data)


fast2sms_service = Fast2SMSService()

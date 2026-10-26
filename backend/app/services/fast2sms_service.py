import json
import logging
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple
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

        # WhatsApp Business Cloud API prohibits sending messages to the sender's own number
        sender_number = clean_indian_phone(getattr(settings, "FAST2SMS_SENDER_NUMBER", "8457960495"))
        if target_phone == sender_number:
            err = (
                f"Cannot send WhatsApp OTP to your registered business sender number (+91 {target_phone}). "
                f"WhatsApp Cloud API strictly forbids a sender number from messaging itself. "
                f"Please test OTP delivery with a different WhatsApp number."
            )
            logger.warning(err)
            return False, err

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
                    req_id = data.get("request_id", "N/A")
                    logger.info(f"WhatsApp OTP accepted by Fast2SMS for ...{target_phone[-4:]} (request_id: {req_id})")
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
    def get_waba_and_templates(cls) -> Dict[str, Any]:
        """Fetch WABA account and approved WhatsApp templates directly from Fast2SMS."""
        if not cls.is_configured():
            return {}
        url = "https://www.fast2sms.com/dev/dlt_manager/whatsapp?type=template"
        req = urllib.request.Request(url, headers={"authorization": settings.FAST2SMS_AUTH_KEY.strip()})
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                if res.get("success") and res.get("data"):
                    return res["data"][0]
        except Exception as e:
            logger.warning(f"Failed to fetch WABA templates: {e}")
        return {}

    @classmethod
    def get_recent_delivery_logs(cls, days: int = 3) -> List[Dict[str, Any]]:
        """Fetch recent WhatsApp message delivery statuses from Fast2SMS analytics."""
        if not cls.is_configured():
            return []
        today = datetime.now(timezone.utc).date()
        from_date = (today - timedelta(days=min(days, 2))).strftime("%Y-%m-%d")
        to_date = today.strftime("%Y-%m-%d")
        url = f"https://www.fast2sms.com/dev/whatsapp_logs?from={from_date}&to={to_date}"
        req = urllib.request.Request(
            url,
            headers={
                "authorization": settings.FAST2SMS_AUTH_KEY.strip(),
                "accept": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                return res.get("data", [])
        except Exception as e:
            logger.warning(f"Failed to fetch Fast2SMS WhatsApp delivery logs: {e}")
            return []

    @classmethod
    def test_connection(cls) -> Dict[str, Any]:
        """Diagnostic check of Fast2SMS credentials, wallet, template category, and delivery logs."""
        if not cls.is_configured():
            return {
                "status": "NOT_CONFIGURED",
                "message": "FAST2SMS_AUTH_KEY is not configured.",
            }

        result: Dict[str, Any] = {
            "status": "UNKNOWN",
            "sender_name": settings.FAST2SMS_SENDER_NAME,
            "sender_number": settings.FAST2SMS_SENDER_NUMBER,
            "phone_number_id": settings.FAST2SMS_WHATSAPP_PHONE_NUMBER_ID,
            "configured_message_id": settings.FAST2SMS_WHATSAPP_MESSAGE_ID,
        }

        # 1. Wallet balance check
        req = urllib.request.Request("https://www.fast2sms.com/dev/wallet")
        req.add_header("authorization", settings.FAST2SMS_AUTH_KEY.strip())
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                result["status"] = "CONNECTED" if data.get("return") else "ERROR"
                result["wallet_balance"] = data.get("wallet")
                result["sms_count"] = data.get("sms_count")
        except Exception as e:
            result["status"] = "CONNECTION_FAILED"
            result["wallet_error"] = str(e)
            return result

        # 2. Template and WABA details
        waba_info = cls.get_waba_and_templates()
        if waba_info:
            result["waba_number"] = waba_info.get("number")
            result["waba_verified_name"] = waba_info.get("verified_name")
            result["waba_status"] = waba_info.get("connection_status")
            templates = waba_info.get("templates", [])
            matched_template = next(
                (t for t in templates if str(t.get("message_id")) == str(settings.FAST2SMS_WHATSAPP_MESSAGE_ID)),
                None,
            )
            if matched_template:
                category = matched_template.get("category", "").upper()
                result["active_template"] = {
                    "name": matched_template.get("template_name"),
                    "category": category,
                    "status": matched_template.get("status"),
                    "language": matched_template.get("language"),
                }
                if category == "MARKETING":
                    result["category_warning"] = (
                        "Template category is 'MARKETING'. Meta enforces strict per-user frequency limits "
                        "(Error 131049) on marketing templates, which drops rapid OTP messages. "
                        "For guaranteed instant OTP delivery, create and use an 'AUTHENTICATION' or 'UTILITY' template in Fast2SMS."
                    )
            result["all_available_templates"] = [
                {
                    "message_id": t.get("message_id"),
                    "name": t.get("template_name"),
                    "category": t.get("category"),
                    "status": t.get("status"),
                }
                for t in templates
            ]

        # 3. Recent message delivery reports
        logs = cls.get_recent_delivery_logs()
        result["recent_delivery_reports"] = [
            {
                "sent_time": item.get("sent_time"),
                "mobile": item.get("mobile"),
                "status": item.get("status"),
                "status_description": item.get("status_description"),
                "request_id": item.get("fast2sms_request_id"),
            }
            for item in (logs[:5] if isinstance(logs, list) else [])
        ]

        return result

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

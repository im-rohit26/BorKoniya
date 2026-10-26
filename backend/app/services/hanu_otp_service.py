import json
import logging
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional, Tuple
from app.core.config import settings

logger = logging.getLogger("borkonya.hanuotp")


def normalize_indian_mobile(phone: str) -> str:
    """
    Ensure the mobile number is formatted for HanuOTP.
    HanuOTP strictly requires exactly 10-digit Indian numbers starting with 6,7,8,9 (without country code 91).
    """
    cleaned = phone.strip().replace(" ", "").replace("-", "").replace("+", "")
    if cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    return cleaned


class HanuOTPService:
    @staticmethod
    def is_configured() -> bool:
        """Check if HanuOTP API key is provided in settings."""
        return bool(settings.HANU_OTP_API_KEY and settings.HANU_OTP_API_KEY.strip())

    @classmethod
    def send_sms_otp(
        cls,
        phone_number: str,
        otp_code: str,
    ) -> Tuple[bool, Optional[str]]:
        """
        Sends SMS OTP via HanuOTP API (No DLT required).
        Endpoint: GET https://api.hanuotp.in/sms-otp.php?number={mobile}&OTP={otp}&apikey={key}&templatesid=default
        Returns: (success: bool, error_message: Optional[str])
        """
        if not cls.is_configured():
            logger.info("HanuOTP API key is not configured.")
            return False, "HanuOTP service is not configured on the server."

        target_phone = normalize_indian_mobile(phone_number)
        if len(target_phone) < 10 or not target_phone.isdigit():
            return False, f"Invalid mobile number format: {phone_number}"

        params = urllib.parse.urlencode({
            "number": target_phone,
            "OTP": str(otp_code),
            "apikey": settings.HANU_OTP_API_KEY.strip(),
            "templatesid": getattr(settings, "HANU_OTP_TEMPLATE_ID", "default") or "default",
        })
        url = f"https://api.hanuotp.in/sms-otp.php?{params}"

        req = urllib.request.Request(url, method="GET")
        req.add_header("User-Agent", "BorKoniya-Backend/1.0")

        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                resp_text = resp.read().decode("utf-8", errors="ignore").strip()
                logger.info(f"HanuOTP raw response for ...{target_phone[-4:]}: {resp_text}")

                try:
                    data = json.loads(resp_text)
                except Exception:
                    data = None

                # HanuOTP returns {"return": true, ...} or {"status": true} or text success
                if data and (data.get("return") is True or data.get("status") is True or str(data.get("status")).lower() == "success"):
                    logger.info(f"SMS OTP dispatched via HanuOTP to ...{target_phone[-4:]}")
                    return True, None

                # If plain text response or json message
                if data:
                    msg = data.get("message")
                    if isinstance(msg, list) and len(msg) > 0:
                        err_msg = str(msg[0])
                    elif isinstance(msg, str):
                        err_msg = msg
                    else:
                        err_msg = str(data)
                    return False, err_msg

                # Plain string check
                if "success" in resp_text.lower() or "sent" in resp_text.lower():
                    return True, None

                return False, resp_text or "Unknown response from HanuOTP service."

        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            logger.error(f"HanuOTP HTTP Error {e.code}: {err_body}")
            return False, f"HanuOTP server error: {err_body or e.reason}"

        except Exception as e:
            logger.exception(f"Unexpected error communicating with HanuOTP: {e}")
            return False, f"Failed to connect to HanuOTP: {str(e)}"

    @classmethod
    def test_connection(cls) -> Dict[str, Any]:
        """Diagnostic check of HanuOTP configuration."""
        if not cls.is_configured():
            return {
                "status": "NOT_CONFIGURED",
                "message": "HANU_OTP_API_KEY is not configured in backend settings.",
            }
        return {
            "status": "CONFIGURED",
            "provider": "HanuOTP (SMS OTP without DLT)",
            "api_endpoint": "https://api.hanuotp.in/sms-otp.php",
            "template_id": getattr(settings, "HANU_OTP_TEMPLATE_ID", "default"),
            "api_key_masked": f"{settings.HANU_OTP_API_KEY[:4]}...{settings.HANU_OTP_API_KEY[-4:]}" if len(settings.HANU_OTP_API_KEY) > 8 else "***",
        }


hanu_otp_service = HanuOTPService()

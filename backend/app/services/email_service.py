import smtplib
import logging
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Tuple, Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger("borkonya.email")


def is_valid_email(email: str) -> bool:
    """Basic RFC-compliant email syntax validation."""
    if not email or len(email) > 254:
        return False
    email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(email_regex, email.strip()))


def mask_email(email: str) -> str:
    """Mask email for safe logging (e.g. j***e@example.com)."""
    if not email or "@" not in email:
        return "***"
    parts = email.split("@")
    user = parts[0]
    domain = parts[1]
    if len(user) <= 2:
        masked_user = user[0] + "***"
    else:
        masked_user = user[0] + "***" + user[-1]
    return f"{masked_user}@{domain}"


class EmailService:
    @staticmethod
    def is_configured() -> bool:
        """Returns True if SMTP credentials are fully provided."""
        return bool(settings.SMTP_USER and settings.SMTP_PASSWORD and settings.SMTP_HOST)

    @classmethod
    def test_connection(cls) -> Dict[str, Any]:
        """Diagnostic check of SMTP connectivity and credentials without leaking secrets."""
        if not cls.is_configured():
            return {
                "status": "NOT_CONFIGURED",
                "message": "SMTP_USER or SMTP_PASSWORD is not configured in environment variables.",
                "smtp_host": settings.SMTP_HOST,
                "smtp_port": settings.SMTP_PORT,
                "smtp_user": mask_email(settings.SMTP_USER) if settings.SMTP_USER else None,
            }

        try:
            port = int(settings.SMTP_PORT)
            host = settings.SMTP_HOST.strip()
            user = settings.SMTP_USER.strip()
            password = settings.SMTP_PASSWORD.strip()

            if port == 465:
                server = smtplib.SMTP_SSL(host, port, timeout=10)
            else:
                server = smtplib.SMTP(host, port, timeout=10)
                server.starttls()

            server.login(user, password)
            server.quit()

            return {
                "status": "CONNECTED",
                "message": f"SMTP is successfully connected and authenticated via {host}:{port}.",
                "smtp_host": host,
                "smtp_port": port,
                "smtp_user": mask_email(user),
            }
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"[SMTP] Authentication failed: {type(e).__name__}")
            return {
                "status": "AUTH_FAILED",
                "message": "SMTP authentication failed. Verify username and App Password.",
                "smtp_host": settings.SMTP_HOST,
                "smtp_port": settings.SMTP_PORT,
                "smtp_user": mask_email(settings.SMTP_USER),
            }
        except Exception as e:
            logger.error(f"[SMTP] Connection check failed: {type(e).__name__} {str(e)}")
            return {
                "status": "CONNECTION_FAILED",
                "message": f"SMTP connection error: {type(e).__name__}",
                "smtp_host": settings.SMTP_HOST,
                "smtp_port": settings.SMTP_PORT,
                "smtp_user": mask_email(settings.SMTP_USER),
            }

    @classmethod
    def send_email(
        cls,
        to_email: str,
        subject: str,
        plain_text: str,
        html_body: str,
    ) -> Tuple[bool, Optional[str]]:
        """
        Sends an email via configured SMTP.
        Returns (success: bool, error_message: Optional[str]).
        Never leaks passwords, OTPs, or stack traces in user-facing messages.
        """
        clean_recipient = to_email.strip()
        if not is_valid_email(clean_recipient):
            return False, "Invalid email address format."

        if not cls.is_configured():
            is_dev = settings.DEBUG or settings.ENVIRONMENT == "development"
            if is_dev:
                logger.info(f"[SMTP-DEV] SMTP not configured. Skipped email to {mask_email(clean_recipient)}.")
                return True, None
            logger.error(f"[SMTP] Cannot send email to {mask_email(clean_recipient)}: SMTP credentials missing in environment.")
            return False, "Email service is temporarily unconfigured. Please contact support."

        try:
            port = int(settings.SMTP_PORT)
            host = settings.SMTP_HOST.strip()
            user = settings.SMTP_USER.strip()
            password = settings.SMTP_PASSWORD.strip()
            from_name = settings.SMTP_FROM_NAME or "BorKonya"

            msg = MIMEMultipart("alternative")
            msg["From"] = f"{from_name} <{user}>"
            msg["To"] = clean_recipient
            msg["Subject"] = subject
            msg["Reply-To"] = user

            # Attach plain text and HTML versions
            msg.attach(MIMEText(plain_text, "plain", "utf-8"))
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            if port == 465:
                server = smtplib.SMTP_SSL(host, port, timeout=10)
            else:
                server = smtplib.SMTP(host, port, timeout=10)
                server.ehlo()
                server.starttls()
                server.ehlo()

            server.login(user, password)
            server.send_message(msg)
            server.quit()

            logger.info(f"[SMTP] Successfully sent email to {mask_email(clean_recipient)} (Subject: {subject[:30]}...)")
            return True, None

        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"[SMTP] Authentication failure while sending to {mask_email(clean_recipient)}: {type(e).__name__}")
            return False, "Email delivery authentication failed on server. Please report to support."
        except smtplib.SMTPRecipientsRefused as e:
            logger.warning(f"[SMTP] Recipient rejected: {mask_email(clean_recipient)}")
            return False, "Recipient email address was rejected by the mail server."
        except (smtplib.SMTPServerDisconnected, smtplib.SMTPConnectError, TimeoutError, OSError) as e:
            logger.error(f"[SMTP] Connection/Timeout error sending to {mask_email(clean_recipient)}: {type(e).__name__}")
            return False, "Unable to establish connection to email service. Please try again shortly."
        except Exception as e:
            logger.error(f"[SMTP] Unexpected error sending to {mask_email(clean_recipient)}: {type(e).__name__} {str(e)}")
            return False, "Unable to send verification email. Please try again."

    @classmethod
    def send_otp_email(
        cls,
        to_email: str,
        otp_code: str,
        recipient_name: str = "Member",
    ) -> Tuple[bool, Optional[str]]:
        """Sends branded BorKonya OTP code email."""
        subject = f"Your BorKonya Verification Code is {otp_code}"
        expiry_min = settings.OTP_EXPIRY_MINUTES

        plain_text = (
            f"Hello {recipient_name},\n\n"
            f"Your verification code (OTP) for BorKonya is:\n\n"
            f"    {otp_code}\n\n"
            f"This code will expire in {expiry_min} minutes.\n"
            f"For your account security, please do not share this code with anyone.\n\n"
            f"Warm regards,\n"
            f"The BorKonya Team\n"
            f"Amar Parampara, Amar Saathi"
        )

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #991b1b 0%, #1e1b4b 100%); padding: 30px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">BorKonya</h1>
              <p style="margin: 4px 0 0 0; color: #fecdd3; font-size: 12px; font-weight: 500; letter-spacing: 0.5px;">AMAR PARAMPARA, AMAR SAATHI</p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">Account Verification</h2>
              <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                Hello <strong>{recipient_name}</strong>,<br>
                Please use the following 6-digit one-time code to complete your verification on BorKonya.
              </p>
              
              <!-- OTP Box -->
              <div style="background-color: #fdf2f8; border: 2px dashed #f43f5e; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 25px;">
                <div style="font-size: 11px; font-weight: 700; color: #9f1239; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Your One-Time Code</div>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; color: #881337; letter-spacing: 8px;">{otp_code}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 8px;">Valid for <strong>{expiry_min} minutes</strong></div>
              </div>

              <!-- Security Notice -->
              <div style="background-color: #f1f5f9; border-radius: 10px; padding: 12px 16px; margin-bottom: 25px;">
                <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">
                  &#128274; <strong>Security Reminder:</strong> Never share this code with anyone, including BorKonya support. If you did not request this, please ignore this email.
                </p>
              </div>

              <p style="margin: 0; color: #64748b; font-size: 13px;">
                Warm regards,<br>
                <strong style="color: #0f172a;">Team BorKonya</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 30px; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                BorKonya — Community Matrimonial Platform<br>
                This is an automated message. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        return cls.send_email(to_email, subject, plain_text, html_body)

    @classmethod
    def send_password_reset_email(
        cls,
        to_email: str,
        otp_code: str,
        recipient_name: str = "Member",
    ) -> Tuple[bool, Optional[str]]:
        """Sends password reset OTP email."""
        subject = f"BorKonya Password Reset Code: {otp_code}"
        expiry_min = settings.OTP_EXPIRY_MINUTES

        plain_text = (
            f"Hello {recipient_name},\n\n"
            f"We received a request to reset your BorKonya password.\n\n"
            f"Your password reset code is: {otp_code}\n\n"
            f"This code will expire in {expiry_min} minutes.\n"
            f"If you did not request a password reset, please ignore this email.\n\n"
            f"- Team BorKonya"
        )

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background: linear-gradient(135deg, #991b1b 0%, #1e1b4b 100%); padding: 25px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">BorKonya</h1>
              <p style="margin: 4px 0 0 0; color: #fecdd3; font-size: 12px; font-weight: 500;">Password Reset Request</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                Hello <strong>{recipient_name}</strong>,<br>
                We received a request to reset your BorKonya account password. Please enter the code below:
              </p>
              <div style="background-color: #fdf2f8; border: 2px dashed #f43f5e; border-radius: 14px; padding: 18px; text-align: center; margin-bottom: 20px;">
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; color: #881337; letter-spacing: 8px;">{otp_code}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Valid for {expiry_min} minutes</div>
              </div>
              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                If you did not request this password reset, please ignore this email. Your current password will remain safe.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        return cls.send_email(to_email, subject, plain_text, html_body)


email_service = EmailService()

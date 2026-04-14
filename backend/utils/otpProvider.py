import os
from smtplib import SMTP
from random import randint
from dotenv import load_dotenv
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", "0"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM")


def generate_otp() -> str:
    # 6-digit OTP, preserves leading zeros
    return f"{randint(0, 999999):06d}"


def send_otp(to_email: str, otp: str, expire_minutes: int) -> None:
    if not SMTP_SERVER or not SMTP_PORT or not SMTP_USERNAME or not SMTP_PASSWORD or not SMTP_FROM:
        raise RuntimeError("SMTP configuration is incomplete. Check .env values.")

    subject = "Your Verification Code"

    body = f"""
Hello,
Your OTP code is {otp}

This OTP will expire in {expire_minutes} minutes.

Do not share this code with anyone.

Regards,
CareerLens Team
""".strip()

    message = MIMEMultipart()
    message["From"] = SMTP_FROM
    message["To"] = to_email
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain"))

    try:
        with SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
    except Exception as e:
        raise RuntimeError(f"Failed to send OTP email: {e}") from e






"""
Second factor for privileged users (ТЗ 5.1, 9.1): time-based one-time codes (TOTP, RFC 6238)
from any authenticator app. No SMS, no third-party service.
"""

import io

import pyotp
import qrcode
import qrcode.image.svg

ISSUER = "Tirek"


def new_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(email: str, secret: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=ISSUER)


def verify(secret: str, code: str) -> bool:
    """One step of clock drift either way is accepted."""
    code = (code or "").replace(" ", "")
    return bool(secret) and code.isdigit() and pyotp.TOTP(secret).verify(code, valid_window=1)


def qr_svg(uri: str) -> str:
    buf = io.BytesIO()
    qrcode.make(uri, image_factory=qrcode.image.svg.SvgPathImage, box_size=8, border=2).save(buf)
    return buf.getvalue().decode()

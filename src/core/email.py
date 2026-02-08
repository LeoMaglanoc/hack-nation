"""Email sending via Resend."""

import base64

import httpx

from src.core.types import InvoiceRequest


def send_invoice_email(
    *,
    api_key: str,
    from_email: str,
    to_email: str | None,
    invoice: InvoiceRequest,
    message: str,
    pdf_bytes: bytes,
) -> str | None:
    recipient = to_email or invoice.customer.email
    payload = {
        "from": from_email,
        "to": [recipient],
        "subject": "Your Agentic Commerce Invoice",
        "text": message,
        "attachments": [
            {
                "filename": "invoice.pdf",
                "content": base64.b64encode(pdf_bytes).decode("utf-8"),
            }
        ],
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=15.0) as client:
        resp = client.post("https://api.resend.com/emails", json=payload, headers=headers)

    if resp.status_code >= 400:
        raise ValueError(f"Resend request failed: {resp.status_code} {resp.text}")

    data = resp.json()
    return data.get("id")

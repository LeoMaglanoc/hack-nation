"""FastAPI app — agentic commerce backend."""

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.ai.brief import parse_brief
from src.ai.message import generate_customer_message
from src.core.cart import build_cart
from src.core.checkout import build_checkout_plan
from src.core.email import send_invoice_email
from src.core.invoice import build_invoice_pdf
from src.core.ranking import rank_products
from src.core.retailers import discover_products
from src.core.types import (
    BriefRequest,
    BriefResponse,
    CartRequest,
    CartResponse,
    CheckoutRequest,
    CheckoutResponse,
    DiscoverRequest,
    DiscoverResponse,
    InvoiceRequest,
    InvoiceResponse,
    RankRequest,
    RankResponse,
)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "")
SERPAPI_API_KEY = os.environ.get("SERPAPI_API_KEY", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM = os.environ.get("RESEND_FROM", "Agentic Commerce <ak1820098@gmail.com>")
RESEND_TO = os.environ.get("RESEND_TO", "")

app = FastAPI(title="hack-nation-backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}




@app.post("/api/brief", response_model=BriefResponse)
def brief(req: BriefRequest):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not set.")

    try:
        spec = parse_brief(
            req.intent,
            api_key=OPENAI_API_KEY,
            model=OPENAI_MODEL or None,
        )
        return {"spec": spec}
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"AI response invalid: {e}") from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {e}") from e


@app.post("/api/discover", response_model=DiscoverResponse)
def discover(req: DiscoverRequest):
    if not SERPAPI_API_KEY:
        raise HTTPException(status_code=503, detail="SERPAPI_API_KEY not set.")

    try:
        products = discover_products(
            req.spec,
            api_key=SERPAPI_API_KEY,
        )
        return {"products": products}
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"AI response invalid: {e}") from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {e}") from e


@app.post("/api/rank", response_model=RankResponse)
def rank(req: RankRequest):
    ranked = rank_products(req.spec, req.products)
    return {"ranked": ranked}


@app.post("/api/cart", response_model=CartResponse)
def cart(req: CartRequest):
    cart_result = build_cart(req.products, size=req.size)
    return {"cart": cart_result}


@app.post("/api/checkout", response_model=CheckoutResponse)
def checkout(req: CheckoutRequest):
    plan = build_checkout_plan(req.cart, req.address, req.payment)
    return {"plan": plan}


@app.post("/api/invoice/email", response_model=InvoiceResponse)
def send_invoice(req: InvoiceRequest):
    if not RESEND_API_KEY:
        raise HTTPException(status_code=503, detail="RESEND_API_KEY not set.")
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not set.")

    try:
        message = generate_customer_message(
            api_key=OPENAI_API_KEY,
            customer_name=req.customer.full_name,
            model=OPENAI_MODEL or None,
        )
        pdf_bytes = build_invoice_pdf(req)
        email_id = send_invoice_email(
            api_key=RESEND_API_KEY,
            from_email=RESEND_FROM,
            to_email=RESEND_TO or None,
            invoice=req,
            message=message,
            pdf_bytes=pdf_bytes,
        )
        return {"message": message, "email_id": email_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email error: {e}") from e

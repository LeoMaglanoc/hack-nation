"""FastAPI app — Easy Buy backend."""

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.ai.breakdown import parse_breakdown
from src.ai.brief import parse_brief
from src.ai.message import generate_customer_message
from src.ai.tradeoffs import parse_tradeoffs
from src.core.cart import build_cart
from src.core.checkout import build_checkout_plan
from src.core.email import send_invoice_email
from src.core.invoice import build_invoice_pdf
from src.core.ranking import rank_products
from src.core.retailers import discover_products
from src.core.types import (
    ArticleSearchRequest,
    ArticleSearchResponse,
    BreakdownRequest,
    BreakdownResponse,
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
    ShoppingSpec,
    TradeoffRequest,
    TradeoffResponse,
)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
SERPAPI_API_KEY = os.environ.get("SERPAPI_API_KEY", "")
LLM_MODEL = os.environ.get("LLM_MODEL", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
RESEND_FROM = os.environ.get("RESEND_FROM", "EasyBuy <easy-buy@lemon.de>")
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


@app.post("/api/breakdown", response_model=BreakdownResponse)
def breakdown(req: BreakdownRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not set.")

    try:
        result = parse_breakdown(
            req.intent,
            api_key=GEMINI_API_KEY,
            model=LLM_MODEL or None,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"AI response invalid: {e}") from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {e}") from e


@app.post("/api/tradeoffs", response_model=TradeoffResponse)
def tradeoffs(req: TradeoffRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not set.")

    try:
        return parse_tradeoffs(
            req.intent,
            constraints=req.constraints,
            api_key=GEMINI_API_KEY,
            model=LLM_MODEL or None,
        )
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"AI response invalid: {e}") from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {e}") from e


@app.post("/api/brief", response_model=BriefResponse)
def brief(req: BriefRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not set.")

    try:
        spec = parse_brief(
            req.intent,
            api_key=GEMINI_API_KEY,
            model=LLM_MODEL or None,
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
    products = discover_products(req.spec, api_key=SERPAPI_API_KEY)
    return {"products": products}


@app.post("/api/rank", response_model=RankResponse)
def rank(req: RankRequest):
    ranked = rank_products(
        req.products,
        budget=req.spec.budget,
        delivery_days=req.spec.deadline_days,
        preferences=req.spec.must_haves + req.spec.nice_to_haves,
    )
    return {"ranked": ranked}


@app.post("/api/search", response_model=ArticleSearchResponse)
def search(req: ArticleSearchRequest):
    if not SERPAPI_API_KEY:
        raise HTTPException(status_code=503, detail="SERPAPI_API_KEY not set.")

    try:
        per_budget = (req.constraints.budget or 400) / max(req.num_articles, 1)

        spec = ShoppingSpec(
            intent=req.article.name,
            budget=per_budget,
            deadline_days=req.constraints.deadline_days or 7,
            size=req.constraints.size or "M",
            must_haves=(req.constraints.preferences or [])
            + (req.constraints.brand_preferences or []),
            nice_to_haves=[],
        )

        products = discover_products(spec, api_key=SERPAPI_API_KEY)

        if req.budget_range and req.budget_range.enabled:
            min_price = req.budget_range.current_min or req.budget_range.min
            max_price = req.budget_range.current_max or req.budget_range.max
            filtered = [
                product
                for product in products
                if min_price <= product.price <= max_price
            ]
            if filtered:
                products = filtered

        weights = None
        scoring_budget = per_budget
        if req.tradeoff_key == "value":
            weights = {
                "price": 0.45,
                "delivery": 0.15,
                "rating": 0.15,
                "match": 0.1,
                "return": 0.15,
            }
        elif req.tradeoff_key == "fast":
            weights = {
                "price": 0.2,
                "delivery": 0.4,
                "rating": 0.15,
                "match": 0.1,
                "return": 0.15,
            }
        elif req.tradeoff_key == "quality":
            weights = {
                "price": 0.1,
                "delivery": 0.1,
                "rating": 0.5,
                "match": 0.15,
                "return": 0.15,
            }
            scoring_budget = per_budget * 1.25

        ranked = rank_products(
            products,
            budget=scoring_budget,
            delivery_days=req.constraints.deadline_days or 7,
            preferences=(req.constraints.preferences or [])
            + (req.constraints.brand_preferences or []),
            brand_preferences=req.constraints.brand_preferences,
            budget_range=req.budget_range,
            weights=weights,
        )

        return ArticleSearchResponse(
            article=req.article,
            ranked_products=ranked[:3],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {e}") from e


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

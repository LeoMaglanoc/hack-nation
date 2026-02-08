"""FastAPI app — agentic commerce backend."""

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.ai.brief import parse_brief
from src.core.cart import build_cart
from src.core.checkout import build_checkout_plan
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
    RankRequest,
    RankResponse,
)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "")
SERPAPI_API_KEY = os.environ.get("SERPAPI_API_KEY", "")

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

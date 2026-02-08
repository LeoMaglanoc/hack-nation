"""Integration tests for Easy Buy endpoints."""

from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from src.core.types import Product, ProductVariant, ShoppingSpec  # noqa: F401
from src.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.anyio
@patch("src.main.parse_brief")
@patch("src.main.GEMINI_API_KEY", "fake-key")
async def test_brief_returns_spec(mock_parse):
    spec = ShoppingSpec(
        intent="Downhill skiing outfit",
        budget=400,
        deadline_days=5,
        size="M",
        must_haves=["waterproof"],
        nice_to_haves=[],
    )
    mock_parse.return_value = spec

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/brief", json={"intent": "Need a skiing outfit"})

    assert resp.status_code == 200
    assert resp.json()["spec"]["budget"] == 400


@pytest.mark.anyio
@patch("src.main.GEMINI_API_KEY", "")
async def test_brief_returns_503_when_no_api_key():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/brief", json={"intent": "Need a skiing outfit"})

    assert resp.status_code == 503
    assert "GEMINI_API_KEY" in resp.json()["detail"]


@pytest.mark.anyio
@patch("src.main.discover_products")
@patch("src.main.SERPAPI_API_KEY", "fake-key")
async def test_discover_returns_products(mock_discover):
    mock_discover.return_value = [
        Product(
            id="p1",
            name="Jacket",
            category="jacket",
            price=200.0,
            delivery_days=3,
            retailer="AlpineCo",
            variants=[ProductVariant(size="M", color="black")],
            tags=["waterproof"],
        )
    ]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/discover",
            json={
                "spec": {
                    "intent": "Downhill skiing outfit",
                    "budget": 400,
                    "deadline_days": 5,
                    "size": "M",
                    "must_haves": ["waterproof"],
                    "nice_to_haves": [],
                }
            },
        )

    assert resp.status_code == 200
    assert resp.json()["products"][0]["id"] == "p1"


@pytest.mark.anyio
@patch("src.main.rank_products")
async def test_rank_returns_ranked_products(mock_rank):
    spec = ShoppingSpec(
        intent="Downhill skiing outfit",
        budget=400,
        deadline_days=5,
        size="M",
        must_haves=["waterproof"],
        nice_to_haves=[],
    )
    mock_rank.return_value = []

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/rank",
            json={"spec": spec.model_dump(), "products": []},
        )

    assert resp.status_code == 200
    assert resp.json()["ranked"] == []


@pytest.mark.anyio
@patch("src.main.build_cart")
async def test_cart_returns_cart(mock_cart):
    mock_cart.return_value = {
        "items": [],
        "total_cost": 0,
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/cart", json={"products": [], "size": "M"})

    assert resp.status_code == 200
    assert resp.json()["cart"]["total_cost"] == 0


@pytest.mark.anyio
@patch("src.main.build_checkout_plan")
async def test_checkout_returns_plan(mock_checkout):
    mock_checkout.return_value = {
        "retailer_steps": [],
        "summary": "ok",
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/checkout",
            json={
                "cart": {"items": [], "total_cost": 0},
                "address": {"line1": "123 St", "city": "X", "country": "US"},
                "payment": {"card_last4": "4242"},
            },
        )

    assert resp.status_code == 200
    assert resp.json()["plan"]["summary"] == "ok"


@pytest.mark.anyio
@patch("src.main.discover_products")
@patch("src.main.SERPAPI_API_KEY", "fake-key")
async def test_search_returns_ranked_products(mock_discover):
    mock_discover.return_value = [
        Product(
            id="ws1",
            name="North Face Jacket",
            price=250.0,
            delivery_days=4,
            retailer="REI",
            rating=4.5,
            description="Waterproof ski jacket",
        ),
        Product(
            id="ws2",
            name="Budget Jacket",
            price=89.0,
            delivery_days=7,
            retailer="Amazon",
            rating=3.8,
            description="Basic jacket",
        ),
    ]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/search",
            json={
                "article": {"name": "Ski Jacket", "category": "jacket", "selected": True},
                "constraints": {
                    "budget": 400,
                    "deadline_days": 5,
                    "size": "M",
                    "preferences": ["waterproof"],
                },
                "intent": "skiing outfit",
                "num_articles": 5,
            },
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["article"]["name"] == "Ski Jacket"
    assert len(data["ranked_products"]) >= 1
    assert data["ranked_products"][0]["rank"] == 1
    assert "score_breakdown" in data["ranked_products"][0]


@pytest.mark.anyio
@patch("src.main.SERPAPI_API_KEY", "")
async def test_search_returns_503_when_no_api_key():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/search",
            json={
                "article": {"name": "Ski Jacket", "category": "jacket", "selected": True},
                "constraints": {"preferences": []},
                "intent": "skiing outfit",
                "num_articles": 1,
            },
        )

    assert resp.status_code == 503
    assert "SERPAPI_API_KEY" in resp.json()["detail"]

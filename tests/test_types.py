"""Unit tests for Easy Buy Pydantic models."""

import pytest
from pydantic import ValidationError

from src.core.types import (
    ArticleSearchRequest,
    ArticleSearchResponse,
    BudgetRange,
    CartItem,
    ExtractedConstraints,
    Message,
    Product,
    ProductVariant,
    RankedProduct,
    ScoreBreakdown,
    ShoppingSpec,
    SuggestedArticle,
    TradeoffRequest,
    TradeoffResponse,
    TradeoffVariant,
)


class TestShoppingSpec:
    def test_valid_spec(self):
        spec = ShoppingSpec(
            intent="Downhill skiing outfit",
            budget=400,
            deadline_days=5,
            size="M",
            must_haves=["waterproof"],
            nice_to_haves=["insulated"],
        )
        assert spec.budget == 400
        assert spec.deadline_days == 5

    def test_invalid_budget_rejected(self):
        with pytest.raises(ValidationError):
            ShoppingSpec(
                intent="Downhill skiing outfit",
                budget=0,
                deadline_days=5,
                size="M",
                must_haves=["waterproof"],
                nice_to_haves=[],
            )

    def test_missing_size_rejected(self):
        with pytest.raises(ValidationError):
            ShoppingSpec(
                intent="Downhill skiing outfit",
                budget=400,
                deadline_days=5,
                size="",
                must_haves=[],
                nice_to_haves=[],
            )


class TestProduct:
    def test_valid_product(self):
        product = Product(
            id="p1",
            name="Ski Jacket",
            category="jacket",
            price=199.0,
            delivery_days=3,
            retailer="AlpineCo",
            variants=[ProductVariant(size="M", color="black")],
            tags=["waterproof"],
        )
        assert product.retailer == "AlpineCo"

    def test_invalid_delivery_rejected(self):
        with pytest.raises(ValidationError):
            Product(
                id="p2",
                name="Ski Pants",
                category="pants",
                price=120.0,
                delivery_days=0,
                retailer="SnowMart",
                variants=[ProductVariant(size="M", color="blue")],
                tags=[],
            )


class TestProductWebSearch:
    """Products from web search have optional fields and no variants/tags."""

    def test_web_search_product_minimal(self):
        product = Product(
            id="ws1",
            name="North Face Jacket",
            price=250.0,
            delivery_days=4,
            retailer="REI",
        )
        assert product.category == ""
        assert product.variants == []
        assert product.tags == []
        assert product.url == ""
        assert product.rating == 0.0
        assert product.description == ""

    def test_web_search_product_full(self):
        product = Product(
            id="ws2",
            name="Patagonia Jacket",
            price=320.0,
            delivery_days=3,
            retailer="Patagonia.com",
            url="https://example.com/jacket",
            rating=4.5,
            description="Insulated waterproof jacket",
        )
        assert product.url == "https://example.com/jacket"
        assert product.rating == 4.5
        assert product.description == "Insulated waterproof jacket"


class TestScoreBreakdown:
    def test_default_breakdown(self):
        bd = ScoreBreakdown()
        assert bd.price_score == 0.0
        assert bd.penalty == 1.0
        assert bd.reason == ""

    def test_custom_breakdown(self):
        bd = ScoreBreakdown(
            price_score=0.9,
            delivery_score=1.0,
            rating_score=0.8,
            match_score=0.7,
            penalty=0.5,
            reason="Over budget",
        )
        assert bd.penalty == 0.5


class TestRankedProduct:
    def test_ranked_product_with_breakdown(self):
        product = Product(
            id="p1",
            name="Jacket",
            price=200.0,
            delivery_days=3,
            retailer="REI",
        )
        rp = RankedProduct(product=product, score=0.85, rank=1)
        assert rp.rank == 1
        assert rp.score_breakdown.price_score == 0.0  # default


class TestMessage:
    def test_user_message(self):
        msg = Message(role="user", content="hello")
        assert msg.role == "user"

    def test_assistant_message(self):
        msg = Message(role="assistant", content="hi")
        assert msg.role == "assistant"

    def test_invalid_role_rejected(self):
        with pytest.raises(ValidationError):
            Message(role="system", content="bad")


class TestArticleSearchModels:
    def test_search_request(self):
        budget_range = BudgetRange(min=10, max=50, enabled=True, current_min=10, current_max=50)
        req = ArticleSearchRequest(
            article=SuggestedArticle(name="Ski Jacket", category="jacket"),
            constraints=ExtractedConstraints(budget=400, size="M", brand_preferences=["adidas"]),
            intent="skiing outfit",
            num_articles=5,
            budget_range=budget_range,
        )
        assert req.article.name == "Ski Jacket"
        assert req.num_articles == 5

    def test_search_response(self):
        product = Product(
            id="p1",
            name="Jacket",
            price=200.0,
            delivery_days=3,
            retailer="REI",
        )
        resp = ArticleSearchResponse(
            article=SuggestedArticle(name="Ski Jacket", category="jacket"),
            ranked_products=[RankedProduct(product=product, score=0.8, rank=1)],
        )
        assert len(resp.ranked_products) == 1


class TestCartItem:
    def test_invalid_quantity_rejected(self):
        product = Product(
            id="p3",
            name="Gloves",
            category="gloves",
            price=35.0,
            delivery_days=2,
            retailer="PeakGear",
            variants=[ProductVariant(size="M", color="gray")],
            tags=[],
        )
        with pytest.raises(ValidationError):
            CartItem(product=product, quantity=0)


class TestTradeoffs:
    def test_tradeoff_variant(self):
        variant = TradeoffVariant(
            key="value",
            label="Cheaper",
            summary="Lower budget",
            constraints=ExtractedConstraints(budget=300, deadline_days=5),
        )
        assert variant.key == "value"

    def test_tradeoff_request_response(self):
        req = TradeoffRequest(
            intent="ski outfit",
            constraints=ExtractedConstraints(budget=400, size="M"),
        )
        resp = TradeoffResponse(
            variants=[
                TradeoffVariant(
                    key="fast",
                    label="Faster delivery",
                    summary="Tighter deadline",
                    constraints=ExtractedConstraints(deadline_days=3),
                )
            ]
        )
        assert req.intent == "ski outfit"
        assert resp.variants[0].key == "fast"

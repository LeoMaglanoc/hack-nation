"""Unit tests for ranking logic."""

from src.core.ranking import rank_products
from src.core.types import Product, ProductVariant, ShoppingSpec


def test_rank_prefers_lower_price_and_higher_rating():
    spec = ShoppingSpec(
        intent="Downhill skiing outfit",
        budget=400,
        deadline_days=5,
        size="M",
        must_haves=["waterproof"],
        nice_to_haves=[],
    )

    products = [
        Product(
            id="best",
            name="Best Jacket",
            category="jacket",
            price=150.0,
            delivery_days=3,
            rating=4.7,
            retailer="AlpineCo",
            variants=[ProductVariant(size="M", color="black")],
            tags=["waterproof"],
        ),
        Product(
            id="cheap-low-rating",
            name="Cheap Jacket",
            category="jacket",
            price=120.0,
            delivery_days=7,
            rating=2.5,
            retailer="SnowMart",
            variants=[ProductVariant(size="M", color="blue")],
            tags=["waterproof"],
        ),
        Product(
            id="expensive-high-rating",
            name="Premium Jacket",
            category="jacket",
            price=300.0,
            delivery_days=4,
            rating=4.9,
            retailer="PeakGear",
            variants=[ProductVariant(size="M", color="gray")],
            tags=["waterproof"],
        ),
    ]

    ranked = rank_products(spec, products)

    assert ranked[0].product.id == "best"
    assert ranked[0].score >= ranked[1].score
    assert "price" in " ".join(ranked[0].reasons).lower()
    assert "rating" in " ".join(ranked[0].reasons).lower()

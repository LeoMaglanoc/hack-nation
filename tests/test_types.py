"""Unit tests for agentic commerce Pydantic models."""

import pytest
from pydantic import ValidationError

from src.core.types import (
    CartItem,
    Product,
    ProductVariant,
    ShoppingSpec,
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
            rating=4.6,
            rating_count=120,
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
                rating=4.0,
                rating_count=15,
                retailer="SnowMart",
                variants=[ProductVariant(size="M", color="blue")],
                tags=[],
            )

    def test_invalid_rating_rejected(self):
        with pytest.raises(ValidationError):
            Product(
                id="p4",
                name="Ski Helmet",
                category="helmet",
                price=90.0,
                delivery_days=3,
                rating=6.0,
                rating_count=10,
                retailer="SnowMart",
                variants=[ProductVariant(size="M", color="black")],
                tags=[],
            )

    def test_invalid_rating_count_rejected(self):
        with pytest.raises(ValidationError):
            Product(
                id="p5",
                name="Ski Boots",
                category="boots",
                price=180.0,
                delivery_days=4,
                rating=4.2,
                rating_count=-1,
                retailer="SnowMart",
                variants=[ProductVariant(size="M", color="black")],
                tags=[],
            )


class TestCartItem:
    def test_invalid_quantity_rejected(self):
        product = Product(
            id="p3",
            name="Gloves",
            category="gloves",
            price=35.0,
            delivery_days=2,
            rating=4.2,
            rating_count=50,
            retailer="PeakGear",
            variants=[ProductVariant(size="M", color="gray")],
            tags=[],
        )
        with pytest.raises(ValidationError):
            CartItem(product=product, quantity=0)

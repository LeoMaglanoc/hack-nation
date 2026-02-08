"""Unit tests for SerpAPI Google Shopping discovery."""

from unittest.mock import MagicMock, patch

from src.core.retailers import discover_products
from src.core.types import ShoppingSpec


def test_discover_products_from_three_retailers():
    spec = ShoppingSpec(
        intent="Downhill skiing outfit",
        budget=400,
        deadline_days=5,
        size="M",
        must_haves=["waterproof"],
        nice_to_haves=[],
    )

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "shopping_results": [
            {
                "product_id": "p1",
                "title": "Jacket",
                "price": "$199",
                "rating": 4.6,
                "reviews": 120,
                "source": "StoreA",
                "link": "https://storea.example/jacket",
                "thumbnail": "https://storea.example/jacket.jpg",
            },
            {
                "product_id": "p2",
                "title": "Pants",
                "price": "$120",
                "rating": 4.2,
                "reviews": 32,
                "source": "StoreB",
                "link": "https://storeb.example/pants",
                "thumbnail": "https://storeb.example/pants.jpg",
            },
            {
                "product_id": "p3",
                "title": "Gloves",
                "price": "$35",
                "rating": 4.8,
                "reviews": 88,
                "source": "StoreC",
                "link": "https://storec.example/gloves",
                "thumbnail": "https://storec.example/gloves.jpg",
            },
        ]
    }

    mock_client = MagicMock()
    mock_client.__enter__.return_value.get.return_value = mock_response

    with patch("src.core.retailers.httpx.Client", return_value=mock_client):
        products = discover_products(spec, api_key="fake-key")

    retailers = {product.retailer for product in products}

    assert len(retailers) >= 3
    assert all(product.price > 0 for product in products)
    assert all(product.delivery_days > 0 for product in products)

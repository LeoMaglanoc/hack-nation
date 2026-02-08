"""Retailer discovery via SerpAPI Google Shopping."""

import re
from typing import Any

import httpx

from src.core.types import Product, ProductVariant, ShoppingSpec


def discover_products(
    spec: ShoppingSpec,
    *,
    api_key: str,
) -> list[Product]:
    query = (
        f"{spec.intent}. size {spec.size}. "
        f"budget {spec.budget}. must have: {', '.join(spec.must_haves)}"
    )

    params = {
        "engine": "google_shopping",
        "q": query,
        "api_key": api_key,
    }

    with httpx.Client(timeout=15.0, follow_redirects=True) as client:
        resp = client.get("https://serpapi.com/search.json", params=params)
    if resp.status_code >= 400:
        raise ValueError("SerpAPI request failed")

    data = resp.json()
    results = data.get("shopping_results", [])

    products: list[Product] = []
    for item in results:
        try:
            products.append(_to_product(item, spec.size))
        except Exception:
            continue

    return [p for p in products if p.price > 0 and p.delivery_days > 0]


def _to_product(item: dict[str, Any], size: str) -> Product:
    variants_raw = item.get("variants") or [{"size": size}]
    variants = [
        ProductVariant(size=v.get("size", size), color=v.get("color"))
        for v in variants_raw
    ]

    return Product(
        id=str(item.get("product_id") or item.get("title")),
        name=str(item.get("title")),
        category=_infer_category(str(item.get("title", ""))),
        price=_parse_price(item.get("price")),
        delivery_days=5,
        rating=_parse_rating(item.get("rating")),
        rating_count=_parse_rating_count(item.get("reviews")),
        retailer=str(item.get("source", "unknown")),
        url=item.get("link"),
        image_url=item.get("thumbnail"),
        variants=variants,
        tags=[str(tag) for tag in item.get("tags", [])],
    )


def _parse_price(value: Any) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if not value:
        raise ValueError("Missing price")
    match = re.search(r"[\d,.]+", str(value))
    if not match:
        raise ValueError("Invalid price")
    return float(match.group(0).replace(",", ""))


def _parse_rating(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    match = re.search(r"[\d.]+", str(value))
    if not match:
        return 0.0
    return float(match.group(0))


def _parse_rating_count(value: Any) -> int:
    if value is None:
        return 0
    if isinstance(value, int):
        return max(value, 0)
    match = re.search(r"[\d,]+", str(value))
    if not match:
        return 0
    return int(match.group(0).replace(",", ""))


def _infer_category(title: str) -> str:
    lower = title.lower()
    for keyword in ["jacket", "pants", "gloves", "goggles", "helmet", "boots"]:
        if keyword in lower:
            return keyword
    return "other"

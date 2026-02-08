"""Deterministic ranking logic for products."""

from src.core.types import Product, RankedProduct, ShoppingSpec


def _normalize(value: float, min_value: float, max_value: float) -> float:
    if max_value == min_value:
        return 0.5
    return (value - min_value) / (max_value - min_value)


def score_product(
    spec: ShoppingSpec,
    product: Product,
    *,
    min_price: float,
    max_price: float,
) -> tuple[float, list[str]]:
    reasons: list[str] = []

    price_norm = 1 - _normalize(product.price, min_price, max_price)
    rating_norm = product.rating / 5 if product.rating else 0.0
    delivery_bonus = 1.0 if product.delivery_days <= spec.deadline_days else 0.0

    score = (price_norm * 0.6 + rating_norm * 0.3 + delivery_bonus * 0.1) * 100

    reasons.append("Lower price" if price_norm >= 0.5 else "Higher price")
    reasons.append("Higher rating" if rating_norm >= 0.6 else "Lower rating")
    if delivery_bonus:
        reasons.append("Delivery before deadline")
    else:
        reasons.append("Delivery after deadline")

    return score, reasons


def rank_products(spec: ShoppingSpec, products: list[Product]) -> list[RankedProduct]:
    if not products:
        return []

    prices = [product.price for product in products]
    min_price = min(prices)
    max_price = max(prices)

    ranked: list[RankedProduct] = []
    for product in products:
        score, reasons = score_product(
            spec,
            product,
            min_price=min_price,
            max_price=max_price,
        )
        ranked.append(RankedProduct(product=product, score=score, reasons=reasons))

    ranked.sort(key=lambda item: item.score, reverse=True)
    return ranked

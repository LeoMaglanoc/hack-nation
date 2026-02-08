"""Pydantic models for Easy Buy."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ShoppingSpec(BaseModel):
    intent: str
    budget: float = Field(gt=0)
    deadline_days: int = Field(gt=0)
    size: str
    must_haves: list[str]
    nice_to_haves: list[str]

    @field_validator("intent", "size")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("value must not be blank")
        return v


class ProductVariant(BaseModel):
    size: str
    color: str | None = None


class Product(BaseModel):
    id: str
    name: str
    category: str = ""
    price: float = Field(gt=0)
    delivery_days: int = Field(gt=0)
    retailer: str
    variants: list[ProductVariant] = []
    tags: list[str] = []
    url: str = ""
    rating: float = 0.0
    rating_count: int = 0
    description: str = ""
    image_url: str | None = None


class ScoreBreakdown(BaseModel):
    price_score: float = 0.0
    delivery_score: float = 0.0
    rating_score: float = 0.0
    match_score: float = 0.0
    return_score: float = 0.0
    penalty: float = 1.0
    reason: str = ""


class RankedProduct(BaseModel):
    product: Product
    rank: int = 0
    score: float
    score_breakdown: ScoreBreakdown = ScoreBreakdown()
    reasons: list[str] = []


class CartItem(BaseModel):
    product: Product
    quantity: int = Field(gt=0)
    selected_variant: ProductVariant | None = None
    missing_variant: bool = False


class Cart(BaseModel):
    items: list[CartItem]
    total_cost: float = Field(ge=0)


class Address(BaseModel):
    line1: str
    city: str
    country: str


class Payment(BaseModel):
    card_last4: str


class CheckoutStep(BaseModel):
    retailer: str
    steps: list[str]


class CheckoutPlan(BaseModel):
    retailer_steps: list[CheckoutStep]
    summary: str


class SuggestedArticle(BaseModel):
    name: str
    category: str
    selected: bool = True


class BudgetRange(BaseModel):
    min: float = Field(ge=0)
    max: float = Field(ge=0)
    enabled: bool = False
    current_min: float | None = None
    current_max: float | None = None


class ExtractedConstraints(BaseModel):
    budget: float | None = None
    deadline_days: int | None = None
    size: str | None = None
    preferences: list[str] = []
    brand_preferences: list[str] = []
    budget_ranges: dict[str, BudgetRange] = {}


class BreakdownRequest(BaseModel):
    intent: str


class BreakdownResponse(BaseModel):
    articles: list[SuggestedArticle]
    constraints: ExtractedConstraints


class TradeoffVariant(BaseModel):
    key: str
    label: str
    summary: str
    constraints: ExtractedConstraints


class TradeoffRequest(BaseModel):
    intent: str
    constraints: ExtractedConstraints


class TradeoffResponse(BaseModel):
    variants: list[TradeoffVariant]


class BriefRequest(BaseModel):
    intent: str


class BriefResponse(BaseModel):
    spec: ShoppingSpec


class DiscoverRequest(BaseModel):
    spec: ShoppingSpec


class DiscoverResponse(BaseModel):
    products: list[Product]


class RankRequest(BaseModel):
    spec: ShoppingSpec
    products: list[Product]


class RankResponse(BaseModel):
    ranked: list[RankedProduct]


class CartRequest(BaseModel):
    products: list[Product]
    size: str


class CartResponse(BaseModel):
    cart: Cart


class CheckoutRequest(BaseModel):
    cart: Cart
    address: Address
    payment: Payment


class CheckoutResponse(BaseModel):
    plan: CheckoutPlan


class CustomerInfo(BaseModel):
    full_name: str
    email: str
    phone: str
    address: str
    city: str
    state: str
    zip: str
    country: str


class InvoiceItem(BaseModel):
    name: str
    retailer: str
    price: float = Field(gt=0)
    delivery_date: str


class InvoiceRequest(BaseModel):
    customer: CustomerInfo
    items: list[InvoiceItem]
    total: float = Field(gt=0)


class InvoiceResponse(BaseModel):
    message: str
    email_id: str | None = None


class ArticleSearchRequest(BaseModel):
    article: SuggestedArticle
    constraints: ExtractedConstraints
    intent: str
    num_articles: int = 1
    tradeoff_key: str | None = None
    budget_range: BudgetRange | None = None


class ArticleSearchResponse(BaseModel):
    article: SuggestedArticle
    ranked_products: list[RankedProduct]

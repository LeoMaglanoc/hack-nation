"""Pydantic models for agentic commerce."""

from pydantic import BaseModel, Field, field_validator


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
    category: str
    price: float = Field(gt=0)
    delivery_days: int = Field(gt=0)
    rating: float = Field(ge=0, le=5, default=0)
    rating_count: int = Field(ge=0, default=0)
    retailer: str
    url: str | None = None
    image_url: str | None = None
    variants: list[ProductVariant]
    tags: list[str]


class RankedProduct(BaseModel):
    product: Product
    score: float
    reasons: list[str]


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

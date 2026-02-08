export interface ShoppingSpec {
  intent: string;
  budget: number;
  deadline_days: number;
  size: string;
  must_haves: string[];
  nice_to_haves: string[];
}

export interface ProductVariant {
  size: string;
  color?: string | null;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  delivery_days: number;
  rating?: number;
  rating_count?: number;
  retailer: string;
  url?: string | null;
  image_url?: string | null;
  variants: ProductVariant[];
  tags: string[];
}

export interface RankedProduct {
  product: Product;
  score: number;
  reasons: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selected_variant?: ProductVariant | null;
  missing_variant: boolean;
}

export interface Cart {
  items: CartItem[];
  total_cost: number;
}

export interface CheckoutStep {
  retailer: string;
  steps: string[];
}

export interface CheckoutPlan {
  retailer_steps: CheckoutStep[];
  summary: string;
}

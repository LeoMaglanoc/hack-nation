# Architecture — Easy Buy (Option B: Skiing Outfit)

## System diagram

```
Browser (Next.js :3000)
  → POST http://localhost:8000/api/brief        { intent } 
  → POST http://localhost:8000/api/tradeoffs    { intent, constraints }
  → POST http://localhost:8000/api/discover     { spec }
  → POST http://localhost:8000/api/rank         { spec, products }
  → POST http://localhost:8000/api/cart         { ranked_products }
  → POST http://localhost:8000/api/checkout     { cart, address, payment }
  → FastAPI backend (:8000)
    → AI Orchestrator (intent → spec, Gemini)
    → Retailer adapters (≥3, mocked or real)
    → Ranking engine (deterministic scoring + return-aware weights)
    → Explain mode (post-hoc rationale)
    → Cart aggregator
    → Checkout orchestrator (simulated fan-out)
  ← Browser renders cart + ranking explanations
```

## Components

### Backend (Python / FastAPI)

| Component | File | Responsibility |
|-----------|------|----------------|
| API server | `src/main.py` | `/api/brief`, `/api/tradeoffs`, `/api/discover`, `/api/rank`, `/api/cart`, `/api/checkout`, `/health` |
| AI orchestrator | `src/ai/` | Intent parsing → structured shopping spec |
| Retailer adapters | `src/core/retailers/` | Mocked retailer catalogs + search |
| Ranking engine | `src/core/ranking.py` | Deterministic scoring + return-aware weights + soft brand/budget boosts |
| Explain mode | `src/core/ranking.py` | Post-hoc rationale from ranking signals |
| Cart aggregator | `src/core/cart.py` | Combined cart across retailers |
| Checkout orchestrator | `src/core/checkout.py` | Simulated per-retailer checkout steps |
| Types | `src/core/types.py` | Pydantic models for spec, products, cart, checkout |

### Frontend (Next.js / React)

| Component | File | Responsibility |
|-----------|------|----------------|
| Page | `frontend/app/page.tsx` | Renders the Easy Buy UI |
| Chat + Spec | `frontend/app/components/Chat.tsx` | Capture intent + show structured spec |
| Cart view | `frontend/app/components/Cart.tsx` | Combined cart, totals, per-item delivery |
| Ranking explanation | `frontend/app/components/RankingExplain.tsx` | Why #1 is ranked highest |
| Checkout preview | `frontend/app/components/Checkout.tsx` | Simulated fan-out checkout plan |
| Types | `frontend/lib/types.ts` | Spec/Product/Cart types |

## Data flow

1. User submits intent.
2. AI orchestrator parses intent → shopping spec.
3. Retailer adapters return products from ≥3 retailers.
4. Ranking engine scores and orders products with explanations.
5. Cart aggregator builds combined cart with totals.
6. User edits cart → repeat steps 2–5.
7. Checkout orchestrator builds per-retailer simulated steps.

## Trust boundaries

- **Browser**: untrusted
- **Backend**: trusted, holds AI model key and mock catalog data
- **Retailer APIs**: mocked or external

## Key decisions

- Deterministic ranking logic separate from AI.
- Mocked retailer catalogs for safe demo.
- Single combined cart with simulated checkout fan-out.

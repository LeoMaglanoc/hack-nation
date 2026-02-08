# Requirements — Easy Buy (Option B: Skiing Outfit)

See the full scope in [docs/agentic-commerce-requirements.md](docs/agentic-commerce-requirements.md).

## Functional

1. Capture a high-level shopping intent and output a structured shopping spec (JSON).
2. Source products from **≥3 retailers** (real or mocked) with price, delivery estimate, variants, and retailer identity.
3. Rank products using deterministic scoring logic (not LLM-only) and explain the top choice.
4. Present a **combined cart** across retailers with total cost and delivery per item.
5. Support user edits (replace/optimize) and re-run ranking + cart aggregation.
6. Simulated checkout: single address/payment entry, per-retailer fan-out steps.
7. Return-aware ranking using deterministic retailer return scores.
8. Explain mode: user-facing rationale using observable signals and criteria.
9. Tradeoff Explorer: AI-generated variants (cheaper, faster, higher quality) with toggle comparison.
10. Soft brand preferences in intent and review, influencing ranking without hard filters.
11. Per-item budget ranges (default off) with user-adjustable min/max and soft ranking boosts.

## Non-functional

- AI is structural: required for intent parsing and preference inference (Gemini).
- Deterministic, testable ranking logic.
- No real purchases.
- Docker-first: everything runs via `docker compose`.
- All backend code linted with `ruff` and tested with `pytest`.

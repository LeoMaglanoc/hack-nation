# Implementation Plan — Easy Buy (Option B)

## What we are building

An Easy Buy system that converts a high-level skiing outfit intent into a structured spec, multi-retailer discovery, deterministic ranking, a combined cart, and a simulated checkout.

## What's real vs faked

### Real
- Intent → spec extraction
- Multi-retailer discovery with mocked catalogs
- Deterministic ranking with explanations
- Combined cart + user edits
- Simulated checkout fan-out
- Docker-first, tests, linting

### Faked / deferred
- Live retailer APIs
- Real checkout / payment
- Persistence and auth
- Inventory reservation

## Build steps (TDD)
1. Update docs to the new system (done first).
2. Add core types for spec, products, cart, checkout.
3. Write unit tests for ranking + cart aggregation.
4. Implement ranking + cart aggregation logic.
5. Add mocked retailer adapters + discovery tests.
6. Implement API endpoints for brief/discover/rank/cart/checkout.
7. Update frontend to show spec, cart, and checkout preview.
8. Run tests + lint.

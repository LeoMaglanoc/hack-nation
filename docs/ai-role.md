# AI Role — Easy Buy

## Current

The AI orchestrator **converts high-level intent into a structured shopping spec**, using Gemini, including:

- required items
- size and material constraints
- budget and delivery deadline
- must-haves vs nice-to-haves
- tradeoff variants for budget, delivery, and quality
- soft brand preferences

This is **structural AI behavior**: the system fails without AI because intent parsing and preference inference are not deterministic.

### What breaks if AI is removed?

- No structured spec → no multi-retailer discovery.
- No preference inference → ranking becomes ungrounded.
- No adaptation to user edits → feedback loop fails.
- No tradeoff variants → no ability to explore alternate outcomes.
- No brand extraction → brand intent is ignored in ranking.

## Fixed logic (non-AI)

- Ranking engine uses deterministic scoring weights.
- Return-aware scoring uses a fixed retailer return-score map.
- Cart aggregation is rule-based.
- Checkout orchestration is simulated and scripted.
- Explain mode is a post-hoc rationale based on observable signals (no internal reasoning).

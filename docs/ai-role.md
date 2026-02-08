# AI Role — Agentic Commerce

## Current

The AI orchestrator **converts high-level intent into a structured shopping spec**, using OpenAI, including:

- required items
- size and material constraints
- budget and delivery deadline
- must-haves vs nice-to-haves

This is **structural AI behavior**: the system fails without AI because intent parsing and preference inference are not deterministic.

### What breaks if AI is removed?

- No structured spec → no multi-retailer discovery.
- No preference inference → ranking becomes ungrounded.
- No adaptation to user edits → feedback loop fails.

## Fixed logic (non-AI)

- Ranking engine uses deterministic scoring weights.
- Cart aggregation is rule-based.
- Checkout orchestration is simulated and scripted.

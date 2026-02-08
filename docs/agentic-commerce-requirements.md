# Easy Buy — Requirements (Option B: Skiing Outfit)

## 1) One‑sentence hook
We built Easy Buy, a system that turns a high‑level skiing outfit intent into a multi‑retailer cart and a simulated checkout, revealing how AI can coordinate real‑world purchasing across stores.

## 2) System summary (actors, signals, feedback)
**Actors**
- User
- AI Orchestrator
- Retailer Catalogs (≥3, mocked or real)
- Ranking Engine
- Cart Aggregator
- Checkout Orchestrator (simulated)

**Signals**
- User constraints: budget, delivery deadline, size, preferences
- Product signals: price, delivery estimate, variants, retailer
- Scoring signals: cost, delivery feasibility, preference match, set coherence
- Feedback: user cart edits (replace/optimize), ranking explanations

**Feedback loop**
User updates constraints or replaces items → AI updates spec → re‑query retailers → re‑rank → updated cart + explanation.

**AI control vs fixed logic**
- AI controls intent parsing and constraint extraction.
- Deterministic logic handles ranking and scoring weights.

## 3) Scenario scope (Option B)
**User prompt**: “Downhill skiing outfit, warm and waterproof, size M, budget $400, delivery within 5 days.”

## 4) AI necessity gate
**What breaks if AI is removed?**
- The system can no longer infer a structured shopping spec from a high‑level intent.
- It cannot adapt to ambiguous preferences or user edits across multiple retailers.

## 5) Functional requirements
### 5.1 Conversational brief & constraints capture
- Capture: budget, delivery deadline, size, preferences, must‑haves vs nice‑to‑haves.
- Output a structured **shopping spec** (JSON).

### 5.2 Multi‑retailer discovery (≥3 retailers)
- Source products from **at least three** retailers (real or mocked).
- Each item must include: price, delivery estimate, variants, retailer identity.

### 5.3 Ranking engine (non‑LLM)
- Rank products using transparent scoring logic with weights.
- Explain why the top option is #1.

### 5.4 Single combined cart view
- Combine items from multiple retailers.
- Show total cost and delivery per item.
- Support item replacement and optimization.

### 5.5 Checkout orchestration (safe demo)
- Simulated or sandbox checkout only.
- Payment + address entered once.
- Agent fans out checkout steps per retailer (simulated).

## 6) Non‑functional requirements
- Deterministic, testable ranking logic.
- No real purchases.
- Works end‑to‑end in Docker.

## 7) Failure modes (must be testable)
- Retailer data missing delivery estimate.
- Budget infeasible with delivery deadline.
- Variant mismatch (size M unavailable).
- User edits break set coherence.

## 8) Real vs faked
**Real:** constraint extraction, ranking logic, cart aggregation, feedback loop.
**Faked:** retailer APIs and checkout flows (mocked/simulated).

## 9) Success demo moment
User changes budget or deadline → agent re‑ranks, updates cart, and explains why the new top choice wins.

# Failure Modes — Easy Buy

## A) Missing Gemini key

- **Symptom**: `GEMINI_API_KEY` missing or invalid.
- **Handling**: Backend returns HTTP 503 with a clear message.
- **Test**: `test_brief_returns_503_when_no_api_key`

## B) Invalid shopping spec

- **Symptom**: Missing size, budget, or deadline.
- **Handling**: HTTP 422 with validation details.
- **Test**: `test_brief_rejects_invalid_spec`

## C) Retailer data incomplete

- **Symptom**: Missing delivery estimate or price.
- **Handling**: Exclude item from ranking; log warning.
- **Test**: `test_discovery_filters_incomplete_items`

## D) Budget infeasible

- **Symptom**: All options exceed budget or deadline.
- **Handling**: Return best-effort cart + explanation.
- **Test**: `test_rank_returns_best_effort_when_over_budget`

## E) Variant mismatch

- **Symptom**: Size M unavailable for a required item.
- **Handling**: Mark as missing + request user change.
- **Test**: `test_cart_flags_missing_variants`

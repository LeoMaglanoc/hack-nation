"""AI brief parser: intent -> structured shopping spec."""

import json
import re

from openai import OpenAI

from src.core.types import ShoppingSpec

DEFAULT_MODEL = "gpt-4o-mini"


def parse_brief(intent: str, *, api_key: str, model: str | None = None) -> ShoppingSpec:
    prompt = (
        "You are an assistant that extracts a structured shopping spec."
        "Return ONLY valid JSON with keys: intent, budget, deadline_days, size,"
        "must_haves (list), nice_to_haves (list)."
        "If missing, infer sensible defaults for skiing outfit: budget 400,"
        "deadline_days 5, size 'M'."
    )

    client = OpenAI(api_key=api_key)
    response = client.responses.create(
        model=model or DEFAULT_MODEL,
        input=f"{prompt}\nIntent: {intent}",
    )

    content = response.output_text or ""
    data = _extract_json(content)
    return ShoppingSpec(**data)


def _extract_json(content: str) -> dict:
    if not content.strip():
        raise ValueError("AI returned empty response")

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", content)
        if not match:
            raise ValueError("AI response was not valid JSON")
        return json.loads(match.group(0))

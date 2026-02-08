"""Generate short customer email message via OpenAI."""

from openai import OpenAI

DEFAULT_MODEL = "gpt-4o-mini"


def generate_customer_message(
    *,
    api_key: str,
    customer_name: str,
    model: str | None = None,
) -> str:
    prompt = (
        "Write a short 3-4 line customer email confirming order placement. "
        "Be friendly and concise, end with a polite greeting and sign as EasyBuy."
    )

    client = OpenAI(api_key=api_key)
    response = client.responses.create(
        model=model or DEFAULT_MODEL,
        input=f"{prompt}\nCustomer name: {customer_name}",
    )

    text = response.output_text.strip()
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    cleaned: list[str] = []
    for line in lines:
        lower = line.lower()
        if "[your name]" in lower or "[your company]" in lower:
            continue
        if "your name" == lower or "your company" == lower:
            continue
        if line.strip() == "EasyBuy":
            continue
        cleaned.append(line)

    cleaned.append("EasyBuy")
    return "\n".join(cleaned).strip()

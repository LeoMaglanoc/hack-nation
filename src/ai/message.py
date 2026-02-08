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
        "Be friendly and concise, end with a polite greeting."
    )

    client = OpenAI(api_key=api_key)
    response = client.responses.create(
        model=model or DEFAULT_MODEL,
        input=f"{prompt}\nCustomer name: {customer_name}",
    )

    return response.output_text.strip()

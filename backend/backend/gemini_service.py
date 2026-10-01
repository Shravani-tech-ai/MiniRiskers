import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-flash-latest",
)

# gemini-2.0-flash, gemini-2.5-flash, and gemini-1.5-flash have been
# retired by Google and now return 404s. gemini-flash-latest is a
# Google-maintained alias that keeps pointing at a current model, so
# it's kept first among the fallbacks to survive future retirements.
FALLBACK_MODELS = [
    GEMINI_MODEL,
    "gemini-flash-latest",
    "gemini-3.6-flash",
    "gemini-3.8-flash",
]

client = None


def _get_client() -> genai.Client:
    global client

    if client is not None:
        return client

    if not GEMINI_API_KEY:
        raise ValueError(
            "GEMINI_API_KEY is not configured. Add it to the project .env file."
        )

    client = genai.Client(api_key=GEMINI_API_KEY)
    return client


def _extract_response_text(response) -> str:
    text = getattr(response, "text", None)

    if text and str(text).strip():
        return str(text).strip()

    candidates = getattr(response, "candidates", None) or []

    for candidate in candidates:
        content = getattr(candidate, "content", None)
        if not content:
            continue

        parts = getattr(content, "parts", None) or []
        chunks = []

        for part in parts:
            part_text = getattr(part, "text", None)

            if part_text:
                chunks.append(part_text)

        if chunks:
            return "".join(chunks).strip()

    prompt_feedback = getattr(response, "prompt_feedback", None)

    if prompt_feedback:
        block_reason = getattr(prompt_feedback, "block_reason", None)

        if block_reason:
            raise ValueError(
                f"Gemini blocked the request: {block_reason}"
            )

    raise ValueError(
        "Gemini returned no text. Check API quota and model availability."
    )


def _generate_with_models(prompt: str, as_json: bool) -> str:
    api_client = _get_client()
    last_error = None

    for model_name in FALLBACK_MODELS:
        if not model_name:
            continue

        try:
            config_kwargs = {}

            if as_json:
                config_kwargs["response_mime_type"] = "application/json"

            response = api_client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(**config_kwargs),
            )

            return _extract_response_text(response)
        except Exception as error:
            last_error = error
            continue

    raise ValueError(
        f"All Gemini models failed. Last error: {last_error}"
    )


def generate_text(prompt: str) -> str:
    return _generate_with_models(prompt, as_json=False)


def generate_json(prompt: str) -> str:
    return _generate_with_models(prompt, as_json=True)

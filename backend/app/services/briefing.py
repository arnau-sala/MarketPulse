"""
Groq LLM service — generates the Director's Briefing.

This is NOT a stub. It calls Groq's API with llama-3.3-70b-versatile and returns
a real, contextual briefing in plain business English.

Error handling: any exception (rate limit, missing API key, network failure)
is caught and re-raised as a RuntimeError with a clear message so main.py
can return a 503 without breaking the app.
"""

import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

_MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are the Sales Director of Damm UK, the Spanish brewery's UK division.
You write concise, actionable briefings for your commercial team based on data
analysis from MarketPulse, an internal forecasting and recommendation tool.

Your briefings:
- Are direct and pragmatic (4-6 sentences max)
- Focus on what action to take and why
- Use business language, never technical jargon (no MAPE, no XGBoost, no models)
- Reference specific channels, brands, weeks and numbers from the context
- End with a clear next step

Always write in English. Tone: confident, calm, executive."""


def generate_briefing(context: dict) -> dict:
    """
    Call Groq to produce a director-level commercial briefing.

    Args:
        context: dict with keys like month, salesToDate, monthlyTarget,
                 expectedGap, status, topGapDriver, recommendedAction.

    Returns:
        dict with keys: text, generatedAt, model.

    Raises:
        RuntimeError: if the Groq call fails for any reason.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to backend/.env (see .env.example)."
        )

    try:
        client = Groq(api_key=api_key)
        user_prompt = (
            f"Generate a director's briefing for {context.get('month', 'this month')} "
            f"with this context:\n\n{_format_context(context)}\n\nWrite the briefing now."
        )

        response = client.chat.completions.create(
            model=_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=300,
        )

        return {
            "text": response.choices[0].message.content.strip(),
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "model": _MODEL,
        }

    except Exception as exc:
        raise RuntimeError(f"Groq call failed: {exc}") from exc


def _format_context(ctx: dict) -> str:
    lines = []
    for key, value in ctx.items():
        if isinstance(value, int) and abs(value) >= 1000:
            lines.append(f"- {key}: £{value:,}")
        else:
            lines.append(f"- {key}: {value}")
    return "\n".join(lines)

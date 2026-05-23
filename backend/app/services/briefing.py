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

SYSTEM_PROMPT = """Eres el Director Comercial de Damm UK, la división británica de la cervecera española.
Escribes resúmenes breves y accionables para tu equipo comercial basándote en datos
del sistema MarketPulse, una herramienta interna de previsión y recomendaciones.

Tus resúmenes:
- Son directos y prácticos (4-6 frases máximo)
- Explican QUÉ hay que hacer y POR QUÉ, en lenguaje de negocio sencillo
- No usan jerga técnica (nada de modelos, algoritmos, MAPE ni estadísticas)
- Mencionan canales, marcas, semanas y cifras concretas del contexto
- Terminan con UN paso de acción claro y concreto para el equipo

Escribe siempre en español. Tono: directo, tranquilo, ejecutivo.
El equipo que te lee no es técnico — usa frases cortas y claras."""


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
            f"Genera el resumen del director para {context.get('month', 'este mes')} "
            f"con este contexto:\n\n{_format_context(context)}\n\nEscribe el resumen ahora."
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


EXPLAIN_PLAN_PROMPT = """Eres un asistente comercial de Damm UK que ayuda al equipo de ventas a entender qué deben hacer.

Tu tarea es explicar un plan de acción comercial de forma muy sencilla, como si se lo explicaras a alguien que no sabe nada de análisis de datos ni forecasting.

Reglas:
- Usa frases cortas y directas
- Nada de tecnicismos (no menciones modelos, algoritmos, porcentajes de confianza ni estadísticas)
- Explica el QUÉ (qué tiene que hacer el equipo), el CUÁNDO (en qué semana) y el POR QUÉ (qué problema resuelve)
- Si hay varias acciones, explícalas como pasos numerados (1, 2, 3...)
- Termina con una frase motivadora y clara sobre el objetivo
- Máximo 120 palabras en total
- Escribe siempre en español"""


def explain_action_plan(req) -> dict:
    """
    Genera una explicación en español sencillo del plan de acción seleccionado.
    Pensado para usuarios no técnicos del equipo comercial.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY no está configurada en backend/.env")

    actions_text = "\n".join(
        f"  - {a['title']} (Semana: {a['week']}, Impacto estimado: £{a['impact']:,}): {a['why']}"
        for a in req.actions
    )
    gap_text = ""
    if req.gapContext:
        gap_text = (
            f"\nContexto de ventas:\n"
            f"  - Ventas hasta hoy: £{req.gapContext.get('salesToDate', 0):,}\n"
            f"  - Objetivo del mes: £{req.gapContext.get('monthlyTarget', 0):,}\n"
            f"  - Diferencia actual: £{req.gapContext.get('expectedGap', 0):,}\n"
        )

    user_prompt = (
        f"Explica este plan de acción comercial de forma sencilla para el equipo de ventas:\n\n"
        f"Plan: {req.planName}\n"
        f"Objetivo: {req.goal}\n"
        f"Impacto esperado: +£{req.expectedImpact:,}\n"
        f"Probabilidad de alcanzar el objetivo: {req.hitProbability}%\n"
        f"Nivel de riesgo: {req.risk}\n"
        f"{gap_text}\n"
        f"Acciones del plan:\n{actions_text}\n\n"
        f"Escribe la explicación ahora, en español sencillo, máximo 120 palabras."
    )

    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model=_MODEL,
            messages=[
                {"role": "system", "content": EXPLAIN_PLAN_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=250,
        )
        return {
            "text": response.choices[0].message.content.strip(),
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "model": _MODEL,
        }
    except Exception as exc:
        raise RuntimeError(f"Error al llamar a Groq: {exc}") from exc


def _format_context(ctx: dict) -> str:
    lines = []
    for key, value in ctx.items():
        if isinstance(value, int) and abs(value) >= 1000:
            lines.append(f"- {key}: £{value:,}")
        else:
            lines.append(f"- {key}: {value}")
    return "\n".join(lines)

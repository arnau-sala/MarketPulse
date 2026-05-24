"""
Groq LLM service — generates the Director's Briefing.

Groq is imported lazily inside each function so the backend starts even if
the `groq` package is not installed or GROQ_API_KEY is missing.
Any failure returns a 200 fallback response instead of crashing.
"""

import os
from datetime import datetime, timezone

from dotenv import load_dotenv

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


def _fallback_briefing(context: dict) -> dict:
    month = context.get("month", "este mes")
    gap = context.get("expectedGap", 0)
    gap_str = f"£{abs(gap):,}" if gap else "un gap pendiente"
    return {
        "text": (
            f"El equipo UK va por debajo del objetivo en {month} con un gap de {gap_str}. "
            "El canal Off-Trade es el mayor contribuidor al gap. "
            "La Semana 3 ofrece la mejor ventana de activación del mes: "
            "alta demanda y alta sensibilidad promocional. "
            "Acción inmediata: activar el Plan Equilibrado con foco en Off-Trade durante la Semana 3."
        ),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "model": "fallback-local",
    }


def generate_briefing(context: dict) -> dict:
    """
    Call Groq to produce a director-level commercial briefing.
    Falls back to a local template if Groq is unavailable.

    Returns:
        dict with keys: text, generatedAt, model.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return _fallback_briefing(context)

    try:
        from groq import Groq  # lazy import — backend starts without groq installed

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

    except Exception:
        return _fallback_briefing(context)


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


def _fallback_explain(req) -> dict:
    actions_text = "; ".join(
        f"{a['title']} ({a['week']})"
        for a in (req.actions if hasattr(req, "actions") else [])
    )
    plan_name = getattr(req, "planName", "el plan seleccionado")
    impact = getattr(req, "expectedImpact", 0)
    return {
        "text": (
            f"El equipo debe ejecutar {plan_name} para recuperar el objetivo del mes. "
            f"Las acciones clave son: {actions_text}. "
            f"El impacto esperado es +£{impact:,}. "
            "Foco en la Semana 3: es la ventana con mayor oportunidad de impacto. "
            "¡Cada acción cuenta para cerrar el gap!"
        ),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "model": "fallback-local",
    }


def explain_action_plan(req) -> dict:
    """
    Genera una explicación en español sencillo del plan de acción.
    Falls back to a local template if Groq is unavailable.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return _fallback_explain(req)

    try:
        from groq import Groq  # lazy import

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
    except Exception:
        return _fallback_explain(req)


def _format_context(ctx: dict) -> str:
    lines = []
    for key, value in ctx.items():
        if isinstance(value, int) and abs(value) >= 1000:
            lines.append(f"- {key}: £{value:,}")
        else:
            lines.append(f"- {key}: {value}")
    return "\n".join(lines)

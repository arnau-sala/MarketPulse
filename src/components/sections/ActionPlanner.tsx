import { useState } from 'react';
import { CheckCircle2, Star, TrendingUp, AlertTriangle, Shield, Sparkles, Loader2 } from 'lucide-react';
import { useActionPlans, useMetrics } from '../../hooks/useMarketPulse';
import { formatCurrency } from '../../utils/formatters';
import { explainPlan } from '../../services/api';
import SectionHeader from '../common/SectionHeader';
import InsightCard from '../common/InsightCard';
import StatusBadge from '../common/StatusBadge';
import ProgressBar from '../common/ProgressBar';
import type { ActionPlan, Tone } from '../../types';

const riskTone: Record<string, Tone> = { Low: 'success', Medium: 'warning', High: 'danger' };
const riskLabel: Record<string, string> = { Low: 'Riesgo bajo', Medium: 'Riesgo medio', High: 'Riesgo alto' };
const riskIcon: Record<string, React.ReactNode> = {
  Low: <Shield size={14} />,
  Medium: <AlertTriangle size={14} />,
  High: <TrendingUp size={14} />,
};

function confidenceLabel(c: number): { label: string; tone: Tone } {
  if (c >= 80) return { label: 'Alta confianza', tone: 'success' };
  if (c >= 65) return { label: 'Confianza media', tone: 'warning' };
  return { label: 'Confianza baja', tone: 'neutral' };
}

export default function ActionPlanner() {
  const { data: plans } = useActionPlans();
  const { data: metrics } = useMetrics();
  const defaultId = plans.find(p => p.recommended)?.id ?? plans[0]?.id ?? 'balanced';
  const [selectedId, setSelectedId] = useState<string>(defaultId);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationModel, setExplanationModel] = useState('');

  const selected: ActionPlan = plans.find(p => p.id === selectedId) ?? plans[0];
  if (!selected) return null;

  const handleExplain = async () => {
    setExplanationLoading(true);
    setExplanation(null);
    try {
      const res = await explainPlan({
        planId: selected.id,
        planName: selected.name,
        goal: selected.goal,
        expectedImpact: selected.expectedImpact,
        hitProbability: selected.hitProbability,
        risk: selected.risk,
        actions: selected.actions.map(a => ({
          title: a.title,
          week: a.week,
          impact: a.impact,
          confidence: a.confidence,
          why: a.why,
        })),
        gapContext: {
          salesToDate: metrics.salesToDate,
          monthlyTarget: metrics.monthlyTarget,
          expectedGap: metrics.expectedGap,
        },
      });
      setExplanation(res.text);
      setExplanationModel(res.model);
    } catch {
      setExplanation('El servicio de explicación no está disponible. Asegúrate de que el backend está en marcha y GROQ_API_KEY está configurada.');
    } finally {
      setExplanationLoading(false);
    }
  };

  // Reset explanation when the plan changes
  const handleSelectPlan = (id: string) => {
    setSelectedId(id);
    setExplanation(null);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="04 — Plan de acción"
        title="¿Qué debemos hacer ahora?"
        description="Planes de recuperación comercial ordenados por impacto, confianza y riesgo de ejecución."
      />

      {/* Plan selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {plans.map(plan => {
          const isActive = plan.id === selectedId;
          const rt = riskTone[plan.risk];
          return (
            <button
              key={plan.id}
              onClick={() => handleSelectPlan(plan.id)}
              className={`relative text-left rounded-2xl border px-5 py-4 transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'border-ink-900 bg-ink-900 shadow-elevated text-white'
                  : 'border-ink-300/60 bg-white shadow-card text-ink-900 hover:border-ink-400'
              }`}
            >
              {plan.recommended && (
                <div className={`absolute -top-2.5 left-4 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                  isActive ? 'bg-warning text-white' : 'bg-warning-light text-warning'
                }`}>
                  <Star size={8} fill="currentColor" /> Recomendado
                </div>
              )}
              <p className={`text-[13px] font-bold leading-tight ${isActive ? 'text-white' : 'text-ink-900'}`}>
                {plan.name}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                  isActive
                    ? rt === 'success' ? 'bg-success-light/20 text-success-light border-success/40'
                      : rt === 'warning' ? 'bg-warning-light/20 text-warning-light border-warning/40'
                      : 'bg-danger-light/20 text-danger-light border-danger/40'
                    : rt === 'success' ? 'bg-success-light text-success border-success/20'
                      : rt === 'warning' ? 'bg-warning-light text-warning border-warning/20'
                      : 'bg-danger-light text-danger border-danger/20'
                }`}>
                  {riskLabel[plan.risk]}
                </span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between">
                  <span className={`text-[11px] ${isActive ? 'text-white/60' : 'text-ink-500'}`}>Impacto esperado</span>
                  <span className={`text-[12px] font-semibold ${isActive ? 'text-white' : 'text-success'}`}>
                    +{formatCurrency(plan.expectedImpact, true)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-[11px] ${isActive ? 'text-white/60' : 'text-ink-500'}`}>Prob. de cumplir objetivo</span>
                  <span className={`text-[12px] font-semibold ${isActive ? 'text-white' : 'text-ink-900'}`}>
                    {plan.hitProbability}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected plan detail */}
      <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-6 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-[18px] font-bold text-ink-900">{selected.name}</h2>
              {selected.recommended && <StatusBadge status="Recomendado" tone="warning" size="sm" />}
            </div>
            <p className="text-[13px] text-ink-500">{selected.explanation}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[28px] font-bold text-success leading-none">
              +{formatCurrency(selected.expectedImpact, true)}
            </p>
            <p className="text-[11px] text-ink-500 mt-0.5">Impacto incremental estimado</p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-ink-100">
          <div>
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-1">Previsión con plan</p>
            <p className="text-[16px] font-bold text-ink-900">{formatCurrency(selected.forecastAfterAction, true)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-1">Gap restante</p>
            <p className={`text-[16px] font-bold ${selected.remainingGap >= 0 ? 'text-success' : 'text-warning'}`}>
              {selected.remainingGap >= 0
                ? `+${formatCurrency(selected.remainingGap, true)}`
                : formatCurrency(selected.remainingGap, true)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-1">Probabilidad de éxito</p>
            <p className="text-[16px] font-bold text-ink-900">{selected.hitProbability}%</p>
            <ProgressBar
              value={selected.hitProbability}
              max={100}
              tone={selected.hitProbability >= 70 ? 'success' : 'warning'}
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-1">Riesgo de ejecución</p>
            <div className="flex items-center gap-1 mt-1">
              <span className={
                riskTone[selected.risk] === 'success' ? 'text-success'
                : riskTone[selected.risk] === 'warning' ? 'text-warning'
                : 'text-danger'
              }>
                {riskIcon[selected.risk]}
              </span>
              <span className={`text-[14px] font-bold ${
                riskTone[selected.risk] === 'success' ? 'text-success'
                : riskTone[selected.risk] === 'warning' ? 'text-warning'
                : 'text-danger'
              }`}>
                {riskLabel[selected.risk]}
              </span>
            </div>
          </div>
        </div>

        {/* Actions list */}
        <div className="space-y-3 pt-2 border-t border-ink-100">
          <p className="text-[12px] font-semibold text-ink-500 uppercase tracking-wider">
            Acciones de este plan
          </p>
          {selected.actions.map((action, i) => {
            const conf = confidenceLabel(action.confidence);
            return (
              <div key={i} className="bg-cream-100 rounded-xl px-4 py-4 border border-ink-200/60">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-ink-900 flex items-center justify-center">
                    <CheckCircle2 size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-[13px] font-semibold text-ink-900">{action.title}</p>
                      <span className="text-[10px] bg-ink-100 text-ink-600 px-1.5 py-0.5 rounded font-medium border border-ink-200">
                        {action.week}
                      </span>
                      <StatusBadge status={conf.label} tone={conf.tone} size="sm" />
                    </div>
                    <p className="text-[12px] text-ink-500 leading-relaxed">{action.why}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[16px] font-bold text-success">+{formatCurrency(action.impact, true)}</p>
                    <p className="text-[10px] text-ink-400">{action.confidence}% confianza</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Groq: Explicación en lenguaje sencillo ── */}
      <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-5 py-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[13px] font-semibold text-ink-900">¿Qué tiene que hacer mi equipo?</p>
            <p className="text-[12px] text-ink-500 mt-0.5">
              Explicación en lenguaje sencillo generada por IA · {selected.name}
            </p>
          </div>
          <button
            onClick={handleExplain}
            disabled={explanationLoading}
            className="flex items-center gap-2 bg-ink-900 hover:bg-ink-700 disabled:opacity-50 text-white text-[12px] font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {explanationLoading ? (
              <><Loader2 size={13} className="animate-spin" /> Generando…</>
            ) : (
              <><Sparkles size={13} /> Explicar para mi equipo</>
            )}
          </button>
        </div>

        {explanation ? (
          <div className="bg-ink-100/50 rounded-xl px-4 py-4 border border-ink-200/60">
            <p className="text-[13px] text-ink-800 leading-relaxed whitespace-pre-line">{explanation}</p>
            {explanationModel && (
              <p className="text-[10px] text-ink-400 mt-2">
                {explanationModel} · {new Date().toLocaleTimeString('es-ES')}
              </p>
            )}
          </div>
        ) : !explanationLoading && (
          <p className="text-[12px] text-ink-400 italic">
            Pulsa el botón para que la IA explique en palabras simples qué debe hacer tu equipo esta semana para cumplir el objetivo.
          </p>
        )}
      </div>

      <InsightCard title="¿Por qué este plan?" tone="neutral">
        {selected.id === 'balanced' ? (
          <>
            Este plan prioriza <strong>Off-Trade porque es donde se origina la mayor parte de la desviación</strong>.
            Se activa en <strong>Semana 3, la ventana de mayor demanda del mes</strong>, y adelanta
            una promoción planificada para mejorar la probabilidad de cierre.
          </>
        ) : selected.id === 'conservative' ? (
          <>
            Una única palanca de <strong>alta confianza</strong> — activación de Estrella Damm en Off-Trade —
            para reducir la desviación en aproximadamente un 50% con mínima complejidad de ejecución.
          </>
        ) : (
          <>
            Añade una <strong>activación digital flash de Estrella Daura</strong> para capturar el
            segmento health-conscious. Mayor potencial de ganancia pero requiere coordinación entre equipos.
          </>
        )}
      </InsightCard>
    </div>
  );
}

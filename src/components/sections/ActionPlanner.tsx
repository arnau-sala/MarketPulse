import { useState } from 'react';
import { CheckCircle2, Star, TrendingUp, AlertTriangle, Shield, Sparkles, Loader2, Brain, Users } from 'lucide-react';
import { useActionPlans, useMetrics } from '../../hooks/useMarketPulse';
import { explainPlan } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import SectionHeader from '../common/SectionHeader';
import InsightCard from '../common/InsightCard';
import StatusBadge from '../common/StatusBadge';
import ProgressBar from '../common/ProgressBar';
import type { ActionPlan, Tone } from '../../types';

const riskTone: Record<string, Tone> = {
  Low:    'success',
  Medium: 'warning',
  High:   'danger',
};

const riskLabel: Record<string, string> = {
  Low:    'Riesgo bajo',
  Medium: 'Riesgo medio',
  High:   'Riesgo alto',
};

const riskIcon: Record<string, React.ReactNode> = {
  Low:    <Shield size={14} />,
  Medium: <AlertTriangle size={14} />,
  High:   <TrendingUp size={14} />,
};

function confidenceLabel(c: number) {
  if (c >= 80) return { label: 'Alta confianza',   tone: 'success' as Tone };
  if (c >= 65) return { label: 'Confianza media',  tone: 'warning' as Tone };
  return             { label: 'Confianza baja',    tone: 'neutral' as Tone };
}

function renderInline(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="text-ink-900 font-semibold">{part}</strong>
      : part,
  );
}

function ExplanationContent({ text, model }: { text: string; model: string }) {
  const sentences = text.split(/(?<=\.)\s+/).filter(Boolean);
  const paras: string[][] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    paras.push(sentences.slice(i, i + 2));
  }
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <span className="text-[48px] leading-none text-emerald-300 font-serif select-none -mt-2 flex-shrink-0">&ldquo;</span>
        <div className="space-y-3 flex-1">
          {paras.map((para, i) => (
            <p key={i} className="text-[14px] text-ink-700 leading-relaxed">
              {para.map((s, j) => (
                <span key={j}>{renderInline(s)}{j < para.length - 1 ? ' ' : ''}</span>
              ))}
            </p>
          ))}
        </div>
      </div>
      {model && (
        <div className="flex items-center gap-2 pt-2 border-t border-ink-100">
          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200/60 rounded-full px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <Sparkles size={9} /> {model}
          </span>
          <span className="text-[10px] text-ink-400">{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}
    </div>
  );
}

export default function ActionPlanner() {
  const { data: plans, loading: loadingPlans } = useActionPlans();
  const { data: m } = useMetrics();

  const defaultId = plans.find(p => p.recommended)?.id ?? plans[0]?.id ?? '';
  const [selectedId, setSelectedId] = useState<string>('');
  const effectiveId = selectedId || defaultId;
  const selected: ActionPlan | undefined = plans.find(p => p.id === effectiveId) ?? plans[0];

  const [explanation, setExplanation]     = useState<string | null>(null);
  const [explanationModel, setExplModel]  = useState('');
  const [explLoading, setExplLoading]     = useState(false);
  const [explPlanId, setExplPlanId]       = useState<string | null>(null);

  const handleExplain = async () => {
    if (!selected) return;
    setExplLoading(true);
    setExplanation(null);
    setExplPlanId(selected.id);
    try {
      const res = await explainPlan({
        planId: selected.id,
        planName: selected.name,
        goal: selected.explanation,
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
          salesToDate: m.salesToDate,
          monthlyTarget: m.monthlyTarget,
          expectedGap: m.expectedGap,
        },
      });
      setExplanation(res.text);
      setExplModel(res.model);
    } catch {
      setExplanation('El servicio de explicación no está disponible. Asegúrate de que el backend está en marcha y GROQ_API_KEY está configurada.');
    } finally {
      setExplLoading(false);
    }
  };

  if (!selected) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          eyebrow="04 — Plan de acción"
          title="¿Qué debemos hacer ahora?"
          description="Planes de recuperación comercial ordenados por impacto, confianza y riesgo de ejecución."
        />
        {loadingPlans && (
          <div className="flex items-center gap-1.5 text-ink-400 text-[11px] mt-1 flex-shrink-0">
            <Loader2 size={12} className="animate-spin" />
            <span>Cargando planes…</span>
          </div>
        )}
      </div>

      {/* Plan selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {plans.map((plan) => {
          const isActive = plan.id === effectiveId;
          return (
            <button
              key={plan.id}
              onClick={() => { setSelectedId(plan.id); setExplanation(null); }}
              className={`
                relative text-left rounded-2xl border px-5 py-4 transition-all duration-150 cursor-pointer
                ${isActive
                  ? 'border-ink-900 bg-ink-900 shadow-elevated text-white'
                  : 'border-ink-300/60 bg-white shadow-card text-ink-900 hover:border-ink-400 hover:shadow-card-hover'
                }
              `}
            >
              {plan.recommended && (
                <div className={`absolute -top-2.5 left-4 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${isActive ? 'bg-warning text-white' : 'bg-warning-light text-warning'}`}>
                  <Star size={8} fill="currentColor" />
                  Recomendado
                </div>
              )}
              <p className={`text-[13px] font-bold leading-tight ${isActive ? 'text-white' : 'text-ink-900'}`}>
                {plan.name}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                  isActive
                    ? riskTone[plan.risk] === 'success' ? 'bg-success-light/20 text-success-light border-success/40'
                      : riskTone[plan.risk] === 'warning' ? 'bg-warning-light/20 text-warning-light border-warning/40'
                      : 'bg-danger-light/20 text-danger-light border-danger/40'
                    : riskTone[plan.risk] === 'success' ? 'bg-success-light text-success border-success/20'
                      : riskTone[plan.risk] === 'warning' ? 'bg-warning-light text-warning border-warning/20'
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
                  <span className={`text-[11px] ${isActive ? 'text-white/60' : 'text-ink-500'}`}>Probabilidad de éxito</span>
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
        {/* Plan header */}
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
            <p className="text-[11px] text-ink-500 mt-0.5">Impacto incremental esperado</p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-ink-100">
          <div>
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-1">Previsión resultante</p>
            <p className="text-[16px] font-bold text-ink-900">{formatCurrency(selected.forecastAfterAction, true)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-1">Diferencia restante</p>
            <p className={`text-[16px] font-bold ${selected.remainingGap >= 0 ? 'text-success' : 'text-warning'}`}>
              {selected.remainingGap >= 0 ? `+${formatCurrency(selected.remainingGap, true)}` : formatCurrency(selected.remainingGap, true)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-1">Probabilidad de éxito</p>
            <p className="text-[16px] font-bold text-ink-900">{selected.hitProbability}%</p>
            <ProgressBar value={selected.hitProbability} max={100} tone={selected.hitProbability >= 70 ? 'success' : 'warning'} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-wide mb-1">Riesgo de ejecución</p>
            <div className="flex items-center gap-1 mt-1">
              <span className={riskTone[selected.risk] === 'success' ? 'text-success' : riskTone[selected.risk] === 'warning' ? 'text-warning' : 'text-danger'}>
                {riskIcon[selected.risk]}
              </span>
              <span className={`text-[14px] font-bold ${riskTone[selected.risk] === 'success' ? 'text-success' : riskTone[selected.risk] === 'warning' ? 'text-warning' : 'text-danger'}`}>
                {riskLabel[selected.risk]}
              </span>
            </div>
          </div>
        </div>

        {/* Actions list */}
        <div className="space-y-3 pt-2 border-t border-ink-100">
          <p className="text-[12px] font-semibold text-ink-500 uppercase tracking-wider">Acciones del plan</p>
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
                    <p className="text-[10px] text-ink-400">{action.confidence}% de confianza</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Why this plan */}
      <InsightCard title="¿Por qué este plan?" tone="neutral">
        {selected.id === 'balanced' ? (
          <>
            Este plan prioriza el <strong>canal Off-Trade porque representa la mayor parte de la desviación</strong>.
            Se activa durante la <strong>Semana 3, la ventana de máxima demanda</strong>, y adelanta una promoción
            planificada al mes actual para mejorar la probabilidad de cierre. Las tres acciones están coordinadas
            para evitar conflictos de ejecución y pueden comunicarse al equipo de campo en 48 horas.
          </>
        ) : selected.id === 'conservative' ? (
          <>
            Este plan se centra en <strong>un único palanca de alta confianza</strong> — impulso de Estrella Damm
            en Off-Trade — para reducir la diferencia en aproximadamente un 50% con mínima complejidad de ejecución
            y bajo riesgo presupuestario. Ideal cuando el equipo tiene capacidad limitada.
          </>
        ) : (
          <>
            Este plan añade una <strong>activación flash de Estrella Daura en Online</strong> para captar el segmento
            health-conscious junto al impulso central en Off-Trade. Mayor potencial de mejora, pero requiere
            coordinación cross-funcional entre trade marketing y medios digitales en plazos ajustados.
          </>
        )}
      </InsightCard>

      {/* AI Team Explainer */}
      <div className="rounded-2xl border border-emerald-200/80 shadow-card overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200/60 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Users size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-ink-900">¿Qué tiene que hacer mi equipo?</p>
              <p className="text-[11px] text-emerald-700/80 font-medium">Explicación operativa generada por IA para el equipo de campo</p>
            </div>
          </div>
          <button
            onClick={handleExplain}
            disabled={explLoading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[12px] font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            {explLoading ? (
              <><Loader2 size={13} className="animate-spin" /> Generando…</>
            ) : (
              <><Sparkles size={13} /> Explicar</>
            )}
          </button>
        </div>

        <div className="bg-white px-5 py-5">
          {explanation && explPlanId === selected.id ? (
            <ExplanationContent text={explanation} model={explanationModel} />
          ) : explLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-ink-400">
              <Loader2 size={24} className="animate-spin text-emerald-500" />
              <p className="text-[13px] font-medium">Preparando briefing de equipo…</p>
              <p className="text-[11px] text-ink-400">El modelo genera instrucciones operativas para el plan seleccionado.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <Brain size={22} className="text-emerald-500" />
              </div>
              <p className="text-[13px] font-semibold text-ink-700">Listo para explicar el plan al equipo</p>
              <p className="text-[12px] text-ink-400 max-w-sm">
                Pulsa <strong>Explicar</strong> para obtener instrucciones operativas claras sobre qué debe hacer cada área del equipo esta semana.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

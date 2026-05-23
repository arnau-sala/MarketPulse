import { useState } from 'react';
import { TrendingDown, Target, DollarSign, BarChart2, Sparkles, Loader2, Brain, TrendingUp, Calendar } from 'lucide-react';
import { formatCurrency, progressValue } from '../../utils/formatters';
import { generateBriefing } from '../../services/api';
import { useMetrics, useForecast, useActionPlans } from '../../hooks/useMarketPulse';
import SectionHeader from '../common/SectionHeader';
import MetricCard from '../common/MetricCard';
import InsightCard from '../common/InsightCard';
import StatusBadge from '../common/StatusBadge';
import ProgressBar from '../common/ProgressBar';
import ClosingTrajectoryChart from '../charts/ClosingTrajectoryChart';

export default function ExecutivePulse() {
  const { data: m, loading: loadingM } = useMetrics();
  const { data: forecast, loading: loadingF } = useForecast();
  const { data: plans } = useActionPlans();
  const recommendedPlan = plans.find(p => p.recommended) ?? null;

  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingModel, setBriefingModel] = useState('');

  const progress = progressValue(m.salesToDate, m.monthlyTarget);
  const forecastProgress = progressValue(m.baselineForecast, m.monthlyTarget);

  const balancedPlan = { forecastAfterAction: m.baselineForecast - m.expectedGap + 16000 };

  const handleGenerateBriefing = async () => {
    setBriefingLoading(true);
    setBriefing(null);
    try {
      const res = await generateBriefing({
        month: m.month,
        salesToDate: m.salesToDate,
        monthlyTarget: m.monthlyTarget,
        expectedGap: m.expectedGap,
        status: m.status,
        topGapDriver: 'Off-Trade underperformance',
        recommendedAction: 'Activate Balanced Recovery plan in Week 3',
      });
      setBriefing(res.text);
      setBriefingModel(res.model);
    } catch {
      setBriefing('The briefing service is currently unavailable. Please ensure the backend is running and GROQ_API_KEY is configured.');
    } finally {
      setBriefingLoading(false);
    }
  };

  const isLoading = loadingM || loadingF;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          eyebrow="01 — Pulso ejecutivo"
          title="¿Va a cumplir UK el objetivo?"
          description="Vista en tiempo real del rendimiento mensual, previsión de cierre y riesgo comercial."
        />
        {isLoading && (
          <div className="flex items-center gap-1.5 text-ink-400 text-[11px] mt-1 flex-shrink-0">
            <Loader2 size={12} className="animate-spin" />
            <span>Sincronizando datos…</span>
          </div>
        )}
      </div>

      {/* Status banner */}
      <div className="bg-danger-light/60 border border-danger/20 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={m.status} tone="danger" size="lg" />
          </div>
          <p className="text-[15px] font-semibold text-ink-900 mt-2">
            Al ritmo actual, UK cerrará{' '}
            <span className="text-danger">
              un {(Math.abs(m.expectedGap) / m.monthlyTarget * 100).toFixed(0)}% por debajo del objetivo
            </span>{' '}
            en {m.month}.
          </p>
          <p className="text-[13px] text-ink-500 mt-1">
            Previsión base: {formatCurrency(m.baselineForecast, true)} vs objetivo: {formatCurrency(m.monthlyTarget, true)} — diferencia de {formatCurrency(m.expectedGap, true)}.
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[42px] font-bold text-danger leading-none">{m.hitProbability}%</p>
          <p className="text-[12px] text-ink-500 mt-1">Probabilidad de cumplir el objetivo</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard title="Ventas hasta hoy"   value={formatCurrency(m.salesToDate, true)}      subtitle={`${progress.toFixed(0)}% del objetivo mensual`}  tone="neutral" icon={<DollarSign size={16} />} />
        <MetricCard title="Objetivo mensual"  value={formatCurrency(m.monthlyTarget, true)}     subtitle={`Meta de ${m.month}`}                         tone="neutral" icon={<Target size={16} />} />
        <MetricCard title="Previsión de cierre" value={formatCurrency(m.baselineForecast, true)} delta={`${formatCurrency(m.expectedGap, true)} vs objetivo`} tone="warning" icon={<BarChart2 size={16} />} />
        <MetricCard title="Diferencia esperada"    value={formatCurrency(m.expectedGap, true)}       delta={`${(Math.abs(m.expectedGap) / m.monthlyTarget * 100).toFixed(0)}% bajo el objetivo`} tone="danger" icon={<TrendingDown size={16} />} />
      </div>

      {/* Progress bars */}
      <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-5 py-4 space-y-4">
        <p className="text-[12px] font-semibold text-ink-500 uppercase tracking-wider">Progreso mensual</p>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[12px] text-ink-700 font-medium">Ventas hasta hoy</span>
              <span className="text-[12px] font-semibold text-ink-900">{formatCurrency(m.salesToDate, true)}</span>
            </div>
            <ProgressBar value={m.salesToDate} max={m.monthlyTarget} tone="warning" />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[12px] text-ink-700 font-medium">Previsión sin acciones</span>
              <span className="text-[12px] font-semibold text-warning">{formatCurrency(m.baselineForecast, true)}</span>
            </div>
            <ProgressBar value={m.baselineForecast} max={m.monthlyTarget} tone={forecastProgress >= 100 ? 'success' : 'warning'} />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[12px] text-ink-700 font-medium">
                Con el Plan de Recuperación Equilibrado
                <span className="ml-2 text-[10px] bg-success-light text-success px-1.5 py-0.5 rounded-full font-semibold">+£136k</span>
              </span>
              <span className="text-[12px] font-semibold text-success">{formatCurrency(balancedPlan.forecastAfterAction, true)}</span>
            </div>
            <ProgressBar value={balancedPlan.forecastAfterAction} max={m.monthlyTarget} tone="success" />
          </div>
          <div className="pt-1 border-t border-ink-100">
            <div className="flex justify-between">
              <span className="text-[11px] text-ink-500">Objetivo mensual</span>
              <span className="text-[11px] font-bold text-ink-900">{formatCurrency(m.monthlyTarget, true)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Closing Trajectory */}
      {loadingF ? (
        <div className="bg-white rounded-2xl border border-ink-300/60 shadow-card px-5 py-5 h-[340px] flex items-center justify-center text-ink-400 text-[13px]">
          <Loader2 size={16} className="animate-spin mr-2" /> Loading forecast…
        </div>
      ) : (
        <ClosingTrajectoryChart forecast={forecast} recommendedPlan={recommendedPlan} />
      )}

      {/* Executive insight */}
      <InsightCard title="Análisis ejecutivo" tone="warning">
        La desviación está impulsada principalmente por el <strong>bajo rendimiento del canal Off-Trade</strong> (43% de la diferencia),
        la <strong>caída de Voll-Damm</strong> en el segmento premium (26%) y un impacto promocional
        más débil de lo previsto con las mecánicas actuales (20%).{' '}
        <strong>La Semana 3 es la mejor ventana de recuperación</strong> con una puntuación de oportunidad de 87/100.
      </InsightCard>

      {/* Director's Briefing */}
      <div className="rounded-2xl border border-amber-200/80 shadow-card overflow-hidden">
        {/* Header strip */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200/60 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Sparkles size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-ink-900">Resumen del Director</p>
              <p className="text-[11px] text-amber-700/80 font-medium">Análisis comercial generado por IA en tiempo real</p>
            </div>
          </div>
          <button
            onClick={handleGenerateBriefing}
            disabled={briefingLoading}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-[12px] font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            {briefingLoading ? (
              <><Loader2 size={13} className="animate-spin" /> Generando…</>
            ) : (
              <><Sparkles size={13} /> Generar</>
            )}
          </button>
        </div>

        <div className="bg-white px-5 py-5">
          {briefing ? (
            <BriefingContent text={briefing} model={briefingModel} />
          ) : briefingLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-ink-400">
              <Loader2 size={24} className="animate-spin text-amber-500" />
              <p className="text-[13px] font-medium">Analizando datos de UK…</p>
              <p className="text-[11px] text-ink-400">El modelo está procesando ventas, previsiones y planes de acción.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Brain size={22} className="text-amber-500" />
              </div>
              <p className="text-[13px] font-semibold text-ink-700">Listo para generar tu briefing</p>
              <p className="text-[12px] text-ink-400 max-w-sm">
                Pulsa <strong>Generar</strong> para obtener un resumen ejecutivo conciso basado en los datos reales de este mes.
              </p>
            </div>
          )}
        </div>

        {/* Methodology strip */}
        <div className="bg-ink-50/60 border-t border-ink-200/40 px-5 py-3">
          <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-2">Cómo calculamos la ganancia prevista</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-lg bg-ink-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Brain size={11} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-ink-700">Modelo LightGBM</p>
                <p className="text-[10px] text-ink-400 leading-snug">Entrenado con 175 semanas de ventas reales UK (2022–2026)</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-lg bg-success flex items-center justify-center flex-shrink-0 mt-0.5">
                <TrendingUp size={11} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-ink-700">Uplift promocional</p>
                <p className="text-[10px] text-ink-400 leading-snug">+32% calibrado en 18 semanas promo 2026 × multiplicador Off-Trade 1.08×</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-lg bg-warning flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar size={11} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-ink-700">Ventana óptima</p>
                <p className="text-[10px] text-ink-400 leading-snug">Semana 3 = 1.32× demanda (pico payday UK) → £66k impacto incremental</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Briefing content renderer ────────────────────────────────────────────────
// Parses **bold** markdown from Groq and renders structured, readable output.

function renderInline(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="text-ink-900 font-semibold">{part}</strong>
      : part,
  );
}

function BriefingContent({ text, model }: { text: string; model: string }) {
  // Split into sentences grouped as paragraphs (split on '. ' boundary)
  const sentences = text.split(/(?<=\.)\s+/).filter(Boolean);
  // Group every 2 sentences into a visual paragraph
  const paras: string[][] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    paras.push(sentences.slice(i, i + 2));
  }

  return (
    <div className="space-y-4">
      {/* Decorative quote mark */}
      <div className="flex gap-3">
        <span className="text-[48px] leading-none text-amber-300 font-serif select-none -mt-2 flex-shrink-0">&ldquo;</span>
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

      {/* Footer: model + time */}
      {model && (
        <div className="flex items-center gap-2 pt-2 border-t border-ink-100">
          <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200/60 rounded-full px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <Sparkles size={9} /> {model}
          </span>
          <span className="text-[10px] text-ink-400">{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}
    </div>
  );
}

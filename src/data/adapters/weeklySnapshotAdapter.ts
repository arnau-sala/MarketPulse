import type { BackendForecastPoint, BackendWeeklyForecastPayload } from '../../types/backend';
import { mapBackendForecastToSalesMomentum } from './forecastAdapter';
import type { SalesMomentumData } from '../../types';

/** Fallback £/Hl when snapshot meta omits revenuePerHlGbp (analytics default scale). */
const DEFAULT_REVENUE_PER_HL_GBP = 86_000;

function parseIsoDate(fecha: string): Date {
  return new Date(`${fecha}T00:00:00`);
}

function formatChartDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { month: 'short', day: '2-digit' }).replace('.', '');
}

function hlToRevenue(hl: number | null | undefined, revenuePerHlGbp: number): number | null {
  if (hl == null || Number.isNaN(hl)) {
    return null;
  }

  return Math.round(hl * revenuePerHlGbp);
}

/**
 * Converts analytics `forecast_results.json` weekly rows into API-shaped forecast points,
 * then into the frontend Closing Trajectory contract.
 */
export function mapWeeklySnapshotToSalesMomentum(
  payload: BackendWeeklyForecastPayload,
  revenuePerHlGbp: number = payload.meta?.revenuePerHlGbp ?? DEFAULT_REVENUE_PER_HL_GBP,
): SalesMomentumData {
  const sorted = [...payload.series].sort(
    (a, b) => parseIsoDate(a.fecha).getTime() - parseIsoDate(b.fecha).getTime(),
  );

  const recent = sorted.slice(-20);
  const monthlyTarget = Math.round(
    recent
      .slice(-4)
      .reduce((sum, row) => sum + (row.venta_real_historica ?? row.prediccion_futura ?? 0), 0) *
      revenuePerHlGbp *
      4.33,
  );

  const weeklyTarget = Math.round(monthlyTarget / 4.33);
  let cumulativeActual = 0;

  const apiPoints: BackendForecastPoint[] = recent.map((row, index) => {
    const date = formatChartDate(parseIsoDate(row.fecha));
    const weeklyActualHl = row.venta_real_historica;
    const weeklyForecastHl = row.prediccion_futura;

    if (row.tipo === 'historico' && weeklyActualHl != null) {
      cumulativeActual += weeklyActualHl * revenuePerHlGbp;
    }

    const actual = row.tipo === 'historico' ? Math.round(cumulativeActual) : null;
    const forecast =
      row.tipo === 'futuro'
        ? Math.round(cumulativeActual + (weeklyForecastHl ?? 0) * revenuePerHlGbp)
        : actual;
    const actionForecast =
      typeof forecast === 'number' ? Math.round(forecast * 1.15) : null;

    return {
      date: index === recent.length - 1 && row.tipo === 'historico' ? 'Today' : date,
      actual,
      target: weeklyTarget * (index + 1),
      forecast,
      actionForecast,
      confidenceLow: hlToRevenue(row.limite_inferior, revenuePerHlGbp),
      confidenceHigh: hlToRevenue(row.limite_superior, revenuePerHlGbp),
    };
  });

  const last = apiPoints[apiPoints.length - 1];
  if (last) {
    last.target = monthlyTarget;
  }

  return mapBackendForecastToSalesMomentum(apiPoints);
}

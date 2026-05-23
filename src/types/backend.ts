/**
 * Backend / analytics output shapes.
 * These types mirror API and pipeline payloads — not used directly by UI components.
 */

export interface BackendForecastPoint {
  date: string;
  actual: number | null;
  target: number;
  forecast: number | null;
  actionForecast: number | null;
  confidenceLow?: number | null;
  confidenceHigh?: number | null;
}

export interface BackendWeeklyForecastRow {
  fecha: string;
  tipo: 'historico' | 'futuro';
  venta_real_historica: number | null;
  prediccion_futura: number | null;
  limite_inferior: number | null;
  limite_superior: number | null;
}

export interface BackendWeeklyForecastPayload {
  meta?: {
    revenuePerHlGbp?: number;
    horizonWeeks?: number;
  };
  series: BackendWeeklyForecastRow[];
}

export type BackendDataSource = 'api' | 'snapshot' | 'mock';

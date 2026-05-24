/**
 * Thin client for the FastAPI backend.
 *
 * All paths are relative — `/api/...` is forwarded to `http://localhost:8000`
 * by the Vite dev proxy (see `vite.config.ts`). In production set
 * `VITE_API_BASE_URL` to point at the deployed backend.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

function buildUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`);
  }
  return (await res.json()) as T;
}

export interface BriefingResponse {
  text: string;
  generatedAt: string;
  model: string;
}

export interface BriefingContext {
  month: string;
  salesToDate: number;
  monthlyTarget: number;
  expectedGap: number;
  status: string;
  topGapDriver: string;
  recommendedAction: string;
}

export async function generateBriefing(context: BriefingContext): Promise<BriefingResponse> {
  return postJson<BriefingResponse>('/api/briefing', { context });
}

export interface ExplainPlanRequest {
  planId: string;
  planName: string;
  goal: string;
  expectedImpact: number;
  hitProbability: number;
  risk: string;
  actions: Array<{
    title: string;
    week: string;
    impact: number;
    confidence: number;
    why: string;
  }>;
  gapContext?: {
    salesToDate: number;
    monthlyTarget: number;
    expectedGap: number;
  };
}

export async function explainPlan(req: ExplainPlanRequest): Promise<BriefingResponse> {
  return postJson<BriefingResponse>('/api/explain-plan', req);
}

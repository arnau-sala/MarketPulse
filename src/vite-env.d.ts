/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_FORECAST_HORIZON?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

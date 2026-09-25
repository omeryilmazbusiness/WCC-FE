export type ExtIntProvider =
  | "whatsapp"
  | "email"
  | "sms"
  | "accounting"
  | "custom";

export type ExtIntStatus =
  | "draft"
  | "configured"
  | "healthy"
  | "degraded"
  | "error"
  | "disabled";

export type ExtIntCatalogItem = {
  id: string;
  provider: ExtIntProvider;
  name: string;
  description: string;
  configSchema: string[];
};

export type ExternalIntegration = {
  id: string;
  branchId: string;
  provider: ExtIntProvider;
  displayName: string;
  config: Record<string, string>;
  enabled: boolean;
  status: ExtIntStatus;
  lastProbeAt: string | null;
  lastError: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateExternalIntegrationInput = {
  provider: ExtIntProvider;
  displayName: string;
  config?: Record<string, string>;
  enabled?: boolean;
};

export type UpdateExternalIntegrationInput = {
  displayName?: string;
  config?: Record<string, string>;
  enabled?: boolean;
};

export type ProbeResult = {
  ok: boolean;
  status: ExtIntStatus;
  latencyMs: number;
  message: string;
  probedAt: string;
};

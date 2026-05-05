import { api } from "./client";

export interface PresetModel {
  id: string;
  name: string;
  provider: string;
}

export interface AppSettings {
  main_model: string;
  branch_model: string;
  available_models: PresetModel[];
  active_providers: string[];
}

export interface ApiKeyStatus {
  anthropic: boolean;
  openai: boolean;
  gemini: boolean;
  openrouter: boolean;
}

export interface ApiKeyUpdate {
  anthropic?: string;
  openai?: string;
  gemini?: string;
  openrouter?: string;
}

export async function getSettings(): Promise<AppSettings> {
  const res = await api.get("/api/settings");
  return res.data;
}

export async function updateSettings(patch: {
  main_model?: string;
  branch_model?: string;
}): Promise<{ main_model: string; branch_model: string }> {
  const res = await api.put("/api/settings", patch);
  return res.data;
}

export async function getApiKeyStatus(): Promise<ApiKeyStatus> {
  const res = await api.get("/api/settings/api-keys");
  return res.data;
}

export async function updateApiKeys(
  keys: ApiKeyUpdate,
): Promise<{ active_providers: string[]; status: ApiKeyStatus }> {
  const res = await api.put("/api/settings/api-keys", keys);
  return res.data;
}

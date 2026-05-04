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

import { useEffect, useRef, useState } from "react";
import type { AppSettings, PresetModel } from "../api/settings";
import { getSettings, updateSettings } from "../api/settings";

const PROVIDER_COLORS: Record<string, string> = {
  Anthropic: "bg-orange-100 text-orange-700",
  OpenAI: "bg-green-100 text-green-700",
  Google: "bg-blue-100 text-blue-700",
  OpenRouter: "bg-purple-100 text-purple-700",
  Ollama: "bg-gray-100 text-gray-600",
};

function ModelBadge({ model, label }: { model: string; label: string }) {
  const short = model.split("/").pop() ?? model;
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500">
      <span className="opacity-60">{label}:</span>
      <span className="font-mono text-gray-700 truncate max-w-[120px]" title={model}>
        {short}
      </span>
    </span>
  );
}

interface DropdownProps {
  label: string;
  current: string;
  models: PresetModel[];
  activeProviders: string[];
  onSelect: (modelId: string) => void;
}

function ModelDropdown({ label, current, models, activeProviders, onSelect }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const grouped = models.reduce<Record<string, PresetModel[]>>((acc, m) => {
    (acc[m.provider] ??= []).push(m);
    return acc;
  }, {});

  const currentName = models.find((m) => m.id === current)?.name ?? current;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 transition-colors"
      >
        <span className="opacity-60">{label}</span>
        <span className="truncate max-w-[110px]" title={current}>
          {currentName}
        </span>
        <span className="opacity-50">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {Object.entries(grouped).map(([provider, providerModels]) => {
              const isActive = activeProviders.includes(provider);
              return (
                <div key={provider}>
                  <div className="px-3 py-1.5 bg-gray-50 flex items-center gap-2 sticky top-0">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        PROVIDER_COLORS[provider] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {provider}
                    </span>
                    {!isActive && (
                      <span className="text-[10px] text-gray-400">（未配置 API Key）</span>
                    )}
                  </div>
                  {providerModels.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onSelect(m.id);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 ${
                        m.id === current ? "bg-blue-50" : ""
                      } ${!isActive ? "opacity-40" : ""}`}
                    >
                      <span className="text-sm text-gray-800">{m.name}</span>
                      {m.id === current && (
                        <span className="text-xs text-blue-600">当前</span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Custom model input */}
          <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
            <div className="text-xs text-gray-500 mb-1.5">自定义模型字符串</div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && custom.trim()) {
                    onSelect(custom.trim());
                    setOpen(false);
                    setCustom("");
                  }
                }}
                placeholder="如 ollama/llama3"
                className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono"
              />
              <button
                onClick={() => {
                  if (custom.trim()) {
                    onSelect(custom.trim());
                    setOpen(false);
                    setCustom("");
                  }
                }}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ModelSelector() {
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    getSettings().then(setAppSettings).catch(console.error);
  }, []);

  if (!appSettings) return null;

  async function handleChange(key: "main_model" | "branch_model", modelId: string) {
    const updated = await updateSettings({ [key]: modelId });
    setAppSettings((prev) => (prev ? { ...prev, ...updated } : prev));
  }

  return (
    <div className="flex items-center gap-2">
      <ModelDropdown
        label="主线"
        current={appSettings.main_model}
        models={appSettings.available_models}
        activeProviders={appSettings.active_providers}
        onSelect={(id) => handleChange("main_model", id)}
      />
      <ModelDropdown
        label="支线"
        current={appSettings.branch_model}
        models={appSettings.available_models}
        activeProviders={appSettings.active_providers}
        onSelect={(id) => handleChange("branch_model", id)}
      />
    </div>
  );
}

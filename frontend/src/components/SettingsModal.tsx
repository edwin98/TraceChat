import { useEffect, useRef, useState } from "react";
import type { ApiKeyStatus, AppSettings, PresetModel } from "../api/settings";
import { getApiKeyStatus, getSettings, updateApiKeys, updateSettings } from "../api/settings";

interface Props {
  onClose: () => void;
  onProvidersChange?: (providers: string[]) => void;
}

const PROVIDERS: {
  key: keyof ApiKeyStatus;
  label: string;
  placeholder: string;
  hint: string;
}[] = [
  {
    key: "anthropic",
    label: "Anthropic",
    placeholder: "sk-ant-api03-...",
    hint: "claude.ai → API Keys",
  },
  {
    key: "openai",
    label: "OpenAI",
    placeholder: "sk-proj-...",
    hint: "platform.openai.com → API Keys",
  },
  {
    key: "gemini",
    label: "Google Gemini",
    placeholder: "AIzaSy...",
    hint: "aistudio.google.com → Get API Key",
  },
  {
    key: "deepseek",
    label: "DeepSeek",
    placeholder: "sk-...",
    hint: "platform.deepseek.com → API Keys",
  },
  {
    key: "qwen",
    label: "通义千问 (Qwen)",
    placeholder: "sk-...",
    hint: "dashscope.aliyuncs.com → API Key 管理",
  },
  {
    key: "openrouter",
    label: "OpenRouter",
    placeholder: "sk-or-v1-...",
    hint: "openrouter.ai → Keys",
  },
];

const PROVIDER_COLORS: Record<string, string> = {
  Anthropic: "bg-orange-100 text-orange-700",
  OpenAI: "bg-green-100 text-green-700",
  Google: "bg-blue-100 text-blue-700",
  DeepSeek: "bg-sky-100 text-sky-700",
  Qwen: "bg-purple-100 text-purple-700",
  OpenRouter: "bg-violet-100 text-violet-700",
  Ollama: "bg-gray-100 text-gray-600",
};

function ModelDropdown({
  label,
  current,
  models,
  activeProviders,
  onSelect,
}: {
  label: string;
  current: string;
  models: PresetModel[];
  activeProviders: string[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
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

  function handleSelect(id: string) {
    onSelect(id);
    setOpen(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <span className="text-gray-400 text-xs mr-2">{label}</span>
        <span className="flex-1 text-left truncate text-gray-800 font-medium" title={current}>
          {currentName}
        </span>
        {savedFlash ? (
          <span className="ml-2 text-xs text-green-600">已保存</span>
        ) : (
          <span className="ml-2 text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
        )}
      </button>

      {open && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
            {Object.entries(grouped).map(([provider, providerModels]) => {
              const isActive = activeProviders.includes(provider);
              return (
                <div key={provider}>
                  <div className="sticky top-0 flex items-center gap-2 bg-gray-50 px-3 py-1.5">
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        PROVIDER_COLORS[provider] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {provider}
                    </span>
                    {!isActive && provider !== "Ollama" && (
                      <span className="text-[10px] text-red-400">未配置 Key</span>
                    )}
                  </div>
                  {providerModels.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelect(m.id)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        m.id === current ? "bg-blue-50 text-blue-700" : "text-gray-800"
                      } ${!isActive && provider !== "Ollama" ? "opacity-40" : ""}`}
                    >
                      {m.name}
                      {m.id === current && <span className="text-xs text-blue-500">当前</span>}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
            <p className="mb-1 text-xs text-gray-500">自定义模型字符串</p>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && custom.trim()) {
                    handleSelect(custom.trim());
                    setCustom("");
                  }
                }}
                placeholder="如 ollama/llama3"
                className="flex-1 rounded-lg border border-gray-300 px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <button
                onClick={() => {
                  if (custom.trim()) {
                    handleSelect(custom.trim());
                    setCustom("");
                  }
                }}
                className="rounded-lg bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
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

export function SettingsModal({ onClose, onProvidersChange }: Props) {
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [keyStatus, setKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [inputs, setInputs] = useState<Partial<Record<keyof ApiKeyStatus, string>>>({});
  const [showKey, setShowKey] = useState<Partial<Record<keyof ApiKeyStatus, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    Promise.all([getSettings(), getApiKeyStatus()]).then(([s, k]) => {
      setAppSettings(s);
      setKeyStatus(k);
    });
  }, []);

  async function handleSaveKeys() {
    const patch: Partial<Record<keyof ApiKeyStatus, string>> = {};
    for (const p of PROVIDERS) {
      const val = inputs[p.key];
      if (val !== undefined) patch[p.key] = val;
    }
    if (Object.keys(patch).length === 0) return;

    setSaving(true);
    setErrorMsg("");
    try {
      const res = await updateApiKeys(patch);
      setKeyStatus(res.status);
      setInputs({});
      setSavedMsg("API Key 已保存");
      onProvidersChange?.(res.active_providers);
      setAppSettings((prev) =>
        prev ? { ...prev, active_providers: res.active_providers } : prev,
      );
    } catch {
      setErrorMsg("保存失败，请重试");
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(""), 2500);
    }
  }

  async function handleClearKey(providerKey: keyof ApiKeyStatus) {
    setSaving(true);
    setErrorMsg("");
    try {
      const res = await updateApiKeys({ [providerKey]: "" });
      setKeyStatus(res.status);
      setInputs((prev) => {
        const next = { ...prev };
        delete next[providerKey];
        return next;
      });
      setSavedMsg("已清除");
      onProvidersChange?.(res.active_providers);
      setAppSettings((prev) =>
        prev ? { ...prev, active_providers: res.active_providers } : prev,
      );
    } catch {
      setErrorMsg("操作失败，请重试");
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(""), 2000);
    }
  }

  async function handleModelChange(key: "main_model" | "branch_model", modelId: string) {
    const updated = await updateSettings({ [key]: modelId });
    setAppSettings((prev) => (prev ? { ...prev, ...updated } : prev));
  }

  const hasInputChanges = Object.values(inputs).some((v) => v !== undefined && v !== "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">设置</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="关闭"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 flex-1">
          {/* API Key Section */}
          <section>
            <h3 className="mb-1 text-sm font-semibold text-gray-800">API 密钥</h3>
            <p className="mb-3 text-xs text-gray-500">
              输入至少一个 provider 的 API Key 才能开始对话。密钥保存在服务器端 .env 文件中。
            </p>
            <div className="space-y-3">
              {PROVIDERS.map((p) => {
                const isConfigured = keyStatus?.[p.key] ?? false;
                const inputVal = inputs[p.key] ?? "";
                const visible = showKey[p.key] ?? false;
                return (
                  <div key={p.key} className="rounded-xl border border-gray-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{p.label}</span>
                      <div className="flex items-center gap-2">
                        {isConfigured && (
                          <button
                            onClick={() => handleClearKey(p.key)}
                            disabled={saving}
                            className="text-[11px] text-red-400 hover:text-red-600 disabled:opacity-40"
                            title="清除此密钥"
                          >
                            清除
                          </button>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            isConfigured
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {isConfigured ? "已配置" : "未配置"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={visible ? "text" : "password"}
                          value={inputVal}
                          onChange={(e) =>
                            setInputs((prev) => ({ ...prev, [p.key]: e.target.value }))
                          }
                          placeholder={isConfigured ? "输入新密钥以更新..." : p.placeholder}
                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 pr-9 font-mono text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowKey((prev) => ({ ...prev, [p.key]: !visible }))
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          tabIndex={-1}
                        >
                          {visible ? (
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" />
                              <path d="M10.748 13.93l2.523 2.524a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                              <path
                                fillRule="evenodd"
                                d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-gray-400">{p.hint}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between">
              {errorMsg ? (
                <span className="text-xs text-red-500">{errorMsg}</span>
              ) : savedMsg ? (
                <span className="text-xs text-green-600">{savedMsg}</span>
              ) : (
                <span />
              )}
              <button
                onClick={handleSaveKeys}
                disabled={saving || !hasInputChanges}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {saving ? "保存中..." : "保存密钥"}
              </button>
            </div>
          </section>

          {/* Model Section */}
          <section className="mt-6 border-t border-gray-100 pt-5">
            <h3 className="mb-1 text-sm font-semibold text-gray-800">模型配置</h3>
            <p className="mb-3 text-xs text-gray-500">
              主线模型用于正式对话，支线模型用于临时查询，可选择较轻量的模型降低成本。模型切换即时生效。
            </p>
            {appSettings ? (
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs text-gray-500">主线模型</p>
                  <ModelDropdown
                    label="主线"
                    current={appSettings.main_model}
                    models={appSettings.available_models}
                    activeProviders={appSettings.active_providers}
                    onSelect={(id) => handleModelChange("main_model", id)}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-gray-500">支线模型</p>
                  <ModelDropdown
                    label="支线"
                    current={appSettings.branch_model}
                    models={appSettings.available_models}
                    activeProviders={appSettings.active_providers}
                    onSelect={(id) => handleModelChange("branch_model", id)}
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400">加载中...</div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 flex-shrink-0">
          <p className="text-xs text-gray-400">
            API Key 重启后从 .env 文件读取。
          </p>
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}

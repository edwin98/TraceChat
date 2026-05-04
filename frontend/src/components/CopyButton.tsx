import { useState } from "react";

interface Props {
  text: string;
  className?: string;
}

export function CopyButton({ text, className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button
      onClick={handleCopy}
      className={`rounded-md px-1.5 py-0.5 text-[10px] transition-colors ${className}`}
      title="复制消息"
    >
      {copied ? "已复制" : "复制"}
    </button>
  );
}

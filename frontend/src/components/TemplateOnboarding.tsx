"use client";

import { useEffect, useState } from "react";
import { Sparkles, MessageSquare, FolderOpen, X } from "lucide-react";

interface OnboardingState {
  templateMode: boolean;
  daName: string;
  interviewCommand: string;
}

const DISMISSED_KEY = "pai:template-onboarding:dismissed";

export default function TemplateOnboarding() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage.getItem(DISMISSED_KEY) === "1") {
      setDismissed(true);
    }
    fetch("/api/onboarding/state")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d))
      .catch(() => setState(null));
  }, []);

  if (!state || !state.templateMode || dismissed) return null;

  const handleDismiss = () => {
    window.sessionStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  const daName = state.daName || "你的助理";
  const cmd = state.interviewCommand || "/interview";

  return (
    <div className="border-b border-line-2 bg-surface-2">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-500/15 p-2 mt-0.5 shrink-0">
            <Sparkles className="w-4 h-4 text-blue-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-blue-50">
                目前顯示的是範例內容。
              </span>
              <span className="text-sm text-ink-2">
                完成個人設定後，這裡會呈現屬於你的工作台。
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-x-5 gap-y-1.5 flex-wrap text-[13px]">
              <span className="flex items-center gap-1.5 text-ink-2">
                <MessageSquare className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                與 <span className="text-blue-200 font-medium">{daName}</span> 對話，使用
                <code className="px-1.5 py-0.5 rounded bg-surface-3 text-blue-200 text-xs font-mono">
                  {cmd}
                </code>
                整理你的方向、身分、目標與專案。
              </span>
              <span className="flex items-center gap-1.5 text-ink-2">
                <FolderOpen className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                也可以直接修改
                <code className="px-1.5 py-0.5 rounded bg-surface-3 text-blue-200 text-xs font-mono">
                  ~/.config/LIFEOS/USER/
                </code>
                中的個人資料。
              </span>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="本次暫時隱藏"
            className="shrink-0 rounded-md text-ink-3 hover:text-ink-1 hover:bg-surface-3 p-1.5 transition-colors"
            title="本次暫時隱藏；完成個人設定後就不再顯示。"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

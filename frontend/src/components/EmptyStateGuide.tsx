"use client";

import { Sparkles } from "lucide-react";
interface EmptyStateGuideProps {
  section: string;
  description: string;
  userDir?: string;
  interviewCommand?: string;
  daPromptExample?: string;
  hideInterview?: boolean;
}
export default function EmptyStateGuide({section,description,userDir,interviewCommand="/interview",daPromptExample,hideInterview=false}:EmptyStateGuideProps) {
  const userPath=userDir ? `~/.config/LIFEOS/USER/${userDir}/` : "~/.config/LIFEOS/USER/";
  return <section className="rounded border border-line-2 bg-surface-2 p-6 sm:p-8">
    <div className="flex items-start gap-4">
      <Sparkles className="w-5 h-5 text-[var(--accent-soft)] shrink-0 mt-1" strokeWidth={1.3}/>
      <div className="min-w-0"><h3 className="text-base text-ink-1 font-medium">{section}還沒有內容</h3><p className="text-sm text-ink-2 leading-relaxed mt-2">{description}</p>
        <p className="text-sm text-ink-2 mt-5">可以對助理說：</p><p className="text-base text-[var(--accent-soft)] mt-2">「{daPromptExample ?? `幫我整理我的${section}`}」</p>
        <details className="mt-6 text-xs text-ink-3"><summary className="cursor-pointer py-2">資料與使用方式</summary><div className="space-y-3 mt-3 break-words">
          {!hideInterview && <p>使用 <code className="text-ink-2">{interviewCommand}</code>，讓助理陪你整理個人資料。</p>}
          <p>本機資料位置：<code className="text-ink-2 break-all">{userPath}</code></p>
          <p>也可以請助理匯入既有的筆記或日誌，再由你確認內容。</p>
        </div></details>
      </div>
    </div>
  </section>;
}

"use client";
import { formatDate } from "@/lib/zh-TW";

import { useEffect, useState } from "react";
import { BookOpen, Star } from "lucide-react";
import { PageShell, PageHeader, Panel, PanelHeader, Pill, EmptyState } from "@/components/ui/chrome";

/**
 * Books tab — 使用者's favorite books. Zero data in this component; it fetches
 * /api/books (which reads USER/BOOKS.md) and renders it. Data/code separated.
 */

interface Book {
  title: string;
  author?: string;
  year?: number;
  rating?: number;
  themes?: string[];
  canonical?: boolean;
}
interface Group { category: string; books: Book[] }
interface BooksData { count: number; lastUpdated: string | null; groups: Group[] }

export default function BooksPage() {
  const [data, setData] = useState<BooksData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError("連線未完成，請檢查本機服務後再試。"));
  }, []);

  const subtitle =
    "值得再次閱讀的喜愛書籍。" +
    (data?.count ? ` 已記錄 ${data.count} 本。` : "") +
    (data?.lastUpdated ? ` 更新於 ${formatDate(data.lastUpdated)}。` : "");

  return (
    <PageShell className="max-w-[1100px]">
      <PageHeader icon={BookOpen} title="閱讀" subtitle={subtitle} />

      {error && <div className="text-warn text-sm">無法連接書籍資料服務： {error}</div>}
      {!data && !error && <div className="text-ink-3 text-sm">正在讀取…</div>}
      {data && data.groups.length === 0 && !error && (
        <EmptyState icon={BookOpen} title="尚未加入書籍" hint="在書籍紀錄中加入書籍後，即可在這裡查看。" />
      )}

      {data?.groups.map((g) => (
        <section key={g.category} className="flex flex-col gap-3">
          <PanelHeader title={g.category} />
          <div className="grid gap-3 sm:grid-cols-2">
            {g.books.map((b, i) => (
              <Panel key={`${b.title}-${i}`} hover className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-ink-1 font-medium flex items-start gap-1.5">
                      {b.canonical && (
                        <Star className="w-3.5 h-3.5 shrink-0 mt-1" style={{ color: "var(--money)" }} fill="currentColor" />
                      )}
                      <span>{b.title}</span>
                    </div>
                    <div className="text-ink-2 text-sm mt-0.5">
                      {b.author}
                      {b.year ? ` · ${b.year}` : ""}
                    </div>
                  </div>
                  {typeof b.rating === "number" && (
                    <span className="shrink-0 font-semibold tabular-nums text-sm" style={{ color: "var(--accent-blue)" }}>
                      {b.rating}/10
                    </span>
                  )}
                </div>
                {b.themes && b.themes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {b.themes.map((t) => (
                      <Pill key={t} dim="neutral">{t}</Pill>
                    ))}
                  </div>
                )}
              </Panel>
            ))}
          </div>
        </section>
      ))}
    </PageShell>
  );
}

"use client";

import { displayLabel } from "@/lib/zh-TW";
import { docDisplayLabel } from "@/lib/module-labels-zh";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import MarkdownRenderer from "@/components/wiki/MarkdownRenderer";
import WikiMeta from "@/components/wiki/WikiMeta";
import {
  BookOpen,
  Compass,
  Sparkles,
  ArrowRight,
  Folder,
} from "lucide-react";
import Link from "next/link";
import { wikiPageUrl } from "@/lib/wiki-links";
import { PageShell, PageHeader, Panel, StatTile, Pill } from "@/components/ui/chrome";
import type { LucideIcon } from "lucide-react";

interface TreeNode {
  label: string;
  slug?: string;
  category?: string;
  children?: TreeNode[];
  count?: number;
}

interface WikiPage {
  slug: string;
  title: string;
  category: string;
  tags?: string[];
  quality?: number;
  lastModified: string;
  wordCount: number;
  group?: string;
}

interface WikiIndex {
  tree: TreeNode[];
  recentChanges: WikiPage[];
  stats: { totalSystem: number };
}

interface PageDetail {
  slug: string;
  title: string;
  category: string;
  content: string;
  wordCount: number;
  lastModified: string;
  backlinks: Array<{ slug: string; title: string; category: string }>;
  wikilinks: string[];
  tags?: string[];
  quality?: number;
  filePath?: string;
  group?: string;
}

// The card look, matching chrome Panel + hover, applied to Link elements.
const CARD_CLASS =
  "flex flex-col gap-2 bg-surface-2 border border-line-2 rounded-xl p-5 transition-colors duration-200 hover:bg-surface-3 hover:border-line-3";

const START_HERE_SLUGS = [
  {
    slug: "PAISystemArchitecture",
    tagline: "整體架構文件，呈現每個子系統的關係",
  },
  {
    slug: "LifeOs__LifeOsThesis",
    tagline: "LifeOS 為何存在：生活作業系統的核心理念",
  },
  {
    slug: "ARCHITECTURE_SUMMARY",
    tagline: "自動產生並持續更新的單頁架構摘要",
  },
];

function qualityLabel(quality: number | undefined): string {
  if (quality === undefined) return "尚無品質評分";
  return `${Math.round(quality * 100)}％品質`;
}

function flattenTree(nodes: TreeNode[] | undefined): TreeNode[] {
  if (!nodes) return [];
  const out: TreeNode[] = [];
  for (const n of nodes) {
    out.push(n);
    if (n.children) out.push(...flattenTree(n.children));
  }
  return out;
}

function SectionHeading({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h2
      className="flex items-center gap-2 mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-3"
      style={{ fontFamily: "'concourse-c3', 'concourse-t3', sans-serif" }}
    >
      <Icon className="w-4 h-4" />
      {children}
    </h2>
  );
}

function DocsLanding({ data }: { data: WikiIndex }) {
  const documentationNode =
    data.tree.find((n) => n.label.toLowerCase() === "documentation") ?? null;

  const groups: TreeNode[] = documentationNode?.children ?? [];

  const allLeaves = flattenTree(groups).filter((n) => n.slug);

  const slugToNode = new Map<string, TreeNode>();
  for (const leaf of allLeaves) {
    if (leaf.slug) slugToNode.set(leaf.slug, leaf);
  }

  type StartHereEntry = {
    slug: string;
    tagline: string;
    title: string;
    category: string | undefined;
  };

  const startHere: StartHereEntry[] = START_HERE_SLUGS.flatMap((entry) => {
    const node = slugToNode.get(entry.slug);
    if (!node) return [];
    return [{ slug: entry.slug, tagline: entry.tagline, title: node.label, category: node.category }];
  });

  return (
    <div className="h-full overflow-y-auto">
      <PageShell>
        <PageHeader
          title="文件"
          subtitle="LifeOS 子系統架構、執行流程與參考資料"
          icon={BookOpen}
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile icon={BookOpen} label="文件" value={data.stats.totalSystem} dim="rhythms" />
          <StatTile icon={Folder} label="章節" value={groups.length} dim="relationships" />
        </div>

        {startHere.length > 0 && (
          <div>
            <SectionHeading icon={Sparkles}>從這裡開始</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {startHere.map((entry) => (
                <Link
                  key={entry.slug}
                  href={wikiPageUrl(entry.category ?? "system-doc", entry.slug)}
                  className={`${CARD_CLASS} group`}
                >
                  <div className="text-base font-semibold text-ink-1">{docDisplayLabel(entry.title)}</div>
                  <div className="text-[13px] leading-relaxed text-ink-3">{entry.tagline}</div>
                  <div className="mt-auto flex items-center gap-2 pt-2">
                    <Pill dim="creative">從這裡開始</Pill>
                    <span className="flex items-center gap-1 text-[13px] uppercase tracking-[0.2em] text-dim-creative">
                      開啟
                      <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {groups.length > 0 && (
          <div>
            <SectionHeading icon={Compass}>依章節瀏覽</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groups.map((group) => {
                const firstChild = group.children?.find((c) => c.slug);
                const href =
                  firstChild && firstChild.slug
                    ? wikiPageUrl(firstChild.category ?? "system-doc", firstChild.slug)
                    : "#";

                return (
                  <Link key={group.label} href={href} className={CARD_CLASS}>
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-3"
                        style={{ fontFamily: "'concourse-c3', 'concourse-t3', sans-serif" }}
                      >
                        {docDisplayLabel(group.label)}
                      </div>
                      {group.count !== undefined && (
                        <Pill dim="freedom" className="tabular-nums">
                          {group.count}
                        </Pill>
                      )}
                    </div>
                    <div className="text-[13px] text-ink-3 leading-relaxed line-clamp-2">
                      {(group.children ?? [])
                        .filter((c) => c.slug)
                        .slice(0, 3)
                        .map((c) => docDisplayLabel(c.label))
                        .join(" · ")}
                      {(group.children?.length ?? 0) > 3 && " · …"}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {data.recentChanges.length > 0 && (
          <div>
            <SectionHeading icon={Sparkles}>最近更新</SectionHeading>
            <Panel className="p-0">
              <div className="divide-y divide-line-1">
                {data.recentChanges.slice(0, 6).map((page, index) => (
                  <Link
                    key={page.slug}
                    href={wikiPageUrl(page.category, page.slug)}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-surface-3 transition-colors"
                  >
                    <div className="mono text-ink-3 tabular-nums shrink-0" style={{ fontSize: 13 }}>
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-ink-1" style={{ fontSize: 14 }}>
                        {page.category === "system-doc" ? docDisplayLabel(page.title) : page.title}
                      </div>
                      <div className="text-ink-3" style={{ fontSize: 13 }}>
                        {displayLabel(page.category)} · {page.wordCount.toLocaleString()} 字
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <Pill dim="rhythms">更新於</Pill>
                      <span className="text-ink-3 tabular-nums" style={{ fontSize: 12 }}>
                        {new Date(page.lastModified).toLocaleDateString("zh-TW", { timeZone: "Asia/Shanghai", 
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <Pill dim="relationships" className="shrink-0">
                      {qualityLabel(page.quality)}
                    </Pill>
                  </Link>
                ))}
              </div>
            </Panel>
          </div>
        )}
      </PageShell>
    </div>
  );
}

function DocsPageInner() {
  const searchParams = useSearchParams();
  const docSlug = searchParams.get("doc");
  const isViewing = !!docSlug;

  const { data: indexData } = useQuery<WikiIndex>({
    queryKey: ["wiki-index"],
    queryFn: async () => {
      const res = await fetch("/api/wiki");
      if (!res.ok) throw new Error("無法讀取文件索引");
      return res.json();
    },
    staleTime: 30_000,
    enabled: !isViewing,
  });

  const { data: docDetail } = useQuery<PageDetail>({
    queryKey: ["wiki-doc", docSlug],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/doc/${docSlug}`);
      if (!res.ok) throw new Error("無法讀取文件");
      return res.json();
    },
    enabled: isViewing,
  });

  if (isViewing && docDetail) {
    return (
      <div className="flex h-full wiki-document">
        {/* inline flex: `flex-1` here loses its grow to an unlayered CSS rule and collapses the body to width 0 — inline restores it */}
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl" style={{ flex: "1 1 auto", minWidth: 0 }}>
          <MarkdownRenderer content={docDetail.content} />
        </div>
        <WikiMeta
          title={docDisplayLabel(docDetail.title)}
          category={docDetail.category}
          tags={docDetail.tags}
          quality={docDetail.quality}
          lastModified={docDetail.lastModified}
          wordCount={docDetail.wordCount}
          backlinks={docDetail.backlinks}
          filePath={docDetail.filePath}
        />
      </div>
    );
  }

  if (!isViewing && indexData) {
    return <DocsLanding data={indexData} />;
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-sm text-ink-3">載入中…</div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-ink-3">載入中…</div>
        </div>
      }
    >
      <DocsPageInner />
    </Suspense>
  );
}

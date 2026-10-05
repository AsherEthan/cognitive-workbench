"use client";
import { presentHealthData, sectionLabel } from "../life/template-data";
import { displayLabel } from "@/lib/zh-TW";
import { useEffect, useState } from "react";
import {
  Activity,
  Heart,
  Apple,
  FlaskConical,
  Pill as PillIcon,
  Stethoscope,
  ClipboardList,
  FileText,
  Lock,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { FreshnessIndicator, type FreshnessData } from "@/components/FreshnessIndicator";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import {
  PageShell,
  PageHeader,
  Panel,
  PanelHeader,
  StatTile,
  Pill,
  TabBar,
  type TabSpec,
  type Dim,
} from "@/components/ui/chrome";

interface HealthFile {
  name: string;
  sections: string[];
}

interface Section {
  heading: string;
  body: string;
}

interface HealthData {
  files?: HealthFile[];
  referenceFiles?: HealthFile[];
  supplements?: Section[];
  freshness?: FreshnessData;
}

interface FileMeta {
  icon: LucideIcon;
  label: string;
  priority: number;
}

const FILE_META: Record<string, FileMeta> = {
  METRICS: { icon: Activity, label: "指標", priority: 1 },
  FITNESS: { icon: Heart, label: "體能", priority: 2 },
  NUTRITION: { icon: Apple, label: "營養", priority: 3 },
  CONDITIONS: { icon: ClipboardList, label: "健康狀況", priority: 4 },
  MEDICATIONS: { icon: PillIcon, label: "用藥", priority: 5 },
  PROVIDERS: { icon: Stethoscope, label: "醫療服務", priority: 6 },
  HISTORY: { icon: FileText, label: "歷史紀錄", priority: 7 },
  SUPPLEMENTS: { icon: PillIcon, label: "補充品", priority: 5 },
};

function fileMeta(name: string): FileMeta {
  if (name.startsWith("lab_results")) {
    return {
      icon: FlaskConical,
      label: name.replace(/^lab_results_/, "檢驗 — "),
      priority: 0,
    };
  }
  return FILE_META[name.toUpperCase()] || { icon: FileText, label: name, priority: 99 };
}

function FileCard({ file }: { file: HealthFile }) {
  const meta = fileMeta(file.name);
  const Icon = meta.icon;
  return (
    <Panel hover style={{ borderLeft: "3px solid var(--health)" }}>
      <PanelHeader
        title={meta.label}
        icon={Icon}
        actions={
          <Pill dim="health" className="tabular-nums">
            {file.sections.length} 個章節
          </Pill>
        }
      />
      <div className="space-y-1.5" data-sensitive>
        {file.sections.slice(0, 8).map((s, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-ink-2">
            <span
              className="w-1 h-1 rounded-full mt-1.5 shrink-0"
              style={{ backgroundColor: "var(--rhythms)", opacity: 0.6 }}
            />
            <span className="line-clamp-2">{sectionLabel(s)}</span>
          </div>
        ))}
        {file.sections.length > 8 && (
          <div className="text-[12px] italic pt-1 text-ink-3">
            + {file.sections.length - 8} 項未展開
          </div>
        )}
      </div>
    </Panel>
  );
}

// ── Supplements ──

interface Supplement {
  name: string;
  dose?: string;
  purpose?: string;
  cadence?: string;
  category?: string;
  status?: string;
}

const CATEGORY_ORDER = ["Foundational", "Longevity", "Nootropic", "Allergy", "Rx"];
const CATEGORY_DIM: Record<string, Dim> = {
  Foundational: "health",
  Longevity: "rhythms",
  Nootropic: "blue",
  Allergy: "creative",
  Rx: "money",
};

function field(body: string, name: string): string | undefined {
  const m = body.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*(.+)`));
  return m ? m[1].trim() : undefined;
}

function parseSupplements(sections: Section[]): { items: Supplement[]; notes?: string } {
  const items: Supplement[] = [];
  let notes: string | undefined;
  for (const s of sections) {
    if (s.heading.toLowerCase() === "notes") {
      notes = s.body;
      continue;
    }
    const dose = field(s.body, "Dose");
    const category = field(s.body, "Category");
    if (!dose && !category) continue; // not a supplement entry
    items.push({
      name: s.heading,
      dose,
      purpose: field(s.body, "Purpose"),
      cadence: field(s.body, "Cadence"),
      category,
      status: field(s.body, "Status"),
    });
  }
  return { items, notes };
}

function SupplementCard({ s }: { s: Supplement }) {
  const dim = (s.category && CATEGORY_DIM[s.category]) || "health";
  const inactive = s.status && !/^active/i.test(s.status);
  return (
    <Panel hover style={{ borderLeft: `3px solid var(--${dim})` }}>
      <PanelHeader
        title={s.name}
        icon={PillIcon}
        actions={
          s.category ? (
            <Pill dim={dim}>{displayLabel(s.category)}</Pill>
          ) : undefined
        }
      />
      <div className="space-y-1.5" data-sensitive>
        {s.dose && (
          <div className="text-sm font-medium text-ink-1">{s.dose}</div>
        )}
        {s.cadence && (
          <div className="text-[12px] uppercase tracking-wide text-ink-3">{displayLabel(s.cadence)}</div>
        )}
        {s.purpose && <div className="text-xs text-ink-2">{s.purpose}</div>}
        {s.status && (
          <div
            className="text-[12px] pt-1"
            style={{ color: inactive ? "var(--ink-3)" : "var(--health)" }}
          >
            {displayLabel(s.status)}
          </div>
        )}
      </div>
    </Panel>
  );
}

function SupplementsTab({ sections }: { sections: Section[] }) {
  const { items, notes } = parseSupplements(sections);

  if (items.length === 0) {
    return (
      <EmptyStateGuide
        section="補充品"
        description="記錄日常或需要時使用的補充品、用量、用途與頻率。"
        userDir="HEALTH"
        daPromptExample="把我的補充品資料加入健康頁面"
      />
    );
  }

  const daily = items.filter((s) => /daily/i.test(s.cadence || "")).length;
  const categories = Array.from(
    new Set(items.map((s) => s.category).filter(Boolean) as string[]),
  ).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        <StatTile
          label="已記錄"
          value={<span data-sensitive>{items.length}</span>}
          dim="health"
          icon={PillIcon}
        />
        <StatTile
          label="每日使用"
          value={<span data-sensitive>{daily}</span>}
          dim="rhythms"
          icon={Activity}
        />
        <StatTile
          label="分類"
          value={<span data-sensitive>{categories.length}</span>}
          dim="blue"
          icon={LayoutGrid}
        />
      </div>

      <p className="text-sm flex items-center gap-2 text-ink-3">
        <Lock className="w-3.5 h-3.5" /> 個人資料。開啟隱藏內容後，下方資料會模糊顯示。
      </p>

      {categories.map((cat) => {
        const group = items.filter((s) => s.category === cat);
        return (
          <section key={cat}>
            <h2 className="text-[13px] font-medium uppercase tracking-widest text-ink-3 mb-4">
              {displayLabel(cat)}
            </h2>
            <div className="prob-grid">
              {group.map((s) => (
                <SupplementCard key={s.name} s={s} />
              ))}
            </div>
          </section>
        );
      })}

      {notes && (
        <Panel style={{ borderLeft: "3px solid var(--rhythms)" }}>
          <PanelHeader title="筆記" icon={FileText} />
          <div className="text-xs text-ink-2 whitespace-pre-line" data-sensitive>
            {notes.replace(/^- /gm, "• ")}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ── Page ──

type TabKey = "overview" | "supplements";
const TABS: TabSpec<TabKey>[] = [
  { id: "overview", label: "概覽", icon: Activity, dim: "health", hint: "1" },
  { id: "supplements", label: "補充品", icon: PillIcon, dim: "rhythms", hint: "2" },
];

function OverviewTab({ files }: { files: HealthFile[] }) {
  const labs = files.filter((f) => f.name.startsWith("lab_results"));
  const nonLabs = files.filter((f) => !f.name.startsWith("lab_results"));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        <StatTile
          label="資料來源"
          value={<span data-sensitive>{files.length}</span>}
          dim="health"
          icon={Activity}
        />
        <StatTile
          label="檢驗報告"
          value={<span data-sensitive>{labs.length}</span>}
          dim="rhythms"
          icon={FlaskConical}
        />
      </div>

      <p className="text-sm flex items-center gap-2 text-ink-3">
        <Lock className="w-3.5 h-3.5" /> 個人資料。開啟隱藏內容後，下方資料會模糊顯示。
      </p>

      {labs.length > 0 && (
        <section>
          <h2 className="text-[13px] font-medium uppercase tracking-widest text-ink-3 mb-4 flex items-center gap-2">
            <FlaskConical className="w-4 h-4" /> 檢驗報告
          </h2>
          <div className="prob-grid">
            {labs.map((f) => (
              <FileCard key={f.name} file={f} />
            ))}
          </div>
        </section>
      )}
      {nonLabs.length > 0 && (
        <section>
          <h2 className="text-[13px] font-medium uppercase tracking-widest text-ink-3 mb-4">
            主要紀錄
          </h2>
          <div className="prob-grid">
            {nonLabs.map((f) => (
              <FileCard key={f.name} file={f} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");

  useEffect(() => {
    fetch("/api/life/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((value) => setData(value ? presentHealthData(value) : null))
      .catch((e) => setError("連線未完成，請檢查本機服務後再試。"));
  }, []);

  // Hash-routed tab state (matches finances/agents pattern).
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.replace(/^#/, "");
      if (h === "overview" || h === "supplements") setTab(h);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "1") changeTab("overview");
      if (e.key === "2") changeTab("supplements");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const changeTab = (k: TabKey) => {
    setTab(k);
    if (typeof window !== "undefined") window.location.hash = k;
  };

  if (error) {
    return (
      <PageShell>
        <Panel style={{ borderLeft: "3px solid var(--err)" }}>
          <h2 className="font-medium text-err">健康資料讀取失敗</h2>
          <p className="text-sm text-ink-2">{error}</p>
        </Panel>
      </PageShell>
    );
  }
  if (!data) return <div className="p-8 text-sm text-ink-3">正在讀取健康資料…</div>;

  const files = (data.files || [])
    .slice()
    .sort((a, b) => fileMeta(a.name).priority - fileMeta(b.name).priority);
  const isFreshInstall = files.length === 0 && (data.supplements?.length ?? 0) === 0;

  return (
    <PageShell>
      <PageHeader
        title="健康"
        icon={Activity}
        subtitle="檢驗、體能、營養與補充品的個人紀錄。按 1／2 可切換分頁。"
        actions={!isFreshInstall ? <FreshnessIndicator freshness={data.freshness} /> : undefined}
      />

      {isFreshInstall && (
        <EmptyStateGuide
          section="健康紀錄"
          description="尚未提供可判讀的個人健康紀錄。安裝範例不會列入紀錄或數量；補上資料後，即可回看檢驗、體能、營養與長期變化。"
          userDir="HEALTH"
          daPromptExample="協助我整理健康資料的保存位置"
        />
      )}

      {!isFreshInstall && <TabBar tabs={TABS} active={tab} onChange={changeTab} />}

      {!isFreshInstall && tab === "overview" && <OverviewTab files={files} />}
      {!isFreshInstall && tab === "supplements" && <SupplementsTab sections={data.supplements || []} />}
      {(data.referenceFiles?.length ?? 0) > 0 && <details className="text-sm text-ink-3"><summary className="cursor-pointer">概覽檔案結構</summary><p className="mt-2">此處僅提供章節名稱，不作為健康紀錄或量測依據。</p>{data.referenceFiles?.map((file) => <p key={file.name} className="mt-2">{file.sections.map(sectionLabel).join(" · ")}</p>)}</details>}
    </PageShell>
  );
}

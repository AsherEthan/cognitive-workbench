"use client";

import { displayLabel } from "@/lib/zh-TW";
import { skillDisplayName, skillDisplayDescription } from "@/lib/module-labels-zh";

import { Suspense, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import MarkdownRenderer from "@/components/wiki/MarkdownRenderer";
import { Zap, ArrowLeft, Pencil, Check, X, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  PageShell,
  PageHeader,
  Panel,
  StatTile,
  TabBar,
  Pill,
  dimStyle,
  type Dim,
} from "@/components/ui/chrome";

interface SkillMeta {
  name: string;
  dir?: string;
  description: string;
  effort: string;
  hasWorkflows: boolean;
  lastModified: string;
}

// A skill is "private" purely by naming convention: its on-disk directory
// starts with "_" and the rest is all-caps (e.g. _EXAMPLE, _MY_TOOL).
// No skill names are hardcoded — whatever the user has that matches shows up.
function isPrivateSkill(skill: SkillMeta): boolean {
  const key = skill.dir ?? skill.name;
  return key.startsWith("_") && key === key.toUpperCase();
}

interface SkillDetail {
  name: string;
  description: string;
  effort: string;
  content: string;
  filePath: string;
  lastModified: string;
  wordCount: number;
}

function effortDim(effort: string): Dim {
  if (effort === "easy" || effort === "low") return "ok";
  if (effort === "hard" || effort === "high") return "err";
  return "neutral";
}

function SkillsLanding({ skills }: { skills: SkillMeta[] }) {
  const [tab, setTab] = useState<"public" | "private">("public");
  const privateSkills = skills.filter(isPrivateSkill);
  const publicSkills = skills.filter((s) => !isPrivateSkill(s));
  const active = tab === "public" ? publicSkills : privateSkills;

  return (
    <PageShell>
      <PageHeader
        title="技能"
        icon={Zap}
        subtitle="由觸發語句啟用的領域能力。每項技能整合提示詞、工作流程、工具與範本，形成可獨立使用的單位。"
      />

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 220px))" }}>
        <StatTile label="技能" value={skills.length} icon={Zap} dim="creative" />
      </div>

      <TabBar
        tabs={[
          { id: "public", label: "公開", dim: "blue", hint: publicSkills.length },
          { id: "private", label: "私人", dim: "creative", hint: privateSkills.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "private" && (
        <p className="-mt-2 text-[13px] text-ink-3">
          以底線及全大寫命名的個人整合與平台自動化，從你的技能目錄即時讀取。
        </p>
      )}

      {/* Private skills describe personal domains — Observer mode blurs them. */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
        data-sensitive={tab === "private" ? "" : undefined}
      >
        {active.map((skill) => (
          <SkillCard key={skill.name} skill={skill} />
        ))}
      </div>
    </PageShell>
  );
}

function SkillCard({ skill }: { skill: SkillMeta }) {
  const title = skillDisplayName(skill.name);
  const description = skillDisplayDescription(skill.description, skill.name);
  return (
    <Link href={`/skills?name=${encodeURIComponent(skill.name)}`} className="block">
      <Panel hover className="h-full flex flex-col gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="w-4 h-4 shrink-0 text-dim-creative" />
          <span className="font-medium text-ink-1 truncate">{title}</span>
        </div>
        {title !== skill.name && <p className="text-[11px] text-ink-3 mono">{skill.name}</p>}
        <p className="text-[13px] leading-relaxed text-ink-2">
          {description.slice(0, 140)}
          {description.length > 140 ? "…" : ""}
        </p>
        <div className="flex items-center gap-1.5 mt-auto pt-1">
          <Pill dim={effortDim(skill.effort)}>{displayLabel(skill.effort)}</Pill>
          {skill.hasWorkflows && <Pill dim="relationships">含工作流程</Pill>}
        </div>
      </Panel>
    </Link>
  );
}

function SkillDetailView({ skill }: { skill: SkillDetail }) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(skill.content);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/wiki/skills/${encodeURIComponent(skill.name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("儲存失敗");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-detail", skill.name] });
      setEditing(false);
    },
  });

  const btnBase =
    "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium cursor-pointer";

  const isPrivate = skill.name.startsWith("_") && skill.name === skill.name.toUpperCase();

  return (
    <div
      className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-4"
      data-sensitive={isPrivate ? "" : undefined}
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/skills" className="text-ink-2 hover:text-ink-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-ink-1">{skillDisplayName(skill.name)}</h1>
            {skillDisplayName(skill.name) !== skill.name && <p className="text-[11px] text-ink-3 mono">{skill.name}</p>}
            <p className="mt-0.5 text-[13px] text-ink-2">
              {skill.wordCount} 字 ·{" "}
              {new Date(skill.lastModified).toLocaleDateString("zh-TW", { timeZone: "Asia/Shanghai", 
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={() => mutation.mutate(editContent)}
                disabled={mutation.isPending}
                className={btnBase}
                style={{
                  ...dimStyle("ok"),
                  cursor: mutation.isPending ? "not-allowed" : "pointer",
                  opacity: mutation.isPending ? 0.6 : 1,
                }}
              >
                {mutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                儲存
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditContent(skill.content);
                }}
                className={btnBase}
                style={dimStyle("neutral")}
              >
                <X className="w-4 h-4" />
                取消
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setEditing(true);
                setEditContent(skill.content);
              }}
              className={btnBase}
              style={dimStyle("neutral")}
            >
              <Pencil className="w-4 h-4" />
              編輯
            </button>
          )}
        </div>
      </div>

      {mutation.isError && (
        <div className="px-3 py-2 rounded-md text-[13px]" style={dimStyle("err")}>
          無法儲存變更。
        </div>
      )}

      {editing ? (
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full h-[600px] rounded-lg p-4 text-sm mono resize-y bg-surface-1 border border-line-2 text-ink-1 outline-none"
          spellCheck={false}
        />
      ) : (
        <Panel>
          <div className="prose prose-invert max-w-none">
            <MarkdownRenderer content={skill.content} />
          </div>
        </Panel>
      )}
    </div>
  );
}

function SkillsPageInner() {
  const searchParams = useSearchParams();
  const skillName = searchParams.get("name");
  const isViewing = !!skillName;

  const { data: listData } = useQuery<{ skills: SkillMeta[]; total: number }>({
    queryKey: ["skills-list"],
    queryFn: async () => {
      const res = await fetch("/api/wiki/skills");
      if (!res.ok) throw new Error("無法讀取技能列表");
      return res.json();
    },
    staleTime: 30_000,
    enabled: !isViewing,
  });

  const { data: detailData } = useQuery<SkillDetail>({
    queryKey: ["skill-detail", skillName],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/skills/${encodeURIComponent(skillName!)}`);
      if (!res.ok) throw new Error("無法讀取技能");
      return res.json();
    },
    enabled: isViewing,
  });

  if (isViewing && detailData) {
    return <SkillDetailView skill={detailData} />;
  }

  if (!isViewing && listData) {
    return <SkillsLanding skills={listData.skills} />;
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-sm text-ink-3">載入中…</div>
    </div>
  );
}

export default function SkillsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-ink-3">載入中…</div>
        </div>
      }
    >
      <SkillsPageInner />
    </Suspense>
  );
}

"use client";

// HERO: an interactive filament sculpture gives the present moment a spatial, living form.
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Download, RefreshCw, Pause, Play, RotateCcw, MoveUpRight, ArrowUpRight } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import theme from "@/components/awareness-theme.module.css";
import styles from "./awareness.module.css";

const AwarenessScene = dynamic(() => import("@/components/AwarenessScene"), { ssr: false });

// Keep the journal usable even if the optional 3D bundle cannot load.
class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

type Level = 0 | 1 | 2 | null;
type Dimension = "clarity" | "stability" | "tension";
type Draft = Record<Dimension, Level> & { note: string };
type Entry = Draft & { id: string; createdAt: string; updatedAt: string };
const EMPTY: Draft = { clarity: null, stability: null, tension: null, note: "" };
const DIMENSIONS: { key: Dimension; title: string; question: string; options: string[]; hint: string }[] = [
  { key: "clarity", title: "清楚度", question: "此刻的感受，清楚嗎？", options: ["模糊", "普通", "清楚"], hint: "看一眼周圍，再感受一下自己。" },
  { key: "stability", title: "安住度", question: "注意力停得住嗎？", options: ["飄移", "時穩時散", "穩定"], hint: "留意注意力現在在哪裡，不急著拉回來。" },
  { key: "tension", title: "鬆緊度", question: "身體與心裡，有多用力？", options: ["鬆開", "適中", "緊繃"], hint: "留意眉心、肩膀，或心裡催促自己的感覺。" },
];
const TZ = "Asia/Shanghai";
const DRAFT_KEY = "lifeos-self-awareness-draft-v1";
const day = (date: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
const timestamp = (date: string) => new Intl.DateTimeFormat("zh-TW", { timeZone: TZ, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(date));
const sortEntries = (entries: Entry[]) => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const label = (entry: Draft, dimension: typeof DIMENSIONS[number]) => entry[dimension.key] === null ? "尚不確定" : dimension.options[entry[dimension.key] as number];

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(path, { ...init, cache: "no-store", signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "操作沒有完成，請重試。");
    return data as T;
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.name === "AbortError")) {
      throw new Error("連線未完成。輸入已保留，請重試；同一筆記錄不會重複新增。");
    }
    throw error;
  } finally { clearTimeout(timer); }
}

function StateWords({ entry }: { entry: Draft }) {
  return <dl className={styles.stateWords}>{DIMENSIONS.map(d => <div key={d.key}>
    <dt>{d.title}</dt><dd>{label(entry, d)}</dd>
  </div>)}</dl>;
}

export default function AwarenessPage() {
  const [draft, setDraft] = useState<Draft>({ ...EMPTY });
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [period, setPeriod] = useState("all");
  const [view, setView] = useState<"now" | "history">("now");
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [activeDimension, setActiveDimension] = useState<Dimension>("clarity");
  const [paused, setPaused] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [sceneStatus, setSceneStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [visibleCount, setVisibleCount] = useState(20);
  const [discard, setDiscard] = useState<Entry | "reset" | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftWarning, setDraftWarning] = useState("");
  const [calendarNow, setCalendarNow] = useState(() => new Date());
  const clientId = useRef<string | null>(null);
  const pendingCreate = useRef(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const historyTitleRef = useRef<HTMLHeadingElement>(null);
  const discardTrigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        const validDraft = saved?.version === 1 && saved.draft && typeof saved.draft.note === "string" && saved.draft.note.length <= 1000 && DIMENSIONS.every(d => [null, 0, 1, 2].includes(saved.draft[d.key]));
        const validEdit = saved.editing === null || (saved.editing && typeof saved.editing.id === "string" && !Number.isNaN(Date.parse(saved.editing.createdAt)));
        if (validDraft && validEdit) {
          setDraft(saved.draft); setEditing(saved.editing); setNoteExpanded(!!saved.draft.note);
          clientId.current = typeof saved.clientId === "string" ? saved.clientId : null;
          pendingCreate.current = saved.pendingCreate === true && clientId.current !== null;
          setMessage("已恢復這個分頁尚未儲存的草稿，請確認它是否仍符合要記錄的片刻。");
        } else sessionStorage.removeItem(DRAFT_KEY);
      }
    } catch { setDraftWarning("此分頁無法恢復草稿，請重新確認輸入。"); }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    try {
      if (editing !== null || draft.note !== "" || DIMENSIONS.some(d => draft[d.key] !== null)) {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, draft, editing, clientId: clientId.current, pendingCreate: pendingCreate.current }));
      } else sessionStorage.removeItem(DRAFT_KEY);
    } catch { setDraftWarning("此分頁無法暫存草稿，離開前請先儲存記錄。"); }
  }, [draft, editing, draftReady, busy]);

  useEffect(() => {
    const refreshDate = () => setCalendarNow(new Date());
    window.addEventListener("focus", refreshDate);
    document.addEventListener("visibilitychange", refreshDate);
    return () => { window.removeEventListener("focus", refreshDate); document.removeEventListener("visibilitychange", refreshDate); };
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const data = await request<{ schemaVersion: number; entries: Entry[] }>("/api/self-awareness");
      if (data.schemaVersion !== 1 || !Array.isArray(data.entries)) throw new Error("記錄格式無法讀取，請保留資料並檢查服務。");
      setEntries(sortEntries(data.entries)); setLoaded(true);
    } catch (e) { setLoadError(e instanceof Error ? e.message : "記錄讀取失敗，請重試。"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);


  const hasContent = draft.note.trim().length > 0 || DIMENSIONS.some(d => draft[d.key] !== null);
  const dirty = editing !== null || draft.note !== "" || DIMENSIONS.some(d => draft[d.key] !== null);
  function change(next: Partial<Draft>) {
    setDraft(current => ({ ...current, ...next }));
    setError(""); setMessage("");
  }
  function reset() { setDraft({ ...EMPTY }); setEditing(null); clientId.current = null; pendingCreate.current = false; setError(""); }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current || !hasContent || !loaded || loadError) return;
    inFlight.current = true; setBusy(true); setError(""); setMessage("");
    clientId.current ??= crypto.randomUUID();
    try {
      // A timed-out POST may have committed. Reconcile its UUID before saving
      // a changed draft, updating that same record instead of creating a duplicate.
      let targetId = editing?.id;
      if (!editing && pendingCreate.current) {
        const journal = await request<{ entries: Entry[] }>("/api/self-awareness");
        targetId = journal.entries.find(entry => entry.id === clientId.current)?.id;
      }
      if (!targetId) pendingCreate.current = true;
      const data = await request<{ entry: Entry }>(targetId ? `/api/self-awareness/${targetId}` : "/api/self-awareness", {
        method: targetId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetId ? draft : { ...draft, clientId: clientId.current }),
      });
      setEntries(current => sortEntries([data.entry, ...current.filter(e => e.id !== data.entry.id)]));
      setMessage(editing ? "修改已儲存，保留原記錄時間。" : "這一刻已記下。下一次覺察可以重新開始。");
      reset();
    } catch (e) { setError(e instanceof Error ? e.message : "儲存失敗，輸入已保留。"); }
    finally { inFlight.current = false; setBusy(false); }
  }

  function beginEdit(entry: Entry) {
    setView("now"); setNoteExpanded(!!entry.note);
    setEditing(entry); setDraft({ clarity: entry.clarity, stability: entry.stability, tension: entry.tension, note: entry.note });
    clientId.current = null; pendingCreate.current = false; setMessage(""); setError(""); setDeleting(null);

  }

  useEffect(() => {
    if (editing && view === "now") {
      formRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
      formRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    }
  }, [editing, view]);

  function edit(entry: Entry) {
    if (dirty) openDiscard(entry); else beginEdit(entry);
  }

  function openDiscard(next: Entry | "reset") {
    discardTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDiscard(next);
  }
  function cancelDiscard() { setDiscard(null); discardTrigger.current?.focus(); }

  async function remove(id: string) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(""); setMessage("");
    try {
      try {
        await request(`/api/self-awareness/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" } });
      } catch (cause) {
        // A deleted record can return 404 on retry after a lost response.
        const journal = await request<{ entries: Entry[] }>("/api/self-awareness");
        if (journal.entries.some(entry => entry.id === id)) throw cause;
      }
      setEntries(current => current.filter(e => e.id !== id)); setDeleting(null);
      if (editing?.id === id) reset();
      setMessage("記錄已刪除。");
      historyTitleRef.current?.focus({ preventScroll: true });
    } catch (e) { setError(e instanceof Error ? e.message : "刪除未完成，請重試。"); }
    finally { inFlight.current = false; setBusy(false); }
  }

  async function exportEntries() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      // Fetch all records afresh so another open tab's saves are included.
      const data = await request<{ schemaVersion: number; entries: Entry[] }>("/api/self-awareness");
      const file = { ...data, timeZone: TZ, exportedAt: new Date().toISOString(), dimensions: Object.fromEntries(DIMENSIONS.map(d => [d.key, { name: d.title, values: d.options, unknown: null }])) };
      const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json;charset=utf-8" }));
      const a = document.createElement("a"); a.href = url; a.download = `自我覺察-${day(new Date())}.json`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage("已匯出全部紀錄，包含時間與三個維度的文字對照。");
    } catch (e) { setError(e instanceof Error ? e.message : "匯出未完成，請重試。"); }
    finally { inFlight.current = false; setBusy(false); }
  }

  const today = day(calendarNow);
  const weekStart = day(new Date(calendarNow.getTime() - 6 * 86400000));
  const filtered = entries.filter(e => period === "all" || (period === "today" ? day(e.createdAt) === today : day(e.createdAt) >= weekStart));
  return <div className={`${theme.theme} ${styles.surface}`} lang="zh-Hant" data-awareness-page>
    <div className={styles.page}>
      {discard && <div className={styles.dialogBackdrop}><section className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="discard-title" aria-describedby="discard-description" onKeyDown={event => {
        if (event.key === "Escape") cancelDiscard();
        if (event.key === "Tab") { const buttons = event.currentTarget.querySelectorAll("button"); const first = buttons[0]; const last = buttons[buttons.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
      }}><h2 id="discard-title">放棄目前的草稿？</h2><p id="discard-description">尚未儲存的輸入將被清除，已儲存的記錄會保留。</p><div className={styles.formActions}><button autoFocus className={styles.primary} onClick={cancelDiscard}>保留草稿</button><button className={styles.secondary} onClick={() => { const next = discard; setDiscard(null); if (next === "reset") { reset(); setMessage(""); formRef.current?.querySelector("input")?.focus(); } else beginEdit(next); }}>放棄草稿</button></div></section></div>}

      <div className={styles.pageHeading}>
        <p className={styles.eyebrow}><span /> 內在空間 <i>/</i> 自我覺察</p>
        <span className={styles.edition}>留一點空間，感受自己</span>
      </div>
      <div className={styles.spread}>
        <section className={styles.stage} aria-label="當下的三維感知場">
          <div className={styles.scene} data-scene-status={sceneStatus}>
            <SceneBoundary onError={() => setSceneStatus("fallback")}><AwarenessScene values={draft} activeDimension={activeDimension} onSelectDimension={setActiveDimension} paused={paused} resetToken={resetToken} onStatusChange={setSceneStatus} /></SceneBoundary>
          </div>
          <span className={styles.touchHint}>橫向拖曳旋轉</span>
          <header className={styles.intro}>
            <h1>回到<span>此刻。</span></h1>
            <p className={styles.lead}>給感受一點空間，<br />看見正在發生的自己。</p>
          </header>
          {sceneStatus !== "ready" && <div className={styles.sceneFallback} role="status"><div className={styles.fallbackOrbit} aria-hidden="true" /><p>{sceneStatus === "loading" ? "感知場正在展開…" : "此裝置無法呈現 3D，仍可記下此刻。"}</p></div>}
          <div className={styles.sceneLabel}><span className={styles.tinyLabel}>當下的感知場</span><p>形隨心動</p><span>依你選擇的感受生成，並非身心測量。</span></div>
          <div className={styles.sceneControls}>
            <span className={styles.dragHint}><MoveUpRight size={13} /> 拖曳旋轉 · 滾輪縮放</span>
            <button type="button" disabled={sceneStatus !== "ready"} aria-label={paused ? "播放場景動畫" : "暫停場景動畫"} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>
            <button type="button" disabled={sceneStatus !== "ready"} aria-label="重設場景視角" onClick={() => setResetToken(value => value + 1)}><RotateCcw size={15} /></button>
          </div>
          <div className={styles.dimensionDock} role="group" aria-label="選擇觀察維度">
            {DIMENSIONS.map((dimension, index) => <button type="button" key={dimension.key} data-dimension={dimension.key} aria-pressed={activeDimension === dimension.key} onClick={() => setActiveDimension(dimension.key)}><span className={styles.dockIndex}>0{index + 1}</span><span><strong>{dimension.title}</strong><small>{label(draft, dimension)}</small></span><i aria-hidden="true" /></button>)}
          </div>
        </section>

        <div className={styles.journal}>
          <div className={styles.viewNav} role="group" aria-label="覺察內容">
            <button type="button" aria-pressed={view === "now"} onClick={() => setView("now")}>此刻</button>
            <button type="button" aria-pressed={view === "history"} onClick={() => setView("history")}>回顧</button>
            <span className={styles.panelDot} aria-hidden="true" />
          </div>

          {view === "now" && <section className={styles.capture} aria-label="記錄此刻">
            <div className={styles.panelHeading}><p className={styles.tinyLabel}>與自己相遇</p><h2>現在，你怎麼樣？</h2><p>不用調整自己，先感受就好。</p></div>
            {editing && <div className={styles.editingNotice}>正在編輯 {timestamp(editing.createdAt)} 的記錄 · 上海時間</div>}
            <form ref={formRef} onSubmit={save} className={styles.form}>
              {DIMENSIONS.map(d => <fieldset key={d.key} disabled={busy} className={`${styles.dimension} ${activeDimension === d.key ? styles.activeDimension : ""}`} onFocus={() => setActiveDimension(d.key)}>
                <legend><span aria-hidden="true">0{DIMENSIONS.indexOf(d) + 1}</span>{d.title}</legend><p id={`${d.key}-hint`}>{d.question}</p>
                <div className={styles.options} role="radiogroup" aria-label={d.title} aria-describedby={`${d.key}-hint`}>
                  {d.options.map((option, index) => <label key={option} className={styles.option}>
                    <input type="radio" name={d.key} value={index} checked={draft[d.key] === index} onChange={() => { setActiveDimension(d.key); change({ [d.key]: index as Level }); }} />
                    <span><i aria-hidden="true" />{option}</span>
                  </label>)}
                  <label className={`${styles.option} ${styles.unknown}`}><input type="radio" name={d.key} value="unknown" checked={draft[d.key] === null} onChange={() => { setActiveDimension(d.key); change({ [d.key]: null }); }} /><span>尚不確定</span></label>
                </div>
              </fieldset>)}
              <details className={styles.note} open={noteExpanded} onToggle={event => setNoteExpanded(event.currentTarget.open)}>
                <summary>補一句情境 <span>{draft.note ? "已有內容" : "選填"}</span></summary>
                <label className={styles.srOnly} htmlFor="awareness-note">當下的情境</label>
                <textarea id="awareness-note" value={draft.note} disabled={busy} maxLength={1000} rows={3} onChange={e => change({ note: e.target.value })} placeholder="剛才在做什麼？有什麼想留給自己？" />
                {draft.note.length >= 800 && <span className={styles.count}>{draft.note.length} / 1000</span>}
              </details>
              <div className={styles.formActions}>
                <button type="submit" className={styles.primary} disabled={busy || !hasContent || !loaded || loading || !!loadError}>{busy ? "正在儲存…" : editing ? "儲存修改" : "記下此刻"}<ArrowUpRight size={16} /></button>
                {dirty && <button type="button" className={styles.textButton} disabled={busy} onClick={() => openDiscard("reset")}>{editing ? "取消編輯" : "清空草稿"}</button>}
                <span className={styles.draftHint}>{dirty ? "草稿暫存在此分頁" : "可以只記一項，或一句話"}</span>
              </div>
              {draftWarning && <p className={styles.error} role="alert">{draftWarning}</p>}
            </form>
            <details className={styles.guide}><summary>怎麼觀察這三個感受？</summary><div>
              {DIMENSIONS.map(d => <p key={d.key}><strong>{d.title}</strong>{d.hint}</p>)}
              <p className={styles.boundary}>這是主觀感受的記錄，沒有總分，不用來判定健康狀況或修行程度。</p>
            </div></details>
          </section>}

          {view === "history" && <section className={styles.history} aria-labelledby="history-title">
            <div className={styles.historyHeader}><h2 id="history-title" ref={historyTitleRef} tabIndex={-1}>回看自己的片刻</h2><div className={styles.tools}>
              <button className={styles.secondary} onClick={() => void load()} disabled={busy || loading}><RefreshCw size={14} />重新整理</button>
              <button className={styles.secondary} onClick={() => void exportEntries()} disabled={busy || loading || !loaded || !!loadError || entries.length === 0}><Download size={14} />匯出全部</button>
            </div></div>
            <div className={styles.filters}><div role="group" aria-label="記錄範圍">{[["today", "今天"], ["week", "近七天"], ["all", "全部"]].map(([value, text]) => <button key={value} aria-pressed={period === value} onClick={() => { setPeriod(value); setVisibleCount(20); setCalendarNow(new Date()); }}>{text}</button>)}</div><span>上海時間（UTC+8）</span></div>
            {loading ? <div className={styles.empty}>正在讀取記錄…</div> : loadError ? <div className={styles.empty}>暫時無法讀取，請再試一次。</div> : filtered.length === 0 ? <div className={styles.empty}><p>{entries.length ? "這段時間還沒有記錄。" : "還沒有記錄。"}</p><button className={styles.textButton} onClick={() => setView("now")}>回到此刻</button></div> : <ol className={styles.entries}>
              {filtered.slice(0, visibleCount).map(entry => <li key={entry.id} className={styles.entry}>
                <div className={styles.entryHead}><div><time dateTime={entry.createdAt}>{new Intl.DateTimeFormat("zh-TW", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(entry.createdAt))}</time>{entry.updatedAt !== entry.createdAt && <span className={styles.edited}>已編輯</span>}</div><div className={styles.entryActions}><button disabled={busy} onClick={() => edit(entry)} aria-label={`編輯 ${timestamp(entry.createdAt)} 的記錄`}>編輯</button><button disabled={busy} onClick={() => setDeleting(deleting === entry.id ? null : entry.id)} aria-label={`刪除 ${timestamp(entry.createdAt)} 的記錄`}>刪除</button></div></div>
                <StateWords entry={entry} />{entry.note && <p className={styles.entryNote}>{entry.note}</p>}
                {deleting === entry.id && <div className={styles.confirm} role="group" aria-label="確認刪除"><p>確定刪除這筆記錄？刪除後無法復原。</p><button disabled={busy} className={styles.secondary} onClick={() => setDeleting(null)}>保留</button><button disabled={busy} className={styles.danger} onClick={() => void remove(entry.id)}>確定刪除</button></div>}
              </li>)}
            </ol>}
            {filtered.length > visibleCount && <button className={styles.secondary} onClick={() => setVisibleCount(n => n + 20)}>顯示更多記錄</button>}
          </section>}

          <div className={styles.feedback} aria-live="polite" role="status">{message}</div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {loadError && <div className={styles.error} role="alert"><p>未能讀取記錄：{loadError}</p><button className={styles.secondary} disabled={busy || loading} onClick={() => void load()}>重新讀取</button></div>}
        </div>
      </div>
      <section className={styles.practiceBridge} aria-labelledby="practice-bridge-title">
        <div><p className={styles.tinyLabel}>從覺察，到一個小小的選擇</p><h2 id="practice-bridge-title">留一點空間，試一種練習。</h2><p>也可以先不做什麼。若想試試，從熟悉、舒服的方法開始，再回來看看感受。</p></div>
        <div className={styles.practiceBridgeLinks}>
          <Link href="/practices?method=P01">自然呼吸覺察<ArrowUpRight size={14} /></Link>
          <Link href="/practices?method=P03">舒適躺休<ArrowUpRight size={14} /></Link>
          <Link href="/practices?method=P04">覺察步行<ArrowUpRight size={14} /></Link>
          <Link href="/practices?access=self" className={styles.practiceLibraryLink}>瀏覽練習與實踐<ArrowUpRight size={15} /></Link>
        </div>
      </section>
      <footer className={styles.footer}><span><i /> 手動記錄 · 本機保存</span><p>不必成為什麼，先在這裡。</p><span className={styles.techCredit}>三維互動 · 當下覺察</span></footer>
    </div>
  </div>;
}

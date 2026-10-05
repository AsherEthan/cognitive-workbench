"use client";

// HERO: three quiet contour rings carry the language of awareness into a reading library.
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, BookOpen, Check, ChevronDown, Download, ExternalLink, Leaf, Search, Share2, SlidersHorizontal, X } from "lucide-react";
import { practices, practiceSources } from "@/lib/practices/catalog";
import { ACCESS_LABELS, DIMENSION_LABELS, KIND_LABELS, TRADITION_LABELS, type Practice, type PracticeAccess, type PracticeKind, type PracticeTradition } from "@/lib/practices/types";
import theme from "@/components/awareness-theme.module.css";
import { downloadJson, PracticeMarkdown, PracticeTimer, ReaderDialog, safeExternalUrl } from "./PracticeReader";
import { PracticeAudioGuide } from "./PracticeAudioGuide";
import { PracticePathways } from "./PracticePathways";
import { getPracticePathIds, parsePracticePath, PRACTICE_PATH_BY_ID, PRACTICE_PATHWAYS, type PracticePathId } from "@/lib/practices/pathways";
import { practicePathMap } from "@/lib/practices/pathway-map";
import { ScriptureStudyReader } from "./ScriptureStudyReader";
import styles from "./practices.module.css";
import { PracticeVisualField, PracticeDetailVisual, PracticeCardVisual } from "./PracticeVisuals";

const FAVORITES_KEY = "lifeos-practice-library-favorites-v1";
const PAGE_SIZE = 24;
const SELF_READING_IDS = new Set(["P01", "P02", "P03", "P04", "P05", "P06"]);
const PRACTICE_IDS = new Set(practices.map(practice => practice.id));
const PRACTICE_BY_ID = new Map(practices.map(practice => [practice.id, practice]));
const SOURCE_BY_ID = new Map(practiceSources.map(source => [source.id, source]));
const normalizeSearch = (text: string) => text.normalize("NFKC").toLocaleLowerCase("zh-TW");
const SEARCH_CONTENT = new Map(practices.map(practice => [practice.id, normalizeSearch([
  practice.id, practice.title, ...practice.aliases, practice.summary, practice.content,
  practice.recitation?.text ?? "", practice.recitation?.version ?? "",
  ...(practice.references ?? []).map(reference => `${reference.title} ${reference.note ?? ""}`),
  practice.study?.sanskrit.iast ?? "", practice.study?.sanskrit.devanagari ?? "", practice.study?.sanskrit.note ?? "",
  practice.study?.pronunciation.text ?? "", practice.study?.pronunciation.chineseApproximation ?? "",
  practice.study?.annotation.overview ?? "", practice.study?.annotation.note ?? "",
  ...(practice.study?.annotation.passages ?? []).map(passage => `${passage.label} ${passage.original ?? ""} ${passage.reading ?? ""} ${passage.meaning}`),
  ...(practice.study?.annotation.terms ?? []).map(term => `${term.term} ${term.meaning}`),
  practice.scripturePurpose?.summary ?? "", practice.scripturePurpose?.intention ?? "", practice.scripturePurpose?.context ?? "",
  ...(practice.scripturePurpose?.traditionalUses ?? []).map(use => `${use.label} ${use.description}`),
  ...practice.traditions.map(tradition => TRADITION_LABELS[tradition]), ACCESS_LABELS[practice.access], KIND_LABELS[practice.kind],
  ...getPracticePathIds(practice.id).map(id => PRACTICE_PATH_BY_ID.get(id)?.title ?? ""),
].join(" "))]));
const SELF_NOTICE = "先讀完做法與限制，再決定要不要短試。保持自然呼吸；若感到不舒服，可以隨時停下、睜眼或換個姿勢。";

function parseFavorites(raw: string | null): string[] {
  if (raw === null) return [];
  const saved: unknown = JSON.parse(raw);
  if (typeof saved !== "object" || saved === null || !("version" in saved) || saved.version !== 1 || !("ids" in saved)
    || !Array.isArray(saved.ids) || !saved.ids.every(id => typeof id === "string")) throw new Error("invalid favorites");
  return [...new Set(saved.ids.filter(id => PRACTICE_IDS.has(id)))];
}

function AccessTag({ practice }: { practice: Practice }) {
  return <span className={`${styles.accessTag} ${practice.access === "self" ? styles.selfTag : practice.access === "teacher" ? styles.teacherTag : styles.referenceTag}`}>
    {practice.kind === "candidate" ? "待核查線索" : practice.kind === "classification" ? "分類索引" : ACCESS_LABELS[practice.access]}
  </span>;
}

function ScriptureContent({ practice }: { practice: Practice }) {
  if (!practice.scripture) return null;
  const item = practice.scripture;
  const status = { confirmed: "名稱可對照", family: "集合或法門名稱", uncertain: "對應版本待核" }[item.identificationStatus];
  const recitation = practice.recitation;
  const textSource = recitation?.referenceUrl ? safeExternalUrl(recitation.referenceUrl) : undefined;
  return <section className={styles.scriptureSection} aria-labelledby="scripture-content-title">
    <div className={styles.scriptureMeta}><span>{status}</span></div>
    <h3 id="scripture-content-title">{practice.study ? "經咒閱讀與理解" : recitation?.text ? "念誦文字" : "正文與法本"}</h3>
    {item.canonicalName && item.canonicalName !== item.originalName && <p className={styles.scriptureVersion}>對照名稱：{item.canonicalName}</p>}
    {practice.study ? <ScriptureStudyReader key={practice.id} practice={practice} /> : recitation?.text ? <>
      <p className={styles.scriptureVersion}>{recitation.language} · {recitation.version}</p>
      <div className={styles.recitationText}><p lang={recitation.language === "藏文原文" ? "bo" : undefined}>{recitation.text}</p></div>
      {textSource && <a className={styles.subtleButton} href={textSource} target="_blank" rel="noopener noreferrer">核對這份原文<ExternalLink size={14} /></a>}
    </> : <p className={styles.scriptureVersion}>{recitation?.version || "依下列原典與法本入口查閱，具體版本仍待核對。"}</p>}
    {!!practice.references?.length && <div className={styles.scriptureReferences}>{practice.references.map((reference, index) => {
      const url = safeExternalUrl(reference.url);
      return url ? <a key={`${url}-${index}`} href={url} target="_blank" rel="noopener noreferrer"><span>{reference.title}{reference.note && <small>{reference.note}</small>}</span><ArrowUpRight size={16} /></a> : null;
    })}</div>}
  </section>;
}

function FavoriteButton({ practice, saved, ready, toggle, compact = false }: {
  practice: Practice; saved: boolean; ready: boolean; toggle: (id: string) => void; compact?: boolean;
}) {
  return <button type="button" data-sensitive="true" className={compact ? styles.bookmarkButton : styles.subtleButton}
    aria-label={`${saved ? "取消收藏" : "收藏"}：${practice.title}`} aria-pressed={saved} disabled={!ready}
    title={saved ? "取消收藏" : "收藏"} onClick={() => toggle(practice.id)}>
    <Bookmark size={17} strokeWidth={1.5} fill={saved ? "currentColor" : "none"} />{!compact && (saved ? "已收藏" : "收藏")}
  </button>;
}

function PracticeCard({ practice, saved, ready, toggle, open }: {
  practice: Practice; saved: boolean; ready: boolean; toggle: (id: string) => void; open: (id: string) => void;
}) {
  return <article className={styles.card}>
    <div className={styles.cardTop}><span className={styles.recordId}>{practice.id}</span><AccessTag practice={practice} />
      <FavoriteButton practice={practice} saved={saved} ready={ready} toggle={toggle} compact />
    </div>
    <PracticeCardVisual practice={practice} open={open} />
    <h3><button type="button" onClick={() => open(practice.id)}>{practice.title}</button></h3>
    <p className={styles.cardSummary}>{practice.summary}</p>
    <div className={styles.cardTraditions}>{practice.traditions.map(tradition => <span key={tradition}>{TRADITION_LABELS[tradition]}</span>)}</div>
    <div className={styles.cardPaths}>{getPracticePathIds(practice.id).map(id => <span key={id}>{PRACTICE_PATH_BY_ID.get(id)?.title}</span>)}</div>
    <div className={styles.cardBottom}>
      <span>{practice.kind !== "method" ? KIND_LABELS[practice.kind] : practice.duration || "時間依方法而定"}</span>
      <button type="button" onClick={() => open(practice.id)} aria-label={`閱讀${practice.kind === "recitation" ? "經咒" : practice.kind === "method" ? "方法" : "資料"}：${practice.title}`}>
        {practice.kind === "recitation" ? "閱讀經咒" : practice.access === "teacher" ? "了解學習路線" : practice.kind === "method" ? "閱讀方法" : "查看資料"}<ArrowUpRight size={15} strokeWidth={1.5} />
      </button>
    </div>
  </article>;
}

function PracticeDetail({ practice, saved, favoritesReady, toggleFavorite, openMethod, close, returnFocus }: {
  practice: Practice; saved: boolean; favoritesReady: boolean; toggleFavorite: (id: string) => void;
  openMethod: (id: string) => void; close: () => void; returnFocus: HTMLElement | null;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  const [shareMessage, setShareMessage] = useState("");
  const [shareFallback, setShareFallback] = useState("");
  const source = practice.sourcePageId ? SOURCE_BY_ID.get(practice.sourcePageId) : undefined;
  const sourceUrl = safeExternalUrl(practice.sourceUrl);
  const selfReading = SELF_READING_IDS.has(practice.id) && practice.access === "self" && practice.kind === "method";
  const related = practice.relatedIds.map(id => PRACTICE_BY_ID.get(id)).filter((item): item is Practice => !!item);
  useEffect(() => {
    setShareMessage(""); setShareFallback("");
    title.current?.closest("dialog")?.scrollTo({ top: 0, behavior: "auto" });
    title.current?.focus({ preventScroll: true });
  }, [practice.id]);
  async function share() {
    const url = new URL(window.location.href);
    url.searchParams.set("method", practice.id);
    try { await navigator.clipboard.writeText(url.href); setShareMessage("連結已複製。"); setShareFallback(""); }
    catch { setShareMessage("可選取下方連結，自行複製。"); setShareFallback(url.href); }
  }
  return <ReaderDialog titleId="practice-title" onClose={close} returnFocus={returnFocus}>
    <div className={styles.readerTopbar}>
      <button type="button" className={styles.subtleButton} onClick={close}><ArrowLeft size={16} />返回練習與實踐</button>
      <span className={styles.readerRecord}>{practice.id}</span>
      <button type="button" className={styles.iconButton} aria-label="關閉方法詳情" onClick={close}><X size={20} /></button>
    </div>
    <div className={styles.readerInner}>
      <header className={styles.readerHeader}>
        <div className={styles.readerTags}><AccessTag practice={practice} />{practice.traditions.map(tradition => <span key={tradition}>{TRADITION_LABELS[tradition]}</span>)}</div>
        <h2 id="practice-title" ref={title} tabIndex={-1} data-reader-title>{practice.title}</h2>
        {!practice.scripture && practice.aliases.length > 0 && <p className={styles.aliases}>{practice.aliases.join(" · ")}</p>}
        <p className={styles.readerSummary}>{practice.summary}</p>
        <div className={styles.readerActions}>
          <FavoriteButton practice={practice} saved={saved} ready={favoritesReady} toggle={toggleFavorite} />
          <button type="button" className={styles.subtleButton} onClick={share}><Share2 size={16} />複製{practice.kind === "recitation" ? "經咒" : "方法"}連結</button>
          {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.subtleButton}><ExternalLink size={15} />{practice.scripture ? "開啟原典與法本" : "開啟調研來源"}</a>}
        </div>
        {shareMessage && <p className={styles.inlineMessage} role="status">{shareMessage}</p>}
        {shareFallback && <input className={styles.shareInput} aria-label="可複製的方法連結" readOnly value={shareFallback} onFocus={event => event.target.select()} />}
      </header>
      <div className={styles.readerGrid}>
        <div className={styles.readingColumn}>
          <PracticeDetailVisual key={practice.id} practice={practice} />
          <ScriptureContent practice={practice} />
          <PracticeAudioGuide practice={practice} />
          <div className={`${styles.readingNote} ${selfReading ? styles.gentleNote : ""}`}>
            <span>{selfReading ? "閱讀式練習" : practice.kind === "recitation" ? "經咒閱讀與學習" : practice.access === "teacher" ? "正式學習路線" : practice.kind === "candidate" ? "待核查，先保留問題" : practice.kind === "classification" || practice.access === "reference" ? "背景與分類資料" : "先了解公開引導"}</span>
            <p>{selfReading ? SELF_NOTICE : practice.kind === "recitation" ? "閱讀時留意所列譯本與傳承。實修所需的口傳、許可或儀軌條件，依相應教學確認；可以先從了解文字開始。" : practice.access === "teacher" ? "這裡整理原意、限制與學習來源。深入操作需要合適教師與相應傳承，請先了解完整學習條件。" : practice.kind !== "method" || practice.access === "reference" ? "這筆是分類、版本關係或待確認的研究線索，不作為直接操作指引。" : "先閱讀來源中的完整引導與限制，確認適合自己的版本。這裡不推定你的身體狀態或練習經驗。"}</p>
          </div>
          <section className={styles.fullContent} aria-label="完整方法與研究紀錄"><PracticeMarkdown content={practice.content} /></section>
          {source && <details className={styles.sourceDisclosure}>
            <summary><BookOpen size={17} />展開所屬調研原文<ChevronDown size={16} /></summary>
            <div className={styles.sourceOriginal}>
              <p className={styles.sourceOriginalTitle}>{source.title}</p>
              <PracticeMarkdown content={source.markdown} />
            </div>
          </details>}
          {related.length > 0 && <section className={styles.relatedSection} aria-labelledby="related-title">
            <h3 id="related-title">相關方法與版本</h3>
            <p>保留傳統與版本的差異，方便相互對照。</p>
            <div className={styles.relatedList}>{related.map(item => <button type="button" key={item.id} onClick={() => openMethod(item.id)}>
              <span><small>{item.id} · {KIND_LABELS[item.kind]}</small>{item.title}</span><ArrowRight size={17} />
            </button>)}</div>
          </section>}
        </div>
        <aside className={styles.readingAside}>
          <div className={styles.detailPaths}><span className={styles.smallLabel}>實踐方向</span><div>{getPracticePathIds(practice.id).map(id => <span key={id}>{PRACTICE_PATH_BY_ID.get(id)?.title}</span>)}</div></div>
          <div className={styles.methodFacts}>
            <span className={styles.smallLabel}>閱讀提示</span>
            <dl><div><dt>條目類型</dt><dd>{KIND_LABELS[practice.kind]}</dd></div><div><dt>接近方式</dt><dd>{ACCESS_LABELS[practice.access]}</dd></div>
              <div><dt>時間資訊</dt><dd>{practice.duration || "依原文與學習階段而定"}</dd></div></dl>
          </div>
          {practice.observations.length > 0 && <div className={styles.observationNote}>
            <span className={styles.smallLabel}>可以留意的感受</span>
            <div>{practice.observations.map(dimension => <span key={dimension}>{DIMENSION_LABELS[dimension]}</span>)}</div>
            <p>只是觀察的角度，不是預測效果，也不是能量或健康測量。感受不確定時，就保留不確定。</p>
            <Link href="/awareness">回到自我覺察<ArrowUpRight size={14} /></Link>
          </div>}
          {selfReading && <PracticeTimer key={practice.id} />}
          <div className={styles.sourceCredit}><span className={styles.smallLabel}>收錄來源</span><p>{practice.sourceTitle}</p>
            {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{practice.scripture ? "閱讀原典與法本" : "閱讀調研頁"}<ExternalLink size={13} /></a>}
          </div>
        </aside>
      </div>
    </div>
  </ReaderDialog>;
}

function SourceLibrary({ close, returnFocus, downloadAll, exportMessage }: { close: () => void; returnFocus: HTMLElement | null; downloadAll: () => void; exportMessage: string }) {
  const [sourceId, setSourceId] = useState(practiceSources[0]?.id ?? "");
  const [downloadMessage, setDownloadMessage] = useState("");
  const source = SOURCE_BY_ID.get(sourceId);
  const sourceHref = source ? safeExternalUrl(source.url) : undefined;
  const title = useRef<HTMLHeadingElement>(null);
  function downloadSource() {
    if (!source) return;
    const success = downloadJson(source, `lifeos-practice-source-${practiceSources.findIndex(item => item.id === sourceId) + 1}.json`);
    setDownloadMessage(success ? "已交給瀏覽器下載。" : "無法啟動下載，請稍後再試。");
  }
  function selectSource(id: string) { setSourceId(id); setDownloadMessage(""); }
  return <ReaderDialog titleId="sources-title" onClose={close} returnFocus={returnFocus}>
    <div className={styles.readerTopbar}>
      <button type="button" className={styles.subtleButton} onClick={close}><ArrowLeft size={16} />返回練習與實踐</button>
      <span className={styles.readerRecord}>{practiceSources.length} 份原文</span>
      <button type="button" className={styles.iconButton} onClick={close} aria-label="關閉調研原文"><X size={20} /></button>
    </div>
    <div className={styles.readerInner}>
      <header className={styles.readerHeader}><p className={styles.smallLabel}>保留來處，也保留差異</p><h2 id="sources-title" ref={title} tabIndex={-1} data-reader-title>調研原文</h2>
        <p className={styles.readerSummary}>完整閱讀各份資料，對照來源、版本與尚待確認的內容。下載會保留原文及結構化條目。</p>
        <button type="button" className={styles.subtleButton} onClick={downloadAll}><Download size={16} />匯出完整資料庫</button>
        {exportMessage && <p className={styles.inlineMessage} role="status">{exportMessage}</p>}
      </header>
      <div className={styles.sourcesGrid}>
        <nav className={styles.sourceNav} aria-label="選擇調研原文">{practiceSources.map((item, index) => <button type="button" key={item.id} aria-current={sourceId === item.id ? "page" : undefined} onClick={() => selectSource(item.id)}>
          <small>{String(index + 1).padStart(2, "0")}</small><span>{item.title}</span><ArrowRight size={15} />
        </button>)}</nav>
        <section className={styles.sourceReading} aria-label="目前選擇的調研原文">
          {source ? <><div className={styles.sourceToolbar}>
            <h3>{source.title}</h3><div><button type="button" className={styles.subtleButton} onClick={downloadSource}><Download size={15} />下載這份原文</button>
              {sourceHref && <a className={styles.subtleButton} href={sourceHref} target="_blank" rel="noopener noreferrer">開啟來源<ExternalLink size={14} /></a>}</div>
          </div><p className={styles.inlineMessage} role="status">{downloadMessage}</p><PracticeMarkdown content={source.markdown} /></> : <p>尚無可閱讀的調研原文。</p>}
        </section>
      </div>
    </div>
  </ReaderDialog>;
}

function PracticesLibrary() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const methodId = searchParams.get("method");
  const selected = methodId ? PRACTICE_BY_ID.get(methodId) : undefined;
  const accessParam = searchParams.get("access");
  const initialAccess = accessParam && Object.prototype.hasOwnProperty.call(ACCESS_LABELS, accessParam) ? accessParam as PracticeAccess : "all";
  const kindParam = searchParams.get("kind");
  const initialKind = kindParam && Object.prototype.hasOwnProperty.call(KIND_LABELS, kindParam) ? kindParam as PracticeKind : "all";
  const initialPath = parsePracticePath(searchParams.get("path"));
  const [query, setQuery] = useState("");
  const [tradition, setTradition] = useState<PracticeTradition | "all">("all");
  const [access, setAccess] = useState<PracticeAccess | "all">(initialAccess);
  const [kind, setKind] = useState<PracticeKind | "all">(initialKind);
  const [path, setPath] = useState<PracticePathId | "all">(initialPath);
  const [savedOnly, setSavedOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showSources, setShowSources] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const openingTrigger = useRef<HTMLElement | null>(null);
  const sourceTrigger = useRef<HTMLElement | null>(null);
  const openedFromLibrary = useRef(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const resultTitle = useRef<HTMLHeadingElement>(null);

  useEffect(() => { setAccess(initialAccess); }, [initialAccess]);
  useEffect(() => { setKind(initialKind); }, [initialKind]);
  useEffect(() => { setPath(initialPath); }, [initialPath]);
  useEffect(() => {
    try { setFavorites(parseFavorites(window.localStorage.getItem(FAVORITES_KEY))); }
    catch { setStorageWarning("此瀏覽器的收藏暫時無法讀取。你仍可瀏覽，原有資料不會被自動清除。"); }
    setFavoritesReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== FAVORITES_KEY && event.key !== null) return;
      try { setFavorites(parseFavorites(window.localStorage.getItem(FAVORITES_KEY))); setStorageWarning(""); }
      catch { setStorageWarning("收藏同步未完成；目前畫面保留本次的選擇。"); }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query, tradition, access, kind, savedOnly, path]);
  useEffect(() => { if (!methodId) openedFromLibrary.current = false; }, [methodId]);

  function toggleFavorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter(item => item !== id) : [...favorites, id];
    setFavorites(next);
    try { window.localStorage.setItem(FAVORITES_KEY, JSON.stringify({ version: 1, ids: next })); setStorageWarning(""); }
    catch { setStorageWarning("此瀏覽器無法儲存收藏；本次選擇仍保留在畫面，重新整理後可能消失。"); }
  }
  // These query changes only select local records; preserve history without a route fetch.
  function setPathFilter(next: PracticePathId | "all") {
    setPath(next); setQuery(""); setTradition("all"); setKind("all"); setAccess("all"); setSavedOnly(false);
    const params = new URLSearchParams(searchParams.toString()); params.delete("access"); params.delete("kind");
    if (next === "all") params.delete("path"); else params.set("path", next);
    window.history.replaceState(null, "", `${pathname}${params.size ? `?${params}` : ""}`);
  }
  function setAccessFilter(next: PracticeAccess | "all") {
    setAccess(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("access"); else params.set("access", next);
    window.history.replaceState(null, "", `${pathname}${params.size ? `?${params}` : ""}`);
  }
  function setKindFilter(next: PracticeKind | "all") {
    setKind(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("kind"); else params.set("kind", next);
    window.history.replaceState(null, "", `${pathname}${params.size ? `?${params}` : ""}`);
  }
  function clearFilters() {
    setQuery(""); setTradition("all"); setKind("all"); setSavedOnly(false); setAccess("all"); setPath("all");
    const params = new URLSearchParams(searchParams.toString()); params.delete("access"); params.delete("kind"); params.delete("path");
    window.history.replaceState(null, "", `${pathname}${params.size ? `?${params}` : ""}`);
  }
  function browseScriptures() {
    setQuery(""); setTradition("all"); setSavedOnly(false); setAccess("all"); setKind("recitation"); setPath("all");
    const params = new URLSearchParams(searchParams.toString()); params.delete("access"); params.delete("path"); params.set("kind", "recitation");
    window.history.replaceState(null, "", `${pathname}?${params}`);
  }
  function openMethod(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("method", id);
    if (!methodId) {
      openingTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : searchInput.current;
      openedFromLibrary.current = true;
      window.history.pushState(null, "", `${pathname}?${params}`);
    } else window.history.replaceState(null, "", `${pathname}?${params}`);
  }
  function closeMethod() {
    if (openedFromLibrary.current) { openedFromLibrary.current = false; window.history.back(); }
    else {
      const params = new URLSearchParams(searchParams.toString()); params.delete("method");
      window.history.replaceState(null, "", `${pathname}${params.size ? `?${params}` : ""}`);
    }
  }
  function openSources() {
    sourceTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : searchInput.current;
    setShowSources(true);
  }
  function exportAll() {
    const success = downloadJson({ schemaVersion: 1, exportedAt: new Date().toISOString(), note: "條目包含方法版本、分類與待核查線索；法門可交叉分類。", practices, sources: practiceSources, classification: { pathways: PRACTICE_PATHWAYS, assignments: practicePathMap } }, "lifeos-practice-library.json");
    setExportMessage(success ? "完整資料已交給瀏覽器下載。" : "無法啟動下載，請稍後再試。");
  }
  const favoriteIds = useMemo(() => new Set(favorites), [favorites]);
  const filtered = useMemo(() => {
    const terms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
    const matches = practices.filter(practice => (tradition === "all" || practice.traditions.includes(tradition))
      && (path === "all" || getPracticePathIds(practice.id).includes(path))
      && (access === "all" || practice.access === access) && (kind === "all" || practice.kind === kind)
      && (!savedOnly || favoriteIds.has(practice.id)) && terms.every(term => SEARCH_CONTENT.get(practice.id)?.includes(term)));
    if (terms.length === 0) return matches;
    const exact = normalizeSearch(query).trim();
    const rank = (practice: Practice) => {
      if (normalizeSearch(practice.id) === exact) return 0;
      const heading = normalizeSearch([practice.title, ...practice.aliases].join(" "));
      return terms.some(term => heading.includes(term)) ? 1 : 2;
    };
    return matches.sort((a, b) => rank(a) - rank(b));
  }, [query, tradition, access, kind, savedOnly, favoriteIds, path]);
  const pathCounts = useMemo(() => new Map(PRACTICE_PATHWAYS.map(item => [item.id, practices.filter(practice => getPracticePathIds(practice.id).includes(item.id)).length])), []);
  const selectedPath = path === "all" ? undefined : PRACTICE_PATH_BY_ID.get(path);
  const mainCount = practices.filter(practice => practice.kind !== "candidate").length;
  const candidateCount = practices.length - mainCount;
  const scriptureCount = practices.filter(practice => practice.kind === "recitation").length;
  const activeFilters = !!query || tradition !== "all" || access !== "all" || kind !== "all" || savedOnly || path !== "all";
  const visible = filtered.slice(0, visibleCount);

  return <div className={`${theme.theme} ${styles.surface}`}>
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroIntro}>
          <p className={styles.eyebrow}><span />從覺察，走向照顧</p>
          <h1>練習與實踐</h1>
          <p className={styles.heroLead}>從理解到實踐，找到願意深入的方向。</p>
          <p className={styles.heroDescription}>以法門為閱讀路徑，讓禪修、聞思、戒行與日常照顧各有位置。</p>
          <div className={styles.heroActions}><a href="#visual-field-title" className={styles.subtleButton}>立體瀏覽<ArrowDown size={15} /></a><Link href="/awareness" className={styles.subtleButton}><ArrowLeft size={15} />自我覺察</Link>
            <button type="button" className={styles.subtleButton} onClick={openSources}><BookOpen size={16} />調研原文<span className={styles.buttonCount}>{practiceSources.length}</span></button>
            <button type="button" className={styles.subtleButton} onClick={exportAll}><Download size={16} />匯出資料</button></div>
        </div>
        <div className={styles.heroSide}>
          <div className={styles.contours} aria-hidden="true"><span /><span /><span /><i /></div>
          <div className={styles.libraryCount}><span>{mainCount}</span><p>筆主紀錄<small>方法、分類與經咒</small></p></div>
          <p className={styles.catalogNote}>含 {scriptureCount} 筆經咒與儀軌；另有 {candidateCount} 筆待核查線索。<br />條目數不等於獨立療法的數量。</p>
        </div>
      </header>
      {exportMessage && <p className={styles.pageMessage} role="status"><Check size={15} />{exportMessage}</p>}
      <div className={styles.orientation}>
        <Leaf size={20} strokeWidth={1.2} /><p><strong>不急著改變感受。</strong>清楚度、安住度、鬆緊度只是觀察的角度，不是療效承諾。從閱讀開始，也可以選擇今天先不練習。</p>
      </div>
      <PracticePathways selected={path} counts={pathCounts} total={practices.length} select={setPathFilter} />
      <section className={styles.library} aria-labelledby="library-title">
        <div className={styles.libraryHeading}>
          <div className={styles.viewSwitch} aria-label="瀏覽範圍"><button type="button" aria-pressed={!savedOnly && kind !== "recitation"} onClick={() => { setSavedOnly(false); setKindFilter("all"); }}>全部條目</button>
            <button type="button" aria-pressed={!savedOnly && kind === "recitation"} onClick={browseScriptures}><BookOpen size={15} />經咒<span>{scriptureCount}</span></button>
            <button type="button" data-sensitive="true" aria-pressed={savedOnly} onClick={() => setSavedOnly(true)}><Bookmark size={15} />我的收藏<span>{favoritesReady ? favorites.length : "—"}</span></button></div>
          <p className={styles.localNote} data-sensitive="true">收藏僅保存在這個瀏覽器</p>
        </div>
        {storageWarning && <p className={styles.storageWarning} role="status" data-sensitive="true">{storageWarning}</p>}
        <div className={styles.searchRow}>
          <label className={styles.searchBox}><Search size={19} strokeWidth={1.5} /><span className={styles.srOnly}>搜尋方法、經咒與完整研究內容</span>
            <input ref={searchInput} value={query} onChange={event => setQuery(event.target.value)} placeholder="搜尋方法、經咒或想了解的內容…" type="search" autoComplete="off" />
          </label>
          <label className={styles.selectField}><span>接近方式</span><select value={access} onChange={event => setAccessFilter(event.target.value as PracticeAccess | "all")}>
            <option value="all">不限接近方式</option>{(Object.entries(ACCESS_LABELS) as [PracticeAccess, string][]).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
          </select></label>
          <label className={styles.selectField}><span>條目類型</span><select value={kind} onChange={event => setKindFilter(event.target.value as PracticeKind | "all")}>
            <option value="all">所有類型</option>{(Object.entries(KIND_LABELS) as [PracticeKind, string][]).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
          </select></label>
        </div>
        <fieldset className={styles.traditionFilters}><legend>依傳統瀏覽</legend>
          <button type="button" aria-pressed={tradition === "all"} onClick={() => setTradition("all")}>全部傳統</button>
          {(Object.entries(TRADITION_LABELS) as [PracticeTradition, string][]).map(([key, text]) => <button type="button" key={key} aria-pressed={tradition === key} onClick={() => setTradition(key)}>{text}</button>)}
        </fieldset>
        <div className={styles.resultsHeading} data-sensitive={savedOnly ? "true" : undefined}>
          <h2 id="library-title" ref={resultTitle} tabIndex={-1}>{savedOnly ? "收藏的條目" : selectedPath?.title ?? (kind === "recitation" ? "經典、祈願文與心咒" : "慢慢找，慢慢讀")}<span aria-live="polite">{filtered.length} 筆結果</span></h2>
          {activeFilters ? <button type="button" className={styles.clearButton} onClick={clearFilters}><X size={14} />清除篩選</button> : <span className={styles.resultHint}><SlidersHorizontal size={14} />依原始收錄順序</span>}
        </div>
        <div data-sensitive={savedOnly ? "true" : undefined}>
          <PracticeVisualField items={filtered} open={openMethod} />
          {filtered.length > 0 ? <><div className={styles.cards}>{visible.map(practice => <PracticeCard key={practice.id} practice={practice} saved={favoriteIds.has(practice.id)} ready={favoritesReady} toggle={toggleFavorite} open={openMethod} />)}</div>
            <div className={styles.moreResults}>
              <p>已顯示 {visible.length}／{filtered.length} 筆</p>
              {visible.length < filtered.length && <div><button type="button" className={styles.primaryButton} onClick={() => setVisibleCount(count => count + PAGE_SIZE)}><ArrowDown size={16} />再看 {Math.min(PAGE_SIZE, filtered.length - visible.length)} 筆</button>
                <button type="button" className={styles.subtleButton} onClick={() => setVisibleCount(filtered.length)}>顯示全部結果</button></div>}
            </div></> : <div className={styles.emptyState}><BookOpen size={30} strokeWidth={1} /><h3>{savedOnly && favorites.length === 0 ? "還沒有收藏" : "這組條件沒有找到條目"}</h3>
              <p>{savedOnly && favorites.length === 0 ? "遇見想再讀的方法時，點一下書籤，就能留在這裡。" : selectedPath && pathCounts.get(selectedPath.id) === 0 ? "這個方向先保留分類與閱讀框架，獨立方法尚待整理。" : "試著換個關鍵字，或放寬接近方式與傳統的範圍。"}</p><button type="button" className={styles.subtleButton} onClick={clearFilters}>瀏覽全部條目<ArrowRight size={15} /></button></div>}
        </div>
      </section>
      <footer className={styles.footer}><p>一份持續整理的閱讀地圖。不同傳承、分類與版本並列，不視為彼此等同。</p><button type="button" onClick={openSources}>回到原始資料<ArrowUpRight size={15} /></button></footer>
    </div>
    {selected && <PracticeDetail practice={selected} saved={favoriteIds.has(selected.id)} favoritesReady={favoritesReady} toggleFavorite={toggleFavorite} openMethod={openMethod} close={closeMethod} returnFocus={openingTrigger.current ?? searchInput.current} />}
    {methodId && !selected && <ReaderDialog titleId="missing-method-title" onClose={closeMethod} returnFocus={searchInput.current}>
      <div className={styles.missingMethod}><h2 id="missing-method-title" tabIndex={-1} data-reader-title>找不到這個條目</h2><p>這個連結中的方法編號不在目前資料庫。可以返回練習與實踐重新搜尋。</p><button type="button" className={styles.primaryButton} onClick={closeMethod}><ArrowLeft size={16} />返回練習與實踐</button></div>
    </ReaderDialog>}
    {showSources && !methodId && <SourceLibrary close={() => setShowSources(false)} returnFocus={sourceTrigger.current} downloadAll={exportAll} exportMessage={exportMessage} />}
  </div>;
}

export default function PracticesPage() {
  return <Suspense fallback={<div className={`${theme.theme} ${styles.loading}`} role="status">正在整理練習與實踐…</div>}><PracticesLibrary /></Suspense>;
}

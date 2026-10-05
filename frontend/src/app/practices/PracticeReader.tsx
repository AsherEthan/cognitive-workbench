"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import theme from "@/components/awareness-theme.module.css";
import styles from "./practices.module.css";

export function safeExternalUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch { return undefined; }
}

type MarkdownNode = { type: string; value?: string; children?: MarkdownNode[] };

// CommonMark leaves **標籤：**中文 as literal text. Repair that display case
// after parsing so fenced code, inline code, and the stored Markdown stay intact.
function remarkCjkLabelStrong() {
  return (tree: MarkdownNode) => {
    function visit(node: MarkdownNode) {
      if (!node.children) return;
      node.children = node.children.flatMap(child => {
        if (child.type !== "text" || !child.value) { visit(child); return [child]; }
        const value = child.value;
        const pattern = /\*\*([^*\n]{1,60})([：:])\*\*(?=\S)/g;
        const parts: MarkdownNode[] = [];
        let cursor = 0;
        for (const match of value.matchAll(pattern)) {
          const start = match.index ?? 0;
          if (start > cursor) parts.push({ type: "text", value: value.slice(cursor, start) });
          parts.push({ type: "strong", children: [{ type: "text", value: match[1] }] });
          parts.push({ type: "text", value: match[2] });
          cursor = start + match[0].length;
        }
        if (!parts.length) return [child];
        if (cursor < value.length) parts.push({ type: "text", value: value.slice(cursor) });
        return parts;
      });
    }
    visit(tree);
  };
}

/** Research Markdown is content, never executable HTML. */
export function PracticeMarkdown({ content }: { content: string }) {
  return <div className={styles.markdown}>
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkCjkLabelStrong]} skipHtml components={{
      a: ({ href, children }) => {
        const safe = href ? safeExternalUrl(href) : undefined;
        return safe ? <a href={safe} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>;
      },
      img: ({ src, alt }) => {
        const safe = typeof src === "string" ? safeExternalUrl(src) : undefined;
        return safe ? <a href={safe} target="_blank" rel="noopener noreferrer">{alt || "查看來源圖片"}</a> : null;
      },
      h1: ({ children }) => <h3>{children}</h3>,
      h2: ({ children }) => <h3>{children}</h3>,
      h3: ({ children }) => <h4>{children}</h4>,
      table: ({ children }) => <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="資料表，可水平捲動"><table>{children}</table></div>,
    }}>{content}</ReactMarkdown>
  </div>;
}

export function ReaderDialog({ titleId, onClose, children, returnFocus }: {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  returnFocus?: HTMLElement | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeHandler = useRef(onClose);
  closeHandler.current = onClose;
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const previous = returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const originalOverflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = "hidden";
    node.querySelector<HTMLElement>("[data-reader-title]")?.focus({ preventScroll: true });
    return () => {
      node.close();
      document.body.style.overflow = originalOverflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
    // A dialog keeps its focus scope while the selected document changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <dialog ref={dialog} className={`${theme.theme} ${styles.dialog}`} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); closeHandler.current(); }}>
    {children}
  </dialog>;
}

/** A manual wall-clock timer, with no prescribed breathing rhythm or completion record. */
export function PracticeTimer() {
  const [duration, setDuration] = useState(60);
  const [remaining, setRemaining] = useState(60);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(false);
  const deadline = useRef(0);
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) { setRunning(false); setElapsed(true); }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [running]);
  function start() {
    const seconds = remaining > 0 ? remaining : duration;
    deadline.current = Date.now() + seconds * 1000;
    setRemaining(seconds); setElapsed(false); setRunning(true);
  }
  function pause() {
    setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    setRunning(false);
  }
  function reset(seconds = duration) {
    setRunning(false); setElapsed(false); setRemaining(seconds);
  }
  return <details className={styles.timerPanel}>
    <summary><Timer size={16} strokeWidth={1.5} />可選的手動計時<span>由你決定何時開始</span></summary>
    <div className={styles.timerBody}>
      <p>自訂計時，非建議練習時長。依原文選擇時間，可隨時暫停；不設定呼吸節奏，也不記錄完成率。</p>
      <div className={styles.timerRow}>
        <span className={styles.clock} role="timer" aria-label={`剩餘 ${Math.floor(remaining / 60)} 分 ${remaining % 60} 秒`}>
          {String(Math.floor(remaining / 60)).padStart(2, "0")}<span>:</span>{String(remaining % 60).padStart(2, "0")}
        </span>
        <label className={styles.timerDuration}>自行設定
          <select value={duration} onChange={event => { const next = Number(event.target.value); setDuration(next); reset(next); }}>
            <option value={20}>20 秒</option><option value={30}>30 秒</option><option value={60}>1 分鐘</option><option value={180}>3 分鐘</option><option value={300}>5 分鐘</option><option value={600}>10 分鐘</option>
          </select>
        </label>
      </div>
      <div className={styles.timerControls}>
        <button type="button" className={styles.primaryButton} onClick={running ? pause : start}>
          {running ? <Pause size={15} /> : <Play size={15} />}{running ? "暫停" : remaining === duration || remaining === 0 ? "開始計時" : "繼續計時"}
        </button>
        <button type="button" className={styles.subtleButton} onClick={() => reset()}><RotateCcw size={15} />重設</button>
      </div>
      <p className={styles.timerStatus} role="status">{elapsed ? "時間到了。可以在這裡停下，也可以再留一會兒。" : running ? "正在計時；你可以隨時暫停。" : "尚未計時，或已暫停。"}</p>
    </div>
  </details>;
}

export function downloadJson(value: unknown, filename: string): boolean {
  try {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch { return false; }
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Eye, EyeOff, Search, MessageSquarePlus } from "lucide-react";
import { useObserverMode } from "@/contexts/ObserverModeContext";
import type { NavItem } from "@/lib/palette/nav-manifest";
import { pageLabel } from "@/lib/zh-TW";
import { openPalette } from "@/lib/palette/events";
import theme from "./awareness-theme.module.css";
import styles from "./AwarenessHeader.module.css";

const PRIMARY = ["/telos", "/awareness", "/practices", "/life"];
const PERSONAL = ["/work", "/content", "/health", "/finances", "/business", "/growth", "/local", "/gear", "/books"];
const KNOWLEDGE = ["/atlas", "/memory", "/synapse", "/agents"];

export default function AwarenessHeader({ items }: { items: NavItem[] }) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const { observerMode, toggleObserverMode } = useObserverMode();
  const active = (href: string) => href === "/telos" ? pathname === "/" || pathname.startsWith("/telos") : pathname === href || pathname.startsWith(href + "/");
  const primaryItems = PRIMARY.flatMap(href => items.find(item => item.href === href) ?? []);
  const secondaryItems = items.filter(item => !PRIMARY.includes(item.href) && item.href !== "/chat");
  const groups = [
    {label:"生活與行動", items:secondaryItems.filter(item => PERSONAL.includes(item.href))},
    {label:"知識與協作", items:secondaryItems.filter(item => KNOWLEDGE.includes(item.href))},
    {label:"工具與系統", items:secondaryItems.filter(item => !PERSONAL.includes(item.href) && !KNOWLEDGE.includes(item.href))},
  ];
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("mousedown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <header className={`${theme.theme} ${styles.header}`} lang="zh-Hant">
    <div className={styles.inner}>
      <Link className={styles.brand} href="/telos" aria-label="認知工作台首頁"><span className={styles.mark} aria-hidden="true" /><span>認知工作台</span></Link>
      <nav className={styles.primaryNav} aria-label="主要導覽">{primaryItems.map(item => <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined}>{pageLabel(item.href)}</Link>)}</nav>
      <div className={styles.actions} ref={box}>
        <Link className={styles.inputLink} href="/chat" aria-label="開啟輸入口" aria-current={active("/chat") ? "page" : undefined}><MessageSquarePlus size={15} aria-hidden="true" /><span className={styles.fullLabel}>輸入口</span><span className={styles.compactLabel} aria-hidden="true">輸入</span></Link>
        <button className={styles.search} onClick={() => openPalette()} aria-label="搜尋工作區與知識" title="搜尋工作區與知識"><Search size={15} /></button>
        <button className={styles.privacy} aria-label={observerMode ? "顯示個人內容" : "隱藏個人內容"} aria-pressed={observerMode} onClick={toggleObserverMode} title={observerMode ? "顯示個人內容" : "隱藏個人內容"}>{observerMode ? <EyeOff size={15} /> : <Eye size={15} />}<span>{observerMode ? "內容已隱藏" : "隱藏內容"}</span></button>
        <button className={styles.more} ref={trigger} aria-expanded={open} aria-controls="awareness-workspaces" onClick={() => setOpen(value => !value)}>{primaryItems.some(item => active(item.href)) || active("/chat") ? "所有工作區" : pageLabel(pathname)}<ChevronDown size={14} /></button>
        {open && <nav id="awareness-workspaces" className={styles.workspaces} aria-label="所有工作區">
          {groups.filter(group => group.items.length).map(group => <section key={group.label}><h2>{group.label}</h2><div>{group.items.map(item => <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined} onClick={() => setOpen(false)}>{pageLabel(item.href)}</Link>)}</div></section>)}
        </nav>}
      </div>
    </div>
  </header>;
}

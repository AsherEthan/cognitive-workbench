import Link from "next/link";
import { ArrowUpRight, ScrollText } from "lucide-react";
import { updates } from "./entries";
import styles from "./changelog.module.css";
export const metadata = { title: "更新日誌 · 認知工作台" };
// HERO: A continuous timeline makes each small change part of the workbench's story.
export default function ChangelogPage() {
  return <div className={styles.page}><header className={styles.header}><p className={styles.eyebrow}>認知工作台 · 持續演進</p><h1>每一次更新，<br />都留下一筆。</h1><p className={styles.intro}>看看工作台增加了什麼，以及你可以怎麼使用。</p><div className={styles.meta}><span><ScrollText size={15} />{updates.length} 筆功能更新</span><span>日期以上海時區記錄</span></div></header>
    <section aria-label="功能更新時間軸" className={styles.timeline}>{updates.map((entry, index) => <article key={entry.id} id={entry.id} className={styles.entry}><div className={styles.date}><time dateTime={entry.date}>{entry.date.replaceAll("-", ".")}</time>{index === 0 && <span className={styles.latest}>最新</span>}</div><div className={styles.body}><span className={styles.tag}>{entry.type}</span><h2>{entry.title}</h2><p className={styles.summary}>{entry.summary}</p><ul>{entry.details.map(detail => <li key={detail}>{detail}</li>)}</ul><Link className={styles.link} href={entry.link}>{entry.linkLabel}<ArrowUpRight size={15} /></Link></div></article>)}</section>
    <footer className={styles.footer}><div><h2>尋找系統維護資訊？</h2><p>版本、完整性檢查與部署紀錄，請查看系統更新紀錄。</p></div><Link href="/ledger">系統更新紀錄<ArrowUpRight size={16} /></Link></footer></div>;
}

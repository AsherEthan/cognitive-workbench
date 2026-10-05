import { ArrowRight } from "lucide-react";
import { PRACTICE_PATHWAYS, PRACTICE_PATH_BY_ID, type PracticePathId, type PracticePathNode } from "@/lib/practices/pathways";
import styles from "./practices.module.css";

function Branches({ nodes }: { nodes: PracticePathNode[] }) {
  return <ul className={styles.pathBranches}>{nodes.map(node => <li key={node.label}>
    <span>{node.label}</span>{node.children && <Branches nodes={node.children} />}
  </li>)}</ul>;
}

// HERO: a quiet branching directory connects contemplation with lived practice.
export function PracticePathways({ selected, counts, total, select }: {
  selected: PracticePathId | "all"; counts: Map<PracticePathId, number>; total: number;
  select: (id: PracticePathId | "all") => void;
}) {
  const path = selected === "all" ? undefined : PRACTICE_PATH_BY_ID.get(selected);
  return <section className={styles.pathDirectory} aria-labelledby="path-directory-title">
    <div className={styles.pathDirectoryHeader}>
      <div><p>從一個方向開始</p><h2 id="path-directory-title">修行與實踐的路徑</h2></div>
      <span>選擇法門，閱讀對應條目</span>
    </div>
    <div className={styles.pathDirectoryGrid}>
      <nav className={styles.pathNav} aria-label="法門分類">
        <button type="button" aria-pressed={selected === "all"} aria-controls="path-context" onClick={() => select("all")}>
          <small>全</small><span>全部練習與實踐</span><em>{total}</em>
        </button>
        {PRACTICE_PATHWAYS.map((item, index) => <button type="button" key={item.id}
          aria-pressed={selected === item.id} aria-controls="path-context" onClick={() => select(item.id)}>
          <small>{index === 8 ? "＋" : String(index + 1).padStart(2, "0")}</small><span>{item.title}</span>
          <em>{counts.get(item.id) ?? 0}</em>
        </button>)}
      </nav>
      <div id="path-context" className={styles.pathContext}>
        {path ? <>
          <p className={styles.pathKicker}>{path.subtitle}</p><h3>{path.title}</h3><p className={styles.pathDescription}>{path.description}</p>
          <Branches nodes={path.branches} />
          {path.scopeNote && <p className={styles.pathScope}>{path.scopeNote}</p>}
          <a href="#library-title" className={styles.pathBrowse}>閱讀這個方向的條目<ArrowRight size={15} /></a>
        </> : <>
          <p className={styles.pathKicker}>應機施教</p><h3>找到適合自己的入口。</h3>
          <p className={styles.pathDescription}>從禪修、聞思、戒行到讀誦，先了解各個方向，再選擇願意投入的實踐。</p>
          <ol className={styles.pathPrinciples}>
            <li><span>一</span><div><h4>法門各有適應對象</h4><p>依當下的條件、意願與學習脈絡選擇。</p></div></li>
            <li><span>二</span><div><h4>先了解，再逐步深入</h4><p>可以體驗不同入口，再選擇專修的方向。</p></div></li>
            <li><span>三</span><div><h4>專修與日常實踐結合</h4><p>把所學帶回生活，保留觀察與回顧的空間。</p></div></li>
          </ol>
          <p className={styles.pathScope}>同一條目可跨列不同法門；各條目仍保留原典、版本與傳承資訊。</p>
        </>}
      </div>
    </div>
  </section>;
}

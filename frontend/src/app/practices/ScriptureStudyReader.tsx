"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight, Headphones } from "lucide-react";
import type { Practice, ScriptureTextScope } from "@/lib/practices/types";
import { safeExternalUrl } from "./PracticeReader";
import styles from "./practices.module.css";

const TABS = [{ id: "original", label: "原文／梵文" }, { id: "pronunciation", label: "讀音" }, { id: "annotation", label: "中文註釋" }, { id: "purpose", label: "作用與發心" }] as const;
type StudyTab = typeof TABS[number]["id"];
const SCOPE_LABELS: Record<ScriptureTextScope, string> = { mantra: "咒文對照", excerpt: "節錄對照", title: "僅經題或名稱", full: "所列版本全文", none: "版本說明" };
const PURPOSE_LABELS = { "source-described": "具名文本說明", "family-context": "同類法門背景", unresolved: "法本待核" };

function ReferenceLinks({ urls, practice, label }: { urls: string[]; practice: Practice; label: string }) {
  return <div className={styles.studyLinks}>{[...new Set(urls)].map((value, index) => {
    const url = safeExternalUrl(value);
    if (!url) return null;
    const reference = practice.references?.find(item => safeExternalUrl(item.url) === url);
    return <a key={url} href={url} target="_blank" rel="noopener noreferrer">{reference?.title ?? `${label} ${index + 1}`}<ArrowUpRight size={14} /></a>;
  })}</div>;
}

/** Different scripts, readings and interpretations remain attached to their named editions. */
export function ScriptureStudyReader({ practice }: { practice: Practice }) {
  const [tab, setTab] = useState<StudyTab>("original");
  const tabList = useRef<HTMLDivElement>(null);
  const study = practice.study;
  if (!study) return null;
  const recitation = practice.recitation;
  const sanskrit = study.sanskrit;
  const reading = study.pronunciation;
  const annotation = study.annotation;
  const purpose = practice.scripturePurpose;
  const tabs = TABS.filter(item => item.id !== "purpose" || purpose);
  const prefix = `study-${practice.id}`;
  const originalSource = recitation?.referenceUrl ? safeExternalUrl(recitation.referenceUrl) : undefined;
  const audioUrl = reading.audioUrl ? safeExternalUrl(reading.audioUrl) : undefined;
  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setTab(tabs[next].id);
    tabList.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }
  return <div className={styles.studyReader}>
    <div className={styles.studyTabs} role="tablist" aria-label="經咒閱讀方式" ref={tabList}>{tabs.map((item, index) => <button
      key={item.id} type="button" role="tab" id={`${prefix}-tab-${item.id}`} aria-selected={tab === item.id}
      aria-controls={`${prefix}-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1}
      onClick={() => setTab(item.id)} onKeyDown={event => moveTab(event, index)}>{item.label}</button>)}</div>
    {tabs.filter(item => item.id !== tab).map(item => <div key={item.id} hidden role="tabpanel" id={`${prefix}-panel-${item.id}`} aria-labelledby={`${prefix}-tab-${item.id}`} />)}
    <div className={styles.studyPanel} role="tabpanel" id={`${prefix}-panel-${tab}`} aria-labelledby={`${prefix}-tab-${tab}`} tabIndex={0}>
      {tab === "original" && <>
        {recitation?.text ? <div className={styles.originalPassage}>
          <span className={styles.smallLabel}>已收錄的念誦文字 · {recitation.language}</span>
          <p className={styles.scriptureVersion}>{recitation.version}</p>
          <div className={styles.recitationText}><p lang={recitation.language === "藏文原文" ? "bo" : undefined}>{recitation.text}</p></div>
          {originalSource && <a className={styles.subtleButton} href={originalSource} target="_blank" rel="noopener noreferrer">核對這份原文<ArrowUpRight size={14} /></a>}
        </div> : <p className={styles.studyNote}>{recitation?.version}</p>}
        <div className={styles.sanskritSection}>
          <div className={styles.studyHeading}><h4>梵文對照</h4><span>{SCOPE_LABELS[sanskrit.scope]}</span></div>
          {sanskrit.devanagari && <p className={`${styles.studyText} ${styles.devanagari}`} lang="sa-Deva">{sanskrit.devanagari}</p>}
          {sanskrit.iast && <><span className={styles.smallLabel}>梵語羅馬字轉寫</span><p className={styles.studyText} lang="sa-Latn">{sanskrit.iast}</p></>}
          <p className={styles.studyNote}>{sanskrit.note}</p>
          <ReferenceLinks urls={sanskrit.referenceUrls} practice={practice} label="梵文與版本來源" />
        </div>
      </>}
      {tab === "pronunciation" && <>
        <div className={styles.studyHeading}><h4>{reading.system || "讀音與學習入口"}</h4><span>{SCOPE_LABELS[reading.scope]}</span></div>
        {reading.text && <p className={styles.studyText}>{reading.text}</p>}
        {reading.chineseApproximation && <div className={styles.approximateReading}><span className={styles.smallLabel}>中文近似音</span>
          <p className={styles.studyText}>{reading.chineseApproximation}</p><p className={styles.studyNote}>{reading.chineseApproximationNote || "漢字僅作近似音提示，實際發音以所列來源為準。"}</p></div>}
        <p className={styles.studyNote}>{reading.note}</p>
        {audioUrl && <a className={styles.audioReference} href={audioUrl} target="_blank" rel="noopener noreferrer"><Headphones size={17} />開啟朗讀示範<ArrowUpRight size={14} /></a>}
        <ReferenceLinks urls={reading.referenceUrls} practice={practice} label="讀音來源" />
        <details className={styles.pronunciationGuide}><summary>梵文字母與讀音怎麼看</summary>
          <p>天城體與羅馬字可用來對照同一份梵文。ā、ī、ū 的橫線表示長母音；藏式羅馬字另記藏傳念誦的讀音，依條目所標系統閱讀。</p>
          <a href="https://www.learnsanskrit.org/guide/sounds/vowels/" target="_blank" rel="noopener noreferrer">梵語母音與長短音說明<ArrowUpRight size={13} /></a>
        </details>
      </>}
      {tab === "annotation" && <>
        <div className={styles.studyHeading}><h4>理解這份經咒</h4><span>中文整理</span></div>
        <p className={styles.annotationOverview}>{annotation.overview}</p>
        {!!annotation.passages.length && <div className={styles.annotationPassages}>{annotation.passages.map((passage, index) => <article key={`${passage.label}-${index}`}>
          <h5><span>{String(index + 1).padStart(2, "0")}</span>{passage.label}</h5>
          {passage.original && <p className={styles.annotationOriginal}>{passage.original}</p>}
          {passage.reading && <p className={styles.annotationReading}>{passage.reading}</p>}
          <p className={styles.annotationMeaning}>{passage.meaning}</p>
        </article>)}</div>}
        {!!annotation.terms.length && <div className={styles.annotationTerms}><h5>詞語與觀念</h5><dl>{annotation.terms.map((term, index) => <div key={`${term.term}-${index}`}>
          <dt>{term.term}</dt><dd>{term.meaning}</dd>
        </div>)}</dl></div>}
        <p className={styles.studyNote}>{annotation.note}</p>
        <ReferenceLinks urls={annotation.referenceUrls} practice={practice} label="註釋參考來源" />
      </>}
      {tab === "purpose" && purpose && <>
        <div className={styles.studyHeading}><h4>傳統中的作用</h4><span>{PURPOSE_LABELS[purpose.status]}</span></div>
        <p className={styles.annotationOverview}>{purpose.summary}</p>
        {!!purpose.traditionalUses.length && <div className={styles.annotationPassages}>{purpose.traditionalUses.map((use, index) => <article key={`${use.label}-${index}`}>
          <h5><span>{String(index + 1).padStart(2, "0")}</span>{use.label}</h5>
          <p className={styles.annotationMeaning}>{use.description}</p>
        </article>)}</div>}
        <div className={styles.purposeIntention}><h5>念誦與閱讀時的發心</h5><p>{purpose.intention}</p></div>
        <div className={styles.purposeContext}><h5>法本與適用範圍</h5><p>{purpose.context}</p></div>
        <p className={styles.studyNote}>以上依經典與傳承所述用途整理，供理解發心與修學方向；個人的實際感受可自行觀察。</p>
        <ReferenceLinks urls={purpose.referenceUrls} practice={practice} label="作用與發心來源" />
      </>}
    </div>
  </div>;
}

'use client';
import dynamic from 'next/dynamic';
import { useEffect,useMemo,useState } from 'react';
import { ArrowUpRight,Pause,Play,RotateCcw } from 'lucide-react';
import type { Practice } from '@/lib/practices/types';
import { MOTIFS, VISUAL_MODE_LABELS, visualFor } from '@/lib/practices/visuals';
import { PracticeVisualCanvas } from './PracticeVisualCanvas';
import styles from './practice-visuals.module.css';
const Scene=dynamic(()=>import('./PracticeScene'),{ssr:false,loading:()=> <div className={styles.empty}>正在展開立體示意…</div>});

export function PracticeVisualField({items,open}: {items:Practice[];open:(id:string)=>void}){
  const [active,setActive]=useState('P01'),[paused,setPaused]=useState(false),[reset,setReset]=useState(0),[hover,setHover]=useState('');
  const selected=useMemo(()=>items.find(p=>p.id===active)??items[0],[active,items]);
  useEffect(()=>{setHover('');},[selected?.id]);
  const motif=selected?MOTIFS[visualFor(selected).motif]:null;
  return <section className={styles.field} aria-labelledby="visual-field-title" data-visual-records={items.length}>
    <header className={styles.fieldHeader}><div><p className={styles.kicker}>讓方法的特徵變得可見</p><h2 id="visual-field-title">實踐的立體地圖</h2></div><span>{items.length} 筆對應目前篩選</span></header>
    <div className={styles.fieldGrid}><div className={styles.stage}>
      {selected?<Scene practice={selected} items={items} onPick={setActive} onHover={setHover} paused={paused} resetToken={reset}/>:<div className={styles.empty}>目前篩選沒有條目。</div>}
      <span className={styles.stageLabel}>{hover||'外圍節點是條目 · 中央是所選方法'}</span><span className={styles.stageLegend}>拖曳旋轉 · 點選節點 · 方向鍵調整視角</span>
    </div><div className={styles.preview}>{selected&&motif?<><span className={styles.badge}><i style={{background:motif.color}}/>{motif.label} · {selected.id}</span><h3>{selected.title}</h3><p>{selected.summary}</p><p className={styles.mode}>{VISUAL_MODE_LABELS[visualFor(selected).mode]}</p><button type="button" className={styles.action} onClick={()=>open(selected.id)}>閱讀原文與方法<ArrowUpRight size={16}/></button></>:<p>放寬篩選後，再選擇想了解的方法。</p>}</div></div>
    <div className={styles.controls}><label className={styles.picker}>選擇條目<select aria-label="選擇立體示意條目" value={selected?.id??''} disabled={!selected} onChange={e=>setActive(e.target.value)}>{!selected&&<option value="">沒有條目</option>}{items.map(p=><option key={p.id} value={p.id}>{p.id} · {p.title}</option>)}</select></label><button type="button" aria-pressed={paused} onClick={()=>setPaused(p=>!p)}>{paused?<Play size={14}/>:<Pause size={14}/>} {paused?'播放示意':'暫停示意'}</button><button type="button" onClick={()=>setReset(r=>r+1)}><RotateCcw size={14}/>重設視角</button></div>
    <p className={styles.note}>圖形表達條目的主題，做法與條件以原文為準。顏色用於辨認主題，沒有成就、療效或能量含義。分類與待核查條目保留研究性質。</p>
  </section>;
}
export function PracticeDetailVisual({practice}:{practice:Practice}){
  const [paused,setPaused]=useState(false),[reset,setReset]=useState(0);const profile=visualFor(practice),motif=MOTIFS[profile.motif];
  return <section className={styles.detail} aria-label={`${practice.title}的立體示意`} data-detail-motif={profile.motif}>
    <div className={styles.stage}><Scene practice={practice} paused={paused} resetToken={reset}/><span className={styles.stageLabel}>{VISUAL_MODE_LABELS[profile.mode]}</span></div>
    <div className={styles.controls}><button type="button" aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={14}/>:<Pause size={14}/>} {paused?'播放示意':'暫停示意'}</button><button type="button" onClick={()=>setReset(v=>v+1)}><RotateCcw size={14}/>重設視角</button></div>
    <div className={styles.detailCaption}><span className={styles.badge}><i style={{background:motif.color}}/>{motif.label}</span><h3>看見「{practice.title}」的主題</h3><p>{motif.meaning}</p><p>{profile.anchor}</p></div>
  </section>;
}
export function PracticeCardVisual({practice,open}:{practice:Practice;open:(id:string)=>void}){
  return <button type="button" className={styles.cardVisual} aria-label={`查看${practice.title}的立體示意與原文`} onClick={()=>open(practice.id)}><PracticeVisualCanvas practice={practice}/><span>{MOTIFS[visualFor(practice).motif].label}</span></button>;
}

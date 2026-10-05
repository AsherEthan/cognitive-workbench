"use client";

import { uiLabel } from "./labels";

import { useState } from "react";
import type { Telos } from "./data";

// Subordinate tabs — warm, sentence-led.

interface SparkProps {
  points?: readonly number[];
  color?: string;
}

interface SubTabsProps {
  telos: Telos;
}

export function Spark({ points=[], color='var(--accent)' }: SparkProps) {
  if (points.length < 2) return null;
  const W=160, H=36, max=Math.max(...points), min=Math.min(...points);
  const norm = (v: number, i: number)=>{
    const x = (i/(points.length-1))*W;
    const y = H - ((v-min)/Math.max(1,(max-min)))*H;
    return `${x},${y}`;
  };
  const last = points.at(-1) ?? points[points.length - 1] ?? 0;
  return (
    <svg width={W} height={H} className="spark">
      <polyline fill="none" stroke={color} strokeWidth="1.6" points={points.map(norm).join(' ')}/>
      <circle cx={W} cy={H-((last-min)/Math.max(1,(max-min)))*H} r="2.8" fill={color}/>
    </svg>
  );
}

type SubtabId = string;

export function SubTabs({ telos }: SubTabsProps) {
  const [active, setActive] = useState<SubtabId>('business');
  const tab = telos.subtabs.find(t=>t.id===active) ?? telos.subtabs[0];
  const dim = telos.dimensions.find(d=>d.id===tab?.dim);
  if (!tab || !dim) return null;
  const veloText =
    tab.velo > 0.2 ? `每月約增加 ${tab.velo.toFixed(1)} 點` :
    tab.velo < -0.2 ? `每月約減少 ${Math.abs(tab.velo).toFixed(1)} 點` :
    '大致持平';
  const eta = tab.velo > 0 && tab.ideal > tab.cur ? Math.ceil((tab.ideal-tab.cur)/tab.velo) : null;
  return (
    <section className="subtabs">
      <header className="band-head">
        <div>
          <h2 className="band-title">生活的不同面向</h2>
          <p className="band-sub">把不同領域的日常，連回你在意的生活面向。</p>
        </div>
      </header>

      <div className="sub-nav">
        {telos.subtabs.map(t=>{
          const d = telos.dimensions.find(x=>x.id===t.dim);
          return (
            <button key={t.id} type="button" aria-label={`查看${uiLabel(t.label || d?.label || '生活面向')}`} aria-pressed={t.id === tab.id} className={'sub-tab'+(t.id===tab.id?' on':'')} onClick={()=>setActive(t.id as SubtabId)}>
              <span className="sub-swatch" style={{background:`var(${d?.color ?? '--accent'})`}}/>
              {uiLabel(t.label)}
            </button>
          );
        })}
      </div>

      <div className="sub-card">
        <p className="sub-cite">
          {uiLabel(tab.label)}與<span style={{color:`var(${dim.color})`}}>{uiLabel(dim.label)}</span>有關。
          目前記錄值為 <span className="mono">{tab.cur}</span>，設定值是 {tab.ideal}；{veloText}。
          {eta && `若變化速度不變，約需 ${eta} 個月達到設定值；這是估算。`}
        </p>
        <div className="sub-body">
          <div className="sub-l">
            <p className="sub-top">{tab.top}</p>
            <div className="sub-kpis">
              <div className="kpi"><div className="k">目前</div><div className="v mono">{tab.cur}<span className="u">/{tab.ideal}</span></div></div>
              <div className="kpi"><div className="k">差距</div><div className="v mono">{tab.ideal-tab.cur}</div></div>
              <div className="kpi"><div className="k">每月變化</div><div className="v mono" style={{color:tab.velo>0?'var(--ok)':tab.velo<0?'var(--bad)':'var(--text-3)'}}>{tab.velo>0?'+':''}{tab.velo.toFixed(1)}</div></div>
              <div className="kpi"><div className="k">估計所需時間</div><div className="v mono">{eta?eta+' 個月':'尚無估計'}</div></div>
            </div>
          </div>
          <div className="sub-r">
            <div className="spark-head">歷史趨勢</div>
            <p className="muted">尚未提供這個面向的歷史資料。</p>
          </div>
        </div>
      </div>
    </section>
  );
}

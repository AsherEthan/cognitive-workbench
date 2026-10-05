"use client";

import { uiLabel, periodLabel } from "./labels";

import { useEffect } from "react";
import type { Goal, Telos } from "./data";
import { Icons } from "./icons";
import { Spark } from "./subtabs";

// Goal drill-down modal — warmer, sentence-led.

interface GoalModalProps {
  telos: Telos;
  goal: Goal | null;
  onClose: () => void;
  showIds: boolean;
}

export function GoalModal({ telos, goal, onClose, showIds }: GoalModalProps) {
  useEffect(()=>{
    if (!goal) return;
    const esc = (e: KeyboardEvent)=>e.key==='Escape' && onClose();
    window.addEventListener('keydown', esc);
    return ()=>window.removeEventListener('keydown', esc);
  },[goal, onClose]);

  if (!goal) return null;
  const linkedC = telos.challenges.filter(c=>c.blocks.includes(goal.id));
  const linkedS = telos.strategies.filter(s=>s.implements.includes(goal.id));
  const linkedP = telos.projects.filter(p=>linkedS.some(s=>s.id===p.strategy));
  const dim = telos.dimensions.find(d=>d.id===goal.dims[0]);
  const history = telos.metrics.find(metric => goal.metrics.includes(metric.id) && metric.spark.length > 1);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <div className="modal-eyebrow">
              所屬面向：<span style={{color:`var(${dim?.color ?? '--accent'})`}}>{goal.dims.map(uiLabel).join('、')}</span>
              {showIds && <span className="mono" style={{marginLeft:10,color:'var(--text-4)'}}>{goal.id}</span>}
            </div>
            <h2 className="modal-title">{goal.title}</h2>
          </div>
          <button className="modal-x" onClick={onClose} aria-label="關閉目標詳情"><Icons.X size={16}/></button>
        </header>

        <div className="modal-kpis">
          <div className="mk"><div className="mk-l">目前</div><div className="mk-v mono">{goal.kpi}</div></div>
          <div className="mk"><div className="mk-l">目標</div><div className="mk-v mono">{goal.target}</div></div>
          <div className="mk"><div className="mk-l">進度</div><div className="mk-v mono">{goal.pct}%</div></div>
          <div className="mk"><div className="mk-l">上月變化</div><div className="mk-v mono" style={{color:goal.delta>0?'var(--ok)':goal.delta<0?'var(--bad)':'var(--text-3)'}}>{goal.delta>0?'+':''}{goal.delta}</div></div>
          <div className="mk mk-wide">
            <div className="mk-l">指標歷史</div>
            {history ? <Spark points={history.spark} color={`var(${dim?.color ?? '--accent'})`}/> : <span className="muted">尚未提供歷史資料</span>}
          </div>
        </div>

        <div className="modal-grid">
          <div className="modal-col">
            <div className="modal-col-head">目前的阻礙</div>
            {linkedC.length===0 && <div className="empty">尚未記錄相關阻礙。</div>}
            {linkedC.map(c=>(
              <div key={c.id} className="modal-line">
                {showIds && <span className="mono id" style={{color:'var(--warm)'}}>{c.id}</span>}
                <div><div className="ml-title">{c.title}</div><div className="ml-note">{c.note}</div></div>
              </div>
            ))}
          </div>
          <div className="modal-col">
            <div className="modal-col-head">對應的做法</div>
            {linkedS.length===0 && <div className="empty">尚未連結對應的策略。</div>}
            {linkedS.map(s=>(
              <div key={s.id} className="modal-line">
                {showIds && <span className="mono id" style={{color:'var(--accent-2)'}}>{s.id}</span>}
                <div><div className="ml-title">{s.title.split('—')[0].trim()}</div><div className="ml-note">{s.title.split('—')[1]?.trim()}</div></div>
              </div>
            ))}
          </div>
          <div className="modal-col">
            <div className="modal-col-head">已展開的行動</div>
            {linkedP.length===0 && <div className="empty">目前沒有進行中的專案。</div>}
            {linkedP.map(p=>(
              <div key={p.id} className="modal-line">
                <span className={'dot '+(p.status==='green'?'dot-ok':p.status==='amber'?'dot-warn':'dot-bad')} style={{marginTop:7}}/>
                <div><div className="ml-title">{p.title}</div><div className="ml-note">{p.work.length} 項工作進行中</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { uiLabel, periodLabel } from "./labels";

import type { Telos } from "./data";

// Horizon — mission line, warm and calm.

interface HorizonProps {
  telos: Telos;
  activeId: string;
  onChange: (id: string) => void;
  showIds: boolean;
}

export function Horizon({ telos, activeId, onChange, showIds }: HorizonProps) {
  const active = telos.missions.find(m=>m.id===activeId) || telos.missions[0];
  if (!active) return null;
  return (
    <section className="horizon">
      <div className="h-tabs">
        {telos.missions.map(m=>(
          <button key={m.id}
            className={'h-tab'+(m.id===activeId?' on':'')}
            onClick={()=>onChange(m.id)}>
            <span className="h-tab-horizon">{periodLabel(m.horizon)}</span>
            {showIds && <span className="h-tab-id mono">{m.id}</span>}
          </button>
        ))}
      </div>
      <div className="h-body">
        <div className="h-label">使命</div>
        <div className="h-title">{active.title}</div>
      </div>
      <div className="h-right">
        目前共有 {telos.strategies.length} 項策略，其中 {telos.strategies.filter(s => s.active).length} 項採用中。
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";

// Tweaks panel — density, narrative tone, why-view default, palette.

export interface TweakVals {
  density: "compact" | "comfortable" | "spacious";
  narrativeTone: "operator" | "terse";
  paletteMode: "tokyo-night" | "tokyo-mono" | "cb-safe";
  accentHue: number;
}

type TweakKey = keyof TweakVals;

interface TweakOption<K extends TweakKey> {
  v: TweakVals[K];
  l: string;
}

interface SegProps<K extends TweakKey> {
  k: K;
  options: readonly TweakOption<K>[];
}

export interface TweakState {
  vals: TweakVals;
  set: <K extends TweakKey>(k: K, v: TweakVals[K]) => void;
  visible: boolean;
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "narrativeTone": "operator",
  "paletteMode": "tokyo-night",
  "accentHue": 160
}/*EDITMODE-END*/ satisfies TweakVals;

export function useTweaks(): TweakState {
  const [vals, setVals] = useState<TweakVals>(TWEAK_DEFAULTS);
  const [visible, setVisible] = useState(false);
  useEffect(()=>{
    const h = (e: MessageEvent)=>{
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__activate_edit_mode')   setVisible(true);
      if (e.data.type === '__deactivate_edit_mode') setVisible(false);
    };
    if (typeof window === "undefined") return;
    window.addEventListener('message', h);
    window.parent.postMessage({type:'__edit_mode_available'}, '*');
    return ()=>window.removeEventListener('message', h);
  },[]);
  const set = <K extends TweakKey>(k: K, v: TweakVals[K])=>{
    setVals(prev=>({...prev,[k]:v}));
    if (typeof window === "undefined") return;
    window.parent.postMessage({type:'__edit_mode_set_keys', edits:{[k]:v}}, '*');
  };
  useEffect(()=>{
    if (typeof document === "undefined") return;
    document.documentElement.dataset.density = vals.density;
    document.documentElement.dataset.palette = vals.paletteMode;
    document.querySelectorAll<HTMLElement>('.telos-workspace').forEach(element => {
      element.style.setProperty('--accent', `oklch(88% 0.06 ${vals.accentHue})`);
      element.style.setProperty('--accent-2', `oklch(78% 0.06 ${vals.accentHue})`);
    });
  },[vals]);
  return { vals, set, visible };
}

export function TweakPanel({ vals, set, visible }: TweakState) {
  if (!visible) return null;
  const Seg = <K extends TweakKey>({k, options}: SegProps<K>)=> (
    <div className="tw-seg mono">
      {options.map(o=>(
        <button key={o.v} className={vals[k]===o.v?'on':''} onClick={()=>set(k,o.v)}>{o.l}</button>
      ))}
    </div>
  );
  return (
    <div className="tweaks">
      <header className="tw-head mono">
        <span className="led"/>介面調整
        <span className="tw-meta">儲存至設定檔</span>
      </header>
      <div className="tw-row">
        <div className="tw-label mono">版面密度</div>
        <Seg k="density" options={[{v:'compact',l:'緊湊'},{v:'comfortable',l:'適中'},{v:'spacious',l:'寬鬆'}]}/>
      </div>
      <div className="tw-row">
        <div className="tw-label mono">敘述方式</div>
        <Seg k="narrativeTone" options={[{v:'operator',l:'完整'},{v:'terse',l:'精簡'}]}/>
      </div>
      <div className="tw-row">
        <div className="tw-label mono">配色</div>
        <Seg k="paletteMode" options={[{v:'tokyo-night',l:'午夜'},{v:'tokyo-mono',l:'單色'},{v:'cb-safe',l:'易辨配色'}]}/>
      </div>
      <div className="tw-row">
        <div className="tw-label mono">重點色相 <span className="tw-hue mono">{vals.accentHue}°</span></div>
        <input aria-label="重點色相" type="range" min="0" max="360" step="5" value={vals.accentHue}
               onChange={(e: ChangeEvent<HTMLInputElement>)=>set('accentHue', +e.target.value)} className="tw-slider"/>
      </div>
    </div>
  );
}

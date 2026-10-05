'use client';
import { useEffect, useRef } from 'react';
import { MOTIFS, visualFor, type Motif } from '@/lib/practices/visuals';
import type { Practice } from '@/lib/practices/types';
import styles from './practice-visuals.module.css';

/** Canvas is a quiet, static entry point. Only the selected Three.js scene animates. */
export function drawMotif(ctx: CanvasRenderingContext2D, w: number, h: number, motif: Motif, color: string, seed = 0) {
  ctx.clearRect(0, 0, w, h); ctx.save(); ctx.translate(w / 2, h / 2);
  const r = Math.min(w * .3, h * .35);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.3;
  const line = (x: number, y: number, a: number, b: number) => { ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(a,b); ctx.stroke(); };
  const circle = (x: number, y: number, z: number) => { ctx.beginPath(); ctx.arc(x,y,z,0,Math.PI*2); ctx.stroke(); };
  const dot = (x: number, y: number, z = 2) => { ctx.beginPath(); ctx.arc(x,y,z,0,Math.PI*2); ctx.fill(); };
  switch(motif) {
    case 'breath': case 'kindness': case 'withdraw': case 'gaze': case 'touch':
      for(let i=0;i<4;i++) { ctx.globalAlpha=1-i*.18; circle(motif==='touch'?-r*.35:0,0,r*(.25+i*.25)); }
      ctx.globalAlpha=1; dot(0,0); if(motif==='touch') line(-r,r*.8,r,r*.8); break;
    case 'oral':
      for(const side of [-1,1]) {ctx.beginPath();ctx.ellipse(0,side*r*.15,r*.8,r*.35,0,side<0?Math.PI:0,side<0?Math.PI*2:Math.PI);ctx.stroke();}
      dot(0,0);break;
    case 'walk':
      line(-r,0,r,0); for(let i=0;i<6;i++){ctx.beginPath();ctx.ellipse(-r+i*r*.4,i%2?r*.26:-r*.26,r*.15,r*.07,.3,0,Math.PI*2);ctx.stroke();} break;
    case 'scan': case 'posture': case 'movement': case 'rest':
      if(motif==='rest') ctx.rotate(-Math.PI/2);
      circle(0,-r*.75,r*.17); line(0,-r*.55,0,r*.25); line(-r*.5,-r*.25,r*.5,-r*.25); line(0,r*.25,-r*.35,r);line(0,r*.25,r*.35,r);
      if(motif==='scan') {ctx.globalAlpha=.5;line(-r,-r*.1,r,-r*.1);dot(0,-r*.1,4);} break;
    case 'recite':
      ctx.beginPath();for(let i=0;i<=100;i++){const x=-r+i*r/50,y=Math.sin(i*.22)*r*.32; i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
      for(let i=0;i<12;i++){const a=i*Math.PI/6;dot(Math.cos(a)*r,Math.sin(a)*r,1.8);}break;
    case 'book':
      for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(0,-r*.6);ctx.lineTo(s*r,-r*.8);ctx.lineTo(s*r,r*.65);ctx.lineTo(0,r*.85);ctx.closePath();ctx.stroke();for(let i=0;i<4;i++)line(s*r*.18,-r*.3+i*r*.23,s*r*.8,-r*.43+i*r*.23);}break;
    case 'moon':
      circle(0,0,r*.7);ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(0,0,r*.7,-Math.PI/2,Math.PI/2);ctx.fill();ctx.globalAlpha=.8;circle(-r*.2,r*.2,r*.13);dot(r*.7,-r*.9,1);break;
    case 'flow':
      for(let k=-1;k<=1;k++){ctx.beginPath();for(let i=0;i<=60;i++){const y=-r+i*r/30,x=Math.sin(i*.15+k)*r*.35+k*r*.3;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}break;
    case 'rhythm': case 'rotate': case 'ritual': case 'dream': case 'visualize':
      for(let i=0;i<3;i++){ctx.save();ctx.rotate(i*Math.PI/3);ctx.beginPath();ctx.ellipse(0,0,r,r*(.25+i*.16),0,0,Math.PI*2);ctx.stroke();ctx.restore();}dot(0,0);break;
    default:
      for(let i=0;i<8;i++){const a=i*2.399+seed*.01,rr=r*Math.sqrt((i+1)/8),x=Math.cos(a)*rr,y=Math.sin(a)*rr;ctx.globalAlpha=.4;line(0,0,x,y);ctx.globalAlpha=1;circle(x,y,3);}dot(0,0);break;
  }
  ctx.restore();
}
export function PracticeVisualCanvas({practice, large=false}: {practice: Practice; large?:boolean}) {
  const canvas=useRef<HTMLCanvasElement>(null);
  const profile=visualFor(practice), motif=MOTIFS[profile.motif];
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    const render=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;const dpr=Math.min(window.devicePixelRatio||1,1.5);el.width=Math.round(w*dpr);el.height=Math.round(h*dpr);const ctx=el.getContext('2d');if(ctx){ctx.scale(dpr,dpr);drawMotif(ctx,w,h,profile.motif,motif.color,profile.seed);}};
    const observer=new ResizeObserver(render);observer.observe(el);render();return()=>observer.disconnect();
  },[profile.motif,profile.seed,motif.color]);
  return <canvas ref={canvas} className={large?styles.fallbackCanvas:styles.cardCanvas} aria-hidden="true" data-motif={profile.motif}/>;
}

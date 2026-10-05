'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Practice } from '@/lib/practices/types';
import { MOTIFS, visualFor } from '@/lib/practices/visuals';
import { createPracticeModel } from './practice-model';
import { PracticeVisualCanvas } from './PracticeVisualCanvas';
import styles from './practice-visuals.module.css';

export default function PracticeScene({ practice, items, onPick, onHover, paused, resetToken }: {
  practice:Practice; items?:Practice[]; onPick?:(id:string)=>void; onHover?:(title:string)=>void; paused:boolean; resetToken:number;
}) {
  const canvas=useRef<HTMLCanvasElement>(null);
  const live=useRef({paused,onPick,onHover});live.current={paused,onPick,onHover};
  const invalidate=useRef<()=>void>(()=>{});
  const [fallback,setFallback]=useState(false);
  useEffect(()=>{invalidate.current();},[paused]);
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({canvas:el,alpha:true,antialias:true,powerPreference:'low-power'});}catch{setFallback(true);return;}
    setFallback(false);el.dataset.renderer='threejs';el.dataset.renderFrames='0';
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.innerWidth<640?1.25:1.75));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(40,1,.1,80);camera.position.set(0,items?6.5:1,items?10:5.2);
    const controls=new OrbitControls(camera,el);controls.enableDamping=false;controls.enableZoom=false;controls.enablePan=false;controls.minPolarAngle=.3;controls.maxPolarAngle=Math.PI-.3;
    scene.add(new THREE.AmbientLight('#cfe4dd',1.8));const key=new THREE.DirectionalLight('#f5edda',3);key.position.set(-3,4,5);scene.add(key);const rim=new THREE.DirectionalLight('#a0bfdb',2);rim.position.set(3,0,-3);scene.add(rim);
    const model=createPracticeModel(visualFor(practice));scene.add(model.group);
    const motifs=Object.keys(MOTIFS);let nodes:THREE.InstancedMesh|undefined;let nodeGeo:THREE.BufferGeometry|undefined;let nodeMat:THREE.Material|undefined;
    if(items?.length){
      nodeGeo=new THREE.IcosahedronGeometry(.09,1);nodeMat=new THREE.MeshStandardMaterial({roughness:.6,metalness:.2});nodes=new THREE.InstancedMesh(nodeGeo,nodeMat,items.length);
      const matrix=new THREE.Matrix4();
      items.forEach((item,i)=>{
        const p=visualFor(item),family=motifs.indexOf(p.motif),a=family/motifs.length*Math.PI*2+(p.seed%31)/31*.16;
        const siblings=items.filter(v=>visualFor(v).motif===p.motif),order=siblings.findIndex(v=>v.id===item.id);
        const radius=3.1+(order%5)*.25,y=(Math.floor(order/5)-Math.floor(siblings.length/10))*.24;
        matrix.makeTranslation(Math.cos(a)*radius,y,Math.sin(a)*radius);nodes!.setMatrixAt(i,matrix);nodes!.setColorAt(i,new THREE.Color(MOTIFS[p.motif].color));
      });scene.add(nodes);
      const geo=new THREE.TorusGeometry(3.8,.008,4,180);const mat=new THREE.MeshBasicMaterial({color:'#355650',transparent:true,opacity:.4});const orbit=new THREE.Mesh(geo,mat);orbit.rotation.x=Math.PI/2;orbit.position.y=-1.4;scene.add(orbit);nodeGeo=nodes.geometry;
    }
    let frame=0,visible=true,disposed=false,contextLost=false,clockTime=0,last=performance.now(),frames=0;
    const foreground=()=>!document.querySelector('dialog[open]')||!!el.closest('dialog[open]');
    const moving=()=>!live.current.paused&&!reduced.matches&&visible&&!document.hidden&&foreground()&&!contextLost&&visualFor(practice).mode!=='reference';
    function draw(now=performance.now()){
      if(disposed||contextLost)return;
      const delta=Math.min((now-last)/1000,.05);last=now;if(moving())clockTime+=delta;
      model.update(clockTime);renderer.render(scene,camera);el!.dataset.renderFrames=String(++frames);
    }
    function loop(now:number){frame=0;if(!moving()||disposed)return;draw(now);frame=requestAnimationFrame(loop);}
    function wake(){cancelAnimationFrame(frame);frame=0;last=performance.now();if(visible&&!document.hidden&&foreground()&&!contextLost){draw();if(moving())frame=requestAnimationFrame(loop);}}
    invalidate.current=wake;
    const resize=new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();wake();}});resize.observe(el);
    const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;wake();},{threshold:.02});intersection.observe(el);
    const modalObserver=new MutationObserver(wake);modalObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
    document.addEventListener('visibilitychange',wake);reduced.addEventListener('change',wake);controls.addEventListener('change',wake);
    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=[0,0],hovered='';
    function hit(event:PointerEvent){if(!nodes)return;const rect=el!.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObject(nodes)[0]?.instanceId;}
    const press=(e:PointerEvent)=>{down=[e.clientX,e.clientY];};
    const pick=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down[0],e.clientY-down[1])>7)return;const i=hit(e);if(i!==undefined&&items?.[i])live.current.onPick?.(items[i].id);};
    const hover=(e:PointerEvent)=>{if(e.pointerType==='touch')return;const i=hit(e),title=i!==undefined?items?.[i]?.title??'':'';if(title!==hovered){hovered=title;live.current.onHover?.(title);el!.style.cursor=title?'pointer':'grab';}};
    const leave=()=>{hovered='';live.current.onHover?.('');};
    const keydown=(e:KeyboardEvent)=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','0','+','-','='].includes(e.key))return;e.preventDefault();
      if(e.key==='Home'||e.key==='0'){camera.position.set(0,items?6.5:1,items?10:5.2);controls.target.set(0,0,0);}else if(['+','-','='].includes(e.key)){camera.position.multiplyScalar(e.key==='-'?1.1:.9);camera.position.clampLength(items?7:3,items?18:9);}else{const spherical=new THREE.Spherical().setFromVector3(camera.position);spherical.theta+=e.key==='ArrowLeft'?.13:e.key==='ArrowRight'?-.13:0;spherical.phi+=e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0;spherical.makeSafe();camera.position.setFromSpherical(spherical);}controls.update();wake();};
    const lost=(e:Event)=>{e.preventDefault();contextLost=true;cancelAnimationFrame(frame);setFallback(true);};
    el.addEventListener('pointerdown',press);el.addEventListener('pointerup',pick);el.addEventListener('pointermove',hover);el.addEventListener('pointerleave',leave);el.addEventListener('keydown',keydown);el.addEventListener('webglcontextlost',lost);
    wake();
    return()=>{
      disposed=true;cancelAnimationFrame(frame);invalidate.current=()=>{};resize.disconnect();intersection.disconnect();modalObserver.disconnect();document.removeEventListener('visibilitychange',wake);reduced.removeEventListener('change',wake);controls.removeEventListener('change',wake);controls.dispose();
      el.removeEventListener('pointerdown',press);el.removeEventListener('pointerup',pick);el.removeEventListener('pointermove',hover);el.removeEventListener('pointerleave',leave);el.removeEventListener('keydown',keydown);el.removeEventListener('webglcontextlost',lost);
      scene.remove(model.group);model.dispose();nodeGeo?.dispose();nodeMat?.dispose();scene.traverse(obj=>{if(obj instanceof THREE.Mesh&&obj!==nodes&&!model.group.children.includes(obj)){obj.geometry.dispose();const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach(m=>m.dispose());}});renderer.dispose();
    };
  },[practice,items,resetToken]);
  return <><canvas ref={canvas} className={styles.webgl} style={fallback?{visibility:'hidden'}:undefined} tabIndex={0} role="img" aria-label={`${practice.title}的三維主題示意。拖曳旋轉，方向鍵調整視角，加減鍵縮放，Home 重設。${items?'可點選節點，也可用下方選單選擇條目。':''}`}/>{fallback&&<div className={styles.fallback}><PracticeVisualCanvas practice={practice} large/><span className={styles.stageLegend}>目前使用靜態示意，閱讀與選擇仍可使用。</span></div>}</>;
}

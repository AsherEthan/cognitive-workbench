import * as THREE from 'three';
import { MOTIFS, type VisualProfile } from '@/lib/practices/visuals';

/** Abstract reading models, never prescribed bodily movements or internal measurements. */
export function createPracticeModel(profile: VisualProfile) {
  const group = new THREE.Group();
  const color = new THREE.Color(MOTIFS[profile.motif].color);
  const updates: ((t:number)=>void)[] = [];
  const materials: THREE.Material[] = [];
  const lineMaterial = new THREE.LineBasicMaterial({color,transparent:true,opacity:.7}); materials.push(lineMaterial);
  function line(points: THREE.Vector3[], closed=false) {
    const geometry=new THREE.BufferGeometry().setFromPoints(points);
    const obj=closed?new THREE.LineLoop(geometry,lineMaterial):new THREE.Line(geometry,lineMaterial);group.add(obj);return obj;
  }
  function ring(radius:number, y=0, tilt=0) {
    const points=Array.from({length:96},(_,i)=>new THREE.Vector3(Math.cos(i/96*Math.PI*2)*radius,Math.sin(i/96*Math.PI*2)*radius,0));
    const obj=line(points,true);obj.position.y=y;obj.rotation.x=tilt;return obj;
  }
  function ball(radius:number,x=0,y=0,z=0,opacity=1) {
    const mat=new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.2,transparent:opacity<1,opacity});materials.push(mat);
    const obj=new THREE.Mesh(new THREE.SphereGeometry(radius,24,16),mat);obj.position.set(x,y,z);group.add(obj);return obj;
  }
  function body(horizontal=false) {
    ball(.19,0,1.15);line([new THREE.Vector3(0,.93,0),new THREE.Vector3(0,-.25,0)]);
    line([new THREE.Vector3(-.7,.5,0),new THREE.Vector3(0,.75,0),new THREE.Vector3(.7,.5,0)]);
    line([new THREE.Vector3(-.48,-1.12,0),new THREE.Vector3(0,-.25,0),new THREE.Vector3(.48,-1.12,0)]);
    if(horizontal)group.rotation.z=Math.PI/2;
  }
  switch(profile.motif) {
    case 'breath': {
      for(let i=0;i<6;i++){const obj=ring(.58+i*.18,0,i*.24);updates.push(t=>obj.scale.setScalar(1+.07*Math.sin(t*.65)));}
      ball(.09);break;
    }
    case 'kindness': {
      ball(.16);for(let i=0;i<5;i++){const obj=ring(.3+i*.25,0,.18);updates.push(t=>obj.scale.setScalar(.8+((t*.07+i*.2)%1)*.6));}break;
    }
    case 'withdraw': {
      for(let i=0;i<5;i++){const obj=ring(.4+i*.23,0,.2);updates.push(t=>obj.scale.setScalar(1.2-((t*.05+i*.2)%1)*.4));}ball(.1);break;
    }
    case 'gaze': {ball(.13);ring(.8);ring(1.15,0,.3);break;}
    case 'scan': {
      body();const focus=ball(.12,0,.2,.15);const sweep=ring(.45);sweep.scale.y=.2;
      updates.push(t=>{focus.position.y=Math.cos(t*.4)*.95;sweep.position.y=focus.position.y;});break;
    }
    case 'rest': {body(true);const support=ring(1.45,0,Math.PI/2);support.scale.y=.6;support.position.y=-.6;break;}
    case 'posture': {body();ring(.7,-1.15,Math.PI/2);line([new THREE.Vector3(0,-1.1,-.15),new THREE.Vector3(0,1.5,-.15)]);break;}
    case 'movement': {
      body();for(let i=0;i<3;i++){const obj=ring(.8+i*.2);obj.scale.y=.6;obj.rotation.y=i*.6;updates.push(t=>obj.rotation.z=Math.sin(t*.3+i)*.18);}break;
    }
    case 'oral': {
      for(const side of [-1,1])line(Array.from({length:48},(_,i)=>{const a=i/47*Math.PI;return new THREE.Vector3(Math.cos(a)*1.1,side*(.15+Math.sin(a)*.38),0);}));ball(.06);break;
    }
    case 'walk': {
      line([new THREE.Vector3(-1.6,0,0),new THREE.Vector3(1.6,0,0)]);
      for(let i=0;i<8;i++){const foot=ball(.12,-1.35+i*.38,i%2?.23:-.23);foot.scale.set(1.7,.75,.5);updates.push(t=>foot.scale.z=.4+.3*(.5+.5*Math.sin(t*1.2-i*.7)));}break;
    }
    case 'touch': {body();const focus=ball(.1,.55,.5,.1);for(let i=0;i<3;i++){const obj=ring(.12+i*.09);obj.position.copy(focus.position);updates.push(t=>obj.scale.setScalar(1+.08*Math.sin(t*.5)));}break;}
    case 'recite': {
      ring(1.15,0,.25);for(let i=0;i<18;i++){const a=i/18*Math.PI*2;const bead=ball(.065,Math.cos(a)*1.15,Math.sin(a)*1.15);updates.push(t=>bead.scale.setScalar(1+.5*Math.max(0,Math.cos(t*.8-a))**12));}
      const points=Array.from({length:100},(_,i)=>new THREE.Vector3(-.9+i*.018,Math.sin(i*.18)*.16,0));line(points);break;
    }
    case 'flow': {
      for(let k=-1;k<=1;k++)line(Array.from({length:120},(_,i)=>{const y=-1.3+i/119*2.6;return new THREE.Vector3(Math.sin(y*3+k)*.3+k*.3,y,Math.cos(y*3+k)*.2);}));
      for(let i=0;i<3;i++)ring(.18,-.75+i*.75,Math.PI/2);break;
    }
    case 'moon': {
      const moon=ball(.95,0,0,0);(moon.material as THREE.MeshStandardMaterial).color.set('#cdd6dd');
      for(let i=0;i<16;i++){const a=i*2.399,rr=Math.sqrt((i+1)/17)*.76;const x=Math.cos(a)*rr,y=Math.sin(a)*rr;const crater=ring(.025+(i%3)*.025);crater.position.set(x,y,Math.sqrt(.95**2-x*x-y*y)+.01);}
      ring(1.4,0,.3);break;
    }
    case 'rotate': {
      ball(.14,0,1);line([new THREE.Vector3(0,-1,0),new THREE.Vector3(0,.8,0)]);
      const geometry=new THREE.ConeGeometry(1,.9,48,1,true);const mat=new THREE.MeshStandardMaterial({color,wireframe:true,transparent:true,opacity:.25,side:THREE.DoubleSide});materials.push(mat);const skirt=new THREE.Mesh(geometry,mat);skirt.position.y=-.5;group.add(skirt);
      line([new THREE.Vector3(-.9,.4,0),new THREE.Vector3(.9,.4,0)]);updates.push(t=>group.rotation.y=t*.17);break;
    }
    case 'rhythm': {ring(1.15);ball(.16,-1.15);ball(.11,1.15);const hand=line([new THREE.Vector3(),new THREE.Vector3(0,1.15,0)]);updates.push(t=>hand.rotation.z=-t*.12);break;}
    case 'book': {
      for(const side of [-1,1]){line([new THREE.Vector3(0,-.8,0),new THREE.Vector3(side*1.2,-.6,.2),new THREE.Vector3(side*1.2,.9,.2),new THREE.Vector3(0,.7,0)],true);for(let i=0;i<6;i++)line([new THREE.Vector3(side*.2,-.4+i*.2,.04),new THREE.Vector3(side*1,-.25+i*.2,.18)]);}break;
    }
    case 'visualize': case 'ritual': case 'dream': {
      for(let i=0;i<5;i++){const obj=ring(.35+i*.22,0,i*.3);obj.rotation.y=i*.42;updates.push(t=>obj.rotation.z=t*.03*(i%2?1:-1));}
      if(profile.motif==='visualize'){const mat=new THREE.MeshStandardMaterial({color,wireframe:true,transparent:true,opacity:.6});materials.push(mat);group.add(new THREE.Mesh(new THREE.OctahedronGeometry(.55),mat));}break;
    }
    case 'awareness': {
      const coords=new Float32Array(180*3);for(let i=0;i<180;i++){const a=i*2.399+profile.seed*.001,z=1-2*(i+.5)/180,r=Math.sqrt(1-z*z);coords.set([r*Math.cos(a)*1.35,z*1.35,r*Math.sin(a)*1.35],i*3);}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(coords,3));const mat=new THREE.PointsMaterial({color,size:.035,transparent:true,opacity:.7});materials.push(mat);const points=new THREE.Points(geo,mat);group.add(points);updates.push(t=>points.rotation.y=t*.045);break;
    }
    default: {
      ball(.13);for(let i=0;i<9;i++){const a=i/9*Math.PI*2;const v=new THREE.Vector3(Math.cos(a)*1.15,Math.sin(a)*1.15,Math.sin(i*2)*.25);line([new THREE.Vector3(),v]);ball(.06,v.x,v.y,v.z);}
      if(profile.motif==='index')ring(1.3);break;
    }
  }
  group.rotation.y+=.1;group.rotation.x=.05;
  return {group,update:(t:number)=>{for(const fn of updates)fn(profile.mode==='reference'?0:t);},dispose:()=>{group.traverse(obj=>{if(obj instanceof THREE.Mesh||obj instanceof THREE.Line||obj instanceof THREE.Points)obj.geometry.dispose();});for(const mat of new Set(materials))mat.dispose();}};
}

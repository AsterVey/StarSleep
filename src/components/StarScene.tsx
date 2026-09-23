import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import type {SpaceNode,ExperiencePrefs} from '../shared';
import {ScenePolicy} from '../scene-policy';
import {LaunchScene} from './LaunchScene';

const nodes:SpaceNode[]=['control','agent','workshop','system'];
// Light travel formula adapted from React Bits Hyperspeed CarLights shader,
// commit 9481af758aae6cfb34c3652ec40a1c099360331f, David Haz.
// MIT + Commons Clause; full terms in THIRD_PARTY_NOTICES.txt.
const vertex=`attribute vec3 aOffset; attribute float aSpeed; attribute float aLength;
 uniform float uTime; uniform float uBoost; varying float vFade;
 void main(){vec3 transformed=position;float myLength=aLength*(1.+uBoost*4.);
 transformed.z*=myLength;
 transformed.z+=myLength-mod(uTime*aSpeed+aOffset.z,480.);
 transformed.xy+=aOffset.xy;vFade=1.-clamp(abs(transformed.z)/480.,0.,1.);
 gl_Position=projectionMatrix*modelViewMatrix*vec4(transformed,1.);}`;
const fragment=`varying float vFade;uniform float uGlow;void main(){gl_FragColor=vec4(.28,.70,1.,vFade*uGlow);}`;
type Props={node:SpaceNode;active:boolean;frozen:boolean;reduced:boolean;prefs:ExperiencePrefs;zoom:number;retry:number;launch?:boolean;onStatus:(value:string)=>void};
export function StarScene(props:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
 const [lost,setLost]=useState(false);
 useEffect(()=>{
  const parent=host.current!;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});}catch{setLost(true);props.onStatus('静态星际 · WebGL 不可用');return;}
  setLost(false);renderer.setClearColor(0x030c18,0);renderer.domElement.setAttribute('aria-hidden','true');parent.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(65,1,.1,900),group=new THREE.Group();scene.add(group);
  const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[];
  const addRing=(radius:number,z:number,tilt:number,color:number)=>{const geo=new THREE.TorusGeometry(radius,.13,5,160),mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.72});geometries.push(geo);materials.push(mat);const ring=new THREE.Mesh(geo,mat);ring.position.set(-40,34,z);ring.rotation.set(tilt,-.36,0);group.add(ring);return ring;};
  const rings:THREE.Mesh[]=[];for(let i=0;i<5;i++){rings.push(addRing(38,-90-i*80,.06,0x438ba6));rings.push(addRing(41,-90-i*80,.06,0x183e60));}
  rings.push(addRing(65,-150,1.2,0x526eb4));rings.push(addRing(69,-155,.85,0x297881));
  const ticks=new Float32Array(80*6);for(let i=0;i<80;i++){const a=i/80*Math.PI*2;for(let j=0;j<2;j++)ticks.set([Math.cos(a)*(39+j*2)-40,Math.sin(a)*(39+j*2)+34,-90],i*6+j*3);}const tickGeo=new THREE.BufferGeometry();tickGeo.setAttribute('position',new THREE.BufferAttribute(ticks,3));const tickMat=new THREE.LineBasicMaterial({color:0x84d9e9,transparent:true,opacity:.55});group.add(new THREE.LineSegments(tickGeo,tickMat));geometries.push(tickGeo);materials.push(tickMat);
  const starsGeo=new THREE.BufferGeometry(),stars=new Float32Array(2100*3);for(let i=0;i<stars.length;i+=3){stars[i]=(Math.random()-.5)*460;stars[i+1]=(Math.random()-.5)*290;stars[i+2]=-Math.random()*600;}
  starsGeo.setAttribute('position',new THREE.BufferAttribute(stars,3));const starMat=new THREE.PointsMaterial({color:0xaedafb,size:.22,transparent:true,opacity:.8,sizeAttenuation:true});group.add(new THREE.Points(starsGeo,starMat));geometries.push(starsGeo);materials.push(starMat);
  const lightGeo=new THREE.BufferGeometry(),count=220,positions=new Float32Array(count*6),offsets=new Float32Array(count*6),speeds=new Float32Array(count*2),lengths=new Float32Array(count*2);
  for(let i=0;i<count;i++){const angle=Math.random()*Math.PI*2,r=40+Math.random()*120,x=Math.cos(angle)*r-40,y=Math.sin(angle)*r+34,z=Math.random()*480,speed=20+Math.random()*42,len=3+Math.random()*8;for(let j=0;j<2;j++){const k=i*2+j;positions[k*3+2]=j;offsets.set([x,y,z],k*3);speeds[k]=speed;lengths[k]=len;}}
  lightGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));lightGeo.setAttribute('aOffset',new THREE.BufferAttribute(offsets,3));lightGeo.setAttribute('aSpeed',new THREE.BufferAttribute(speeds,1));lightGeo.setAttribute('aLength',new THREE.BufferAttribute(lengths,1));
  const lightMat=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{uTime:{value:0},uBoost:{value:0},uGlow:{value:.7}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});const trails=new THREE.LineSegments(lightGeo,lightMat);trails.frustumCulled=false;scene.add(trails);geometries.push(lightGeo);materials.push(lightMat);
  let policy=new ScenePolicy(props.prefs.motionQuality??'adaptive'),quality=props.prefs.motionQuality,frame=0,timer:ReturnType<typeof setTimeout>|undefined,lastDraw=0,nextFrame=0,lastInput=performance.now(),time=0,lastNode=props.node,transition=0,previousTier=-1,lastActive=false,failed=false;
  let launchStart=performance.now(),intro:LaunchScene|undefined;
  const start=new THREE.Vector3(),destination=new THREE.Vector3();camera.position.set(0,0,props.launch?165:35/props.zoom);start.copy(camera.position);destination.copy(camera.position);
  const metrics={draws:0,fps:0,tier:0,idle:false,active:false,contexts:1};(window as any).__starScene=metrics;
  const size=()=>{const rect=parent.getBoundingClientRect();renderer.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);camera.aspect=Math.max(1,rect.width)/Math.max(1,rect.height);camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(size);observer.observe(parent);size();
  const input=()=>{lastInput=performance.now();};for(const name of ['pointermove','pointerdown','keydown','wheel'])window.addEventListener(name,input,{passive:true});
  const stop=()=>{cancelAnimationFrame(frame);clearTimeout(timer);frame=0;timer=undefined;metrics.active=false;};
  function draw(now:number){
   frame=0;const p=latest.current;if(failed||!p.active||document.hidden){lastActive=false;stop();return;}
   if(quality!==p.prefs.motionQuality){quality=p.prefs.motionQuality;policy=new ScenePolicy(quality??'adaptive');previousTier=-1;}
   const staticMode=p.reduced||policy.tier===4;
   if(!lastActive){policy.resume();lastDraw=now;nextFrame=now;lastActive=true;}
   // Bound draw rate to a wall-clock cadence, not render-time plus an interval.
   const interval=now-lastInput>=15000?1000/24:1000/60;
   if(!p.frozen&&!staticMode&&now+1<nextFrame){frame=requestAnimationFrame(draw);return;}
   nextFrame=Math.max(nextFrame+interval,now+interval*.25);
   const dt=Math.min(.1,(now-lastDraw)/1000);lastDraw=now;
   if(p.node!==lastNode){lastNode=p.node;start.copy(camera.position);transition=now;}
   const cinematic=!!p.launch&&!staticMode&&!p.frozen;
   if(cinematic&&!intro){intro=new LaunchScene();scene.add(intro.group);launchStart=now;camera.far=1600;camera.updateProjectionMatrix();}
   if(!cinematic&&intro){intro.dispose();intro=undefined;camera.far=900;camera.fov=65;camera.up.set(0,1,0);camera.updateProjectionMatrix();camera.position.set(0,0,35/p.zoom);}
   group.visible=!cinematic;trails.visible=!cinematic;
   const index=nodes.indexOf(p.node);destination.set([0,12,-12,8][index],[0,5,-3,8][index],35/p.zoom-index*70);
   if(p.frozen){transition=0;start.copy(camera.position);}else if(staticMode){camera.position.copy(destination);transition=0;}else if(transition){const t=Math.min(1,(now-transition)/600),ease=1-Math.pow(1-t,3);camera.position.lerpVectors(start,destination,ease);if(t===1)transition=0;}else camera.position.lerp(destination,.16);
   camera.lookAt(-22,10,camera.position.z-130);
   if(!staticMode&&!p.frozen){time+=dt;lightMat.uniforms.uTime.value=time;lightMat.uniforms.uBoost.value=transition?Math.sin(Math.min(1,(now-transition)/600)*Math.PI):0;rings[10].rotation.z=time*.02;rings[11].rotation.z=-time*.025;}
   trails.position.z=-index*70;
   if(previousTier!==policy.tier){previousTier=policy.tier;starsGeo.setDrawRange(0,policy.tier>=1?700:2100);lightGeo.setDrawRange(0,policy.tier>=1?180:count*2);renderer.setPixelRatio(Math.min(devicePixelRatio,policy.tier>=2?.8:1.5));lightMat.uniforms.uGlow.value=policy.tier>=3?.28:.7;size();}
   if(intro){const pose=intro.update(now-launchStart,camera,policy.tier);parent.dataset.launchPhase=pose.phase;parent.dataset.launchTime=String(Math.round(now-launchStart));}else{delete parent.dataset.launchPhase;delete parent.dataset.launchTime;}
   renderer.render(scene,camera);policy.sample(now,lastInput);Object.assign(metrics,{draws:metrics.draws+1,fps:Math.round(policy.fps),tier:policy.tier,idle:policy.idle,active:!p.frozen&&!staticMode});
   parent.dataset.draws=String(metrics.draws);parent.dataset.tier=String(policy.tier);
   const label=p.frozen?'提醒优先 · 场景冻结':staticMode?(p.reduced?'减少动态效果':policy.quality==='static'?'静态星际':'已自动切换静态 · 可重新启用'):policy.idle?'静候 · 24 FPS':`星际航行 · ${['标准','低密度','低分辨率','低辉光'][policy.tier]}`;
   if(parent.dataset.status!==label){parent.dataset.status=label;latest.current.onStatus(label);}
   if(p.frozen||staticMode){stop();return;}timer=setTimeout(()=>{timer=undefined;frame=requestAnimationFrame(draw);},Math.max(0,nextFrame-performance.now()-6));
  }
  const wake=()=>{if(!frame&&!timer&&latest.current.active&&!document.hidden&&!failed){lastDraw=performance.now();frame=requestAnimationFrame(draw);}};
  // Props wake the paused renderer without polling or drawing while hidden.
  const event=()=>{stop();lastActive=false;wake();};parent.addEventListener('scene-state',event);document.addEventListener('visibilitychange',event);
  const contextLost=(e:Event)=>{e.preventDefault();failed=true;stop();setLost(true);latest.current.onStatus('静态星际 · 图形上下文已丢失');};renderer.domElement.addEventListener('webglcontextlost',contextLost);wake();
  return()=>{stop();intro?.dispose();observer.disconnect();parent.removeEventListener('scene-state',event);document.removeEventListener('visibilitychange',event);for(const name of ['pointermove','pointerdown','keydown','wheel'])window.removeEventListener(name,input);renderer.domElement.removeEventListener('webglcontextlost',contextLost);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
 },[props.retry]);
 useEffect(()=>{host.current?.dispatchEvent(new Event('scene-state'));},[props.active,props.frozen,props.reduced,props.node,props.zoom,props.prefs.motionQuality,props.launch]);
 return <div ref={host} className={`star-scene ${lost?'scene-lost':''}`} aria-hidden="true"/>;
}

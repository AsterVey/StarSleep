import React,{useEffect,useRef} from 'react';
import {X,Info} from 'lucide-react';
export function Switch({value,onChange,label,disabled=false}:{value:boolean;onChange:()=>void;label:string;disabled?:boolean}){return <button type="button" className={`switch ${value?'on':''}`} role="switch" aria-checked={value} aria-label={label} onClick={onChange} disabled={disabled}><span/></button>;}
export function Modal({children,title,onClose,wide=false}:{children:React.ReactNode;title:string;onClose?:()=>void;wide?:boolean}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement,d=ref.current!;d.showModal();return()=>{d.close();queueMicrotask(()=>{if(previous?.isConnected)previous.focus();});};},[]);
  return <dialog ref={ref} className={`modal ${wide?'wide':''}`} onCancel={e=>{e.preventDefault();onClose?.();}} aria-label={title}><div className="modal-head"><h2>{title}</h2>{onClose&&<button type="button" className="icon-button" aria-label="关闭面板" onClick={onClose}><X size={20}/></button>}</div>{children}</dialog>;
}
export function Toast({text}:{text:string}){const ref=useRef<HTMLDivElement>(null);useEffect(()=>{ref.current?.showPopover();},[text]);return <div ref={ref} popover="manual" className="toast" role="status"><Info size={18}/>{text}</div>;}
export function Ripple({active}:{active:boolean}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{if(!active)return;const c=ref.current!,ctx=c.getContext('2d')!;let waves:{x:number;y:number;t:number}[]=[],frame=0,last=0;
 const resize=()=>{const scale=Math.min(devicePixelRatio,1.5);c.width=innerWidth*scale;c.height=innerHeight*scale;ctx.setTransform(scale,0,0,scale,0,0);};resize();
 const draw=(now:number)=>{ctx.clearRect(0,0,innerWidth,innerHeight);waves=waves.filter(w=>now-w.t<850);for(const w of waves){const p=Math.max(0,Math.min(1,(now-w.t)/850));ctx.beginPath();ctx.arc(w.x,w.y,5+p*72,0,Math.PI*2);ctx.strokeStyle=`rgba(130,215,252,${(1-p)*.19})`;ctx.stroke();}frame=waves.length?requestAnimationFrame(draw):0;};
 const move=(e:PointerEvent)=>{const now=performance.now();if(now-last<90)return;last=now;waves.push({x:e.clientX,y:e.clientY,t:now});if(!frame)frame=requestAnimationFrame(draw);};
 window.addEventListener('pointermove',move);window.addEventListener('resize',resize);return()=>{cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);window.removeEventListener('resize',resize);ctx.clearRect(0,0,c.width,c.height);};
 },[active]);return <canvas ref={ref} className="ripples" aria-hidden="true"/>;
}

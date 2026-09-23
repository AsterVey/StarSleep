import {useEffect,useRef} from 'react';
import {ArrowRight,Orbit} from 'lucide-react';
import {PRODUCT} from '../product';
export function Launch({onEnter,observing=false,onReplay}:{onEnter:()=>void;observing?:boolean;onReplay?:()=>void}){
 const button=useRef<HTMLButtonElement>(null);
 useEffect(()=>{button.current?.focus();},[]);
 return <section className={`launch-view ${observing?'observing':'cinematic-launch'}`} aria-label={observing?'星际观景':'启动动画'}>{!observing&&<><div className="cinema-shade" aria-hidden="true"/><div className="launch-reticle" aria-hidden="true"><i/><i/><i/><i/></div><div className="launch-stages" aria-hidden="true"><span>星门蓄能</span><span>跃迁航道已展开</span><span>欢迎抵达星枢</span></div></>}<div className="launch-copy"><Orbit size={42} strokeWidth={1}/><h1>{PRODUCT.name}<span>StarNexus</span></h1><p>让灵感有处汇聚，让工作从容启程。</p>{observing&&onReplay&&<button className="text-button launch-replay" onClick={onReplay}>重播开场</button>}</div><div className="launch-actions"><button ref={button} className="launch-enter" onClick={onEnter}>{observing?'返回工作台':'进入工作台'} <ArrowRight size={18}/></button><small>{observing?'Esc 返回 · 滚轮调整镜头':'随时进入 · Esc 跳过动画'}</small></div></section>;
}

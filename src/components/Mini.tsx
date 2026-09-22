import {ArrowUpRight,Pause,Play,Pin,PinOff,X,Moon} from 'lucide-react';
import type {Snapshot,ExperienceSnapshot} from '../shared';
import {Countdown} from './Console';
import {fullTime} from '../plan-utils';
export function Mini({state,experience,busy,onFull,onPause,onPin,onHide}:{state:Snapshot;experience:ExperienceSnapshot;busy:boolean;onFull:()=>void;onPause:()=>void;onPin:()=>void;onHide:()=>void}){
 const future=state.plans.filter(p=>p.nextAt!==null).sort((a,b)=>a.nextAt!-b.nextAt!);
 const next=future.find(p=>p.kind==='shutdown')??future[0],fault=!!state.storageError;
 return <section className={`mini-console ${fault?'fault':''}`} aria-label="迷你控制台">
  <header className="mini-title"><Moon size={16}/><strong>星眠</strong>{state.safeMode&&<span className="mini-safe">安全测试 · 不关机</span>}<div><button aria-label={experience.prefs.miniPinned?'取消置顶':'置顶小窗'} disabled={!!experience.error} onClick={onPin}>{experience.prefs.miniPinned?<Pin size={15}/>:<PinOff size={15}/>}</button><button aria-label="隐藏到托盘" onClick={onHide}><X size={16}/></button></div></header>
  <div className="mini-readout"><div><span>{fault?'自动执行已停止':state.paused?'全部计划已暂停':next?next.kind==='shutdown'?'距离下次关机':'距离下次提醒':'暂无计划'}</span><Countdown at={next?.nextAt??null} paused={state.paused||fault}/></div><button className="mini-return" aria-label="返回完整界面" onClick={onFull}><ArrowUpRight size={23}/></button></div>
  <p className="mini-plan" title={state.storageError??next?.name}>{fault?'请返回完整界面查看故障':next?.name??'打开完整界面，安排一次休息'}</p>
  <div className="mini-bottom"><span>{next?`${state.paused?'原定 ':''}${fullTime(next.nextAt!)}`:'关闭此窗后仍在托盘运行'}</span><button aria-label={state.paused?'恢复计划':'暂停全部'} disabled={busy||fault} onClick={onPause}>{state.paused?<Play size={15}/>:<Pause size={15}/>}</button></div>
 </section>;
}

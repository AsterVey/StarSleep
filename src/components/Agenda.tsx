import {useEffect,useState} from 'react';
import {CalendarDays,Power,Bell} from 'lucide-react';
import type {Agenda,Snapshot} from '../shared';
import {fullTime} from '../plan-utils';
export function AgendaPanel({active,state,onEdit}:{active:boolean;state:Snapshot;onEdit:(p:Snapshot['plans'][number])=>void}){
 const [agenda,setAgenda]=useState<Agenda|null>(null),[date,setDate]=useState(''),[page,setPage]=useState(0),[error,setError]=useState('');
 useEffect(()=>{if(!active||!window.starSleep)return;let live=true;const apply=(a:Agenda)=>{if(live){setAgenda(a);setDate(old=>a.days.some(d=>d.date===old)?old:a.days[0].date);setPage(0);setError('');}};
  const off=window.starSleep.agendaChanged(apply);window.starSleep.agendaWatch(true);void window.starSleep.agenda().then(apply).catch(e=>setError(String(e)));return()=>{live=false;off();window.starSleep?.agendaWatch(false);};
 },[active]);
 if(!active)return null;
 const day=agenda?.days.find(d=>d.date===date),items=day?.occurrences??[];
 return <div className="agenda-view"><div className="agenda-heading"><CalendarDays size={17}/><span>{state.storageError?'自动执行已停止':state.paused?'全部暂停 · 原定安排':'未来七天 · 已启用计划'}</span></div>
 <div className="agenda-days" role="group" aria-label="选择预览日期">{agenda?.days.map((d,i)=><button key={d.date} aria-pressed={date===d.date} aria-label={`${d.date} ${d.occurrences.length} 项`} onClick={()=>{setDate(d.date);setPage(0);}}><span>{i===0?'今天':new Date(`${d.date}T12:00:00`).toLocaleDateString('zh-CN',{weekday:'short'})}</span><strong>{Number(d.date.slice(-2))}</strong><small>{d.occurrences.length} 项</small></button>)}</div>
 <div className="agenda-list">{error?<p role="alert">{error}</p>:!agenda?<p className="muted">正在计算未来安排…</p>:!items.length?<div className="empty small"><MoonIcon/><h3>这一天暂时没有安排</h3><p>只展示尚未执行的已启用计划。</p></div>:items.slice(page*50,(page+1)*50).map(o=><button className="agenda-event" key={o.key} disabled={!!state.storageError} onClick={()=>{const p=state.plans.find(p=>p.id===o.planId);if(p)onEdit(p);}}>{o.kind==='shutdown'?<Power size={18}/>:<Bell size={18}/>}<span><strong>{o.name}</strong><small>{fullTime(o.at)}{o.at!==o.originalAt?' · 已延后':''}</small></span><em>{o.kind==='shutdown'?'关机':'闹钟'}</em></button>)}</div>
 {items.length>50&&<nav className="pagination" aria-label="预览分页"><button disabled={!page} onClick={()=>setPage(p=>p-1)}>上一页</button><span>{page+1} / {Math.ceil(items.length/50)}</span><button disabled={(page+1)*50>=items.length} onClick={()=>setPage(p=>p+1)}>下一页</button></nav>}
 <p className="agenda-note">按当前规则推算；实际执行仍要求星眠运行。</p></div>;
}
function MoonIcon(){return <CalendarDays size={29}/>;}

import type { PlanInput, Plan, Snapshot } from './shared';
export const localDate=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const timeText=(at:number,seconds=false)=>new Date(at).toLocaleTimeString('zh-CN',{hour12:false,hour:'2-digit',minute:'2-digit',...(seconds?{second:'2-digit'}:{})});
export const fullTime=(at:number)=>new Date(at).toLocaleString('zh-CN',{hour12:false});
export const recurrence=(p:PlanInput)=>p.repeat==='once'?p.date:p.repeat==='daily'?'每天':`每周${[1,2,3,4,5,6,0].filter(d=>p.weekdays.includes(d)).map(d=>'日一二三四五六'[d]).join('、')}`;
export const isFinished=(p:Snapshot['plans'][number])=>p.repeat==='once'&&['已完成','已取消','已跳过','已错过'].includes(p.outcome??p.status);
export function nextTime(p:PlanInput,now:number):number|null {
  if(p.repeat==='once'){const at=+new Date(`${p.date}T${p.time}:00`);return Number.isFinite(at)&&at>now?at:null;}
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time))return null;
  const [h,m]=p.time.split(':').map(Number);
  for(let day=0;day<=7;day++){const d=new Date(now);d.setDate(d.getDate()+day);d.setHours(h,m,0,0);if(+d>now&&(p.repeat==='daily'||p.weekdays.includes(d.getDay())))return +d;}
  return null;
}
export function errorsFor(p:PlanInput,now:number,exactAt?:number) {
  const e:Partial<Record<keyof PlanInput,string>>={};
  if(!p.name.trim()||p.name.length>48)e.name='请输入 1–48 个字的名称';
  if(p.notes!==undefined&&(typeof p.notes!=='string'||p.notes.length>500))e.notes='备注最多 500 个字';
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time))e.time='请选择有效的时间';
  if(p.repeat==='weekly'&&!p.weekdays.length)e.weekdays='请至少选择一个星期';
  if(p.repeat==='once'){
    const at=new Date(`${p.date}T${p.time}:00`);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Number.isFinite(+at)||localDate(at)!==p.date)e.date='请选择有效的日期';
    else if((exactAt??+at)<=now)e.time='执行时间必须晚于现在';
  }
  return e;
}
export function draftPlan(template?:'workday'|'daily'):PlanInput {
  const later=Date.now()+3600000;
  return {name:template==='daily'?'每天休息提醒':template==='workday'?'工作日夜间关机':'夜间自动关机',kind:template==='daily'?'alarm':'shutdown',repeat:template==='workday'?'weekly':'daily',date:localDate(new Date(later)),time:template==='workday'?'23:30':template==='daily'?'21:00':timeText(later),weekdays:[1,2,3,4,5],enabled:true};
}
export function copyPlan(p:Plan):PlanInput {
  return {name:(p.name.slice(0,43)+' · 副本').slice(0,48),kind:p.kind,repeat:p.repeat,date:p.date,time:p.time,weekdays:[...p.weekdays],enabled:false,...(p.notes?{notes:p.notes}:{})};
}
export function selectPlans(plans:Snapshot['plans'],query:string,kind:string,status:string,sort:string){
  const search=query.trim().toLocaleLowerCase();
  return plans.filter(p=>(!search||`${p.name}\n${p.notes??''}`.toLocaleLowerCase().includes(search))&&(kind==='all'||p.kind===kind)&&(status==='all'||(status==='enabled'&&p.enabled&&!isFinished(p))||(status==='disabled'&&!p.enabled)||(status==='finished'&&isFinished(p))))
    .sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'zh-CN'):sort==='created'?b.createdAt-a.createdAt:(a.nextAt??Infinity)-(b.nextAt??Infinity)||b.createdAt-a.createdAt);
}

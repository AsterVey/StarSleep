import type { PresetInput, PlanInput, QuickInput, RuntimeState } from './shared';
import { localDate } from './plan-utils';

export function normalizePreset(value: unknown): PresetInput {
  const p = value as PresetInput;
  if (!p || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 48 || !['shutdown','alarm'].includes(p.kind)) throw new Error('模板名称需为 1–48 个字，且动作有效');
  if(p.notes!==undefined&&(typeof p.notes!=='string'||p.notes.length>500))throw new Error('模板备注最多 500 个字');
  const common = {name:p.name.trim(), kind:p.kind,...(p.notes?.trim()?{notes:p.notes.trim()}:{})};
  if (p.type === 'quick') {
    if (!Number.isInteger(p.minutes) || p.minutes < 1 || p.minutes > 1440) throw new Error('模板时长应为 1–1440 的整数分钟');
    return {...common,type:'quick',minutes:p.minutes};
  }
  if (p.type !== 'schedule' || !['once','daily','weekly'].includes(p.repeat) || typeof p.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time) || !Array.isArray(p.weekdays) || p.weekdays.some(d=>!Number.isInteger(d)||d<0||d>6) || (p.repeat==='weekly'&&!p.weekdays.length)) throw new Error('请选择有效的模板时间和重复规则');
  return {...common,type:'schedule',repeat:p.repeat,time:p.time,weekdays:p.repeat==='weekly'?[...new Set(p.weekdays)].sort():[]};
}
export function presetDraft(p: PresetInput, now=Date.now()): PlanInput | QuickInput {
  p=normalizePreset(p);
  if(p.type==='quick')return {kind:p.kind,minutes:p.minutes,name:p.name,...(p.notes?{notes:p.notes}:{})};
  const date=new Date(now),[h,m]=p.time.split(':').map(Number);date.setHours(h,m,0,0);
  if(+date<=now)date.setDate(date.getDate()+1);
  return {name:p.name,kind:p.kind,repeat:p.repeat,time:p.time,weekdays:[...p.weekdays],date:localDate(date),enabled:true,...(p.notes?{notes:p.notes}:{})};
}
export function shipStatus(r:RuntimeState,hasPlans:boolean) {
  if(r.storageError)return {key:'fault',label:'故障保护'};
  if(r.warnings.length)return {key:'warning',label:'关机提醒'};
  if(r.alarms.length)return {key:'alarm',label:'提醒信号'};
  if(r.paused)return {key:'paused',label:'暂停待机'};
  return hasPlans?{key:'cruise',label:'计划巡航'}:{key:'standby',label:'等待启航'};
}

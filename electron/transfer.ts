import type { Plan, PlanDefinition } from '../src/shared';
import { validate, localDate } from './scheduler';
export const MAX_TRANSFER_BYTES=1024*1024;
export const MAX_TRANSFER_PLANS=500;
export function normalizeDefinition(value: unknown): PlanDefinition {
  if(!value||typeof value!=='object')throw new Error('计划条目格式无效');
  const p={...value} as PlanDefinition;
  if(p.exactAt!==undefined){
    const d=new Date(p.exactAt);
    if(p.repeat!=='once'||!Number.isSafeInteger(p.exactAt)||!Number.isFinite(+d))throw new Error('快捷计划时间无效');
    p.date=localDate(d);p.time=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }
  validate({...p,enabled:false},-Infinity);
  return {name:p.name.trim(),kind:p.kind,repeat:p.repeat,date:p.repeat==='once'?p.date:'',time:p.time,weekdays:p.repeat==='weekly'?[...new Set(p.weekdays)].sort():[],enabled:false,...(p.exactAt===undefined?{}:{exactAt:p.exactAt}),...(p.notes?.trim()?{notes:p.notes.trim()}:{})};
}
export function parseTransfer(raw: string): PlanDefinition[] {
  if(Buffer.byteLength(raw,'utf8')>MAX_TRANSFER_BYTES)throw new Error('导入文件不能超过 1 MB');
  let value;try{value=JSON.parse(raw.replace(/^\uFEFF/,''));}catch{throw new Error('文件不是有效的 JSON');}
  if(value?.format!=='starsleep-plans'||value.version!==1||!Array.isArray(value.plans))throw new Error('不支持的计划文件格式或版本');
  if(value.plans.length>MAX_TRANSFER_PLANS)throw new Error('一次最多导入 500 条计划');
  return value.plans.map(normalizeDefinition);
}
export function exportTransfer(plans: Plan[]): string {
  if(plans.length>MAX_TRANSFER_PLANS)throw new Error('当前超过 500 条计划，请减少计划数量后导出');
  const raw=JSON.stringify({format:'starsleep-plans',version:1,plans:plans.map(normalizeDefinition)},null,2);
  if(Buffer.byteLength(raw,'utf8')>MAX_TRANSFER_BYTES)throw new Error('计划文件超过 1 MB，无法导出');
  return raw;
}
const signature=(p:PlanDefinition)=>JSON.stringify([p.name.trim(),p.kind,p.repeat,p.repeat==='once'?(p.exactAt??+new Date(`${p.date}T${p.time}:00`)):p.time,p.repeat==='weekly'?[...new Set(p.weekdays)].sort():[],p.notes?.trim()??'']);
export function classifyImport(definitions: PlanDefinition[],existing: Plan[],now:number){
  const seen=new Set(existing.map(signature)),accepted:PlanDefinition[]=[],skipped:{name:string;reason:string}[]=[];let duplicate=0,expired=0;
  for(const raw of definitions){const p=normalizeDefinition(raw);
    if(p.repeat==='once'&&(p.exactAt??+new Date(`${p.date}T${p.time}:00`))<=now){expired++;skipped.push({name:p.name,reason:'单次时间已过期'});continue;}
    const key=signature(p);if(seen.has(key)){duplicate++;skipped.push({name:p.name,reason:'与现有计划或文件内条目重复'});continue;}seen.add(key);accepted.push(p);
  }
  return {accepted,duplicate,expired,skipped};
}

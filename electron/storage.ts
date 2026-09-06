import fs from 'node:fs';
import path from 'node:path';
import { defaults, localDate } from './scheduler';
import type { StoreData } from '../src/shared';
export function parseStore(raw:string):StoreData {
  const d=JSON.parse(raw);
  if(d.version!==1 || !Array.isArray(d.plans) || !Array.isArray(d.logs) || !d.handled || typeof d.handled!=='object' || Array.isArray(d.handled) || !d.overrides || typeof d.overrides!=='object' || Array.isArray(d.overrides))throw new Error('数据格式无效');
  for(const p of d.plans) {
    if(typeof p.id!=='string' || !/^[a-zA-Z0-9-]+$/.test(p.id) || typeof p.name!=='string' || p.name.length>48 || !['once','daily','weekly'].includes(p.repeat) || !['alarm','shutdown'].includes(p.kind) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time) || !Array.isArray(p.weekdays) || p.weekdays.some((x:number)=>!Number.isInteger(x)||x<0||x>6) || !Number.isInteger(p.revision) || typeof p.enabled!=='boolean')throw new Error('计划数据损坏');
    if(p.repeat==='once' && (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Number.isFinite(+new Date(`${p.date}T${p.time}:00`))||localDate(new Date(`${p.date}T${p.time}:00`))!==p.date))throw new Error('日期数据损坏');
    if(p.repeat==='weekly'&&!p.weekdays.length)throw new Error('星期数据损坏');
  }
  if(Object.values(d.handled).some(v=>typeof v!=='number'||!Number.isFinite(v)) || Object.values(d.overrides).some(v=>typeof v!=='number'||!Number.isFinite(v)))throw new Error('执行记录损坏');
  if(d.logs.some((l:any)=>!Number.isFinite(l.at)||typeof l.text!=='string'||!['info','error'].includes(l.level)))throw new Error('日志损坏');
  d.settings={...defaults().settings,...d.settings};
  if(typeof d.settings.sound!=='boolean'||typeof d.settings.reducedMotion!=='boolean'||!Number.isFinite(d.settings.volume)||d.settings.volume<0||d.settings.volume>1)throw new Error('设置损坏');
  return d;
}
export class Storage {
  file:string; recovery='';
  constructor(public dir:string){fs.mkdirSync(dir,{recursive:true});this.file=path.join(dir,'schedules.json');}
  load():StoreData {
    if(!fs.existsSync(this.file) && !fs.existsSync(this.file+'.bak'))return defaults();
    try{return parseStore(fs.readFileSync(this.file,'utf8'));}catch{}
    try{const d=parseStore(fs.readFileSync(this.file+'.bak','utf8'));this.recovery='主数据损坏，已从备份恢复；计划已暂停，请检查后重新启用。';for(const p of d.plans)p.enabled=false;return d;}catch{}
    throw new Error(`计划文件及备份无法读取。为避免丢失数据，软件未覆盖它们。请检查 ${this.dir}`);
  }
  save(data:StoreData) {
    const temp=this.file+'.tmp';
    const fd=fs.openSync(temp,'w');try{fs.writeFileSync(fd,JSON.stringify(data,null,2),'utf8');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    if(fs.existsSync(this.file)){try{parseStore(fs.readFileSync(this.file,'utf8'));fs.copyFileSync(this.file,this.file+'.bak');}catch(e){if((e as NodeJS.ErrnoException).code)throw e;}}
    fs.renameSync(temp,this.file);
    if(!fs.existsSync(this.file+'.bak'))fs.copyFileSync(this.file,this.file+'.bak');
  }
}

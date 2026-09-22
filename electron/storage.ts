import fs from 'node:fs';
import path from 'node:path';
import { defaults, localDate } from './scheduler';
import type { StoreData } from '../src/shared';
import { normalizeDefinition } from './transfer';
export function parseStore(raw:string):StoreData {
  const d=JSON.parse(raw);
  if(![1,2].includes(d.version) || !Array.isArray(d.plans) || !Array.isArray(d.logs) || !d.handled || typeof d.handled!=='object' || Array.isArray(d.handled) || !d.overrides || typeof d.overrides!=='object' || Array.isArray(d.overrides))throw new Error('数据格式无效');
  if(d.version===2 && typeof d.paused!=='boolean')throw new Error('暂停状态损坏');
  if(new Set(d.plans.map((p:any)=>p?.id)).size!==d.plans.length)throw new Error('计划标识重复');
  for(const p of d.plans) {
    const definition=normalizeDefinition(p);if(p.exactAt!==undefined){p.date=definition.date;p.time=definition.time;}
    if(typeof p.id!=='string' || !/^[a-zA-Z0-9-]+$/.test(p.id) || typeof p.name!=='string' || p.name.length>48 || !['once','daily','weekly'].includes(p.repeat) || !['alarm','shutdown'].includes(p.kind) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time) || !Array.isArray(p.weekdays) || p.weekdays.some((x:number)=>!Number.isInteger(x)||x<0||x>6) || !Number.isInteger(p.revision) || typeof p.enabled!=='boolean')throw new Error('计划数据损坏');
    if(p.repeat==='once' && (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||!Number.isFinite(+new Date(`${p.date}T${p.time}:00`))||localDate(new Date(`${p.date}T${p.time}:00`))!==p.date))throw new Error('日期数据损坏');
    if(p.repeat==='weekly'&&!p.weekdays.length)throw new Error('星期数据损坏');
  }
  if(Object.values(d.handled).some(v=>typeof v!=='number'||!Number.isFinite(v)) || Object.values(d.overrides).some(v=>typeof v!=='number'||!Number.isFinite(v)))throw new Error('执行记录损坏');
  if(d.logs.some((l:any)=>!Number.isFinite(l.at)||typeof l.text!=='string'||!['info','error'].includes(l.level)))throw new Error('日志损坏');
  d.settings={...defaults().settings,...d.settings};
  if(typeof d.settings.sound!=='boolean'||typeof d.settings.reducedMotion!=='boolean'||!Number.isFinite(d.settings.volume)||d.settings.volume<0||d.settings.volume>1)throw new Error('设置损坏');
  if(![1,5,10,15,30].includes(d.settings.warningMinutes)||![15,30,60].includes(d.settings.alarmSeconds))throw new Error('提醒设置损坏');
  return {...d,version:2,paused:d.version===1?false:d.paused};
}
export class Storage {
  file:string; recovery='';
  constructor(public dir:string){fs.mkdirSync(dir,{recursive:true});this.file=path.join(dir,'schedules.json');}
  load():StoreData {
    if(!fs.existsSync(this.file) && !fs.existsSync(this.file+'.bak'))return defaults();
    // An unknown future schema is not corruption: do not silently restore older data.
    if(fs.existsSync(this.file)){try{const v=JSON.parse(fs.readFileSync(this.file,'utf8')).version;if(typeof v==='number'&&v>2)throw new Error('此数据由更高版本星眠创建，请使用新版打开');}catch(e){if(String(e).includes('更高版本'))throw e;}}
    let raw:string|undefined,data:StoreData|undefined;
    try{raw=fs.readFileSync(this.file,'utf8');data=parseStore(raw);}catch{}
    if(!data){try{raw=fs.readFileSync(this.file+'.bak','utf8');data=parseStore(raw);this.recovery='主数据损坏，已从备份恢复；计划已暂停，请检查后重新启用。';for(const p of data.plans)p.enabled=false;data.paused=true;}catch{}}
    if(data&&raw){
      if(JSON.parse(raw).version===1){
        const migrationBackup=path.join(this.dir,'schedules.v1.backup.json');
        if(!fs.existsSync(migrationBackup)){
          const fd=fs.openSync(migrationBackup,'wx');try{fs.writeFileSync(fd,raw,'utf8');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
        }else{const previous=fs.readFileSync(migrationBackup,'utf8');if(JSON.parse(previous).version!==1)throw new Error('升级备份格式异常，未覆盖原计划');parseStore(previous);}
        this.save(data);
      }
      return data;
    }
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

import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import type {ExperiencePrefs, Preset, PresetInput, WindowMode, ExperienceSnapshot} from '../src/shared';
import {normalizePreset} from '../src/presets';
export interface Bounds {x:number;y:number;width:number;height:number}
interface ExperienceData {version:1;presets:Preset[];prefs:ExperiencePrefs;bounds:Partial<Record<WindowMode,Bounds>>}
const defaults=():ExperienceData=>({version:1,presets:[],prefs:{interaction:true,miniPinned:true},bounds:{}});
export function validBounds(b:unknown):b is Bounds {const v=b as Bounds;return !!v&&['x','y','width','height'].every(k=>Number.isFinite(v[k as keyof Bounds]))&&v.width>0&&v.height>0&&v.width<=20000&&v.height<=20000;}
function preferences(value:ExperiencePrefs):ExperiencePrefs {
  if(!value||typeof value.interaction!=='boolean'||typeof value.miniPinned!=='boolean')throw new Error('体验偏好无效');
  return {interaction:value.interaction,miniPinned:value.miniPinned};
}
export function parseExperience(raw:string):ExperienceData {
  const v=JSON.parse(raw);
  if(v?.version!==1||!Array.isArray(v.presets)||!v.bounds||typeof v.bounds!=='object')throw new Error('体验文件格式不支持');
  const presets=v.presets.map((p:any)=>{if(typeof p.id!=='string'||!/^[a-zA-Z0-9-]+$/.test(p.id))throw new Error('模板标识损坏');return {...normalizePreset(p),id:p.id};});
  if(new Set(presets.map((p:Preset)=>p.id)).size!==presets.length)throw new Error('模板标识重复');
  const bounds:ExperienceData['bounds']={};for(const mode of ['full','mini'] as const)if(v.bounds[mode]!==undefined){if(!validBounds(v.bounds[mode]))throw new Error('窗口位置损坏');bounds[mode]={...v.bounds[mode]};}
  return {version:1,presets,prefs:preferences(v.prefs),bounds};
}
export class ExperienceStore {
  data=defaults();error='';notice='';file:string;
  constructor(dir:string){
    this.file=path.join(dir,'experience.json');
    if(!fs.existsSync(this.file)&&!fs.existsSync(this.file+'.bak'))return;
    if(fs.existsSync(this.file))try{const version=JSON.parse(fs.readFileSync(this.file,'utf8')).version;if(typeof version==='number'&&version>1){this.error='体验文件来自更高版本，已保留原文件；个人模板暂不可用。';return;}}catch{}
    try{this.data=parseExperience(fs.readFileSync(this.file,'utf8'));return;}catch{}
    try{this.data=parseExperience(fs.readFileSync(this.file+'.bak','utf8'));this.notice='体验设置已从备份恢复，请核对个人模板。';}catch{this.error='体验文件及备份无法读取，已保留原文件；个人模板与偏好保存暂不可用，现有计划继续运行。';}
  }
  snapshot(mode:WindowMode):ExperienceSnapshot {return {presets:this.data.presets,prefs:this.data.prefs,mode,error:this.error||undefined,notice:this.notice||undefined};}
  private save(next:ExperienceData){
    if(this.error)throw new Error(this.error);
    try{
      const fd=fs.openSync(this.file+'.tmp','w');try{fs.writeFileSync(fd,JSON.stringify(next,null,2));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
      if(fs.existsSync(this.file)){let valid=false;try{parseExperience(fs.readFileSync(this.file,'utf8'));valid=true;}catch{}if(valid)fs.copyFileSync(this.file,this.file+'.bak');}
      fs.renameSync(this.file+'.tmp',this.file);if(!fs.existsSync(this.file+'.bak'))fs.copyFileSync(this.file,this.file+'.bak');this.data=next;
    }catch{this.error='体验设置保存失败；现有计划继续运行，请检查数据目录后重启。';throw new Error(this.error);}
  }
  preset(value:PresetInput,id?:string){
    const input=normalizePreset(value);if(id!==undefined&&(typeof id!=='string'||!this.data.presets.some(p=>p.id===id)))throw new Error('模板已不存在');
    const p={...input,id:id??randomUUID()};this.save({...this.data,presets:id?this.data.presets.map(x=>x.id===id?p:x):[...this.data.presets,p]});
  }
  remove(id:string){if(typeof id!=='string'||!this.data.presets.some(p=>p.id===id))throw new Error('模板已不存在');this.save({...this.data,presets:this.data.presets.filter(p=>p.id!==id)});}
  prefs(value:ExperiencePrefs){this.save({...this.data,prefs:preferences(value)});}
  bounds(mode:WindowMode,value:Bounds){if(!validBounds(value))throw new Error('窗口位置无效');if(JSON.stringify(this.data.bounds[mode])===JSON.stringify(value))return;this.save({...this.data,bounds:{...this.data.bounds,[mode]:value}});}
}
export function clampBounds(value:Bounds,area:Bounds):Bounds {
  const width=Math.min(Math.round(value.width),area.width),height=Math.min(Math.round(value.height),area.height);
  return {width,height,x:Math.max(area.x,Math.min(Math.round(value.x),area.x+area.width-width)),y:Math.max(area.y,Math.min(Math.round(value.y),area.y+area.height-height))};
}

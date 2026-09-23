import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {atomicJson} from './agent-bridge';
import {RESOURCES} from '../src/resources';
import type {LocalSkill,ResourceMark,TokenCounts,UsageDay,UsageSource} from '../src/toolbox-types';

const count=(v:unknown)=>{if(!Number.isSafeInteger(v)||Number(v)<0)throw new Error('统计数据格式不兼容');return Number(v);};
function counts(v:any):TokenCounts{
 const input=count(v.inputTokens??0),output=count(v.outputTokens??0),cacheRead=count(v.cacheReadTokens??0),cacheWrite=count(v.cacheCreationTokens??0);
 const total=count(v.totalTokens??input+output+cacheRead+cacheWrite);
 return {input,output,cacheRead,cacheWrite,total};
}
// The bundled, unmodified ccusage engine owns log parsing and deduplication.
// This adapter only normalizes its two documented daily JSON report shapes.
export function parseUsage(raw:string,source:UsageSource):UsageDay[]{
 const value=JSON.parse(raw);if(!Array.isArray(value.daily)||value.daily.length>4000)throw new Error('统计数据格式不兼容');
 return value.daily.map((day:any)=>{
  if(typeof day.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day.date))throw new Error('统计日期无效');
  const models=source==='codex'?Object.entries(day.models??{}).map(([name,v])=>({name,tokens:counts(v)})):(day.modelBreakdowns??[]).map((v:any)=>({name:v.modelName,tokens:counts(v)}));
  if(models.length>300||models.some((m:any)=>typeof m.name!=='string'||m.name.length>200))throw new Error('模型名称无效');
  return {date:day.date,source,...counts(day),models};
 });
}
export interface HubData {version:1;marks:Record<string,ResourceMark>;paths:Partial<Record<UsageSource,string>>}
export class HubStore {
 data:HubData={version:1,marks:{},paths:{}};error='';readonly file:string;
 constructor(root:string){this.file=path.join(root,'toolbox.json');if(!fs.existsSync(this.file))return;try{this.data=this.parse(fs.readFileSync(this.file,'utf8'));}catch{try{this.data=this.parse(fs.readFileSync(this.file+'.bak','utf8'));this.error='工具箱主文件损坏，已读取备份；为保留原文件，收藏和目录设置暂不能保存。';}catch{this.error='工具箱配置无法读取，原文件已保留；收藏和目录设置暂不能保存。';}}}
 private parse(raw:string):HubData{if(raw.length>256000)throw new Error();const d=JSON.parse(raw);if(d.version!==1||!d.marks||typeof d.marks!=='object'||!d.paths||typeof d.paths!=='object')throw new Error();for(const [id,mark]of Object.entries(d.marks))validateMark(id,mark);for(const [s,p]of Object.entries(d.paths))if(!['codex','claude'].includes(s)||typeof p!=='string'||!path.isAbsolute(p))throw new Error();return d;}
 private save(next:HubData){if(this.error)throw new Error(this.error);if(fs.existsSync(this.file))fs.copyFileSync(this.file,this.file+'.bak');atomicJson(this.file,next);this.data=next;}
 mark(id:string,value:ResourceMark){validateMark(id,value);this.save({...this.data,marks:{...this.data.marks,[id]:{favorite:value.favorite,note:value.note.trim()}}});}
 location(source:UsageSource,location?:string){if(!['codex','claude'].includes(source)||location!==undefined&&!path.isAbsolute(location))throw new Error('目录参数无效');const paths={...this.data.paths};if(location)paths[source]=location;else delete paths[source];this.save({...this.data,paths});}
}
export function validateMark(id:unknown,value:unknown):asserts value is ResourceMark {const m=value as ResourceMark;if(typeof id!=='string'||!RESOURCES.some(r=>r.id===id)||!m||typeof m.favorite!=='boolean'||typeof m.note!=='string'||m.note.length>300)throw new Error('收藏备注无效（最多 300 字）');}

export async function scanSkills(roots:{client:string;path:string}[]):Promise<{items:LocalSkill[];warnings:string[]}>{
 const items:LocalSkill[]=[],warnings:string[]=[],seen=new Set<string>();let visited=0;
 async function walk(dir:string,client:string,depth:number){
  if(visited++>=1500){if(!warnings.includes('目录较多，本次仅扫描前 1500 个目录。'))warnings.push('目录较多，本次仅扫描前 1500 个目录。');return;}
  let entries:fs.Dirent[];try{if((await fs.promises.lstat(dir)).isSymbolicLink())return;entries=await fs.promises.readdir(dir,{withFileTypes:true});}catch(e:any){if(e.code!=='ENOENT')warnings.push(`${client}：部分技能目录无法读取。`);return;}
  const skill=entries.find(e=>e.isFile()&&e.name==='SKILL.md');
  if(skill){const file=path.join(dir,skill.name),canonical=path.resolve(file).toLowerCase();if(!seen.has(canonical)){seen.add(canonical);let description='未提取到简介，可打开目录查看 SKILL.md。',name=path.basename(dir);try{const handle=await fs.promises.open(file,'r');try{const b=Buffer.alloc(8192);const {bytesRead}=await handle.read(b,0,b.length,0);const header=b.subarray(0,bytesRead).toString('utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);if(header){const field=(key:string)=>header[1].match(new RegExp('^'+key+':\\s*(.+)$','m'))?.[1].trim().replace(/^['"]|['"]$/g,'');name=field('name')||name;const text=field('description');if(text&&!['>','|','>-','|-'].includes(text))description=text;}}finally{await handle.close();}}catch{warnings.push(`${client}：技能简介读取失败。`);}items.push({id:createHash('sha256').update(canonical).digest('hex').slice(0,24),name:name.slice(0,100),description:description.slice(0,500),client,path:dir});}return;}
  if(depth<=0)return;for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name)))if(entry.isDirectory()&&!['node_modules','.git'].includes(entry.name))await walk(path.join(dir,entry.name),client,depth-1);
 }
 for(const root of roots)await walk(root.path,root.client,3);
 return {items:items.sort((a,b)=>a.name.localeCompare(b.name)),warnings:[...new Set(warnings)]};
}

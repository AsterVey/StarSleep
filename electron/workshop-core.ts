import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import type {CommunityTheme,WorkshopState,DownloadTask} from '../src/workshop-types';
import type {AgentProvider} from '../src/integration-types';
import {ThemeLibrary,MAX_THEME_BYTES} from './themes';
export type ThemeFetch=(url:string,signal:AbortSignal,progress:(received:number,total?:number)=>void)=>Promise<Buffer>;
export class Workshop {
 state:WorkshopState={favorites:[],tasks:[],themes:{}};
 private active=new Map<string,AbortController>();private file:string;private stopped=false;
 constructor(root:string,readonly catalog:CommunityTheme[],private library:ThemeLibrary,private fetcher:ThemeFetch,private changed:()=>void){
  this.file=path.join(root,'workshop.json');
  const parse=(raw:string)=>{const d=JSON.parse(raw);if(d.version!==1||!Array.isArray(d.favorites)||d.favorites.some((x:unknown)=>typeof x!=='string')||!Array.isArray(d.tasks)||d.tasks.length>50||d.tasks.some((t:any)=>!t||typeof t.id!=='string'||typeof t.resourceId!=='string'||!['done','failed','cancelled','downloading'].includes(t.status))||!d.themes||typeof d.themes!=='object'||Array.isArray(d.themes))throw Error();return d;};
  if(fs.existsSync(this.file)){try{this.state=parse(fs.readFileSync(this.file,'utf8'));}catch{try{this.state=parse(fs.readFileSync(this.file+'.bak','utf8'));}catch{this.state.error='工坊记录无法读取，已保留原文件；下载和收藏保存暂不可用，计划继续运行。';}}}
  this.state.tasks=this.state.tasks.map(t=>t.status==='downloading'?{...t,status:'failed',error:'上次下载中断，可重试'}:t);
 }
 resource(id:unknown){const r=this.catalog.find(r=>r.id===id);if(!r)throw Error('精选资源不存在');return r;}
 private save(){if(this.state.error)throw Error(this.state.error);fs.mkdirSync(path.dirname(this.file),{recursive:true});const fd=fs.openSync(this.file+'.tmp','w');try{fs.writeFileSync(fd,JSON.stringify({version:1,favorites:this.state.favorites,tasks:this.state.tasks,themes:this.state.themes}));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}if(fs.existsSync(this.file)){try{JSON.parse(fs.readFileSync(this.file,'utf8'));fs.copyFileSync(this.file,this.file+'.bak');}catch{}}fs.renameSync(this.file+'.tmp',this.file);}
 private persist(){try{this.save();}catch{this.state.error='工坊记录保存失败；请检查数据目录后重启，计划不受影响。';}this.changed();}
 favorite(id:string,value:boolean){this.resource(id);if(typeof value!=='boolean')throw Error('收藏参数无效');if(this.state.error)throw Error(this.state.error);this.state.favorites=this.state.favorites.filter(x=>x!==id);if(value)this.state.favorites.push(id);this.persist();return this.state;}
 written(id:string,client:AgentProvider){this.library.get(id);this.state.themes[id]={...this.state.themes[id],client,writtenAt:Date.now(),confirmedAt:undefined};this.persist();}
 restored(client:AgentProvider){for(const [id,m]of Object.entries(this.state.themes))if(m.client===client)this.state.themes[id]={...m,writtenAt:undefined,confirmedAt:undefined};this.persist();}
 confirm(id:string){this.library.get(id);const m=this.state.themes[id];if(!m?.writtenAt)throw Error('请先写入配置，再确认客户端效果');if(this.state.error)throw Error(this.state.error);m.confirmedAt=Date.now();this.persist();return this.state;}
 cancel(id:string){const controller=this.active.get(id);if(!controller)throw Error('下载已结束');controller.abort();}
 stop(){this.stopped=true;for(const c of this.active.values())c.abort();}
 async download(id:string){
  const resource=this.resource(id);if(this.state.error)throw Error(this.state.error);if(this.stopped)throw Error('工坊已退出');if(!resource.download)throw Error('请通过作者入口获取此资源');
  if(this.state.tasks.some(t=>t.resourceId===id&&t.status==='downloading'))throw Error('该资源正在下载');if(this.active.size>=2)throw Error('最多同时下载两个主题');
  if(Object.entries(this.state.themes).some(([key,m])=>m.resourceId===id&&this.library.list().some(t=>t.id===key)))throw Error('该主题已下载，请到我的主题中配置');
  const task:DownloadTask={id:randomUUID(),resourceId:id,status:'downloading',received:0,at:Date.now()},controller=new AbortController();
  this.active.set(task.id,controller);this.state.tasks=[task,...this.state.tasks.filter(t=>t.resourceId!==id)].slice(0,50);this.persist();
  if(this.state.error){task.status='failed';task.error=this.state.error;this.active.delete(task.id);throw Error(this.state.error);}
  let last=0;try{const bytes=await this.fetcher(resource.download.url,controller.signal,(received,total)=>{task.received=received;task.total=total;if(Date.now()-last>100){last=Date.now();this.changed();}});
   if(controller.signal.aborted)throw Error('下载已取消');if(bytes.length>MAX_THEME_BYTES)throw Error('文件超过 32 MB');
   if(createHash('sha256').update(bytes).digest('hex')!==resource.download.sha256)throw Error('文件与固定版本不一致，未导入');
   const item=this.library.import(bytes,resource.download.filename);task.themeId=item.id;task.status='done';task.received=bytes.length;
   this.state.themes[item.id]={resourceId:id,source:resource.source,version:resource.version};
  }catch(e){task.status=controller.signal.aborted?'cancelled':'failed';task.error=controller.signal.aborted?'下载已取消':e instanceof Error?e.message:'下载失败';}
  finally{this.active.delete(task.id);this.persist();}
 }
}

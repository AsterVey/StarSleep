import {app,BrowserWindow,clipboard,dialog,ipcMain,shell} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFile,type ChildProcess} from 'node:child_process';
import {HubStore,parseUsage,scanSkills} from './toolbox-core';
import {RESOURCES} from '../src/resources';
import {localDay,usageView} from '../src/usage-utils';
import {Market} from './market';
import {UsageCache} from './usage-cache';
import type {UsageReport,UsageSource,UsageRange,ToolboxState,LocalSkill} from '../src/toolbox-types';

export class Toolbox {
 private store:HubStore;private cache=new UsageCache(()=>this.collect());private children=new Set<ChildProcess>();private skills:LocalSkill[]=[];private stopped=false;
 private market:Market;
 constructor(private root:string,private window:()=>BrowserWindow|null,private safe:boolean){this.store=new HubStore(root);this.market=new Market(root,window,safe);}
 private defaultPath(source:UsageSource){return this.safe?path.join(this.root,'usage-samples',source):source==='codex'?(process.env.CODEX_HOME||path.join(os.homedir(),'.codex')):(process.env.CLAUDE_CONFIG_DIR||path.join(os.homedir(),'.claude'));}
 private location(source:UsageSource){return this.store.data.paths[source]||this.defaultPath(source);}
 state():ToolboxState{return {marks:this.store.data.marks,error:this.store.error||undefined,paths:{codex:this.location('codex'),claude:this.location('claude')}};}
 private run(source:UsageSource,config:string):Promise<string>{
  const executable=app.isPackaged?path.join(process.resourcesPath,'ccusage','ccusage.exe'):path.join(app.getAppPath(),'node_modules/@ccusage/ccusage-win32-x64/bin/ccusage.exe');
  const since=localDay(new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()-29));
  return new Promise((resolve,reject)=>{if(this.stopped)return reject(new Error('工具箱已退出'));const child=execFile(executable,[source,'daily','--json','--offline','--no-cost','--since',since,'--timezone',Intl.DateTimeFormat().resolvedOptions().timeZone,'--config',config],{windowsHide:true,timeout:60000,maxBuffer:4*1024*1024,env:{...process.env,CODEX_HOME:this.location('codex'),CLAUDE_CONFIG_DIR:this.location('claude'),XDG_CACHE_HOME:path.join(this.root,'usage-cache',source),NO_COLOR:'1'}},(error,stdout)=>{this.children.delete(child);if(error)reject(new Error(error.killed?'统计超时，请选择更小的数据目录后重试。':'ccusage 未能读取此目录，请核对日志格式和访问权限后刷新。'));else resolve(stdout);});this.children.add(child);});
 }
 async read(force:unknown=false):Promise<UsageReport>{if(this.stopped)throw new Error('工具箱已退出');return this.cache.read(force);}
 private async collect():Promise<UsageReport>{
  const result:UsageReport={generatedAt:Date.now(),days:[],sources:[],engine:'ccusage 20.0.24 · MIT'};
  const config=path.join(this.root,'usage-engine.json');if(!fs.existsSync(config)){fs.mkdirSync(this.root,{recursive:true});fs.writeFileSync(config,'{}',{flag:'wx'});}
  await Promise.all((['codex','claude']as const).map(async source=>{const location=this.location(source);const exists=source==='codex'?fs.existsSync(path.join(location,'sessions'))||fs.existsSync(path.join(location,'archived_sessions')):fs.existsSync(path.join(location,'projects'));
   if(!exists){result.sources.push({source,path:location,status:'missing',detail:source==='codex'?'没有找到 sessions / archived_sessions，可选择 Codex 数据目录。':'没有找到 projects，仅支持 Claude Code 本地日志，普通 Chat / Cowork 不在此范围。'});return;}
   try{const days=parseUsage(await this.run(source,config),source);result.days.push(...days);result.sources.push({source,path:location,status:days.length?'ready':'empty',detail:days.length?'已读取本地日志；不代表账号额度或账单。':'近 30 天没有可统计记录；未记录的使用量不在此处。'});}catch(e){result.sources.push({source,path:location,status:'error',detail:e instanceof Error?e.message:'读取失败'});}
  }));result.sources.sort((a,b)=>a.source.localeCompare(b.source));result.days.sort((a,b)=>a.date.localeCompare(b.date)||a.source.localeCompare(b.source));result.generatedAt=Date.now();return result;
 }
 register(){const handle=(channel:string,fn:(...args:any[])=>unknown)=>ipcMain.handle(channel,async(event,...args)=>{const w=this.window();if(!w||event.sender!==w.webContents||event.senderFrame!==w.webContents.mainFrame)throw new Error('不允许的调用');return fn(...args);});
  this.market.register();
  handle('toolbox-state',()=>this.state());handle('usage-read',(force:unknown=false)=>this.read(force));
  handle('usage-select',async(source:UsageSource)=>{this.source(source);if(this.cache.busy)throw new Error('正在读取用量，请稍后再更换目录');const chosen=await dialog.showOpenDialog(this.window()!,{title:`选择 ${source==='codex'?'Codex 数据目录（包含 sessions）':'Claude Code 数据目录（包含 projects）'}`,properties:['openDirectory']});if(chosen.canceled)return false;if(this.cache.busy)throw new Error('正在读取用量，请稍后再更换目录');const location=chosen.filePaths[0];if(!fs.existsSync(path.join(location,source==='codex'?'sessions':'projects'))&&!(source==='codex'&&fs.existsSync(path.join(location,'archived_sessions'))))throw new Error('所选目录没有对应会话文件夹');this.store.location(source,location);this.cache.clear();return this.state();});
  handle('usage-reset',(source:UsageSource)=>{this.source(source);if(this.cache.busy)throw new Error('正在读取用量，请稍后再更换目录');this.store.location(source);this.cache.clear();return this.state();});
  handle('usage-export',async(range:UsageRange,source:UsageSource|'all')=>{if(![1,7,30].includes(range)||!['all','codex','claude'].includes(source))throw new Error('筛选参数无效');const report=await this.read(),view=usageView(report.days,range,source);const chosen=await dialog.showSaveDialog(this.window()!,{title:'导出用量摘要（不包含对话和本机路径）',defaultPath:`StarSleep-Usage-${view.from}.json`,filters:[{name:'用量摘要',extensions:['json']}]});if(chosen.canceled||!chosen.filePath)return false;await fs.promises.writeFile(chosen.filePath,JSON.stringify({format:'starsleep-usage',version:1,engine:report.engine,generatedAt:report.generatedAt,from:view.from,until:view.until,source,coverage:report.sources.map(s=>({source:s.source,status:s.status})),totals:view.totals,days:view.filtered},null,2));return true;});
  handle('resource-mark',(id,mark)=>{this.store.mark(id,mark);return this.state();});
  handle('resource-open',id=>shell.openExternal(this.resource(id).url));
  handle('resource-copy',id=>{const r=this.resource(id);clipboard.writeText(`${r.name}\n${r.url}\n\n${r.setup}`);});
  handle('local-skills',async()=>{const home=this.safe?path.join(this.root,'skill-samples'):os.homedir();const roots=[{client:'Codex',path:this.safe?path.join(home,'.codex/skills'):path.join(process.env.CODEX_HOME||path.join(home,'.codex'),'skills')},{client:'共享 Skills',path:path.join(home,'.agents/skills')},{client:'Claude Code',path:this.safe?path.join(home,'.claude/skills'):path.join(process.env.CLAUDE_CONFIG_DIR||path.join(home,'.claude'),'skills')}];roots.push(...Object.entries(this.market.core.targets).map(([client,path])=>({client:{codex:"Codex / 共享 Skills",claude:"Claude Code",deepseek:"DeepSeek Harness"}[client]||client,path})));const result=await scanSkills(roots);this.skills=result.items;return result;});
  handle('skill-reveal',id=>{const item=this.skills.find(s=>s.id===id);if(!item)throw new Error('请刷新技能清单后重试');shell.showItemInFolder(path.join(item.path,'SKILL.md'));});
 }
 private source(source:unknown):asserts source is UsageSource {if(!['codex','claude'].includes(String(source)))throw new Error('数据源无效');}
 private resource(id:unknown){const r=RESOURCES.find(r=>r.id===id);if(!r)throw new Error('资源不存在');return r;}
 stop(){this.market.stop();this.stopped=true;for(const child of this.children)child.kill();this.children.clear();}
 health(){return {items:this.market.core.inspect(),error:this.market.core.error};}
}

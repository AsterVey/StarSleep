import {app,BrowserWindow,dialog,ipcMain,net,shell} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {zipSync} from 'fflate';
import {SkillMarket,repoName,type FetchBytes} from './market-core';
import type {SkillTarget} from '../src/market-types';

export class Market {
 readonly core:SkillMarket;
 private active=new Set<AbortController>();
 private stopped=false;
 private busy=false;
 constructor(root:string,private window:()=>BrowserWindow|null,private safe:boolean){
  const home=safe?path.join(root,'skill-samples'):os.homedir();
  this.core=new SkillMarket(root,{
   codex:path.join(home,'.agents','skills'),
   claude:path.join(safe?path.join(home,'.claude'):(process.env.CLAUDE_CONFIG_DIR||path.join(home,'.claude')),'skills'),
   deepseek:path.join(safe?path.join(home,'.dsh'):(process.env.DSH_HOME||path.join(home,'.dsh')),'skills'),
  },this.download);
 }
 private download:FetchBytes=async(url,limit)=>{
  if(this.stopped)throw new Error('工具箱已退出');const u=new URL(url);if(u.protocol!=='https:'||!['api.github.com','raw.githubusercontent.com'].includes(u.hostname)||u.username||u.password)throw new Error('下载来源不受支持');
  const controller=new AbortController();this.active.add(controller);const timeout=setTimeout(()=>controller.abort(),25000);
  try{const response=await net.fetch(url,{headers:{'User-Agent':`StarSleep/${app.getVersion()}`,'Accept':'application/vnd.github+json'},credentials:'omit',redirect:'error',signal:controller.signal});
   if(!response.ok){if(response.status===403||response.status===429){const epoch=Number(response.headers.get('x-ratelimit-reset'));throw new Error(`GitHub 请求受限，请稍后再试${epoch?`（额度重置约 ${new Date(epoch*1000).toLocaleTimeString()}）`:''}。`);}throw new Error(`GitHub 返回 ${response.status}，请检查仓库是否公开可用。`);}
   const reader=response.body?.getReader();if(!reader)throw new Error('GitHub 没有返回内容');let size=0;const chunks:Buffer[]=[];
   while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>limit){await reader.cancel();throw new Error('下载内容超出大小限制');}chunks.push(Buffer.from(part.value));}return Buffer.concat(chunks);
  }catch(e){if(controller.signal.aborted)throw new Error('网络请求超时或已取消，请重试');throw e;}finally{clearTimeout(timeout);this.active.delete(controller);}
 };
 register(){
  const handle=(name:string,fn:(...args:any[])=>unknown,exclusive=false)=>ipcMain.handle(name,async(event,...args)=>{const w=this.window();if(!w||event.sender!==w.webContents||event.senderFrame!==w.webContents.mainFrame)throw new Error('不允许的调用');if(exclusive&&this.busy)throw new Error('另一项技能操作正在进行');if(exclusive)this.busy=true;try{return await fn(...args);}finally{if(exclusive)this.busy=false;}});
  handle('github-search',(q,s,p)=>this.core.search(q,s,p),true);
  handle('github-skills',repo=>this.core.discover(repo),true);
  handle('skill-audit',(repo,commit,p)=>this.core.audit(repo,commit,p),true);
  handle('skill-audit-file',(token,p)=>this.core.file(token,p));
  handle('skill-install',(token,target)=>this.core.install(token,target),true);
  handle('skill-uninstall',id=>this.core.remove(id),true);
  handle('skill-restore',id=>this.core.restore(id),true);
  handle('market-state',()=>({installs:this.core.list(),error:this.core.error||undefined,targets:(['codex','claude','deepseek']as SkillTarget[]).map(id=>({id,path:this.core.targets[id],name:{codex:'Codex / 共享目录',claude:'Claude Code',deepseek:'DeepSeek Harness'}[id],detail:{codex:'用户级 .agents/skills，也可能被支持共享目录的其他 Agent 发现。',claude:'仅 Claude Code；普通 Claude Chat / Cowork 请使用 ZIP 导出。',deepseek:'按 DSH_HOME 或 ~/.dsh 的用户级目录安装；自定义启动目录需与此一致。'}[id]}))}));
  handle('market-reveal',id=>shell.showItemInFolder(path.join(this.core.location(id),'SKILL.md')));
  handle('market-target',async target=>{if(this.safe)throw new Error('安全体验固定使用隔离 Skills 目录；正式运行时可选择客户端目录');if(!Object.hasOwn(this.core.targets,target))throw new Error('目标无效');const chosen=await dialog.showOpenDialog(this.window()!,{title:'选择客户端实际使用的 Skills 目录（例如 DSH_HOME/skills）',defaultPath:this.core.targets[target as SkillTarget],properties:['openDirectory','createDirectory']});if(chosen.canceled)return false;this.core.configureTarget(target,chosen.filePaths[0]);return true;},true);
  handle('market-open',repo=>shell.openExternal('https://github.com/'+repoName(repo)));
  handle('skill-zip',async token=>{const {audit,files}=this.core.installable(token);const chosen=await dialog.showSaveDialog(this.window()!,{title:'导出 Claude 技能包：随后在 Claude 自定义 > Skills 中上传',defaultPath:`${audit.name}.zip`,filters:[{name:'Claude 技能包',extensions:['zip']}]});if(chosen.canceled||!chosen.filePath)return false;const entries:Record<string,Uint8Array>=Object.create(null);for(const[p,b]of files)entries[`${audit.name}/${p}`]=b;await fs.promises.writeFile(chosen.filePath,zipSync(entries));return true;},true);
 }
 stop(){this.stopped=true;for(const controller of this.active)controller.abort();this.active.clear();}
}

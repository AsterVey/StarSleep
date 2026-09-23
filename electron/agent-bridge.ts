import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import type {NightWatch} from './night-watch';

export function atomicJson(file:string,value:unknown){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.'+randomBytes(6).toString('hex')+'.tmp';try{const fd=fs.openSync(temp,'wx');try{fs.writeFileSync(fd,JSON.stringify(value,null,2),'utf8');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}}
export class AgentBridge {
  readonly dir:string; private server?:http.Server; private token=randomBytes(32).toString('hex');private port=0;private faultAt=0;
  constructor(root:string,private night:NightWatch,private changed:()=>void){this.dir=path.join(root,'agent-bridge');}
  async start(){
    fs.mkdirSync(this.dir,{recursive:true});
    const fault=path.join(this.dir,'connection-fault.txt');if(fs.existsSync(fault))this.faultAt=fs.statSync(fault).mtimeMs;
    this.server=http.createServer((req,res)=>{
      const provided=String(req.headers.authorization??'').replace(/^Bearer /,'');
      if(req.headers.origin||req.method!=='POST'||req.url!=='/event'||Buffer.byteLength(provided)!==this.token.length||!timingSafeEqual(Buffer.from(provided),Buffer.from(this.token))){res.writeHead(403).end();return;}
      let size=0;const chunks:Buffer[]=[];req.on('data',chunk=>{size+=chunk.length;if(size>24_000){res.writeHead(413).end();req.destroy();}else chunks.push(chunk);});
      req.on('end',()=>{if(size>24_000)return;try{const result=this.night.event(JSON.parse(Buffer.concat(chunks).toString('utf8')));res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(result));this.changed();}catch{res.writeHead(400).end('{}');}});
      req.on('error',()=>{});
    });
    this.server.requestTimeout=3000;this.server.headersTimeout=3000;this.server.maxConnections=20;
    await new Promise<void>((resolve,reject)=>{this.server!.once('error',reject);this.server!.listen(0,'127.0.0.1',()=>resolve());});
    this.port=(this.server.address() as {port:number}).port;
    atomicJson(path.join(this.dir,'connection.json'),{version:1,port:this.port,token:this.token,pid:process.pid});this.night.bridgeReady=true;
  }
  check(){const file=path.join(this.dir,'connection-fault.txt');if(fs.existsSync(file)){const at=fs.statSync(file).mtimeMs;if(at!==this.faultAt){this.faultAt=at;this.night.disarm('Agent 事件传送失败，请重新开始任务后开启联动');}}}
  stop(){this.night.bridgeReady=false;this.night.disarm('星枢已退出，夜间联动已解除');this.server?.closeAllConnections();this.server?.close();try{fs.unlinkSync(path.join(this.dir,'connection.json'));}catch{}}
}

export function hookCommand(script:string,provider:'codex'|'claude'){
  if(/["%$`!\r\n]/.test(script))throw new Error('数据目录含不支持的命令字符，请使用普通目录');
  return `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy RemoteSigned -File "${script}" -Provider ${provider}`;
}
export function editHooks(raw:string|undefined,command:string,provider:'codex'|'claude',install:boolean):string{
  const doc=raw?JSON.parse(raw):{};
  if(!doc||Array.isArray(doc)||typeof doc!=='object'||(doc.hooks!==undefined&&(!doc.hooks||Array.isArray(doc.hooks)||typeof doc.hooks!=='object')))throw new Error('原有 hooks 配置格式不支持，未修改');
  const hooks=doc.hooks??{};
  const events=['UserPromptSubmit','PreToolUse','PostToolUse','PermissionRequest','SubagentStart','SubagentStop','Stop','SessionEnd',...(provider==='codex'?['Interrupt']:['StopFailure','Notification'])];
  for(const event of events){
    const entries=hooks[event]??[];if(!Array.isArray(entries)||entries.some((e:any)=>!e||!Array.isArray(e.hooks)))throw new Error(`原有 ${event} 配置格式不支持，未修改`);
    // Replace earlier StarSleep bridges on install; uninstall only this instance.
    const previousBridge=new RegExp('^powershell\\.exe -NoProfile -NonInteractive -ExecutionPolicy RemoteSigned -File "[^"\\r\\n]+[\\\\/]agent-bridge[\\\\/]agent-hook\\.ps1" -Provider '+provider+'$');
    hooks[event]=entries.map((entry:any)=>({...entry,hooks:entry.hooks.filter((h:any)=>h.command!==command&&!(install&&typeof h.command==='string'&&previousBridge.test(h.command)))})).filter((entry:any)=>entry.hooks.length);
    if(install)hooks[event].push({hooks:[{type:'command',command,timeout:3,statusMessage:'星枢 · 同步任务状态'}]});
    if(!hooks[event].length)delete hooks[event];
  }
  doc.hooks=hooks;return JSON.stringify(doc,null,2)+'\n';
}

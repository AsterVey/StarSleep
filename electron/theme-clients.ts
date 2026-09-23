import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import type {ThemeClients} from '../src/integration-types';

// Inspect bounded code resources, never a client's conversation, cookies or credentials.
function asarContains(file:string,select:(name:string)=>boolean,needles:string[]){
  const fd=fs.openSync(file,'r');
  try{
    const first=Buffer.alloc(16);if(fs.readSync(fd,first,0,16,0)!==16)throw new Error('客户端资源头不完整');
    const length=first.readUInt32LE(12),offset=8+first.readUInt32LE(4);
    if(length>16*1024*1024||length<2||offset<length+16)throw new Error('客户端资源格式不受支持');
    const bytes=Buffer.alloc(length);if(fs.readSync(fd,bytes,0,length,16)!==length)throw new Error('客户端资源头不完整');
    const header=JSON.parse(bytes.toString('utf8'));let read=0;
    function walk(node:any,base=''):boolean{
      for(const [key,v]of Object.entries(node.files??{}) as [string,any][]){const name=base?base+'/'+key:key;if(v.files){if(walk(v,name))return true;}else if(select(name)&&!v.unpacked&&Number.isSafeInteger(v.size)&&v.size<=24*1024*1024){
        read+=v.size;if(read>64*1024*1024)throw new Error('客户端资源检查超过范围');
        const at=offset+Number(v.offset);if(!Number.isSafeInteger(at)||at<offset||at+v.size>fs.fstatSync(fd).size)throw new Error('客户端资源范围无效');
        const content=Buffer.alloc(v.size);if(fs.readSync(fd,content,0,v.size,at)!==v.size)throw new Error('客户端资源不完整');
        const text=content.toString('utf8');if(needles.every(n=>text.includes(n)))return true;
      }}return false;
    }
    return walk(header);
  }finally{fs.closeSync(fd);}
}
export function hasClaudeLoader(appDir:string){try{return asarContains(path.join(appDir,'resources','app.asar'),n=>/(^|\/)(index|main)[^/]*\.(js|cjs)$/.test(n),['Claude Theme Loader','__THEME_FILE','theme.json']);}catch{return false;}}
export async function probeThemeClients(codexConfig:string,claudeTheme:string,safe:boolean):Promise<ThemeClients>{
  if(safe)return {codex:{ready:true,label:'隔离测试客户端',detail:'只写入测试目录中的 config.toml。',configPath:codexConfig},claude:{ready:true,label:'隔离测试加载器',detail:'只写入测试目录；不代表真实 Claude 已安装加载器。',configPath:claudeTheme}};
  let packages:any[]=[];
  if(process.platform==='win32'){
    const source="[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false); @(Get-AppxPackage | Where-Object {$_.Name -eq 'OpenAI.Codex' -or $_.Name -eq 'Claude'} | Select-Object Name,Version,InstallLocation) | ConvertTo-Json -Compress";
    packages=await new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-Command',source],{windowsHide:true,timeout:10000,maxBuffer:32*1024,encoding:'utf8'},(err,out)=>{try{const v=err?[]:JSON.parse(out);resolve(Array.isArray(v)?v:[v]);}catch{resolve([]);}}));
  }
  const codex=packages.find(p=>p?.Name==='OpenAI.Codex'),claude=packages.find(p=>p?.Name==='Claude');
  let native=false;
  if(codex)try{native=asarContains(path.join(codex.InstallLocation,'app','resources','app.asar'),n=>/^webview\/assets\/app-shared-.*\.js$/.test(n),['appearanceDarkChromeTheme','appearanceLightChromeTheme']);}catch{}
  const result:ThemeClients={
    codex:{ready:native&&fs.existsSync(codexConfig),label:codex?`Codex ${codex.Version}`:'未识别 Codex 安装',detail:native?'支持原生配色与字体配置。保存后重新打开 Codex，并核对实际外观。':'未验证此安装的原生主题配置；仍可用 Codex 自带的主题导入。',configPath:codexConfig},
    claude:{ready:false,label:claude?`Claude ${claude.Version} · 商店版`:'未找到 Claude Theme Mod',detail:claude?'此商店版未接入 Theme Mod，不能通过写入 theme.json 美化。':'需要可兼容的 Claude 安装及 Theme Mod 加载器。',configPath:claudeTheme}
  };
  const base=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData','Local'),'AnthropicClaude');
  if(fs.existsSync(base)){
    const versions=fs.readdirSync(base,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^app-\d+(?:\.\d+)+$/.test(e.name)).map(e=>e.name).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
    const latest=versions[0];
    if(latest){const loaded=hasClaudeLoader(path.join(base,latest));result.claude={ready:loaded&&!claude,label:`Claude ${latest.slice(4)}${claude?' · 检测到多个安装':''}`,detail:claude?'同时检测到商店版和独立安装版，无法确定使用中的客户端；请先确认安装来源。':loaded?'已检测到 Theme Mod 加载器；写入后由 Claude 加载器更新原界面。':'独立安装版尚未检测到 Theme Mod 加载器。请按兼容指南安装后重新检测。',configPath:claudeTheme};}
  }
  return result;
}

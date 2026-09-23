import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {parse} from 'smol-toml';
import {atomicJson} from './agent-bridge';

const prefix='codex-theme-v1:';
const themeIds=new Set(['absolutely','ayu','catppuccin','codex','dracula','everforest','github','gruvbox','linear','lobster','material','matrix','monokai','night-owl','nord','notion','oscurange','one','proof','raycast','rose-pine','sentry','solarized','temple','tokyo-night','vercel','vscode-plus','xcode']);
const object=(v:any):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const hex=(v:any)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
export function codexTheme(raw:string){
  if(Buffer.byteLength(raw)>1024*1024||!raw.trim().startsWith(prefix))throw new Error('不是 Codex 原生主题代码');
  let value:any;try{const text=raw.trim().slice(prefix.length);value=JSON.parse(text.startsWith('{')?text:decodeURIComponent(text));}catch{throw new Error('Codex 主题代码编码无效');}
  if(!object(value)||!['dark','light'].includes(value.variant)||!object(value.theme))throw new Error('Codex 主题格式无效');
  const t=value.theme;
  if(![t.accent,t.surface,t.ink].every(hex))throw new Error('Codex 主题颜色必须为 #RRGGBB');
  const fonts=t.fonts??{code:null,ui:null};
  if(!object(fonts)||!['code','ui','content'].every(k=>fonts[k]===undefined||fonts[k]===null||(typeof fonts[k]==='string'&&fonts[k].length<=200&&!/[\x00-\x1f]/.test(fonts[k]))))throw new Error('Codex 主题字体配置无效');
  const cleanFonts:Record<string,any>={code:fonts.code??null,ui:fonts.ui??null};
  for(const k of ['content','codeFace','uiFace','contentFace'])if(fonts[k]!==undefined){
    if(k.endsWith('Face')&&(!object(fonts[k])||!['family','fullName','postscriptName'].every(f=>typeof fonts[k][f]==='string'&&fonts[k][f].length<=200&&!/[\x00-\x1f]/.test(fonts[k][f]))))throw new Error('Codex 字体名称无效');
    cleanFonts[k]=k.endsWith('Face')?Object.fromEntries(['family','fullName','postscriptName'].map(f=>[f,fonts[k][f]])):fonts[k];
  }
  const semanticColors=t.semanticColors??{diffAdded:'#4caf78',diffRemoved:'#e57373',skill:t.accent};
  if(!object(semanticColors)||!['diffAdded','diffRemoved','skill'].every(k=>hex(semanticColors[k])))throw new Error('Codex 语义颜色无效');
  const contrast=t.contrast??60,opaqueWindows=t.opaqueWindows??true,codeThemeId=value.codeThemeId??'codex';
  if(!Number.isInteger(contrast)||contrast<0||contrast>100||typeof opaqueWindows!=='boolean'||!themeIds.has(codeThemeId)||!['chatgpt','custom'].includes(t.accentSource??'custom'))throw new Error('Codex 主题选项无效或代码配色尚不支持');
  return {variant:value.variant as 'light'|'dark',codeThemeId,theme:{accent:t.accent,accentSource:t.accentSource??'custom',contrast,fonts:cleanFonts,ink:t.ink,opaqueWindows,semanticColors:Object.fromEntries(['diffAdded','diffRemoved','skill'].map(k=>[k,semanticColors[k]])),surface:t.surface}};
}

const keys=['appearanceTheme','appearanceLightChromeTheme','appearanceLightCodeThemeId','appearanceDarkChromeTheme','appearanceDarkCodeThemeId'];
type Lines=Record<string,string|null>;
function document(raw:string){try{return parse(raw) as Record<string,any>;}catch{throw new Error('Codex config.toml 无法解析，未修改原文件');}}
function desktop(raw:string){
  // Keep every unrelated byte. Unsupported TOML layouts use the client's own import UI.
  if(raw.includes('"""')||raw.includes("'''"))throw new Error('配置含多行字符串，请使用 Codex 自带的主题导入');
  const headers=[...raw.matchAll(/^[\t ]*\[[^\r\n]+\][\t ]*(?:#[^\r\n]*)?(?:\r?\n|$)/gm)];
  const found=headers.findIndex(m=>/^[\t ]*\[[\t ]*desktop[\t ]*\]/.test(m[0]));
  if(found<0)return null;
  return {start:headers[found].index!+headers[found][0].length,end:headers[found+1]?.index??raw.length};
}
function currentLines(raw:string,selected:string[]):Lines{
  const data=document(raw),section=desktop(raw),body=section?raw.slice(section.start,section.end):'';
  if(data.desktop!==undefined&&(!object(data.desktop)||!section))throw new Error('Codex 外观配置不是标准 [desktop] 段，请使用客户端自带导入');
  const result:Lines={};
  for(const key of selected){
    if(!keys.includes(key))throw new Error('外观备份含非主题字段');
    const found=[...body.matchAll(new RegExp(`^[\\t ]*${key}[\\t ]*=[^\\r\\n]*(?:\\r?\\n|$)`,'gm'))];
    if(found.length>1||(data.desktop?.[key]!==undefined&&!found.length))throw new Error('主题配置使用了嵌套或非标准写法，请使用 Codex 自带导入');
    if(found.length){const parsed=document(found[0][0]);if(!isDeepStrictEqual(parsed[key],data.desktop?.[key]))throw new Error('主题字段跨行，未修改配置');}
    result[key]=found[0]?.[0]??null;
  }
  return result;
}
export function patchAppearance(raw:string,lines:Lines){
  const before=document(raw);currentLines(raw,Object.keys(lines));
  let source=raw,section=desktop(source);const newline=raw.includes('\r\n')?'\r\n':'\n';
  if(!section){source+=(source&&!source.endsWith('\n')?newline:'')+`[desktop]${newline}`;section=desktop(source)!;}
  let body=source.slice(section.start,section.end);
  for(const [key,line] of Object.entries(lines)){
    const pattern=new RegExp(`^[\\t ]*${key}[\\t ]*=[^\\r\\n]*(?:\\r?\\n|$)`,'m');
    if(line!==null){const parsed=document(line);if(Object.keys(parsed).length!==1||!(key in parsed))throw new Error('外观备份无效');}
    if(pattern.test(body))body=body.replace(pattern,()=>line??'');
    else if(line!==null)body+=(body&&!body.endsWith('\n')?newline:'')+line;
  }
  const next=source.slice(0,section.start)+body+source.slice(section.end),expected=structuredClone(before);
  expected.desktop??={};for(const [key,line]of Object.entries(lines)){if(line===null)delete expected.desktop[key];else expected.desktop[key]=document(line)[key];}
  if(!isDeepStrictEqual(document(next),expected))throw new Error('外观配置校验失败，未修改文件');
  return next;
}
function inline(v:any):string{
  if(typeof v==='string')return JSON.stringify(v);if(typeof v==='number'||typeof v==='boolean')return String(v);
  if(object(v))return '{ '+Object.entries(v).filter(([,n])=>n!==null&&n!==undefined).map(([k,n])=>`${k} = ${inline(n)}`).join(', ')+' }';
  throw new Error('无法写入该主题值');
}
function bytes(file:string){
  const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>4*1024*1024)throw new Error('客户端配置不是有效的普通文件');
  const raw=fs.readFileSync(file);if(!Buffer.from(raw.toString('utf8')).equals(raw))throw new Error('客户端配置不是 UTF-8');return raw;
}
function write(file:string,raw:string,expected:Buffer){
  const temp=file+'.starsleep-'+randomUUID()+'.tmp';
  try{fs.writeFileSync(temp,raw,{flag:'wx',mode:0o600});if(!bytes(file).equals(expected))throw new Error('Codex 配置已被其他程序修改，请重试');fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
type Backup={version:1;file:string;before:Lines;written:Lines};
export class CodexAppearance {
  private record:string;
  constructor(private file:string,root:string){this.record=path.join(root,'themes','codex-appearance-restore.json');}
  get target(){return this.file;}
  get canRestore(){return fs.existsSync(this.record);}
  private backup():Backup|null{if(!this.canRestore)return null;const b=JSON.parse(bytes(this.record).toString('utf8'));if(b.version!==1||b.file!==this.file||!object(b.before)||!object(b.written)||Object.keys(b.before).some(k=>!keys.includes(k))||!isDeepStrictEqual(Object.keys(b.before).sort(),Object.keys(b.written).sort())||Object.values({...b.before,...b.written}).some(v=>v!==null&&typeof v!=='string'))throw new Error('Codex 外观还原记录无效');return b;}
  apply(raw:string){
    const t=codexTheme(raw),source=bytes(this.file),text=source.toString('utf8'),part=t.variant==='dark'?'Dark':'Light';
    const values={appearanceTheme:t.variant,[`appearance${part}ChromeTheme`]:t.theme,[`appearance${part}CodeThemeId`]:t.codeThemeId};
    const newline=text.includes('\r\n')?'\r\n':'\n';
    const changes=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,`${k} = ${inline(v)}${newline}`]));
    const previous=this.backup();if(previous&&!isDeepStrictEqual(currentLines(text,Object.keys(previous.written)),previous.written))throw new Error('Codex 主题在外部更改过，已保留现状；请先处理原还原记录');
    const next=patchAppearance(text,changes),before={...currentLines(text,Object.keys(changes)),...previous?.before},written={...previous?.written,...changes};
    fs.mkdirSync(path.dirname(this.record),{recursive:true});
    atomicJson(this.record,{version:1,file:this.file,before,written});
    try{write(this.file,next,source);}catch(e){if(previous)atomicJson(this.record,previous);else fs.unlinkSync(this.record);throw e;}
  }
  restore(){
    const b=this.backup();if(!b)throw new Error('没有星枢保存的 Codex 外观备份');
    const source=bytes(this.file),text=source.toString('utf8');
    if(!isDeepStrictEqual(currentLines(text,Object.keys(b.written)),b.written))throw new Error('Codex 主题在外部更改过，未覆盖当前设置');
    const next=patchAppearance(text,b.before);write(this.file,next,source);fs.unlinkSync(this.record);
  }
}

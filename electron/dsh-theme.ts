import fs from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {atomicJson} from './agent-bridge';
import type {ThemeClient} from '../src/integration-types';

const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export const cssColor=(v:unknown)=>typeof v==='string'&&v.length<=100&&(/^(?:#[a-f\d]{3}|#[a-f\d]{4}|#[a-f\d]{6}|#[a-f\d]{8})$/i.test(v)||/^(?:rgb|hsl)a?\(\s*-?[\d.]+%?(?:\s*[, /]\s*-?[\d.]+%?){2,3}\s*\)$/i.test(v));
export const dshRequiredTokens=['--dsw-alias-bg-base','--dsw-alias-bg-layer-1','--dsw-alias-brand-primary','--dsw-alias-label-primary','--dsw-alias-label-secondary','--dsw-alias-border-l1','--dsw-alias-border-l2'];
export function dshPack(value:unknown){
  if(!object(value)||value.format!=='dsh-dream-skin/pack'||value.version!==1||!object(value.manifest))throw new Error('不是支持的 DeepSeek Dream Skin v1 主题包');
  const m=value.manifest;
  if(typeof m.id!=='string'||!m.id.trim()||m.id.length>120||/[\x00-\x1f]/.test(m.id)||['system','light','dark','__proto__','constructor'].includes(m.id)||typeof m.name!=='string'||!m.name.trim()||m.name.length>80||!['light','dark'].includes(m.colorScheme)||!object(m.tokens))throw new Error('DeepSeek 主题缺少有效的标识、名称或明暗模式');
  if(Object.keys(m.tokens).length>512||dshRequiredTokens.some(k=>!cssColor(m.tokens[k])))throw new Error('DeepSeek 主题缺少必要的七个颜色 token');
  for(const [key,value]of Object.entries(m.tokens))if(!/^--dsw-[a-z\d-]+$/i.test(key)||!cssColor(value))throw new Error('DeepSeek token 仅接受颜色，不能包含脚本、URL 或 CSS 规则');
  if(m.accent!==undefined&&m.accent!==null&&!/^#[a-f\d]{3}(?:[a-f\d]{3})?$/i.test(m.accent))throw new Error('DeepSeek 强调色必须为十六进制颜色');
  const meta:Record<string,string>={};for(const k of ['author','version','description','nameZh'])if(m[k]!==undefined){if(typeof m[k]!=='string'||m[k].length>1000)throw new Error('DeepSeek 主题描述无效');meta[k]=m[k];}
  return {format:'dsh-dream-skin/pack',version:1,manifest:{...meta,id:m.id,name:m.name,colorScheme:m.colorScheme,tokens:{...m.tokens},accent:m.accent??null}};
}
const maxState=32*1024*1024;
function read(file:string,limit=maxState){if(!fs.existsSync(file))return null;const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>limit)throw new Error('DeepSeek 外观文件不是受支持的普通文件');return fs.readFileSync(file,'utf8');}
function json(raw:string|null){if(raw===null)return {};let v:unknown;try{v=JSON.parse(raw);}catch{throw new Error('DeepSeek 外观文件已损坏，未修改原文件');}if(!object(v))throw new Error('DeepSeek 外观文件格式无效');return v;}
export function probeDsh(home:string):ThemeClient{
  const result={ready:false,label:'DeepSeek Harness',configPath:home?path.join(home,'dream-skin.json'):'',detail:'选择 DeepSeek 数据目录（DSH_HOME），检测已启用的 Dream Skin 插件。'};
  if(!home)return result;
  try{for(const profile of ['desktop','web']){
    const dir=path.join(home,'profiles',profile),manifest=json(read(path.join(dir,'package.json'),1024*1024));
    if(!manifest.dsh?.profile?.bundles?.includes('dsh-dream-skin'))continue;
    const pluginDir=path.join(dir,'node_modules','dsh-dream-skin'),plugin=json(read(path.join(pluginDir,'package.json'),1024*1024));
    if(plugin.name!=='dsh-dream-skin'||!/^9\./.test(plugin.version??''))continue;
    const host=read(path.join(pluginDir,'lib','index.js'),1024*1024);if(!host?.includes('dream-skin.json'))continue;
    json(read(result.configPath));return {...result,ready:true,label:`DeepSeek ${profile} · Dream Skin ${plugin.version}`,detail:'已识别持久化格式。退出 DeepSeek 后配置主题或背景，重新打开后加载；可以恢复星枢修改的外观字段。'};
  }return {...result,detail:'未找到已启用的兼容 Dream Skin 9.x。请在 DeepSeek 插件页安装并启用，再选择实际数据目录。'};}catch(e){return {...result,detail:String(e).replace(/^Error: /,'')};}
}
const allowed=new Set(['packs','skin','accent','wallpaper','wallpaper-kind','wallpaper-opacity','wallpaper-blur','wallpaper-follows-skin'].map(k=>'dsh-dream-skin:'+k));
type Fields=Record<string,unknown>;
type Backup={version:1;target:string;before:Fields;written:Fields};
const fields=(state:Fields,keys:string[])=>Object.fromEntries(keys.map(k=>[k,Object.hasOwn(state,k)?state[k]:null]));
export class DshAppearance{
  private record:string;readonly target:string;
  constructor(home:string,root:string){this.target=path.join(home,'dream-skin.json');this.record=path.join(root,'themes','dsh-restore.json');}
  get canRestore(){return fs.existsSync(this.record);}
  private backup():Backup|null{const raw=read(this.record,64*1024*1024);if(raw===null)return null;const b=json(raw);if(b.version!==1||b.target!==this.target||!object(b.before)||!object(b.written)||!isDeepStrictEqual(Object.keys(b.before).sort(),Object.keys(b.written).sort())||Object.keys(b.written).some(k=>!allowed.has(k)))throw new Error('DeepSeek 还原记录与当前目录不一致或已损坏');return b as Backup;}
  private commit(next:Fields,expected:string|null){if(Buffer.byteLength(JSON.stringify(next,null,2))>maxState)throw new Error('DeepSeek 外观配置超过 32 MB');if(read(this.target)!==expected)throw new Error('DeepSeek 配置已变化，请退出客户端后重试');atomicJson(this.target,next);}
  private apply(patch:Fields){
    const raw=read(this.target),state=json(raw),previous=this.backup();
    if(previous&&!isDeepStrictEqual(fields(state,Object.keys(previous.written)),previous.written))throw new Error('DeepSeek 外观已在外部修改，保留当前设置；请先导出或手动处理原备份');
    const before={...fields(state,Object.keys(patch)),...previous?.before},written={...previous?.written,...patch};
    atomicJson(this.record,{version:1,target:this.target,before,written});
    try{this.commit({...state,...patch},raw);}catch(e){if(previous)atomicJson(this.record,previous);else fs.unlinkSync(this.record);throw e;}
  }
  applyPack(raw:string){const pack=dshPack(JSON.parse(raw)),state=json(read(this.target));let packs:any[]=[];
    try{packs=state['dsh-dream-skin:packs']?JSON.parse(state['dsh-dream-skin:packs']):[];}catch{throw new Error('DeepSeek 已有主题包列表损坏，未覆盖');}
    if(!Array.isArray(packs)||packs.length>200)throw new Error('DeepSeek 已有主题包列表无效或过多');
    const id='dream-pack:'+pack.manifest.id,existing=packs.find(p=>p?.id===id);
    if(existing&&!isDeepStrictEqual(existing.manifest,pack.manifest))throw new Error('DeepSeek 中已有同名标识的不同主题，请在客户端处理冲突后重试');
    if(!existing)packs.push({id,manifest:pack.manifest});
    this.apply({'dsh-dream-skin:packs':JSON.stringify(packs),'dsh-dream-skin:skin':id,'dsh-dream-skin:accent':pack.manifest.accent??'system'});
  }
  applyWallpaper(dataUrl:string){if(!/^data:image\/(png|jpeg);base64,[A-Za-z\d+/=]+$/.test(dataUrl))throw new Error('背景图片数据无效');this.apply({'dsh-dream-skin:wallpaper':dataUrl,'dsh-dream-skin:wallpaper-kind':'image','dsh-dream-skin:wallpaper-follows-skin':'0'});}
  restore(){const b=this.backup();if(!b)throw new Error('尚无 DeepSeek 外观备份');const raw=read(this.target),state=json(raw);if(!isDeepStrictEqual(fields(state,Object.keys(b.written)),b.written))throw new Error('DeepSeek 外观在外部修改过，未覆盖当前设置');for(const [key,value]of Object.entries(b.before)){if(value===null)delete state[key];else state[key]=value;}this.commit(state,raw);fs.unlinkSync(this.record);}
}

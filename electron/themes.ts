import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {unzipSync} from 'fflate';
import type {ThemeFormat,ThemeItem} from '../src/integration-types';
import {atomicJson} from './agent-bridge';
import {codexTheme} from './codex-theme';
import {cssColor,dshPack} from './dsh-theme';
export const MAX_THEME_BYTES=32*1024*1024;
type Parsed={format:ThemeFormat;name:string;colors:string[];text?:string;note:string;style?:'light'|'dark'};
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const color=(v:unknown)=>typeof v==='string'&&(/^#[0-9a-f]{3,8}$/i.test(v)||/^rgba?\([\d.,%\s]+\)$/.test(v));
function colors(v:unknown):string[]{if(typeof v==='string')return color(v)?[v]:[];return object(v)?[...new Set(Object.values(v).flatMap(colors))].slice(0,8):[];}
function parseJson(raw:string){try{const v=JSON.parse(raw);if(!object(v))throw 0;return v;}catch{throw new Error('美化包不是有效的 JSON 对象');}}
export function parseThemeText(raw:string,name='导入的主题'):Parsed{
  if(Buffer.byteLength(raw)>1024*1024)throw new Error('主题文本不能超过 1 MB');
  const text=raw.trim(),native=text.startsWith('codex-theme-v1:');
  let value:Record<string,any>=native?codexTheme(text):parseJson(text);
  if(native||(value.variant&&value.theme)){
    if(!native)value=codexTheme('codex-theme-v1:'+JSON.stringify(value));
    if(!['dark','light'].includes(value.variant)||!object(value.theme)||!color(value.theme.accent)||!color(value.theme.surface)||!color(value.theme.ink))throw new Error('Codex 主题缺少有效的 variant、accent、surface 或 ink');
    return {format:'codex-native',name,style:value.variant,colors:colors(value.theme),text:'codex-theme-v1:'+JSON.stringify(value),note:'直接配置 Codex 原生配色与字体；应用前备份外观字段，支持恢复。保存后请在 Codex 中确认效果。'};
  }
  if(value.format==='dsh-dream-skin/pack'){
    const pack=dshPack(value);return {format:'dsh-dreamskin',name:pack.manifest.name,style:pack.manifest.colorScheme,colors:colors(pack.manifest.tokens),text:JSON.stringify(pack,null,2),note:'DeepSeek Dream Skin 原生主题包。选择数据目录并检测插件后，退出 DeepSeek 再配置；重新打开客户端加载。'};
  }
  if(value.version===1&&(object(value.colors)||object(value.light)||object(value.dark))){
    const roles=['accent','background','panel','input','text','border'];
    for(const group of [value.colors,value.light,value.dark])if(group!==undefined){if(!object(group)||Object.entries(group).some(([k,v])=>!roles.includes(k)||!(v===''||color(v))))throw new Error('DeepSeek 配色包含不支持的颜色字段');}
    if(!colors(value).length)throw new Error('主题没有有效颜色');
    return {format:'dsh-appearance',name,colors:colors(value),text:JSON.stringify(value,null,2),note:'适用于 dsh-ui-appearance 的配色导入；壁纸在该插件中单独设置。'};
  }
  const claudeKeys=['bgMain','bgSidebar','textPrimary','textSecondary','textMuted','accentPrimary','inlineCodeText','successColor','borderColor','codeBg'];
  if(color(value.bgMain)&&color(value.textPrimary)){
    if(Object.entries(value).some(([k,v])=>k==='name'?typeof v!=='string'||v.length>80:k==='mode'?!['light','dark','system'].includes(v):['glassEffect','glowEffect'].includes(k)?typeof v!=='boolean':!claudeKeys.includes(k)||typeof v!=='string'||!(k==='codeBg'?cssColor(v):/^#[0-9a-f]{6}$/i.test(v))))throw new Error('Claude 主题仅接受配色、明暗模式及布尔材质开关，不接受脚本或 CSS');
    return {format:'claude-json',name:typeof value.name==='string'?value.name.slice(0,80):name,style:['light','dark'].includes(value.mode)?value.mode:undefined,colors:colors(value),text:JSON.stringify(value,null,2),note:'需要已安装的 Claude Theme Mod 加载器；星枢仅配置主题 JSON，不修改 Claude 程序。'};
  }
  throw new Error('未识别主题 JSON。支持 Codex 原生主题、DSH Dream Skin 主题包、DSH 配色与 Claude Theme Mod 配色。CSS 请保存为 .css 文件导入。');
}
export function parseThemeCss(raw:string,name:string):Parsed{
  if(!raw.trim()||Buffer.byteLength(raw)>1024*1024||raw.includes('\0'))throw new Error('CSS 必须为非空文本，且不超过 1 MB');
  if(/@import|javascript\s*:|expression\s*\(|behavior\s*:/i.test(raw))throw new Error('CSS 含不支持的外部加载或执行语法');
  return {format:'custom-css',name,colors:[],text:raw,note:'自定义 CSS：仅收藏、复制和导出，不在星枢内执行。选择原作者指定的客户端加载器；三种 Agent 的选择器不同，CSS 不可直接互换。'};
}
export function parseThemeZip(raw:Buffer,name:string):Parsed{
  if(raw.length>MAX_THEME_BYTES)throw new Error('美化 ZIP 不能超过 32 MB');
  let count=0,total=0;const names=new Set<string>();
  const files=unzipSync(raw,{filter:file=>{
    count++;total+=file.originalSize;
    const pieces=file.name.split('/');
    if(count>32||total>64*1024*1024||file.originalSize>32*1024*1024)throw new Error('主题 ZIP 展开后过大或文件过多');
    if(file.name.includes('\\')||file.name.includes(':')||file.name.startsWith('/')||pieces.some(p=>p==='..'||p==='.')||names.has(file.name.toLowerCase()))throw new Error('主题 ZIP 路径无效或重复');
    names.add(file.name.toLowerCase());return !file.name.endsWith('/');
  }});
  const flat=new Map<string,Uint8Array>();let prefix:string|undefined;
  for(const [file,bytes]of Object.entries(files)){
    const parts=file.split('/');if(parts.length>2)throw new Error('主题只能放在 ZIP 根目录或一层文件夹中');
    const folder=parts.length===2?parts[0]:'';if(prefix!==undefined&&prefix!==folder)throw new Error('主题 ZIP 含多个根目录');prefix=folder;
    const base=parts.at(-1)!;
    if(!/^(theme\.json|theme\.css|manifest\.json|manifest\.sig|LICENSE\.txt|background\.(png|jpg|jpeg|webp))$/i.test(base))throw new Error(`美化包含未支持文件：${base}`);
    flat.set(base.toLowerCase(),bytes);
  }
  const json=flat.get('theme.json'),css=flat.get('theme.css'),images=[...flat.keys()].filter(n=>/^background\./.test(n));
  if(!json?.length||!css?.length||images.length!==1)throw new Error('Dream Skin ZIP 需要 theme.json、非空 theme.css 和一张 background 图片');
  const theme=parseJson(Buffer.from(json).toString('utf8'));
  if(json.length>1024*1024||css.length>1024*1024||flat.get(images[0])!.length>10*1024*1024)throw new Error('主题配置或背景图超过限制');
  const sheet=Buffer.from(css).toString('utf8');if(/@import|javascript\s*:|expression\s*\(|behavior\s*:/i.test(sheet))throw new Error('主题 CSS 含不支持的外部加载或执行语法');
  if(flat.has('manifest.json'))parseJson(Buffer.from(flat.get('manifest.json')!).toString('utf8'));
  return {format:'dreamskin-zip',name:typeof theme.name==='string'?theme.name.slice(0,80):name,colors:colors(theme),note:'结构检查通过；导出原包后交给 Dream Skin 再校验并应用。部分 Windows Codex 版本不兼容。'};
}
export class ThemeLibrary {
  private styleChecked=new Set<string>();
  private file:string;private dir:string;private items:ThemeItem[]=[];error='';
  constructor(root:string){this.dir=path.join(root,'themes');this.file=path.join(this.dir,'library.json');fs.mkdirSync(this.dir,{recursive:true});if(fs.existsSync(this.file)){try{const d=JSON.parse(fs.readFileSync(this.file,'utf8'));if(d.version!==1||!Array.isArray(d.items)||d.items.length>100||d.items.some((t:any)=>!t||!/^[-a-f0-9]{36}$/.test(t.id)||!['codex-native','dsh-appearance','dsh-dreamskin','claude-json','dreamskin-zip','custom-css'].includes(t.format)))throw 0;this.items=d.items;}catch{this.error='主题库读取失败，已保留原文件。计划和 Agent 联动不受影响。';}}}
  list(){return this.items.map(t=>{if(t.style||this.styleChecked.has(t.id)||!['codex-native','claude-json','dsh-dreamskin'].includes(t.format))return t;this.styleChecked.add(t.id);try{const raw=this.raw(t.id);if(raw.length>1024*1024)return t;const style=parseThemeText(raw.toString('utf8')).style;if(style)t.style=style;}catch{}return t;});}
  private save(items:ThemeItem[]){if(this.error)throw new Error(this.error);if(fs.existsSync(this.file))fs.copyFileSync(this.file,this.file+'.bak');atomicJson(this.file,{version:1,items});this.items=items;}
  import(raw:Buffer,filename:string){
    if(this.error)throw new Error(this.error);if(this.items.length>=100)throw new Error('最多保存 100 个主题，请先移除不用的主题');
    const name=path.basename(filename,path.extname(filename)).slice(0,80)||'导入的主题',zip=raw[0]===80&&raw[1]===75;
    const parsed=zip?parseThemeZip(raw,name):path.extname(filename).toLowerCase()==='.css'?parseThemeCss(raw.toString('utf8'),name):parseThemeText(raw.toString('utf8'),name);
    const bytes=zip?raw:Buffer.from(parsed.text!);
    const hash=createHash('sha256').update(bytes).digest('hex');
    if(this.items.some(t=>createHash('sha256').update(this.raw(t.id)).digest('hex')===hash))throw new Error('该主题已在主题库中');
    const item:ThemeItem={id:randomUUID(),name:parsed.name,format:parsed.format,colors:parsed.colors,importedAt:Date.now(),note:parsed.note,style:parsed.style};
    const file=this.location(item);fs.writeFileSync(file,bytes,{flag:'wx'});try{this.save([...this.items,item]);}catch(e){fs.unlinkSync(file);throw e;}return item;
  }
  get(id:unknown){const item=this.items.find(t=>t.id===id);if(!item)throw new Error('主题不存在');return item;}
  private location(item:ThemeItem){return path.join(this.dir,item.id+(item.format==='dreamskin-zip'?'.zip':'.txt'));}
  raw(id:string){return fs.readFileSync(this.location(this.get(id)));}
  remove(id:string){const item=this.get(id);this.save(this.items.filter(t=>t.id!==id));fs.unlinkSync(this.location(item));}
}

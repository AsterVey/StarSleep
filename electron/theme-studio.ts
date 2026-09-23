import {createHash} from 'node:crypto';
import {zipSync} from 'fflate';
import type {StudioDraft} from '../src/theme-studio';
import {parseThemeText,parseThemeZip} from './themes';
const roles=['surface','panel','ink','accent','muted','border'] as const;
export function validateStudio(value:unknown):StudioDraft{
 const v=value as StudioDraft;
 if(!v||typeof v!=='object'||typeof v.name!=='string'||!v.name.trim()||v.name.length>80||/[\x00-\x1f]/.test(v.name)||!['codex','codex-image','claude','deepseek'].includes(v.target)||!['light','dark'].includes(v.mode)||roles.some(k=>typeof v[k]!=='string'||!/^#[a-f\d]{6}$/i.test(v[k]))||![v.focusX,v.focusY].every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw Error('主题名称、配色或焦点无效');
 if(v.target==='codex-image'&&(typeof v.wallpaperId!=='string'||!/^[a-z\d-]{1,80}$/i.test(v.wallpaperId)))throw Error('请从背景库选择一张图片');
 return {name:v.name.trim(),target:v.target,mode:v.mode,...Object.fromEntries(roles.map(k=>[k,v[k]])),focusX:v.focusX,focusY:v.focusY,...(v.target==='codex-image'?{wallpaperId:v.wallpaperId}:{})} as StudioDraft;
}
// Produce data-only native themes, or Dream Skin's documented three-file ZIP.
// The background comes from our decoded local library, never a renderer-supplied path.
export function buildStudioTheme(value:unknown,image?:Buffer){
 const v=validateStudio(value),id='starnexus-'+createHash('sha256').update(JSON.stringify(v)).update(image??'').digest('hex').slice(0,16);
 let text='',extension='json';
 if(v.target==='codex') {extension='codex-theme-v1';text='codex-theme-v1:'+JSON.stringify({variant:v.mode,theme:{accent:v.accent,surface:v.surface,ink:v.ink}});}
 if(v.target==='claude')text=JSON.stringify({name:v.name,mode:v.mode,bgMain:v.surface,bgSidebar:v.panel,textPrimary:v.ink,textSecondary:v.muted,textMuted:v.muted,accentPrimary:v.accent,borderColor:v.border,codeBg:v.panel,glassEffect:false,glowEffect:false},null,2);
 if(v.target==='deepseek')text=JSON.stringify({format:'dsh-dream-skin/pack',version:1,manifest:{id,name:v.name,colorScheme:v.mode,accent:v.accent,tokens:{'--dsw-alias-bg-base':v.surface,'--dsw-alias-bg-layer-1':v.panel,'--dsw-alias-brand-primary':v.accent,'--dsw-alias-label-primary':v.ink,'--dsw-alias-label-secondary':v.muted,'--dsw-alias-border-l1':v.border,'--dsw-alias-border-l2':v.border}}},null,2);
 if(v.target==='codex-image'){
  if(!image?.length||image.length>10*1024*1024||image[0]!==0xff||image[1]!==0xd8)throw Error('背景必须是经过解码的 JPEG 图片，且不超过 10 MB');
  const theme={schemaVersion:1,id,name:v.name,image:'background.jpg',appearance:v.mode,art:{focusX:v.focusX,focusY:v.focusY,safeArea:'left',taskMode:'ambient'},colors:{background:v.surface,panel:v.panel,panelAlt:v.panel,accent:v.accent,accentAlt:v.accent,secondary:v.muted,highlight:v.accent,text:v.ink,muted:v.muted,line:v.border}};
  const css=`[data-ds-part="root"] { color: var(--ds-theme-color-text); }\n[data-ds-part="composer"] { background-color: var(--ds-theme-color-panel); border-color: var(--ds-theme-color-line); }\n`;
  const bytes=Buffer.from(zipSync({'theme.json':Buffer.from(JSON.stringify(theme,null,2)),'theme.css':Buffer.from(css),'background.jpg':image},{level:6}));parseThemeZip(bytes,v.name);return {bytes,filename:v.name+'.zip'};
 }
 parseThemeText(text,v.name);return {bytes:Buffer.from(text),filename:v.name+'.'+extension};
}

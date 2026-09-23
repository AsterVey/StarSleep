export type StudioTarget='codex'|'codex-image'|'claude'|'deepseek';
export interface StudioDraft {name:string;target:StudioTarget;mode:'light'|'dark';surface:string;panel:string;ink:string;accent:string;muted:string;border:string;wallpaperId?:string;focusX:number;focusY:number;}
export const STUDIO_PALETTES=[
 {name:'雾海',mode:'light',surface:'#F3F6F7',panel:'#E5ECEF',ink:'#243A49',accent:'#3C718C',muted:'#566C7A',border:'#C1D0D8'},
 {name:'深空',mode:'dark',surface:'#0B1424',panel:'#152338',ink:'#E2EDF7',accent:'#7BC8E4',muted:'#99AEC4',border:'#344961'},
 {name:'暖纸',mode:'light',surface:'#F8F4EC',panel:'#EEE6D9',ink:'#3C352C',accent:'#9F563E',muted:'#766554',border:'#D8CBBB'},
 {name:'鸢尾',mode:'dark',surface:'#181724',panel:'#252239',ink:'#EDE8F6',accent:'#BEA4E3',muted:'#B0A4C2',border:'#4C425F'},
] as const;
export function studioDraft():StudioDraft{return {...STUDIO_PALETTES[0],name:'我的雾海',target:'codex',focusX:.5,focusY:.5};}
export function contrastRatio(a:string,b:string){const luminance=(s:string)=>{const c=[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}

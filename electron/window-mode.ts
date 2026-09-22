import {screen, type BrowserWindow} from 'electron';
import type {WindowMode} from '../src/shared';
import {ExperienceStore,clampBounds,type Bounds} from './experience';

export class WindowModes {
  mode:WindowMode='full';
  blocked=false;
  private switching=false;
  private fullMaximized=false;
  private saveTimer:ReturnType<typeof setTimeout>|undefined;
  private positions:Partial<Record<WindowMode,Bounds>>;
  constructor(private win:BrowserWindow,private store:ExperienceStore,private changed:()=>void,private hasReminder:()=>boolean){
    this.positions={...store.data.bounds};
    this.apply('full');
    const remember=()=>{if(this.switching||win.isMinimized())return;clearTimeout(this.saveTimer);this.saveTimer=setTimeout(()=>this.remember(),400);};
    win.on('moved',remember);win.on('resized',remember);
    screen.on('display-removed',this.fit);screen.on('display-metrics-changed',this.fit);
  }
  private remember(){
    clearTimeout(this.saveTimer);this.saveTimer=undefined;
    if(this.win.isDestroyed()||this.win.isMinimized())return;
    const bounds=this.win.getNormalBounds();this.positions[this.mode]=bounds;
    if(!this.store.error)try{this.store.bounds(this.mode,bounds);}catch{this.changed();}
  }
  private apply(mode:WindowMode){
    this.switching=true;
    const current=this.win.getNormalBounds(),area=screen.getDisplayMatching(this.positions[mode]??current).workArea;
    const desired=this.positions[mode]??(mode==='mini'?{x:area.x+area.width-340,y:area.y+24,width:320,height:168}:current);
    const target=clampBounds(mode==='mini'?{...desired,width:320,height:168}:desired,area);
    this.win.setMinimumSize(Math.min(mode==='mini'?320:900,area.width),Math.min(mode==='mini'?168:650,area.height));
    this.win.setResizable(mode==='full');this.win.setMaximizable(mode==='full');
    this.win.setBounds(target);this.win.setAlwaysOnTop(mode==='mini'&&this.store.data.prefs.miniPinned,'screen-saver');
    this.switching=false;
  }
  private fit=()=>{if(this.win.isDestroyed())return;this.positions[this.mode]=this.win.getNormalBounds();this.apply(this.mode);this.remember();};
  set(mode:WindowMode,force=false){
    if(mode!=='full'&&mode!=='mini')throw new Error('窗口模式无效');
    if(mode==='mini'&&(this.blocked||this.hasReminder()))throw new Error('请先处理当前面板或提醒，再进入迷你模式');
    if(mode===this.mode)return;
    this.remember();this.switching=true;
    if(this.mode==='full')this.fullMaximized=this.win.isMaximized();
    if(this.win.isMaximized())this.win.unmaximize();
    if(this.win.isMinimized())this.win.restore();
    this.mode=mode;this.apply(mode);
    if(mode==='full'&&this.fullMaximized&&!force)this.win.maximize();
    this.changed();
  }
  pin(){this.win.setAlwaysOnTop(this.mode==='mini'&&this.store.data.prefs.miniPinned,'screen-saver');}
  dispose(){this.remember();screen.removeListener('display-removed',this.fit);screen.removeListener('display-metrics-changed',this.fit);}
}

import {app,BrowserWindow,clipboard,dialog,ipcMain,shell,nativeImage,net} from 'electron';
import {Workshop} from './workshop-core';
import {themeDownloader} from './workshop-network';
import {buildStudioTheme,validateStudio} from './theme-studio';
import {COMMUNITY_THEMES} from '../src/community-catalog';
import type {HealthReport,HealthItem} from '../src/workshop-types';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {AgentBridge,atomicJson,editHooks,hookCommand} from './agent-bridge';
import {NightWatch} from './night-watch';
import {ThemeLibrary,MAX_THEME_BYTES,parseThemeText} from './themes';
import {CodexAppearance} from './codex-theme';
import {probeThemeClients} from './theme-clients';
import {WallpaperLibrary,MAX_WALLPAPER_BYTES} from './wallpapers';
import {DshAppearance,probeDsh} from './dsh-theme';
import type {IntegrationSnapshot,ThemeClients} from '../src/integration-types';

const digest=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
export class Integrations {
  readonly night:NightWatch;readonly bridge:AgentBridge;readonly themes:ThemeLibrary;
  error='';private last='';private configBusy=false;
  private clients?:ThemeClients;
  private wallpapers?:WallpaperLibrary;
  private selectedDshHome?:string;
  readonly workshop:Workshop;
  skillHealth:()=>{items:{name:string;status:string;detail:string}[];error:string}=()=>({items:[],error:''});
  constructor(private root:string,private window:()=>BrowserWindow|null,private safe:boolean,private blocked:()=>boolean,warningMinutes:()=>number,execute:()=>Promise<void>,log:(text:string,error?:boolean)=>void,notify:()=>void){
    this.night=new NightWatch(Date.now,pid=>{try{process.kill(pid,0);return true;}catch{return false;}},warningMinutes,execute,log,notify);
    this.bridge=new AgentBridge(root,this.night,()=>this.send());this.themes=new ThemeLibrary(root);
    this.workshop=new Workshop(root,COMMUNITY_THEMES,this.themes,themeDownloader((url,options)=>net.fetch(url as string,options)),()=>{const w=this.window();if(w&&!w.isDestroyed())w.webContents.send('workshop',this.workshop.state);this.send();});
  }
  async start(){try{await this.bridge.start();}catch{this.error='Agent 接入未能启动，自动联动不可用。定时计划仍可使用。';}this.register();}
  private config(provider:'codex'|'claude',real=false){
    if(this.safe&&!real)return path.join(this.root,'test-clients',provider,provider==='codex'?'hooks.json':'settings.json');
    return provider==='codex'?path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'hooks.json'):path.join(process.env.CLAUDE_CONFIG_DIR||path.join(os.homedir(),'.claude'),'settings.json');
  }
  private script(){return path.join(this.bridge.dir,'agent-hook.ps1');}
  private installed(provider:'codex'|'claude',real=false){try{return fs.readFileSync(this.config(provider,real),'utf8').includes(JSON.stringify(hookCommand(this.script(),provider)).slice(1,-1));}catch{return false;}}
  snapshot():IntegrationSnapshot{return {night:this.night.snapshot(),themes:this.themes.list(),installed:{codex:this.installed('codex'),claude:this.installed('claude')},realHooks:{codex:{installed:this.installed('codex',true),path:this.config('codex',true)},claude:{installed:this.installed('claude',true),path:this.config('claude',true)}},clients:this.clients,codexRestore:this.codexAppearance().canRestore,dshRestore:this.dshAppearance().canRestore,error:this.error||this.themes.error||undefined};}
  send(force=false){const w=this.window();if(!w||w.isDestroyed())return;const state=this.snapshot(),signature=JSON.stringify(state);if(force||signature!==this.last){this.last=signature;w.webContents.send('integrations',state);}}
  tick(){this.bridge.check();this.night.tick(this.blocked());this.send();}
  stop(){this.bridge.stop();this.workshop.stop();}
  private async health():Promise<HealthReport>{
    await this.refreshClients();const items:HealthItem[]=[];
    for(const [key,c]of Object.entries(this.clients!)){items.push({name:c.label,status:c.ready?'ok':'attention',detail:c.detail,next:c.ready?'在我的主题中选择对应格式；写入后在原客户端确认效果。':'打开客户端配置，按作者说明准备兼容加载器。'});
      const folder=path.dirname(c.configPath||'.');items.push({name:`${key} 配置目录`,status:c.configPath&&fs.existsSync(folder)?'ok':'attention',detail:c.configPath&&fs.existsSync(folder)?'目录存在':'尚未选择或目录尚不存在',next:'在客户端配置页查看目标位置。'});
      const backup=key==='codex'?this.codexAppearance().canRestore:key==='deepseek'?this.dshAppearance().canRestore:fs.existsSync(path.join(this.root,'themes/claude-restore.json'));
      items.push({name:`${key} 外观备份`,status:'ok',detail:backup?'已有星枢还原记录':'尚无还原记录，首次配置时建立',next:backup?'可使用选择性恢复；遇到外部修改时会停止。':'先预览更改，再应用主题。'});
    }
    items.push(...this.themes.list().map(t=>{try{parseThemeText(this.themes.raw(t.id).toString('utf8'));return {name:`主题 · ${t.name}`,status:'ok' as const,detail:'数据格式可识别',next:'按主题对应的客户端配置。'};}catch{return {name:`主题 · ${t.name}`,status:'attention' as const,detail:['dreamskin-zip','custom-css'].includes(t.format)?'需作者指定的外部加载器':'主题文件需重新核对',next:'导出原包并查看作者说明，不执行包内脚本。'};}}));
    const skills=this.skillHealth();items.push(...skills.items.map(s=>({name:`Skill · ${s.name}`,status:s.status==='ok'?'ok' as const:'attention' as const,detail:s.detail,next:s.status==='ok'?'无须处理':'在本机 Skills 中核对文件，星枢不会覆盖修改。'})));
    if(skills.error)items.push({name:'Skills 操作记录',status:'attention',detail:skills.error,next:'检查 skill-operation.json 与对应安装目录后重启。'});
    if(this.workshop.state.error)items.push({name:'工坊存储',status:'attention',detail:this.workshop.state.error,next:'检查数据目录权限与 workshop.json 备份后重启。'});
    return {at:Date.now(),safe:this.safe,items,clients:this.clients};
  }
  private register(){
    const handle=(name:string,fn:(...args:any[])=>unknown)=>ipcMain.handle(name,async(event,...args)=>{const w=this.window();if(event.sender!==w?.webContents||event.senderFrame!==w.webContents.mainFrame)throw new Error('不允许的调用');try{return await fn(...args);}finally{this.send();}});
    handle('workshop-catalog',()=>COMMUNITY_THEMES.map(({download,...r})=>({...r,download:download?{filename:download.filename}:undefined})));
    handle('workshop-state',()=>this.workshop.state);
    handle('theme-create',input=>{const draft=validateStudio(input);const image=draft.target==='codex-image'?nativeImage.createFromBuffer(this.wallpaperLibrary().raw(draft.wallpaperId!)).toJPEG(92):undefined;const result=buildStudioTheme(draft,image);return this.themes.import(result.bytes,result.filename);});
    handle('workshop-download',id=>this.workshop.download(id));
    handle('workshop-cancel',id=>this.workshop.cancel(id));
    handle('workshop-favorite',(id,value)=>this.workshop.favorite(id,value));
    handle('workshop-open',id=>shell.openExternal(this.workshop.resource(id).source));
    handle('workshop-confirm',id=>this.workshop.confirm(id));
    handle('theme-drop',(file:unknown)=>{if(typeof file!=='string'||!path.isAbsolute(file)||!fs.statSync(file).isFile())throw Error('请拖入一个本地美化文件');if(/\.(png|jpe?g|webp)$/i.test(file))this.wallpaperLibrary().import(readLimited(file,MAX_WALLPAPER_BYTES),file);else{if(!/\.(json|txt|codex-theme-v1|css|zip)$/i.test(file))throw Error('不支持这种美化文件');this.themes.import(readLimited(file,MAX_THEME_BYTES),file);}});
    handle('client-health',()=>this.health());
    handle('health-export',async()=>{const report=await this.health();const chosen=await dialog.showSaveDialog(this.window()!,{title:'导出脱敏配置体检',defaultPath:'StarSleep-Health.json',filters:[{name:'JSON',extensions:['json']}]});if(chosen.canceled||!chosen.filePath)return false;const items=report.items.map(i=>({...i,detail:i.detail.replace(/[A-Z]:[\\/][^\s，；。]+/gi,'[本机路径]')}));fs.writeFileSync(chosen.filePath,JSON.stringify({version:1,at:report.at,safe:report.safe,items},null,2));return true;});
    handle('wallpaper-list',()=>({items:this.wallpaperLibrary().list(),error:this.wallpaperLibrary().error}));
    handle('wallpaper-preview',id=>nativeImage.createFromBuffer(this.wallpaperLibrary().raw(id)).resize({width:1200,quality:'good'}).toDataURL());
    handle('wallpaper-import',async()=>{const chosen=await dialog.showOpenDialog(this.window()!,{title:'导入背景图片',properties:['openFile'],filters:[{name:'背景图片（不超过 10 MB）',extensions:['png','jpg','jpeg','webp']}]});if(chosen.canceled)return false;const file=chosen.filePaths[0];return this.wallpaperLibrary().import(readLimited(file,MAX_WALLPAPER_BYTES),file);});
    handle('wallpaper-export',async id=>{const lib=this.wallpaperLibrary(),item=lib.item(id),ext=item.builtin?'png':'jpg';const chosen=await dialog.showSaveDialog(this.window()!,{title:'导出背景，再到 DeepSeek 的 Theme / 外观选择图片',defaultPath:`${item.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')}.${ext}`,filters:[{name:'背景图片',extensions:[ext]}]});if(chosen.canceled||!chosen.filePath)return false;fs.writeFileSync(chosen.filePath,lib.raw(id));return true;});
    handle('wallpaper-remove',id=>this.wallpaperLibrary().remove(id));
    handle('theme-dsh-select',async()=>{
      if(this.configBusy)throw new Error('另一个配置操作尚未完成');this.configBusy=true;
      try{if(this.safe){await this.refreshClients();return this.snapshot();}
        const chosen=await dialog.showOpenDialog(this.window()!,{title:'选择 DeepSeek 数据目录 DSH_HOME（包含 profiles 文件夹）',properties:['openDirectory']});if(chosen.canceled)return false;
        const home=chosen.filePaths[0],status=probeDsh(home);if(!status.ready)throw new Error(status.detail);
        if(this.dshAppearance().canRestore&&home!==this.dshHome())throw new Error('请先恢复已配置目录的 DeepSeek 外观，再切换数据目录');
        atomicJson(path.join(this.root,'theme-targets.json'),{version:1,dshHome:home});this.selectedDshHome=home;await this.refreshClients();return this.snapshot();
      }finally{this.configBusy=false;}
    });
    handle('theme-dsh-apply',id=>{const item=this.themes.get(id);if(item.format!=='dsh-dreamskin')throw new Error('请选择 DeepSeek Dream Skin 原生主题包');return this.configureDsh(`主题「${item.name}」`,appearance=>{appearance.applyPack(this.themes.raw(id).toString('utf8'));this.workshop.written(id,'deepseek');});});
    handle('wallpaper-dsh-apply',id=>{const lib=this.wallpaperLibrary(),item=lib.item(id);return this.configureDsh(`背景「${item.name}」`,appearance=>appearance.applyWallpaper(nativeImage.createFromBuffer(lib.raw(id)).toDataURL()));});
    handle('theme-dsh-restore',()=>this.configureDsh('恢复星枢首次配置前的外观',appearance=>{appearance.restore();this.workshop.restored('deepseek');},true));
    handle('integrations',()=>this.snapshot());
    handle('agent-arm',(ids)=>{if(this.blocked())throw new Error('请先恢复计划或解除存储故障');this.night.arm(ids);return this.snapshot();});
    handle('agent-disarm',()=>{this.night.disarm();return this.snapshot();});
    handle('agent-connect',async(provider,install,real=false)=>{
      if(!['codex','claude'].includes(provider)||typeof install!=='boolean'||typeof real!=='boolean')throw new Error('接入参数无效');
      if(this.configBusy)throw new Error('另一个配置操作尚未完成');this.configBusy=true;
      try{
        const file=this.config(provider,real),command=hookCommand(this.script(),provider),raw=fs.existsSync(file)?readLimited(file,1024*1024).toString('utf8'):undefined;
        const next=editHooks(raw,command,provider,install);
        const answer=await dialog.showMessageBox(this.window()!,{type:'question',title:install?'配置 Agent 接入':'移除 Agent 接入',message:`${install?'添加':'移除'}星枢的 ${provider==='codex'?'Codex':'Claude Code 桌面本地会话'} hooks`,detail:`修改文件：${file}\n\n${install?'保留其他设置并先创建备份，替换其他星枢版本的接入。开始新任务时加入完成报告约定；原始对话不落盘、不上传。Codex 需要在其界面中信任 hooks 后生效。Claude 仅支持 Code 标签本地会话，Chat / Cowork 暂不支持。':'仅移除当前星枢版本创建的 hook，保留其他配置与备份。'}${this.safe?(real?'\n\n将配置真实客户端；星枢仍处于安全测试模式，不会实际关机。':'\n\n仅模拟配置：只修改隔离测试目录，不会出现在真实客户端中。'):''}`,buttons:['取消',install?'备份并配置':'移除接入'],defaultId:0,cancelId:0});
        if(answer.response!==1)return false;
        const current=fs.existsSync(file)?fs.readFileSync(file,'utf8'):undefined;if(current!==raw)throw new Error('客户端配置已被其他程序修改，请重新操作');
        if(install){fs.mkdirSync(this.bridge.dir,{recursive:true});fs.copyFileSync(path.join(app.getAppPath(),'resources','agent-hook.ps1'),this.script());}
        fs.mkdirSync(path.dirname(file),{recursive:true});if(raw!==undefined)fs.writeFileSync(`${file}.starsleep-${Date.now()}.bak`,raw,{flag:'wx'});
        atomicJson(file,JSON.parse(next));this.night.disarm('接入配置已变化，请在客户端开始新任务后开启联动');return this.snapshot();
      }finally{this.configBusy=false;}
    });
    handle('agent-export-dsh',async()=>{
      const chosen=await dialog.showOpenDialog(this.window()!,{title:'选择 DeepSeek 连接器导出位置',properties:['openDirectory','createDirectory']});if(chosen.canceled)return false;
      const dir=path.join(chosen.filePaths[0],'dsh-starsleep');if(fs.existsSync(dir))throw new Error('该位置已有 dsh-starsleep，请选择其他目录');
      fs.cpSync(path.join(app.getAppPath(),'resources','dsh-starsleep'),dir,{recursive:true,errorOnExist:true,force:false});atomicJson(path.join(dir,'connection-path.json'),{path:path.join(this.bridge.dir,'connection.json')});fs.copyFileSync(path.join(app.getAppPath(),'LICENSE'),path.join(dir,'LICENSE'));
      fs.writeFileSync(path.join(dir,'接入说明.txt'),'在已安装 DeepSeek Harness 的终端执行：\r\ndsh plugin --profile web add "'+dir+'"\r\n\r\nDSH Desktop 请将 web 改为实际 profile（通常为 desktop）。重启对应 Harness 并开始新任务，再到星枢选择任务。\r\n卸载：dsh plugin --profile web remove dsh-starsleep\r\n本插件按 2026-09-22 上游接口实现，开发预览版本变化后应重新验证。只支持本机 Harness。星枢完全退出后不会关机。\r\n','utf8');return true;
    });
    handle('agent-demo',()=>{
      if(!this.safe)throw new Error('请从安全体验入口启动后演示 Agent 联动');
      const sessionId='demo-'+randomUUID();const base={provider:'codex',sessionId,pid:process.pid,at:Date.now(),name:'安全演示 · 夜间代码检查'};
      const result=this.night.event({...base,event:'start',eventId:randomUUID()});this.night.arm([`codex:${sessionId}`]);const marker=result.context!.match(/\[STARSLEEP_DONE:[a-f0-9]+\]/)![0];this.night.event({...base,event:'stop',message:`演示任务已完成\n${marker}`,eventId:randomUUID()});return this.snapshot();
    });
    handle('theme-import',async()=>{const chosen=await dialog.showOpenDialog(this.window()!,{title:'导入主题、CSS 或背景图片',properties:['openFile'],filters:[{name:'美化文件',extensions:['json','txt','codex-theme-v1','css','zip','png','jpg','jpeg','webp']},{name:'主题',extensions:['json','txt','codex-theme-v1','css','zip']},{name:'背景图片',extensions:['png','jpg','jpeg','webp']}]});if(chosen.canceled)return false;const file=chosen.filePaths[0];if(/\.(png|jpe?g|webp)$/i.test(file)){this.wallpaperLibrary().import(readLimited(file,MAX_WALLPAPER_BYTES),file);return '图片已加入「DeepSeek 背景」页，可在那里预览并配置；尚未改变客户端。';}this.themes.import(readLimited(file,MAX_THEME_BYTES),file);return this.snapshot();});
    handle('theme-import-text',(text,name)=>{if(typeof text!=='string'||typeof name!=='string'||name.length>80)throw new Error('主题文本或名称无效');this.themes.import(Buffer.from(text),name||'主题.txt');return this.snapshot();});
    handle('theme-remove',id=>{this.themes.remove(id);return this.snapshot();});
    handle('theme-copy',id=>{const item=this.themes.get(id);if(item.format==='dreamskin-zip')throw new Error('ZIP 主题请导出后使用 Dream Skin 导入');clipboard.writeText(this.themes.raw(id).toString('utf8'));return item.note;});
    handle('theme-export',async id=>{const item=this.themes.get(id),ext=item.format==='dreamskin-zip'?'zip':item.format==='custom-css'?'css':item.format==='codex-native'?'codex-theme-v1':'json';const chosen=await dialog.showSaveDialog(this.window()!,{title:'导出主题',defaultPath:`${item.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')}.${ext}`,filters:[{name:'主题文件',extensions:[ext]}]});if(chosen.canceled||!chosen.filePath)return false;fs.writeFileSync(chosen.filePath,this.themes.raw(id));return true;});
    handle('theme-clients',async()=>{await this.refreshClients();return this.snapshot();});
    handle('theme-codex-apply',async id=>{
      const item=this.themes.get(id);if(item.format!=='codex-native')throw new Error('请选择 Codex 原生主题');
      if(this.configBusy)throw new Error('另一个配置操作尚未完成');this.configBusy=true;
      try{
        const appearance=this.codexAppearance();await this.refreshClients();
        if(!this.clients!.codex.ready)throw new Error(this.clients!.codex.detail);
        const answer=await dialog.showMessageBox(this.window()!,{type:'question',title:'配置 Codex 原界面',message:`将「${item.name}」应用到 Codex`,detail:`目标：${appearance.target}\n\n保存原有外观字段，然后写入主题颜色、字体和明暗模式。其他 Codex 设置保持原样。保存后请重新打开 Codex 核对效果；星枢不会结束正在运行的任务。${this.safe?'\n\n安全体验：只修改隔离测试配置，不修改真实 Codex。':''}`,buttons:['取消','备份并应用到 Codex'],defaultId:0,cancelId:0});
        if(answer.response!==1)return '已取消';
        if(this.safe&&!fs.existsSync(appearance.target)){fs.mkdirSync(path.dirname(appearance.target),{recursive:true});fs.writeFileSync(appearance.target,'[desktop]\nappearanceTheme = "system"\n',{flag:'wx'});}
        appearance.apply(this.themes.raw(id).toString('utf8'));this.workshop.written(id,'codex');
        return this.safe?'已写入隔离测试配置；真实 Codex 外观未改变。':'Codex 外观配置已写入并保留备份。请重新打开 Codex，确认原界面的配色与字体。';
      }finally{this.configBusy=false;}
    });
    handle('theme-codex-restore',async()=>{
      if(this.configBusy)throw new Error('另一个配置操作尚未完成');this.configBusy=true;
      try{const answer=await dialog.showMessageBox(this.window()!,{type:'question',title:'恢复 Codex 原外观',message:'恢复星枢首次配置前的 Codex 外观？',detail:'只恢复星枢改过的主题字段，保留期间其他设置的变化。外观在其他程序中被修改过时会停止还原。',buttons:['取消','恢复 Codex 原外观'],defaultId:0,cancelId:0});if(answer.response!==1)return '已取消';this.codexAppearance().restore();this.workshop.restored('codex');return this.safe?'已还原隔离测试配置。':'已恢复原外观字段，请重新打开 Codex 确认。';}finally{this.configBusy=false;}
    });
    handle('theme-claude-apply',async id=>{
      const item=this.themes.get(id);if(item.format!=='claude-json')throw new Error('请选择 Claude JSON 主题');if(this.configBusy)throw new Error('另一个配置操作尚未完成');this.configBusy=true;
      try{const file=this.claudeThemePath(),raw=this.themes.raw(id).toString('utf8');parseThemeText(raw);
        await this.refreshClients();if(!this.clients!.claude.ready)throw new Error(this.clients!.claude.detail+' 请打开 Claude 美化配置指南。');
        const answer=await dialog.showMessageBox(this.window()!,{type:'question',title:'配置 Claude 原界面',message:`将「${item.name}」交给已检测到的 Claude 加载器`,detail:`星枢将备份并写入 ${file}。\nTheme Mod 加载器负责在 Claude 原界面加载颜色。配置后请切换到 Claude 确认；客户端升级后需要重新检查兼容性。${this.safe?'\n安全模式仅写入隔离目录，不代表真实客户端已经加载。':''}`,buttons:['取消','备份并应用到 Claude'],defaultId:0,cancelId:0});if(answer.response!==1)return '已取消';
        const stateFile=path.join(this.root,'themes','claude-restore.json'),before=fs.existsSync(file)?readLimited(file,1024*1024).toString('utf8'):null;
        let state:{before:string|null;written:string}=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{before,written:digest(before??'')};
        if(state.written!==digest(before??''))throw new Error('Claude 主题已在外部修改，请先保留或移除旧还原记录后再配置');
        const encoded=JSON.stringify(JSON.parse(raw),null,2);
        atomicJson(stateFile,{...state,written:digest(encoded)});try{atomicJson(file,JSON.parse(raw));this.workshop.written(id,'claude');}catch(e){atomicJson(stateFile,state);throw new Error(`写入失败，已保留还原记录：${String(e)}`);}return this.safe?'已写入隔离测试配置；真实 Claude 外观未改变。':'Claude 加载器的主题配置已写入；请在 Claude 原界面确认实际外观。';
      }finally{this.configBusy=false;}
    });
    handle('theme-claude-restore',()=>{if(this.configBusy)throw new Error('另一个配置操作尚未完成');const record=path.join(this.root,'themes','claude-restore.json');if(!fs.existsSync(record))throw new Error('没有星枢保存的 Claude 主题备份');const state=JSON.parse(fs.readFileSync(record,'utf8')),file=this.claudeThemePath();if(!fs.existsSync(file)||digest(fs.readFileSync(file))!==state.written)throw new Error('主题文件已在外部修改，未覆盖；请保留现有配置后手动处理');if(state.before===null)fs.unlinkSync(file);else fs.writeFileSync(file,state.before,'utf8');fs.unlinkSync(record);this.workshop.restored('claude');return '已恢复配置前的 Claude 主题文件';});
    const links={ 'codex-theme':'https://github.com/Fei-Away/Codex-Dream-Skin', 'dsh-theme':'https://github.com/RevolutionLA/dsh-dream-skin', 'claude-theme':'https://github.com/sillyhappydog/claude-theme-mod',guide:'https://github.com/AsterVey/StarSleep' };
    handle('integration-link',(target:unknown)=>{if(typeof target!=='string'||!Object.hasOwn(links,target))throw new Error('无效链接');return shell.openExternal(links[target as keyof typeof links]);});
  }
  private dshHome(){if(this.safe)return path.join(this.root,'test-clients','deepseek');if(this.selectedDshHome!==undefined)return this.selectedDshHome;try{const data=JSON.parse(readLimited(path.join(this.root,'theme-targets.json'),16384).toString('utf8'));return this.selectedDshHome=data.version===1&&typeof data.dshHome==='string'&&path.isAbsolute(data.dshHome)?data.dshHome:'';}catch{return this.selectedDshHome='';}}
  private dshAppearance(){return new DshAppearance(this.dshHome(),this.root);}
  private async refreshClients(){this.clients={...await probeThemeClients(this.codexAppearance().target,this.claudeThemePath(),this.safe),deepseek:this.safe?{ready:true,label:'DeepSeek · 隔离测试客户端',detail:'仅模拟 Dream Skin 持久化配置；不代表真实插件已安装。',configPath:this.dshAppearance().target}:probeDsh(this.dshHome())};}
  private async configureDsh(label:string,apply:(appearance:DshAppearance)=>void,restore=false){
    if(this.configBusy)throw new Error('另一个配置操作尚未完成');this.configBusy=true;
    try{await this.refreshClients();const status=this.clients!.deepseek!;if(!status.ready)throw new Error(status.detail+' 请先在原界面美化页选择数据目录并重新检测。');
      const answer=await dialog.showMessageBox(this.window()!,{type:'question',title:'配置 DeepSeek 原界面',message:label,detail:`目标：${status.configPath}\n\n请先完全退出 DeepSeek，再继续。运行中的插件可能覆盖文件修改。${restore?'只恢复星枢改过的外观字段；外部修改冲突时停止。':'先备份涉及的外观字段，再写入配置；保留其他设置。'}配置后重新打开 DeepSeek 核对效果。星枢不会结束客户端或任务。${this.safe?'\n\n安全体验：仅操作隔离目录，不修改真实 DeepSeek。':''}`,buttons:['取消',this.safe?'配置隔离测试文件':restore?'已退出，恢复外观':'已退出，备份并配置'],defaultId:0,cancelId:0});if(answer.response!==1)return '已取消';
      apply(this.dshAppearance());return this.safe?'已处理隔离测试文件；真实 DeepSeek 外观未改变。':restore?'DeepSeek 外观字段已恢复，请重新打开客户端核对。':'DeepSeek 外观配置已写入并备份，请重新打开客户端核对效果。';
    }finally{this.configBusy=false;}
  }
  private claudeThemePath(){return this.safe?path.join(this.root,'test-clients','claude','theme.json'):path.join(os.homedir(),'.claude','theme.json');}
  private wallpaperLibrary(){return this.wallpapers??=new WallpaperLibrary(this.root,path.join(app.getAppPath(),'resources','wallpapers'),bytes=>{const image=nativeImage.createFromBuffer(bytes);if(image.isEmpty())throw new Error('无法解码图片，请选择完整的 PNG、JPEG 或 WebP 文件');const {width,height}=image.getSize();return {width,height,thumbnail:image.resize({width:320,quality:'good'}).toDataURL(),normalized:image.toJPEG(92)};});}
  private codexAppearance(){return new CodexAppearance(path.join(path.dirname(this.config('codex')),'config.toml'),this.root);}
}
export function readLimited(file:string,max:number){const fd=fs.openSync(file,'r');try{if(fs.fstatSync(fd).size>max)throw new Error('文件超过大小限制');const data=Buffer.alloc(max+1);const n=fs.readSync(fd,data,0,data.length,0);if(n>max)throw new Error('文件超过大小限制');return data.subarray(0,n);}finally{fs.closeSync(fd);}}

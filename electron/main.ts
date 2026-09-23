import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, powerMonitor, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Scheduler, localDate } from './scheduler';
import { Storage } from './storage';
import type { Settings, PlanDefinition, PauseInput } from '../src/shared';
import { exportTransfer, parseTransfer, classifyImport, MAX_TRANSFER_BYTES } from './transfer';
import { PRODUCT } from '../src/product';
import { exportLogText } from './logs';
import {ExperienceStore} from './experience';
import {WindowModes} from './window-mode';
import {Integrations} from './integrations';
import {Toolbox} from './toolbox';
const safeMode=process.argv.includes('--safe-mode');
app.setPath('userData',path.join(app.getPath('appData'),'StarSleep'));
const qaData=process.env.STARSLEEP_QA_DATA;
if(qaData && safeMode)app.setPath('userData',path.resolve(qaData));
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const gotLock=app.requestSingleInstanceLock();
if(!gotLock)app.quit();
let win:BrowserWindow|null=null, tray:Tray|null=null, scheduler:Scheduler, timer:NodeJS.Timeout|undefined;
let quitting=false, storageError='', suspended=false, lastMono=performance.now(), lastWall=Date.now(), lastOffset=new Date().getTimezoneOffset();
let pendingImport:{token:string;plans:PlanDefinition[]}|null=null;
let traySignature='', sentRevision=-1, sentError='', runtimeSignature='';
let experience:ExperienceStore,modes:WindowModes|undefined,experienceSignature='';
let integrations:Integrations|undefined;let toolbox:Toolbox|undefined;
let shutdownInFlight:Promise<void>|undefined,lastShutdownRequest=0;
function executeShutdown():Promise<void>{
  if(shutdownInFlight&&Date.now()-lastShutdownRequest<2000)return shutdownInFlight;
  if(!scheduler.active||scheduler.data.paused||storageError||quitting||suspended)return Promise.reject(new Error('自动执行已停止'));
  lastShutdownRequest=Date.now();
  shutdownInFlight=new Promise<void>((resolve,reject)=>{
    if(safeMode){scheduler.log('安全测试模式 · 已拦截实际关机');saveState();resolve();return;}
    const executable=path.join(process.env.SystemRoot??'C:\\Windows','System32','shutdown.exe');
    execFile(executable,['/s','/f','/t','0'],{windowsHide:true,timeout:15_000},error=>error?reject(error):resolve());
  });return shutdownInFlight;
}
function currentWarnings(){const warning=integrations?.night.warning;return warning?[...scheduler.warnings,warning]:scheduler.warnings;}
function currentSnapshot(){return {...scheduler.snapshot(safeMode),warnings:currentWarnings(),storageError};}
function pauseAll(paused:boolean){scheduler.setPaused(paused);if(paused)integrations?.night.disarm('全部计划已暂停，夜间联动已解除');}
function pauseFor(input:PauseInput){scheduler.pauseFor(input);integrations?.night.disarm('全部计划暂时暂停，夜间联动已解除；恢复计划不会自动开启联动');}
let watchingAgenda=false,agendaRevision=-1,agendaDate='',agendaOffset=0,agendaBoundary=0;
function sendExperience(){if(!win||win.isDestroyed()||!experience)return;const value=experience.snapshot(modes?.mode??'full'),signature=JSON.stringify(value);if(signature!==experienceSignature){experienceSignature=signature;win.webContents.send('experience',value);}}
function sendAgenda(force=false){
  if(!watchingAgenda||!win?.isVisible()||win.isMinimized()||modes?.mode==='mini')return;
  const now=Date.now(),date=localDate(new Date(now)),offset=new Date(now).getTimezoneOffset();
  if(!force&&agendaRevision===scheduler.revision&&agendaDate===date&&agendaOffset===offset&&now<agendaBoundary)return;
  const value=scheduler.agenda(),midnight=new Date(now);midnight.setDate(midnight.getDate()+1);midnight.setHours(0,0,0,0);
  agendaRevision=scheduler.revision;agendaDate=date;agendaOffset=offset;agendaBoundary=Math.min(+midnight,...value.days.flatMap(d=>d.occurrences.map(o=>o.at)));
  win.webContents.send('agenda',value);
}
function updateTray(){
  if(!tray)return;
  const trayPaused=scheduler.data.paused;
  const signature=`${scheduler.revision}:${storageError}:${integrations?.night.armed}`;
  if(traySignature===signature)return;traySignature=signature;
  const next=scheduler.snapshot().plans.filter(p=>p.kind==='shutdown'&&p.nextAt!==null).sort((a,b)=>a.nextAt!-b.nextAt!)[0];
  tray.setToolTip(storageError?'星枢 · 故障，自动执行已停止':trayPaused?(scheduler.data.pauseUntil?`星枢 · 暂停至 ${new Date(scheduler.data.pauseUntil).toLocaleString('zh-CN',{hour12:false})}`:'星枢 · 全部计划已暂停'):'星枢 · 运行中，定时任务有效');
  tray.setContextMenu(Menu.buildFromTemplate([{label:'打开星枢',click:show},{label:'迷你模式',click:()=>{if(modes?.mode==='mini'){win?.show();win?.focus();}else{show();win?.webContents.send('open-mini');}}},{label:integrations?.night.armed?'Agent 联动已开启':'Agent 联动未开启',enabled:false},{label:'取消 Agent 夜间联动',enabled:!!integrations?.night.armed,click:()=>{integrations?.night.disarm();send();}},{label:next?`${trayPaused?'暂停中 · 原定':'下次关机'} ${new Date(next.nextAt!).toLocaleString('zh-CN',{hour12:false})}`:'尚未安排关机',enabled:false},{label:'快捷计时',enabled:!storageError,click:()=>{show();win?.webContents.send('open-quick');}},{label:trayPaused?'恢复计划':'暂停全部计划',enabled:!storageError,click:()=>{try{pauseAll(!scheduler.data.paused);send();}catch(e){dialog.showErrorBox('星枢',String(e));}}},{label:scheduler.data.pauseUntil?`自动恢复于 ${new Date(scheduler.data.pauseUntil).toLocaleString('zh-CN',{hour12:false})}`:'临时暂停',enabled:!storageError,submenu:[...[15,30,60,120].map(minutes=>({label:`暂停 ${minutes} 分钟`,click:()=>{try{pauseFor({minutes});send();}catch(e){dialog.showErrorBox('星枢',String(e));}}})),{label:'一直暂停 · 手动恢复',click:()=>{try{pauseAll(true);send();}catch(e){dialog.showErrorBox('星枢',String(e));}}}]},{label:'演示关机提醒',click:()=>{scheduler.demo('shutdown');send();}},{type:'separator'},{label:'退出星枢 · 停止所有任务',click:()=>app.quit()}]));
}
function show(){if(win){modes?.set('full');win.setSkipTaskbar(false);win.show();if(win.isMinimized())win.restore();win.focus();}}
function send(force=false){
  updateTray();if(!win || win.isDestroyed())return;sendExperience();sendAgenda(force);integrations?.send(force);
  const runtime={warnings:currentWarnings(),alarms:scheduler.alarms,settings:scheduler.data.settings,paused:scheduler.data.paused,pauseUntil:scheduler.data.pauseUntil,storageError};
  const signature=JSON.stringify(runtime);
  if(signature!==runtimeSignature || force){runtimeSignature=signature;win.webContents.send('runtime',{...runtime,now:Date.now()});}
  if(win.isVisible()&&!win.isMinimized()){
    if(force||sentRevision!==scheduler.revision||sentError!==storageError){sentRevision=scheduler.revision;sentError=storageError;win.webContents.send('state',currentSnapshot());}
    win.webContents.send('clock',Date.now());
  }
}
function visibility(){const visible=!!win?.isVisible()&&!win?.isMinimized();win?.webContents.send('visibility',visible);if(visible)send(true);}
function iconImage(){return nativeImage.createFromPath(path.join(app.getAppPath(),'resources','icon.png'));}
function createWindow(){
  win=new BrowserWindow({width:1240,height:820,minWidth:900,minHeight:650,show:false,frame:false,backgroundColor:'#060d18',title:'星枢',icon:iconImage(),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:true}});
  modes=new WindowModes(win,experience,()=>{sendExperience();sendAgenda(true);},()=>currentWarnings().length>0||scheduler.alarms.length>0);
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',event=>event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  win.on('close',event=>{if(!quitting){event.preventDefault();win?.hide();}});
  win.on('show',visibility);win.on('hide',visibility);win.on('minimize',visibility);win.on('restore',visibility);
  win.on('closed',()=>{win=null;});
  win.once('ready-to-show',()=>show());
  win.loadFile(path.join(app.getAppPath(),'dist','index.html'));
}
function registerIpc(){
  const ensureSender=(event:Electron.IpcMainInvokeEvent)=>{if(event.sender!==win?.webContents||event.senderFrame!==win.webContents.mainFrame)throw new Error('不允许的调用');};
  ipcMain.handle('experience',event=>{ensureSender(event);return experience.snapshot(modes!.mode);});
  for(const [channel,action] of Object.entries({
    'preset-save':(value:any,id?:string)=>experience.preset(value,id),
    'preset-remove':(id:string)=>experience.remove(id),
    'experience-prefs':(value:any)=>{experience.prefs(value);modes?.pin();},
    'window-mode':(mode:any)=>modes!.set(mode)
  }))ipcMain.handle(channel,(event,...args)=>{ensureSender(event);try{(action as (...args:any[])=>void)(...args);return experience.snapshot(modes!.mode);}finally{sendExperience();}});
  ipcMain.on('panel-open',(event,open)=>{if(event.sender===win?.webContents&&event.senderFrame===win.webContents.mainFrame&&typeof open==='boolean')modes!.blocked=open;});
  ipcMain.handle('agenda',event=>{ensureSender(event);return scheduler.agenda();});
  ipcMain.on('agenda-watch',(event,value)=>{if(event.sender!==win?.webContents||event.senderFrame!==win.webContents.mainFrame||typeof value!=='boolean')return;watchingAgenda=value;if(value)sendAgenda(true);});
  ipcMain.handle('export-logs',async(event,filter)=>{
    ensureSender(event);const raw=exportLogText(scheduler.data.logs,filter);
    const chosen=await dialog.showSaveDialog(win!,{title:'导出当前执行记录',defaultPath:'StarSleep-records.txt',filters:[{name:'文本记录',extensions:['txt']}]});
    if(chosen.canceled||!chosen.filePath)return false;
    fs.writeFileSync(chosen.filePath,raw,'utf8');return true;
  });
  ipcMain.handle('export-plans',async event=>{
    ensureSender(event);const raw=exportTransfer(scheduler.data.plans);
    const chosen=await dialog.showSaveDialog(win!,{title:'导出计划',defaultPath:'StarSleep-plans.json',filters:[{name:'星枢计划',extensions:['json']}]});
    if(chosen.canceled||!chosen.filePath)return false;
    const temp=chosen.filePath+'.'+randomUUID()+'.tmp';
    try{const fd=fs.openSync(temp,'wx');try{fs.writeFileSync(fd,raw,'utf8');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,chosen.filePath);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
    return true;
  });
  ipcMain.handle('preview-import',async event=>{
    ensureSender(event);if(storageError)throw new Error(storageError);pendingImport=null;
    const chosen=await dialog.showOpenDialog(win!,{title:'导入计划',properties:['openFile'],filters:[{name:'星枢计划',extensions:['json']}]});
    if(chosen.canceled||!chosen.filePaths[0])return null;
    const fd=fs.openSync(chosen.filePaths[0],'r');let raw:string;
    try{if(fs.fstatSync(fd).size>MAX_TRANSFER_BYTES)throw new Error('导入文件不能超过 1 MB');const buffer=Buffer.alloc(MAX_TRANSFER_BYTES+1);const n=fs.readSync(fd,buffer,0,buffer.length,0);if(n>MAX_TRANSFER_BYTES)throw new Error('导入文件不能超过 1 MB');raw=buffer.subarray(0,n).toString('utf8');}finally{fs.closeSync(fd);}
    const plans=parseTransfer(raw),result=classifyImport(plans,scheduler.data.plans,Date.now()),token=randomUUID();pendingImport={token,plans};
    return {token,total:plans.length,imported:result.accepted.length,duplicate:result.duplicate,expired:result.expired,names:result.accepted.map(p=>p.name),skipped:result.skipped};
  });
  ipcMain.handle('cancel-import',event=>{ensureSender(event);pendingImport=null;});
  ipcMain.handle('commit-import',(event,token:unknown)=>{
    ensureSender(event);if(storageError)throw new Error(storageError);
    if(!pendingImport||token!==pendingImport.token)throw new Error('导入预览已失效，请重新选择文件');
    const plans=pendingImport.plans;pendingImport=null;const result=scheduler.importPlans(plans);send();return {...result,state:{...scheduler.snapshot(safeMode),storageError}};
  });
  ipcMain.handle('open-link',async(event,target:unknown)=>{
    if(event.sender!==win?.webContents || event.senderFrame!==win.webContents.mainFrame)throw new Error('不允许的调用');
    if(target!=='repository' && target!=='author')throw new Error('无效链接');
    await shell.openExternal(target==='repository'?PRODUCT.github:PRODUCT.profile);
  });
  const handle=(channel:string,fn:(...args:any[])=>unknown)=>ipcMain.handle(channel,(event,...args)=>{
    if(event.sender!==win?.webContents || event.senderFrame!==win.webContents.mainFrame)throw new Error('不允许的调用');
    if(storageError && !['snapshot','demo'].includes(channel))throw new Error(storageError);
    fn(...args);send();return currentSnapshot();
  });
  handle('snapshot',()=>{});
  handle('save',(input,id)=>scheduler.save(input,id));
  handle('remove',id=>scheduler.remove(id));
  handle('toggle',id=>scheduler.toggle(id));
  handle('batch',(ids,action)=>scheduler.batch(ids,action));
  handle('skip',(id,at)=>scheduler.skip(id,at));
  handle('act',(keys,action,minutes)=>{if(!Array.isArray(keys)||!['cancel','snooze'].includes(action)||(minutes!==undefined&&![10,30,60].includes(minutes)))throw new Error('提醒操作无效');const nightKey=integrations?.night.warning?.key;if(nightKey&&keys.includes(nightKey))integrations!.night.action(action,minutes);const normal=keys.filter((key:string)=>key!==nightKey);if(normal.length)scheduler.action(normal,action,minutes);});
  handle('settings',(settings:Settings)=>scheduler.updateSettings(settings));
  handle('demo',kind=>{if(!['alarm','shutdown'].includes(kind))throw new Error('类型无效');scheduler.demo(kind);});
  handle('quick',input=>scheduler.quick(input));
  handle('pause',paused=>pauseAll(paused));
  handle('pause-for',input=>pauseFor(input));
  ipcMain.on('window',(event,action)=>{if(event.sender!==win?.webContents)return;if(action==='minimize')win?.minimize();else if(action==='hide')win?.hide();else if(action==='quit')app.quit();});
}
let storage:Storage;
function saveState(){
  try{storage.save(scheduler.data);}catch(e){storageError='保存失败，所有自动执行已暂停。请检查磁盘空间与数据目录权限后重启软件。';integrations?.night.disarm('存储故障，夜间联动已解除',false);scheduler.stop();show();send();throw e;}
}
app.on('second-instance',show);
if(gotLock)app.whenReady().then(async()=>{
  app.setAppUserModelId('local.starsleep.desktop');
  storage=new Storage(app.getPath('userData'));
  experience=new ExperienceStore(app.getPath('userData'));
  let data;
  try{data=storage.load();}catch(e){dialog.showErrorBox('星枢 · 无法读取计划',String(e));app.quit();return;}
  scheduler=new Scheduler(data,Date.now,saveState,executeShutdown,()=>{show();setImmediate(send);});
  integrations=new Integrations(app.getPath('userData'),()=>win,safeMode,()=>!!storageError||scheduler.data.paused||!scheduler.active||suspended,()=>scheduler.data.settings.warningMinutes??5,executeShutdown,(text,error)=>{scheduler.log(text,error?'error':'info');saveState();},()=>{show();setImmediate(send);});
  await integrations.start();
  if(storage.recovery)scheduler.log(storage.recovery,'error');
  createWindow();registerIpc();
  toolbox=new Toolbox(app.getPath('userData'),()=>win,safeMode);toolbox.register();integrations.skillHealth=()=>toolbox!.health();
  tray=new Tray(iconImage().resize({width:32,height:32}));
  updateTray();
  tray.on('double-click',show);tray.on('click',show);
  scheduler.reconcile();
  timer=setInterval(()=>{
    if(suspended||!scheduler.active)return;
    try{
      const wall=Date.now(), mono=performance.now();
      const offset=new Date().getTimezoneOffset();
      if(wall-lastWall>15_000||Math.abs((wall-lastWall)-(mono-lastMono))>2000||offset!==lastOffset){integrations?.night.disarm('系统时间变化或计时中断，请重新开启夜间联动');scheduler.reconcile('系统时间、时区或计时状态已调整');}else{integrations?.tick();scheduler.tick();}
      lastWall=wall;lastMono=mono;lastOffset=offset;send();
    }catch(e){integrations?.night.disarm('调度故障，夜间联动已解除',false);scheduler.stop();storageError=`调度已暂停：${String(e)}`;show();send();}
  },1000);
  powerMonitor.on('suspend',()=>{suspended=true;integrations?.night.disarm('电脑进入睡眠，夜间联动已解除');});
  powerMonitor.on('resume',()=>{suspended=false;lastWall=Date.now();lastMono=performance.now();try{scheduler.reconcile('电脑从睡眠恢复');send();}catch(e){scheduler.stop();storageError=String(e);show();send();}});
});
app.on('before-quit',()=>{quitting=true;if(timer)clearInterval(timer);integrations?.stop();toolbox?.stop();modes?.dispose();scheduler?.stop();tray?.destroy();tray=null;});
app.on('window-all-closed',()=>{if(quitting)app.quit();});

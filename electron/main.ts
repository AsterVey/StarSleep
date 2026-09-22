import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, powerMonitor, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Scheduler } from './scheduler';
import { Storage } from './storage';
import type { Settings, PlanDefinition } from '../src/shared';
import { exportTransfer, parseTransfer, classifyImport, MAX_TRANSFER_BYTES } from './transfer';
import { PRODUCT } from '../src/product';
import { exportLogText } from './logs';
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
function updateTray(){
  if(!tray)return;
  const trayPaused=scheduler.data.paused;
  const signature=`${scheduler.revision}:${storageError}`;
  if(traySignature===signature)return;traySignature=signature;
  const next=scheduler.snapshot().plans.filter(p=>p.kind==='shutdown'&&p.nextAt!==null).sort((a,b)=>a.nextAt!-b.nextAt!)[0];
  tray.setToolTip(storageError?'星眠 · 故障，自动执行已停止':trayPaused?'星眠 · 全部计划已暂停':'星眠 · 运行中，定时任务有效');
  tray.setContextMenu(Menu.buildFromTemplate([{label:'打开星眠',click:show},{label:next?`${trayPaused?'暂停中 · 原定':'下次关机'} ${new Date(next.nextAt!).toLocaleString('zh-CN',{hour12:false})}`:'尚未安排关机',enabled:false},{label:'快捷计时',enabled:!storageError,click:()=>{show();win?.webContents.send('open-quick');}},{label:trayPaused?'恢复计划':'暂停全部计划',enabled:!storageError,click:()=>{try{scheduler.setPaused(!scheduler.data.paused);send();}catch(e){dialog.showErrorBox('星眠',String(e));}}},{label:'演示关机提醒',click:()=>{scheduler.demo('shutdown');send();}},{type:'separator'},{label:'退出星眠 · 停止所有任务',click:()=>app.quit()}]));
}
function show(){if(win){win.setSkipTaskbar(false);win.show();if(win.isMinimized())win.restore();win.focus();}}
function send(force=false){
  updateTray();if(!win || win.isDestroyed())return;
  const runtime={warnings:scheduler.warnings,alarms:scheduler.alarms,settings:scheduler.data.settings,paused:scheduler.data.paused,storageError};
  const signature=JSON.stringify(runtime);
  if(signature!==runtimeSignature || force){runtimeSignature=signature;win.webContents.send('runtime',{...runtime,now:Date.now()});}
  if(win.isVisible()&&!win.isMinimized()){
    if(force||sentRevision!==scheduler.revision||sentError!==storageError){sentRevision=scheduler.revision;sentError=storageError;win.webContents.send('state',{...scheduler.snapshot(safeMode),storageError});}
    win.webContents.send('clock',Date.now());
  }
}
function visibility(){const visible=!!win?.isVisible()&&!win?.isMinimized();win?.webContents.send('visibility',visible);if(visible)send(true);}
function iconImage(){return nativeImage.createFromPath(path.join(app.getAppPath(),'resources','icon.png'));}
function createWindow(){
  win=new BrowserWindow({width:1240,height:820,minWidth:900,minHeight:650,show:false,frame:false,backgroundColor:'#060d18',title:'星眠',icon:iconImage(),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:true}});
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
  ipcMain.handle('export-logs',async(event,filter)=>{
    ensureSender(event);const raw=exportLogText(scheduler.data.logs,filter);
    const chosen=await dialog.showSaveDialog(win!,{title:'导出当前执行记录',defaultPath:'StarSleep-records.txt',filters:[{name:'文本记录',extensions:['txt']}]});
    if(chosen.canceled||!chosen.filePath)return false;
    fs.writeFileSync(chosen.filePath,raw,'utf8');return true;
  });
  ipcMain.handle('export-plans',async event=>{
    ensureSender(event);const raw=exportTransfer(scheduler.data.plans);
    const chosen=await dialog.showSaveDialog(win!,{title:'导出计划',defaultPath:'StarSleep-plans.json',filters:[{name:'星眠计划',extensions:['json']}]});
    if(chosen.canceled||!chosen.filePath)return false;
    const temp=chosen.filePath+'.'+randomUUID()+'.tmp';
    try{const fd=fs.openSync(temp,'wx');try{fs.writeFileSync(fd,raw,'utf8');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,chosen.filePath);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
    return true;
  });
  ipcMain.handle('preview-import',async event=>{
    ensureSender(event);if(storageError)throw new Error(storageError);pendingImport=null;
    const chosen=await dialog.showOpenDialog(win!,{title:'导入计划',properties:['openFile'],filters:[{name:'星眠计划',extensions:['json']}]});
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
    fn(...args);send();return {...scheduler.snapshot(safeMode),storageError};
  });
  handle('snapshot',()=>{});
  handle('save',(input,id)=>scheduler.save(input,id));
  handle('remove',id=>scheduler.remove(id));
  handle('toggle',id=>scheduler.toggle(id));
  handle('batch',(ids,action)=>scheduler.batch(ids,action));
  handle('skip',(id,at)=>scheduler.skip(id,at));
  handle('act',(keys,action,minutes)=>scheduler.action(keys,action,minutes));
  handle('settings',(settings:Settings)=>scheduler.updateSettings(settings));
  handle('demo',kind=>{if(!['alarm','shutdown'].includes(kind))throw new Error('类型无效');scheduler.demo(kind);});
  handle('quick',input=>scheduler.quick(input));
  handle('pause',paused=>scheduler.setPaused(paused));
  ipcMain.on('window',(event,action)=>{if(event.sender!==win?.webContents)return;if(action==='minimize')win?.minimize();else if(action==='hide')win?.hide();else if(action==='quit')app.quit();});
}
let storage:Storage;
function saveState(){
  try{storage.save(scheduler.data);}catch(e){storageError='保存失败，所有自动执行已暂停。请检查磁盘空间与数据目录权限后重启软件。';scheduler.stop();show();send();throw e;}
}
app.on('second-instance',show);
if(gotLock)app.whenReady().then(()=>{
  app.setAppUserModelId('local.starsleep.desktop');
  storage=new Storage(app.getPath('userData'));
  let data;
  try{data=storage.load();}catch(e){dialog.showErrorBox('星眠 · 无法读取计划',String(e));app.quit();return;}
  scheduler=new Scheduler(data,Date.now,saveState,()=>new Promise<void>((resolve,reject)=>{
    if(safeMode){scheduler.log('安全测试模式 · 已拦截实际关机');saveState();resolve();return;}
    const executable=path.join(process.env.SystemRoot??'C:\\Windows','System32','shutdown.exe');
    execFile(executable,['/s','/f','/t','0'],{windowsHide:true,timeout:15_000},error=>error?reject(error):resolve());
  }),()=>{show();setImmediate(send);});
  if(storage.recovery)scheduler.log(storage.recovery,'error');
  createWindow();registerIpc();
  tray=new Tray(iconImage().resize({width:32,height:32}));
  updateTray();
  tray.on('double-click',show);tray.on('click',show);
  scheduler.reconcile();
  timer=setInterval(()=>{
    if(suspended||!scheduler.active)return;
    try{
      const wall=Date.now(), mono=performance.now();
      const offset=new Date().getTimezoneOffset();
      if(Math.abs((wall-lastWall)-(mono-lastMono))>2000||offset!==lastOffset)scheduler.reconcile('系统时间或时区已调整');else scheduler.tick();
      lastWall=wall;lastMono=mono;lastOffset=offset;send();
    }catch(e){scheduler.stop();storageError=`调度已暂停：${String(e)}`;show();send();}
  },1000);
  powerMonitor.on('suspend',()=>{suspended=true;});
  powerMonitor.on('resume',()=>{suspended=false;lastWall=Date.now();lastMono=performance.now();try{scheduler.reconcile('电脑从睡眠恢复');send();}catch(e){scheduler.stop();storageError=String(e);show();send();}});
});
app.on('before-quit',()=>{quitting=true;if(timer)clearInterval(timer);scheduler?.stop();tray?.destroy();tray=null;});
app.on('window-all-closed',()=>{if(quitting)app.quit();});

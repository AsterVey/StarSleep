import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, powerMonitor, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
import { Scheduler } from './scheduler';
import { Storage } from './storage';
import type { Settings } from '../src/shared';
import { PRODUCT } from '../src/product';
const safeMode=process.argv.includes('--safe-mode');
app.setPath('userData',path.join(app.getPath('appData'),'StarSleep'));
const qaData=process.env.STARSLEEP_QA_DATA;
if(qaData && safeMode)app.setPath('userData',path.resolve(qaData));
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const gotLock=app.requestSingleInstanceLock();
if(!gotLock)app.quit();
let win:BrowserWindow|null=null, tray:Tray|null=null, scheduler:Scheduler, timer:NodeJS.Timeout|undefined;
let quitting=false, storageError='', suspended=false, lastMono=performance.now(), lastWall=Date.now(), lastOffset=new Date().getTimezoneOffset();
function show(){if(win){win.setSkipTaskbar(false);win.show();if(win.isMinimized())win.restore();win.focus();}}
function send(){if(win && !win.isDestroyed() && win.isVisible() && !win.isMinimized())win.webContents.send('state',{...scheduler.snapshot(safeMode),storageError});}
function visibility(){const visible=!!win?.isVisible()&&!win?.isMinimized();win?.webContents.send('visibility',visible);if(visible)send();}
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
  handle('act',(keys,action,minutes)=>scheduler.action(keys,action,minutes));
  handle('settings',(settings:Settings)=>{if(!settings||typeof settings.sound!=='boolean'||typeof settings.reducedMotion!=='boolean'||!Number.isFinite(settings.volume)||settings.volume<0||settings.volume>1)throw new Error('设置无效');scheduler.data.settings={sound:settings.sound,reducedMotion:settings.reducedMotion,volume:settings.volume};saveState();});
  handle('demo',kind=>{if(!['alarm','shutdown'].includes(kind))throw new Error('类型无效');scheduler.demo(kind);});
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
  tray.setToolTip('星眠 · 运行中，定时任务有效');
  tray.setContextMenu(Menu.buildFromTemplate([{label:'打开星眠',click:show},{label:'演示关机提醒',click:()=>{scheduler.demo('shutdown');send();}},{type:'separator'},{label:'退出星眠 · 停止所有任务',click:()=>app.quit()}]));
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

import { contextBridge, ipcRenderer } from 'electron';
import type { Api } from '../src/shared';
const api:Api={
  snapshot:()=>ipcRenderer.invoke('snapshot'),
  save:(input,id)=>ipcRenderer.invoke('save',input,id),
  remove:id=>ipcRenderer.invoke('remove',id),
  toggle:id=>ipcRenderer.invoke('toggle',id),
  batch:(ids,action)=>ipcRenderer.invoke('batch',ids,action),
  skip:(id,at)=>ipcRenderer.invoke('skip',id,at),
  act:(keys,action,minutes)=>ipcRenderer.invoke('act',keys,action,minutes),
  settings:value=>ipcRenderer.invoke('settings',value),
  demo:kind=>ipcRenderer.invoke('demo',kind),
  quick:input=>ipcRenderer.invoke('quick',input),
  pause:paused=>ipcRenderer.invoke('pause',paused),
  exportPlans:()=>ipcRenderer.invoke('export-plans'),
  exportLogs:filter=>ipcRenderer.invoke('export-logs',filter),
  previewImport:()=>ipcRenderer.invoke('preview-import'),
  commitImport:token=>ipcRenderer.invoke('commit-import',token),
  cancelImport:()=>ipcRenderer.invoke('cancel-import'),
  openLink:target=>ipcRenderer.invoke('open-link',target),
  window:action=>ipcRenderer.send('window',action),
  subscribe:callback=>{const fn=(_:unknown,state:any)=>callback(state);ipcRenderer.on('state',fn);return()=>ipcRenderer.removeListener('state',fn);},
  clock:callback=>{const fn=(_:unknown,now:number)=>callback(now);ipcRenderer.on('clock',fn);return()=>ipcRenderer.removeListener('clock',fn);},
  runtime:callback=>{const fn=(_:unknown,state:any)=>callback(state);ipcRenderer.on('runtime',fn);return()=>ipcRenderer.removeListener('runtime',fn);},
  quickRequest:callback=>{const fn=()=>callback();ipcRenderer.on('open-quick',fn);return()=>ipcRenderer.removeListener('open-quick',fn);},
  visibility:callback=>{const fn=(_:unknown,visible:boolean)=>callback(visible);ipcRenderer.on('visibility',fn);return()=>ipcRenderer.removeListener('visibility',fn);}
};
contextBridge.exposeInMainWorld('starSleep',api);

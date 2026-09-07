import { contextBridge, ipcRenderer } from 'electron';
import type { Api } from '../src/shared';
const api:Api={
  snapshot:()=>ipcRenderer.invoke('snapshot'),
  save:(input,id)=>ipcRenderer.invoke('save',input,id),
  remove:id=>ipcRenderer.invoke('remove',id),
  toggle:id=>ipcRenderer.invoke('toggle',id),
  act:(keys,action,minutes)=>ipcRenderer.invoke('act',keys,action,minutes),
  settings:value=>ipcRenderer.invoke('settings',value),
  demo:kind=>ipcRenderer.invoke('demo',kind),
  quick:input=>ipcRenderer.invoke('quick',input),
  pause:paused=>ipcRenderer.invoke('pause',paused),
  exportPlans:()=>ipcRenderer.invoke('export-plans'),
  previewImport:()=>ipcRenderer.invoke('preview-import'),
  commitImport:token=>ipcRenderer.invoke('commit-import',token),
  cancelImport:()=>ipcRenderer.invoke('cancel-import'),
  openLink:target=>ipcRenderer.invoke('open-link',target),
  window:action=>ipcRenderer.send('window',action),
  subscribe:callback=>{const fn=(_:unknown,state:any)=>callback(state);ipcRenderer.on('state',fn);return()=>ipcRenderer.removeListener('state',fn);},
  visibility:callback=>{const fn=(_:unknown,visible:boolean)=>callback(visible);ipcRenderer.on('visibility',fn);return()=>ipcRenderer.removeListener('visibility',fn);}
};
contextBridge.exposeInMainWorld('starSleep',api);

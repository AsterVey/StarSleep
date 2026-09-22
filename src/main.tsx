import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Moon,Minus,X,Settings2,Timer,Pause,Play,History,Sparkles,AlertTriangle} from 'lucide-react';
import '@fontsource/rajdhani/400.css';
import '@fontsource/rajdhani/500.css';
import './style.css';
import type {Snapshot,RuntimeState,Plan,PlanInput,QuickInput,ImportPreview} from './shared';
import {setClock} from './clock';
import {tone,useAlarmAudio} from './audio';
import {draftPlan,copyPlan,fullTime} from './plan-utils';
import {Modal,Ripple,Toast} from './components/UI';
import {Console,WallClock} from './components/Console';
import {Plans} from './components/Plans';
import {Editor,QuickPanel} from './components/Editor';
import {SettingsPanel,Logs,ImportPanel} from './components/Settings';
import {Reminder} from './components/Reminder';
const empty:Snapshot={plans:[],warnings:[],alarms:[],logs:[],settings:{sound:true,volume:.5,reducedMotion:false,warningMinutes:5,alarmSeconds:60},now:Date.now(),safeMode:false,paused:false};
type Editing={initial:PlanInput;plan?:Plan;copy?:boolean};
function App(){
 const api=window.starSleep;
 const [state,setState]=useState(empty),[runtime,setRuntime]=useState<RuntimeState>(empty),[ready,setReady]=useState(false),[visible,setVisible]=useState(!document.hidden),[systemReduced,setSystemReduced]=useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [editing,setEditing]=useState<Editing|null>(null),[quick,setQuick]=useState<QuickInput|null>(null),[settingsOpen,setSettingsOpen]=useState(false),[logsOpen,setLogsOpen]=useState(false),[importPreview,setImportPreview]=useState<ImportPreview|null>(null),[deleting,setDeleting]=useState<Snapshot['plans']|null>(null),[skipping,setSkipping]=useState<Snapshot['plans'][number]|null>(null),[toast,setToast]=useState(''),[busy,setBusy]=useState(false),[fileBusy,setFileBusy]=useState(false);
 const searchRef=useRef<HTMLInputElement>(null),pending=useRef(false);
 const apply=(s:Snapshot)=>{setState(s);setRuntime(s);setClock(s.now);};
 useEffect(()=>{if(!api){setReady(true);setToast('桌面接口不可用，请通过星眠程序打开。');return;}let live=true;const off=api.subscribe(s=>{if(live)apply(s);}),offClock=api.clock(setClock),offRuntime=api.runtime(s=>{setRuntime(s);setClock(s.now);}),offVisibility=api.visibility(setVisible),offQuick=api.quickRequest(()=>{if(!document.querySelector('dialog[open]'))setQuick({kind:'shutdown',minutes:60});});
 void api.snapshot().then(s=>{if(live){apply(s);setReady(true);}}).catch(e=>{if(live){setReady(true);setToast(String(e));}});return()=>{live=false;off();offClock();offRuntime();offVisibility();offQuick();};},[]);
 useEffect(()=>{const fn=()=>setVisible(!document.hidden),mq=matchMedia('(prefers-reduced-motion: reduce)'),motion=()=>setSystemReduced(mq.matches);document.addEventListener('visibilitychange',fn);mq.addEventListener('change',motion);return()=>{document.removeEventListener('visibilitychange',fn);mq.removeEventListener('change',motion);};},[]);
 useEffect(()=>{document.body.classList.toggle('motion-off',!visible||state.settings.reducedMotion||systemReduced);},[visible,state.settings.reducedMotion,systemReduced]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(t);},[toast]);
 useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(!e.ctrlKey||e.altKey||document.querySelector('dialog[open]'))return;if(e.key.toLowerCase()==='n'){e.preventDefault();if(!state.storageError&&ready)setEditing({initial:draftPlan()});}if(e.key.toLowerCase()==='f'){e.preventDefault();searchRef.current?.focus();}};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);},[state.storageError,ready]);
 useAlarmAudio(runtime);
 const warningKey=runtime.warnings.map(w=>w.key).join('|');
 useEffect(()=>{if(warningKey&&runtime.settings.sound)tone('success',runtime.settings.volume);},[warningKey]);
 function error(e:unknown){setToast(String(e).replace(/^Error: (Error invoking remote method '[^']+': Error: )?/,''));if(state.settings.sound)tone('error');}
 async function run(fn:()=>Promise<Snapshot>,message?:string){if(pending.current)return false;pending.current=true;setBusy(true);try{const s=await fn();apply(s);if(message){setToast(message);if(s.settings.sound)tone('success');}return true;}catch(e){error(e);return false;}finally{pending.current=false;setBusy(false);}}
 async function transfer(action:'import'|'export'){if(!api||fileBusy)return;setFileBusy(true);try{if(action==='export'){if(await api.exportPlans())setToast('计划已导出');}else{const preview=await api.previewImport();if(preview){setSettingsOpen(false);setImportPreview(preview);}}}catch(e){error(e);}finally{setFileBusy(false);}}
 async function importConfirm(){if(!api||!importPreview||fileBusy)return;setFileBusy(true);try{const result=await api.commitImport(importPreview.token);apply(result.state);setImportPreview(null);setToast(`已导入 ${result.imported} 条 · 核对后启用`);}catch(e){error(e);setImportPreview(null);}finally{setFileBusy(false);}}
 const fault=!!state.storageError,mutating=busy||fault||!ready||!api;
 return <div className={`app ${state.paused?'paused':''}`} onClickCapture={e=>{if((e.target as HTMLElement).closest('button:not(:disabled)')&&state.settings.sound)tone('click');}}><Ripple active={visible&&!state.settings.reducedMotion&&!systemReduced}/>
 <header className="titlebar"><div className="brand"><Moon size={26}/><strong>星眠</strong><span>STAR SLEEP</span></div><span className="title-caption">让电脑准时休息</span><div className="window-controls"><button aria-label="最小化" onClick={()=>api?.window('minimize')}><Minus size={19}/></button><button aria-label="隐藏到托盘" onClick={()=>api?.window('hide')}><X size={19}/></button></div></header>
 <div className="toolbar"><div className={`running-state ${fault?'fault':''}`}><span className="active-dot"/>{fault?'故障保护':state.paused?'全部计划已暂停':'休息控制台'}{state.safeMode?<span className="safe-indicator">安全测试 · 不关机</span>:<small>{state.paused?'恢复后跳过已错过的执行':'运行期间计划有效'}</small>}</div><div className="toolbar-right"><WallClock/><button className="secondary" disabled={mutating} onClick={()=>setQuick({kind:'shutdown',minutes:60})}><Timer size={18}/> 快捷计时</button><button className={state.paused?'primary':'secondary'} disabled={mutating} onClick={()=>void run(()=>api!.pause(!state.paused),state.paused?'计划已恢复':'全部计划已暂停')}>{state.paused?<Play size={17}/>:<Pause size={17}/>} {state.paused?'恢复计划':'暂停全部'}</button><button className="icon-button" aria-label="设置" onClick={()=>setSettingsOpen(true)}><Settings2 size={21}/></button></div></div>
 {state.storageError&&<div className="notice danger" role="alert"><AlertTriangle size={18}/>{state.storageError}</div>}
 {!ready?<main className="workspace"><div className="empty">正在读取计划…</div></main>:<main className="workspace"><Console state={state} onQuick={q=>!mutating&&setQuick(q)} onEdit={p=>!mutating&&setEditing({initial:p,plan:p})} onTemplate={id=>!mutating&&setEditing({initial:draftPlan(id)})}/><Plans state={state} searchRef={searchRef} busy={mutating} onCreate={()=>setEditing({initial:draftPlan()})} onEdit={p=>setEditing({initial:p,plan:p})} onCopy={p=>setEditing({initial:copyPlan(p),copy:true})} onSkip={setSkipping} onDelete={setDeleting} onBatch={(ids,action)=>run(()=>api!.batch(ids,action),'批量操作已完成')} onToggle={p=>void run(()=>api!.toggle(p.id))}/></main>}
 <footer><span>不唤醒电脑 · 不补执行过期任务</span><div><button className="text-button" onClick={()=>void run(()=>api!.demo('shutdown'))} disabled={!api||busy}><Sparkles size={16}/> 演示提醒</button><button className="text-button" onClick={()=>setLogsOpen(true)}><History size={16}/> 执行记录</button></div></footer>
 {toast&&<Toast text={toast}/>}
 {editing&&<Editor key={editing.plan?.id??'new'} {...editing} settings={state.settings} onClose={()=>setEditing(null)} onSave={async p=>{const ok=await run(()=>api!.save(p,editing.plan?.id),'计划已保存');if(ok)setEditing(null);return ok;}}/>}
 {quick&&<QuickPanel initial={quick} paused={state.paused} settings={state.settings} onClose={()=>setQuick(null)} onSave={async q=>{const ok=await run(()=>api!.quick(q),state.paused?'快捷计划已保存 · 当前暂停':'快捷计划已开始计时');if(ok)setQuick(null);return ok;}}/>}
 {settingsOpen&&<SettingsPanel settings={state.settings} fileBusy={fileBusy} onClose={()=>setSettingsOpen(false)} onUpdate={s=>run(()=>api!.settings(s))} onDemo={()=>void run(()=>api!.demo('alarm'))} onLink={target=>void api?.openLink(target).catch(error)} onImport={()=>void transfer('import')} onExport={()=>void transfer('export')}/>}
 {logsOpen&&<Logs logs={state.logs} onClose={()=>setLogsOpen(false)} onExport={async f=>{try{if(await api!.exportLogs(f))setToast('记录已导出');}catch(e){error(e);}}}/>}
 {importPreview&&<ImportPanel preview={importPreview} busy={fileBusy} onClose={()=>{setImportPreview(null);void api?.cancelImport().catch(error);}} onConfirm={()=>void importConfirm()}/>}
 {deleting&&<Modal title={deleting.length===1?'删除这个计划？':`删除 ${deleting.length} 条计划？`} onClose={()=>{if(!busy)setDeleting(null);}}><p className="muted">计划及其当前提醒将被移除。暂时不用时，也可以选择停用。</p><ul className="confirmation-list">{deleting.map(p=><li key={p.id}>{p.name}</li>)}</ul><div className="modal-actions"><button className="secondary" disabled={busy} onClick={()=>setDeleting(null)}>保留计划</button><button className="danger-button" disabled={busy} onClick={async()=>{if(await run(()=>api!.batch(deleting.map(p=>p.id),'delete'),'计划已删除'))setDeleting(null);}}>{busy?'正在删除…':'删除计划'}</button></div></Modal>}
 {skipping&&<Modal title="跳过下一次执行？" onClose={()=>{if(!busy)setSkipping(null);}}><h3>{skipping.name}</h3><p className="execution-preview">{fullTime(skipping.nextAt!)}</p><p className="muted">仅跳过这一次，保留启用状态和重复规则。</p><div className="modal-actions"><button className="secondary" disabled={busy} onClick={()=>setSkipping(null)}>保留本次</button><button className="primary" disabled={busy} onClick={async()=>{if(await run(()=>api!.skip(skipping.id,skipping.nextAt!),'已跳过本次执行'))setSkipping(null);}}>确认跳过</button></div></Modal>}
 {(runtime.warnings.length>0||runtime.alarms.length>0)&&<Reminder runtime={runtime} busy={busy} onAction={(keys,action,minutes)=>void run(()=>api!.act(keys,action,minutes))} onPause={()=>void run(()=>api!.pause(true),'全部计划已暂停')}/>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);

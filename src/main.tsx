import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Moon,Minus,X,Settings2,Timer,Pause,Play,History,Sparkles,AlertTriangle,Minimize2} from 'lucide-react';
import '@fontsource/rajdhani/400.css';
import '@fontsource/rajdhani/500.css';
import './style.css';
import './experience.css';
import type {Snapshot,RuntimeState,Plan,PlanInput,QuickInput,ImportPreview,ExperienceSnapshot,PresetInput,Preset,WindowMode} from './shared';
import {setClock} from './clock';
import {tone,useAlarmAudio} from './audio';
import {draftPlan,copyPlan,fullTime} from './plan-utils';
import {Modal,Ripple,Toast} from './components/UI';
import {Console,WallClock} from './components/Console';
import {Plans} from './components/Plans';
import {Editor,QuickPanel} from './components/Editor';
import {SettingsPanel,Logs,ImportPanel} from './components/Settings';
import {Reminder} from './components/Reminder';
import {Mini} from './components/Mini';
import {PresetLibrary,PresetEditor} from './components/Presets';
import {presetDraft} from './presets';
const empty:Snapshot={plans:[],warnings:[],alarms:[],logs:[],settings:{sound:true,volume:.5,reducedMotion:false,warningMinutes:5,alarmSeconds:60},now:Date.now(),safeMode:false,paused:false};
type Editing={initial:PlanInput;plan?:Plan;copy?:boolean};
function App(){
 const api=window.starSleep;
 const [state,setState]=useState(empty),[runtime,setRuntime]=useState<RuntimeState>(empty),[ready,setReady]=useState(false),[visible,setVisible]=useState(!document.hidden),[systemReduced,setSystemReduced]=useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [editing,setEditing]=useState<Editing|null>(null),[quick,setQuick]=useState<QuickInput|null>(null),[settingsOpen,setSettingsOpen]=useState(false),[logsOpen,setLogsOpen]=useState(false),[importPreview,setImportPreview]=useState<ImportPreview|null>(null),[deleting,setDeleting]=useState<Snapshot['plans']|null>(null),[skipping,setSkipping]=useState<Snapshot['plans'][number]|null>(null),[toast,setToast]=useState(''),[busy,setBusy]=useState(false),[fileBusy,setFileBusy]=useState(false);
 const [experience,setExperience]=useState<ExperienceSnapshot>({presets:[],prefs:{interaction:true,miniPinned:true},mode:'full'}),[libraryOpen,setLibraryOpen]=useState(false),[presetEdit,setPresetEdit]=useState<(PresetInput&{id?:string})|null>(null),[searchRequest,setSearchRequest]=useState(0);
 const searchRef=useRef<HTMLInputElement>(null),pending=useRef(false);
 const apply=(s:Snapshot)=>{setState(s);setRuntime(s);setClock(s.now);};
 useEffect(()=>{if(!api){setReady(true);setToast('桌面接口不可用，请通过星眠程序打开。');return;}let live=true;const off=api.subscribe(s=>{if(live)apply(s);}),offClock=api.clock(setClock),offRuntime=api.runtime(s=>{setRuntime(s);setClock(s.now);}),offVisibility=api.visibility(setVisible),offExperience=api.experienceChanged(setExperience),offMini=api.miniRequest(()=>void changeMode('mini')),offQuick=api.quickRequest(()=>{if(!document.querySelector('dialog[open]'))setQuick({kind:'shutdown',minutes:60});});
 void Promise.all([api.snapshot(),api.experience()]).then(([s,e])=>{if(live){apply(s);setExperience(e);setReady(true);}}).catch(e=>{if(live){setReady(true);setToast(String(e));}});return()=>{live=false;off();offClock();offRuntime();offVisibility();offQuick();offExperience();offMini();};},[]);
 useEffect(()=>{const fn=()=>setVisible(!document.hidden),mq=matchMedia('(prefers-reduced-motion: reduce)'),motion=()=>setSystemReduced(mq.matches);document.addEventListener('visibilitychange',fn);mq.addEventListener('change',motion);return()=>{document.removeEventListener('visibilitychange',fn);mq.removeEventListener('change',motion);};},[]);
 useEffect(()=>{document.body.classList.toggle('motion-off',!visible||state.settings.reducedMotion||systemReduced||experience.mode==='mini');},[visible,state.settings.reducedMotion,systemReduced,experience.mode]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(t);},[toast]);
 useEffect(()=>setToast(''),[experience.mode]);
 useEffect(()=>{api?.panelOpen(!!(editing||quick||settingsOpen||logsOpen||importPreview||deleting||skipping||libraryOpen||presetEdit||busy||fileBusy));},[editing,quick,settingsOpen,logsOpen,importPreview,deleting,skipping,libraryOpen,presetEdit,busy,fileBusy]);
 useEffect(()=>{const fn=async(e:KeyboardEvent)=>{if(!e.ctrlKey||e.altKey||document.querySelector('dialog[open]'))return;const key=e.key.toLowerCase();if(key!=='n'&&key!=='f')return;e.preventDefault();if(experience.mode==='mini')await changeMode('full');if(key==='n'&&!state.storageError&&ready)setEditing({initial:draftPlan()});if(key==='f')setSearchRequest(n=>n+1);};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);},[state.storageError,ready,experience.mode]);
 useAlarmAudio(runtime);
 const warningKey=runtime.warnings.map(w=>w.key).join('|');
 useEffect(()=>{if(warningKey&&runtime.settings.sound)tone('success',runtime.settings.volume);},[warningKey]);
 function error(e:unknown){setToast(String(e).replace(/^Error: (Error invoking remote method '[^']+': Error: )?/,''));if(state.settings.sound)tone('error');}
 async function run(fn:()=>Promise<Snapshot>,message?:string){if(pending.current)return false;pending.current=true;setBusy(true);try{const s=await fn();apply(s);if(message){setToast(message);if(s.settings.sound)tone('success');}return true;}catch(e){error(e);return false;}finally{pending.current=false;setBusy(false);}}
 async function transfer(action:'import'|'export'){if(!api||fileBusy)return;setFileBusy(true);try{if(action==='export'){if(await api.exportPlans())setToast('计划已导出');}else{const preview=await api.previewImport();if(preview){setSettingsOpen(false);setImportPreview(preview);}}}catch(e){error(e);}finally{setFileBusy(false);}}
 async function importConfirm(){if(!api||!importPreview||fileBusy)return;setFileBusy(true);try{const result=await api.commitImport(importPreview.token);apply(result.state);setImportPreview(null);setToast(`已导入 ${result.imported} 条 · 核对后启用`);}catch(e){error(e);setImportPreview(null);}finally{setFileBusy(false);}}
 async function changeMode(mode:WindowMode){if(!api)return;if(mode==='mini'&&document.querySelector('dialog[open]')){setToast('请先处理当前面板，再进入迷你模式');return;}try{setExperience(await api.setMode(mode));}catch(e){error(e);}}
 async function changeExperience(fn:()=>Promise<ExperienceSnapshot>,message?:string){try{setExperience(await fn());if(message)setToast(message);return true;}catch(e){error(e);return false;}}
 function applyPreset(p:Preset){const draft=presetDraft(p);setLibraryOpen(false);if('minutes' in draft)setQuick(draft);else setEditing({initial:draft});}
 function applyBuiltin(id:string){setLibraryOpen(false);if(id==='alarm30')setQuick({kind:'alarm',minutes:30});else if(id==='shutdown120')setQuick({kind:'shutdown',minutes:120});else setEditing({initial:draftPlan(id as 'workday'|'daily')});}
 const fault=!!state.storageError,mutating=busy||fault||!ready||!api;
 return <div className={`app ${state.paused?'paused':''} ${experience.mode==='mini'?'mini':''}`} onClickCapture={e=>{if((e.target as HTMLElement).closest('button:not(:disabled)')&&state.settings.sound)tone('click');}}><Ripple active={visible&&experience.mode==='full'&&!state.settings.reducedMotion&&!systemReduced}/><div className="full-shell" hidden={experience.mode==='mini'}>
 <header className="titlebar"><div className="brand"><Moon size={26}/><strong>星眠</strong><span>STAR SLEEP</span></div><span className="title-caption">让电脑准时休息</span><div className="window-controls"><button aria-label="最小化" onClick={()=>api?.window('minimize')}><Minus size={19}/></button><button aria-label="隐藏到托盘" onClick={()=>api?.window('hide')}><X size={19}/></button></div></header>
 <div className="toolbar"><div className={`running-state ${fault?'fault':''}`}><span className="active-dot"/>{fault?'故障保护':state.paused?'全部计划已暂停':'休息控制台'}{state.safeMode?<span className="safe-indicator">安全测试 · 不关机</span>:<small>{state.paused?'恢复后跳过已错过的执行':'运行期间计划有效'}</small>}</div><div className="toolbar-right"><WallClock/><button className="secondary" disabled={mutating} onClick={()=>setQuick({kind:'shutdown',minutes:60})}><Timer size={18}/> 快捷计时</button><button className={state.paused?'primary':'secondary'} disabled={mutating} onClick={()=>void run(()=>api!.pause(!state.paused),state.paused?'计划已恢复':'全部计划已暂停')}>{state.paused?<Play size={17}/>:<Pause size={17}/>} {state.paused?'恢复计划':'暂停全部'}</button><button className="icon-button" aria-label="迷你模式" title="迷你模式" disabled={mutating} onClick={()=>void changeMode('mini')}><Minimize2 size={20}/></button><button className="icon-button" aria-label="设置" onClick={()=>setSettingsOpen(true)}><Settings2 size={21}/></button></div></div>
 {state.storageError&&<div className="notice danger" role="alert"><AlertTriangle size={18}/>{state.storageError}</div>}
 {(experience.error||experience.notice)&&<div className="notice experience-notice" role="status">{experience.error||experience.notice}</div>}
 {!ready?<main className="workspace"><div className="empty">正在读取计划…</div></main>:<main className="workspace"><Console state={state} active={visible&&experience.mode==='full'} interaction={experience.prefs.interaction} onPresets={()=>setLibraryOpen(true)} onQuick={q=>!mutating&&setQuick(q)} onEdit={p=>!mutating&&setEditing({initial:p,plan:p})} onTemplate={id=>!mutating&&setEditing({initial:draftPlan(id)})}/><Plans state={state} active={experience.mode==='full'} searchRequest={searchRequest} searchRef={searchRef} busy={mutating} onCreate={()=>setEditing({initial:draftPlan()})} onEdit={p=>setEditing({initial:p,plan:p})} onCopy={p=>setEditing({initial:copyPlan(p),copy:true})} onSkip={setSkipping} onDelete={setDeleting} onBatch={(ids,action)=>run(()=>api!.batch(ids,action),'批量操作已完成')} onToggle={p=>void run(()=>api!.toggle(p.id))}/></main>}
 <footer><span>不唤醒电脑 · 不补执行过期任务</span><div><button className="text-button" onClick={()=>void run(()=>api!.demo('shutdown'))} disabled={!api||busy}><Sparkles size={16}/> 演示提醒</button><button className="text-button" onClick={()=>setLogsOpen(true)}><History size={16}/> 执行记录</button></div></footer></div>
 {experience.mode==='mini'&&<Mini state={state} experience={experience} busy={busy} onFull={()=>void changeMode('full')} onPause={()=>void run(()=>api!.pause(!state.paused))} onPin={()=>void changeExperience(()=>api!.experiencePrefs({...experience.prefs,miniPinned:!experience.prefs.miniPinned}))} onHide={()=>api?.window('hide')}/>}
 {toast&&<Toast text={toast}/>}
 {editing&&<Editor onPreset={experience.error?undefined:p=>setPresetEdit(p)} key={editing.plan?.id??'new'} {...editing} settings={state.settings} onClose={()=>setEditing(null)} onSave={async p=>{const ok=await run(()=>api!.save(p,editing.plan?.id),'计划已保存');if(ok)setEditing(null);return ok;}}/>}
 {quick&&<QuickPanel onPreset={experience.error?undefined:p=>setPresetEdit(p)} initial={quick} paused={state.paused} settings={state.settings} onClose={()=>setQuick(null)} onSave={async q=>{const ok=await run(()=>api!.quick(q),state.paused?'快捷计划已保存 · 当前暂停':'快捷计划已开始计时');if(ok)setQuick(null);return ok;}}/>}
 {settingsOpen&&<SettingsPanel settings={state.settings} experience={experience} onExperience={p=>changeExperience(()=>api!.experiencePrefs(p))} fileBusy={fileBusy} onClose={()=>setSettingsOpen(false)} onUpdate={s=>run(()=>api!.settings(s))} onDemo={()=>void run(()=>api!.demo('alarm'))} onLink={target=>void api?.openLink(target).catch(error)} onImport={()=>void transfer('import')} onExport={()=>void transfer('export')}/>}
 {logsOpen&&<Logs logs={state.logs} onClose={()=>setLogsOpen(false)} onExport={async f=>{try{if(await api!.exportLogs(f))setToast('记录已导出');}catch(e){error(e);}}}/>}
 {importPreview&&<ImportPanel preview={importPreview} busy={fileBusy} onClose={()=>{setImportPreview(null);void api?.cancelImport().catch(error);}} onConfirm={()=>void importConfirm()}/>}
 {deleting&&<Modal title={deleting.length===1?'删除这个计划？':`删除 ${deleting.length} 条计划？`} onClose={()=>{if(!busy)setDeleting(null);}}><p className="muted">计划及其当前提醒将被移除。暂时不用时，也可以选择停用。</p><ul className="confirmation-list">{deleting.map(p=><li key={p.id}>{p.name}</li>)}</ul><div className="modal-actions"><button className="secondary" disabled={busy} onClick={()=>setDeleting(null)}>保留计划</button><button className="danger-button" disabled={busy} onClick={async()=>{if(await run(()=>api!.batch(deleting.map(p=>p.id),'delete'),'计划已删除'))setDeleting(null);}}>{busy?'正在删除…':'删除计划'}</button></div></Modal>}
 {skipping&&<Modal title="跳过下一次执行？" onClose={()=>{if(!busy)setSkipping(null);}}><h3>{skipping.name}</h3><p className="execution-preview">{fullTime(skipping.nextAt!)}</p><p className="muted">仅跳过这一次，保留启用状态和重复规则。</p><div className="modal-actions"><button className="secondary" disabled={busy} onClick={()=>setSkipping(null)}>保留本次</button><button className="primary" disabled={busy} onClick={async()=>{if(await run(()=>api!.skip(skipping.id,skipping.nextAt!),'已跳过本次执行'))setSkipping(null);}}>确认跳过</button></div></Modal>}
 {libraryOpen&&<PresetLibrary experience={experience} onClose={()=>setLibraryOpen(false)} onApply={applyPreset} onBuiltin={applyBuiltin} onEdit={setPresetEdit} onDelete={id=>changeExperience(()=>api!.removePreset(id),'模板已删除')}/>}
 {presetEdit&&<PresetEditor initial={presetEdit} onClose={()=>setPresetEdit(null)} onSave={(p,id)=>changeExperience(()=>api!.savePreset(p,id),'模板已保存 · 未创建计划')}/>}
 {(runtime.warnings.length>0||runtime.alarms.length>0)&&<Reminder runtime={runtime} busy={busy} onAction={(keys,action,minutes)=>void run(()=>api!.act(keys,action,minutes))} onPause={()=>void run(()=>api!.pause(true),'全部计划已暂停')}/>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);

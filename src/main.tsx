import { PRODUCT } from './product';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Power, Bell, Plus, Settings2, Minus, X, Clock3, CalendarDays, Pencil, Trash2, Volume2, VolumeX, ChevronRight, ArrowUpRight, Check, RotateCcw, History, Info, Sparkles, Moon, CheckCircle2, AlertTriangle, Github, Timer, Pause, Play, Upload, Download, FolderSync } from 'lucide-react';
import '@fontsource/rajdhani/400.css';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/600.css';
import './style.css';
import './fit.css';
import './release.css';
import type { Api, Kind, Plan, PlanInput, Settings, Snapshot, ImportPreview, QuickInput } from './shared';

const empty:Snapshot={plans:[],warnings:[],alarms:[],logs:[],settings:{sound:true,volume:0.5,reducedMotion:false},now:Date.now(),safeMode:false,paused:false};
const dateText=(at:number)=>new Date(at).toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});
const timeText=(at:number)=>new Date(at).toLocaleTimeString('zh-CN',{hour12:false,hour:'2-digit',minute:'2-digit'});
const localDate=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const recurrence=(p:Plan)=>p.repeat==='once'?p.date.replaceAll('-',' / '):p.repeat==='daily'?'每天':`每周 ${[1,2,3,4,5,6,0].filter(d=>p.weekdays.includes(d)).map(d=>'日一二三四五六'[d]).join('、')}`;
const executionText=(at:number,now:number)=>`${localDate(new Date(at))===localDate(new Date(now))?'今天':dateText(at)} ${timeText(at)}`;
const countdown=(at:number|null,now:number)=>{const s=at?Math.max(0,Math.ceil((at-now)/1000)):0;return [Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(x=>String(x).padStart(2,'0'));};
let audio:AudioContext|undefined;
let audioIdle:ReturnType<typeof setTimeout>|undefined;
function tone(type:'click'|'success'|'error'|'alarm',volume=.35){
  try {audio??=new AudioContext();void audio.resume();const frequencies=type==='alarm'?[660,880,660]:type==='success'?[560,840]:type==='error'?[220,160]:[920];
    frequencies.forEach((f,i)=>{const osc=audio!.createOscillator(),gain=audio!.createGain(),t=audio!.currentTime+i*.13;osc.type='sine';osc.frequency.setValueAtTime(f,t);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume*.17,t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+(type==='click'?.07:.25));osc.connect(gain);gain.connect(audio!.destination);osc.start(t);osc.stop(t+.3);});
    clearTimeout(audioIdle);audioIdle=setTimeout(()=>void audio?.suspend(),1100);
  }catch{}
}
function Ripple({active}:{active:boolean}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{if(!active)return;const c=ref.current!,ctx=c.getContext('2d')!;let waves:{x:number;y:number;t:number}[]=[],frame=0,last=0;const scale=Math.min(devicePixelRatio,1.5);
    const resize=()=>{c.width=innerWidth*scale;c.height=innerHeight*scale;ctx.setTransform(scale,0,0,scale,0,0);};resize();
    const draw=(now:number)=>{ctx.clearRect(0,0,innerWidth,innerHeight);waves=waves.filter(w=>now-w.t<1000);for(const w of waves){const p=(now-w.t)/1000;ctx.beginPath();ctx.arc(w.x,w.y,6+p*90,0,Math.PI*2);ctx.strokeStyle=`rgba(110,214,255,${(1-p)*.25})`;ctx.lineWidth=1;ctx.stroke();}frame=waves.length?requestAnimationFrame(draw):0;};
    const move=(e:PointerEvent)=>{const now=performance.now();if(now-last<65)return;last=now;waves.push({x:e.clientX,y:e.clientY,t:now});if(waves.length>18)waves.shift();if(!frame)frame=requestAnimationFrame(draw);};
    window.addEventListener('pointermove',move);window.addEventListener('resize',resize);return()=>{cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);window.removeEventListener('resize',resize);ctx.clearRect(0,0,c.width,c.height);};
  },[active]);return <canvas ref={ref} className="ripples" aria-hidden="true"/>;
}
function Switch({value,onChange,label}:{value:boolean;onChange:()=>void;label:string}){return <button className={`switch ${value?'on':''}`} role="switch" aria-checked={value} aria-label={label} onClick={onChange}><span/></button>;}
function Modal({children,title,onClose,wide=false}:{children:React.ReactNode;title:string;onClose:()=>void;wide?:boolean}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const d=ref.current!;d.showModal();return()=>d.close();},[]);
  return <dialog ref={ref} className={wide?'modal wide':'modal'} onCancel={e=>{e.preventDefault();onClose();}} aria-label={title}><div className="modal-head"><h2>{title}</h2><button className="icon-button" aria-label="关闭面板" onClick={onClose}><X size={20}/></button></div>{children}</dialog>;
}
function Toast({text}:{text:string}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{ref.current?.showPopover();},[text]);
  return <div ref={ref} popover="manual" className="toast" style={{inset:'auto auto 30px 50%',margin:0,width:'max-content'}} role="status"><Info size={17}/>{text}</div>;
}
function App(){
  const api=window.starSleep;
  const [state,setState]=useState(empty),[filter,setFilter]=useState('all'),[editor,setEditor]=useState<Plan|null|undefined>(),[settingsOpen,setSettingsOpen]=useState(false),[logsOpen,setLogsOpen]=useState(false),[deleteId,setDeleteId]=useState<string|null>(null),[toast,setToast]=useState(''),[visible,setVisible]=useState(true),[ready,setReady]=useState(false);
  const [quickOpen,setQuickOpen]=useState(false),[importPreview,setImportPreview]=useState<ImportPreview|null>(null),[fileBusy,setFileBusy]=useState(false);
  const [systemReduced,setSystemReduced]=useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{const mq=matchMedia('(prefers-reduced-motion: reduce)'),fn=()=>setSystemReduced(mq.matches);mq.addEventListener('change',fn);return()=>mq.removeEventListener('change',fn);},[]);
  useEffect(()=>{if(!api){setReady(true);return;}api.snapshot().then(s=>{setState(s);setReady(true);}).catch(e=>{setToast(String(e));setReady(true);});const off=api.subscribe(setState),offV=api.visibility(setVisible);return()=>{off();offV();};},[]);
  useEffect(()=>{const fn=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',fn);return()=>document.removeEventListener('visibilitychange',fn);},[]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(timer);},[toast]);
  async function transfer(action:'import'|'export'){
    if(!api||fileBusy)return;setFileBusy(true);
    try{if(action==='export'){if(await api.exportPlans()){setToast('计划已导出');if(state.settings.sound)tone('success');}}
      else{setSettingsOpen(false);setImportPreview(await api.previewImport());}}
    catch(e){setToast(String(e).replace(/^Error: /,''));if(state.settings.sound)tone('error');}finally{setFileBusy(false);}
  }
  async function importConfirm(){if(!api||!importPreview||fileBusy)return;setFileBusy(true);try{const r=await api.commitImport(importPreview.token);setState(r.state);setImportPreview(null);setToast(`已导入 ${r.imported} 条，跳过 ${r.duplicate+r.expired} 条 · 核对后启用`);if(state.settings.sound)tone('success');}catch(e){setToast(String(e));setImportPreview(null);if(state.settings.sound)tone('error');}finally{setFileBusy(false);}}
  async function openLink(target:'repository'|'author'){try{await api?.openLink(target);}catch{setToast('无法打开浏览器，请稍后重试。');}}
  const alarmKey=state.alarms.map(a=>a.key).sort().join('|');
  useEffect(()=>{if(!alarmKey)return;const play=()=>tone('alarm',state.settings.volume);play();const id=setInterval(play,2300);return()=>clearInterval(id);},[alarmKey,state.settings.volume]);
  const warningKey=state.warnings.map(a=>a.key).sort().join('|');
  useEffect(()=>{if(warningKey && state.settings.sound)tone('success',state.settings.volume);},[warningKey]);
  useEffect(()=>{document.body.classList.toggle('motion-off',!visible||state.settings.reducedMotion||systemReduced);},[visible,state.settings.reducedMotion,systemReduced]);
  async function run(operation:()=>Promise<Snapshot>,message?:string){try{const s=await operation();setState(s);if(message){setToast(message);if(s.settings.sound)tone('success');}return true;}catch(e){setToast(String(e).replace(/^Error: (Error invoking remote method '[^']+': Error: )?/,''));if(state.settings.sound)tone('error');return false;}}
  const shutdowns=state.plans.filter(p=>p.kind==='shutdown'&&p.nextAt!==null).sort((a,b)=>a.nextAt!-b.nextAt!);
  const next=shutdowns[0],parts=countdown(next?.nextAt??null,state.now);
  const days=next?Math.floor((next.nextAt!-state.now)/86400_000):0;
  if(days>=4)parts[0]=String(Number(parts[0])%24).padStart(2,'0');
  const plans=state.plans.filter(p=>filter==='all'||p.kind===filter).sort((a,b)=>(a.nextAt??Infinity)-(b.nextAt??Infinity)||b.createdAt-a.createdAt);
  const busy=state.warnings.length>0||state.alarms.length>0;
  return <div className={`app ${state.paused?'paused':''}`} onClickCapture={e=>{if((e.target as HTMLElement).closest('button')&&state.settings.sound)tone('click');}}>
    <Ripple active={visible&&!state.settings.reducedMotion&&!systemReduced}/>
    <header className="titlebar"><div className="brand"><span className="brand-mark"><Moon size={20}/></span><strong>星眠</strong><span className="brand-en">STAR SLEEP</span></div><span className="title-caption">让电脑准时休息</span><div className="window-buttons"><button aria-label="最小化" onClick={()=>api?.window('minimize')}><Minus size={17}/></button><button className="close" aria-label="隐藏到托盘，任务继续" title="隐藏到托盘，任务继续" onClick={()=>api?.window('hide')}><X size={18}/></button></div></header>
    <nav className="toolbar"><div className="page-name"><span className="active-dot"/><span>休息控制台</span><span className="divider"/><span className="muted">{state.storageError?'自动执行已停止':state.paused?'全部计划已暂停':state.safeMode?'安全测试模式':'本地运行'}</span></div><div className="toolbar-right"><time>{dateText(state.now)}<b>{timeText(state.now)}</b></time><button className="quick-entry secondary" disabled={!api||!ready||!!state.storageError} onClick={()=>setQuickOpen(true)}><Timer size={17}/> 快捷计时</button><button className={state.paused?'pause-control resumed':'pause-control'} disabled={!api||!ready||!!state.storageError} onClick={()=>void run(()=>api!.pause(!state.paused),state.paused?'已恢复未来计划':'全部计划已暂停，重新打开后仍保持暂停')}>{state.paused?<Play size={16}/>:<Pause size={16}/>} {state.paused?'恢复计划':'暂停全部'}</button><button className="icon-button" aria-label="设置" title="设置" onClick={()=>setSettingsOpen(true)}><Settings2 size={19}/></button></div></nav>
    {!api&&<div className="notice">界面预览 · 请启动桌面软件以保存计划和执行关机。</div>}
    {state.storageError&&<div className="notice danger">{state.storageError}</div>}
    {!state.storageError&&state.logs[0]?.level==='error'&&<div className="notice danger">{state.logs[0].text} <button className="text-button" onClick={()=>setLogsOpen(true)}>查看记录 <ChevronRight size={13}/></button></div>}
    <main className="workspace">
      <section className="orbit-panel" aria-label="下一次关机">
        <div className="panel-heading"><h1>今晚，到点就休息。</h1><p>把时间留给自己，把准时交给星眠。</p></div>
        <div className={`orbital ${next?'armed':''}`}>
          <svg className="instrument" viewBox="0 0 440 440" aria-hidden="true"><defs><linearGradient id="arc" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b1edff"/><stop offset="1" stopColor="#2673b0"/></linearGradient></defs><circle className="outer-orbit" cx="220" cy="220" r="207"/><circle className="mid-orbit" cx="220" cy="220" r="182"/>{Array.from({length:120},(_,i)=>{const angle=i*3*Math.PI/180;return <line key={i} x1={220+195*Math.sin(angle)} y1={220-195*Math.cos(angle)} x2={220+(i%5===0?186:191)*Math.sin(angle)} y2={220-(i%5===0?186:191)*Math.cos(angle)} stroke={i%5===0?'#6486a2':'#243a50'} strokeWidth={i%5===0?1.4:1}/>;})}<circle className="arc-track" cx="220" cy="220" r="165"/><circle className="arc-light" cx="220" cy="220" r="165" strokeDasharray="765 1037" transform="rotate(-91 220 220)"/><circle className="inner-orbit" cx="220" cy="220" r="145"/><g className="orbit-satellite"><circle cx="220" cy="13" r="3" fill="#a0e7ff"/></g><path d="M 18 220 h12 M410 220 h12 M220 18 v12 M220 410 v12" stroke="#83b9d6" strokeWidth="2"/></svg>
          <div className="dial-content"><div className="dial-icon"><Power size={25} strokeWidth={1.4}/></div><div className="dial-label">{state.paused?'所有自动执行已暂停':next?(days>=4?`距离下次关机 · ${days} 天`:'距离下次关机'):'等待下一次休息'}</div><div className="countdown" aria-label={next?`剩余 ${days>=4?days+' 天 ':''}${parts.join(':')}`:'尚未设置关机'}>{parts.map((p,i)=><React.Fragment key={i}>{i>0&&<span className="colon">:</span>}<span>{next&&!state.paused?p:'--'}</span></React.Fragment>)}</div><div className="dial-units"><span>小时</span><span>分钟</span><span>秒</span></div><div className={`dial-state ${next?'live':''}`}><span/>{state.paused?'恢复后仅执行未来计划':next?'计划已就绪':'尚未设置关机计划'}</div></div>
        </div>
        <div className="next-event"><span className="next-event-icon"><CalendarDays size={19}/></span><div><span>{next?dateText(next.nextAt!):'准备好让电脑休息了吗？'}</span><strong>{next?`${timeText(next.nextAt!)} · ${next.name}`:'添加你的第一个关机计划'}</strong></div><button className="icon-button" aria-label={next?'编辑下一次关机':'添加关机计划'} onClick={()=>setEditor(next??null)}>{next?<ArrowUpRight size={21}/>:<Plus size={21}/>}</button></div>
        <div className="orbit-bottom"><span><Clock3 size={14}/> 关机前 5 分钟提醒</span><span><CheckCircle2 size={14}/> 可随时取消本次</span></div>
      </section>
      <section className="plans-panel"><div className="plans-heading"><div><h2>时间计划 <span>{state.plans.length.toString().padStart(2,'0')}</span></h2><p>安排好每一次休息与提醒。</p></div><button className="primary" onClick={()=>setEditor(null)} disabled={!api||!ready}><Plus size={17}/> 新建计划</button></div>
        <div className="filters" role="group" aria-label="筛选计划">{[['all','全部计划'],['shutdown','定时关机'],['alarm','闹钟提醒']].map(([key,label])=><button key={key} aria-pressed={filter===key} className={filter===key?'selected':''} onClick={()=>setFilter(key)}>{label}</button>)}</div>
        <div className="plan-list">
          {!ready?<div className="empty"><Clock3/><h3>正在读取计划…</h3></div>:plans.length===0?<div className="empty"><div className="empty-symbol"><Moon size={32} strokeWidth={1.1}/><span/></div><h3>{state.plans.length?'这里还没有此类计划':'给忙碌的一天，设一个终点。'}</h3><p>设定关机时间，或留一个温柔的提醒。<br/>你的计划只保存在这台电脑上。</p><button className="text-button" disabled={!api} onClick={()=>setEditor(null)}>创建一个计划 <ChevronRight size={16}/></button></div>:plans.map(p=><article key={p.id} className={`plan-row ${!p.enabled?'disabled':''} ${p.id===next?.id?'next-plan':''}`}><div className={`plan-type ${p.kind}`}>{p.kind==='shutdown'?<Power size={21}/>:<Bell size={21}/>}</div><div className="plan-main"><div className="plan-name"><h3>{p.name}</h3><span>{p.kind==='shutdown'?'关机':'闹钟'}</span></div><div className="plan-clock">{p.time}<span>{recurrence(p)}</span></div><div className="plan-meta">{p.nextAt?<><span className="meta-dot"/>{state.paused?'暂停中 · 原定':p.id===next?.id?'下次关机':'下次执行'} · {executionText(p.nextAt,state.now)}{p.exactAt!==undefined&&<span className="exact-seconds">:{String(new Date(p.nextAt).getSeconds()).padStart(2,'0')}</span>}</>:p.status}</div></div><div className="plan-controls"><Switch value={p.enabled} label={`${p.enabled?'停用':'启用'}${p.name}`} onChange={()=>void run(()=>api!.toggle(p.id))}/><div className="row-actions"><button className="icon-button" title="编辑计划" aria-label={`编辑${p.name}`} onClick={()=>setEditor(p)}><Pencil size={15}/></button><button className="icon-button delete" title="删除计划" aria-label={`删除${p.name}`} onClick={()=>setDeleteId(p.id)}><Trash2 size={15}/></button></div></div></article>)}
        </div>
        <div className="plan-note"><Info size={16}/><p>关闭窗口后仍在托盘运行。<br/>从托盘退出星眠，所有定时任务随即停止。</p></div>
        <div className="demo-strip"><div className="demo-icon"><Sparkles size={19}/></div><div><strong>先体验，再安心交给它</strong><p>演示倒计时与音效，不会真的关机。</p></div><button className="text-button" disabled={!api} onClick={()=>void run(()=>api!.demo('shutdown'))}>演示提醒 <ArrowUpRight size={16}/></button></div>
      </section>
    </main>
    <footer><span><span className="active-dot"/>{state.storageError?'故障保护 · 自动执行已停止':state.paused?'全部计划已暂停':'运行期间计划有效'}<span className="footer-divider">/</span>不唤醒电脑 · 不补执行过期任务</span><button className="text-button" onClick={()=>setLogsOpen(true)}><History size={14}/> 执行记录 <ChevronRight size={14}/></button></footer>
    {toast&&<Toast text={toast}/>}
    {quickOpen&&<QuickPanel now={state.now} paused={state.paused} onClose={()=>setQuickOpen(false)} onSave={async input=>{if(await run(()=>api!.quick(input),state.paused?'快捷计划已保存 · 当前全部暂停':'快捷计划已开始计时'))setQuickOpen(false);}}/>}
    {importPreview&&<Modal title="导入前，核对一下" onClose={()=>{setImportPreview(null);void api?.cancelImport().catch(()=>{});}}><p className="modal-description">追加到现有计划，不覆盖已有内容。导入后全部停用，核对后再开启。</p><div className="import-counts"><span><strong>{importPreview.imported}</strong> 可导入</span><span><strong>{importPreview.duplicate}</strong> 重复</span><span><strong>{importPreview.expired}</strong> 已过期</span></div><ul className="import-names">{importPreview.names.map((name,i)=><li key={i}>{name}<span>导入后停用</span></li>)}</ul><div className="modal-actions"><button className="secondary" onClick={()=>{setImportPreview(null);void api?.cancelImport().catch(()=>{});}}>取消导入</button><button className="primary" disabled={fileBusy||!importPreview.imported} onClick={()=>void importConfirm()}>确认导入 {importPreview.imported} 条</button></div></Modal>}
    {editor!==undefined&&<Editor plan={editor} onClose={()=>setEditor(undefined)} onSave={async (input)=>{if(await run(()=>api!.save(input,editor?.id),'计划已保存'))setEditor(undefined);}}/>}
    {settingsOpen&&<SettingsPanel fileBusy={fileBusy} onImport={()=>void transfer('import')} onExport={()=>void transfer('export')} onLink={target=>void openLink(target)} settings={state.settings} onClose={()=>setSettingsOpen(false)} onUpdate={s=>void run(()=>api!.settings(s))} onDemo={()=>void run(()=>api!.demo('alarm'))}/>}
    {logsOpen&&<Modal title="执行记录" onClose={()=>setLogsOpen(false)}><p className="modal-description">保留最近 200 条记录，仅存储在本机。</p><div className="logs">{state.logs.length?state.logs.map((log,i)=><div className={`log ${log.level}`} key={i}><time>{new Date(log.at).toLocaleString('zh-CN',{hour12:false})}</time><span>{log.text}</span></div>):<div className="empty small"><History size={26}/><p>还没有执行记录。</p></div>}</div></Modal>}
    {deleteId&&<Modal title="删除这个计划？" onClose={()=>setDeleteId(null)}><p className="modal-description">“{state.plans.find(p=>p.id===deleteId)?.name}”及其本次提醒将被移除。如果暂时不用，也可以停用计划。</p><div className="modal-actions"><button className="secondary" onClick={()=>setDeleteId(null)}>保留计划</button><button className="danger-button" onClick={async()=>{if(await run(()=>api!.remove(deleteId),'计划已删除'))setDeleteId(null);}}>删除计划</button></div></Modal>}
    {busy&&<Reminder onPause={()=>void run(()=>api!.pause(true),'全部计划已暂停')} state={state} onAction={(keys,action,mins)=>void run(()=>api!.act(keys,action,mins))}/>}
  </div>;
}
function QuickPanel({now,paused,onClose,onSave}:{now:number;paused:boolean;onClose:()=>void;onSave:(input:QuickInput)=>Promise<void>}){
  const [minutes,setMinutes]=useState(60),[kind,setKind]=useState<Kind>('shutdown'),[saving,setSaving]=useState(false);
  const valid=Number.isInteger(minutes)&&minutes>=1&&minutes<=1440;
  const at=valid?now+minutes*60000:now;
  return <Modal title="给这次工作，留一点时间" onClose={onClose}><form onSubmit={async e=>{e.preventDefault();if(!valid)return;setSaving(true);try{await onSave({kind,minutes});}finally{setSaving(false);}}}>
    <p className="modal-description">确认时开始计时，保存为一次性计划。软件退出期间错过的时间不会补执行。</p>
    <div className="quick-presets" role="group" aria-label="常用时长">{[[30,'30 分钟'],[60,'1 小时'],[120,'2 小时'],[240,'4 小时']].map(([n,label])=><button type="button" key={n} aria-pressed={minutes===n} className={minutes===n?'selected':''} onClick={()=>setMinutes(Number(n))}>{label}</button>)}</div>
    <div className="form-grid"><label className="field">自定义分钟<input autoFocus type="number" min="1" max="1440" step="1" required value={Number.isNaN(minutes)?'':minutes} onChange={e=>setMinutes(e.target.valueAsNumber)}/></label><label className="field">到点动作<select value={kind} onChange={e=>setKind(e.target.value as Kind)}><option value="shutdown">定时关机</option><option value="alarm">闹钟提醒</option></select></label></div>
    <div className="quick-preview"><Timer size={21}/><div><span>{paused?'保存后保持暂停 · 预计执行':'预计执行时间 · 确认时开始计时'}</span><strong>{valid?new Date(at).toLocaleString('zh-CN',{hour12:false}):'请输入 1–1440 分钟'}</strong></div></div>
    <div className={'form-hint '+(kind==='shutdown'?'warning':'')}><AlertTriangle size={17}/><span>{kind==='shutdown'?'到点强制关机，未保存内容可能丢失。剩余不足 5 分钟时立即提醒。':'到点弹窗并响铃，可停止或延后 10 分钟。'}</span></div>
    <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>取消</button><button className="primary" disabled={!valid||saving} type="submit"><Timer size={17}/>{saving?'正在保存…':paused?'保存快捷计划':'开始计时'}</button></div>
  </form></Modal>;
}
function Editor({plan,onClose,onSave}:{plan:Plan|null;onClose:()=>void;onSave:(input:PlanInput)=>Promise<void>}){
  const later=new Date(Date.now()+3600_000);
  const [value,setValue]=useState<PlanInput>(plan??{name:'夜间自动关机',kind:'shutdown',repeat:'daily',date:localDate(later),time:timeText(+later),weekdays:[1,2,3,4,5],enabled:true});
  const [saving,setSaving]=useState(false);
  const update=<K extends keyof PlanInput>(key:K,v:PlanInput[K])=>setValue({...value,[key]:v});
  return <Modal title={plan?'编辑计划':'新建时间计划'} onClose={onClose}><form onSubmit={async e=>{e.preventDefault();setSaving(true);try{await onSave(value);}finally{setSaving(false);}}}>
    <div className="kind-picker"><button type="button" aria-pressed={value.kind==='shutdown'} className={value.kind==='shutdown'?'selected':''} onClick={()=>setValue({...value,kind:'shutdown',name:value.name==='日常提醒'?'夜间自动关机':value.name})}><Power size={20}/><span>定时关机<small>让电脑按时休息</small></span>{value.kind==='shutdown'&&<Check size={16}/>}</button><button type="button" aria-pressed={value.kind==='alarm'} className={value.kind==='alarm'?'selected':''} onClick={()=>setValue({...value,kind:'alarm',name:value.name==='夜间自动关机'?'日常提醒':value.name})}><Bell size={20}/><span>闹钟提醒<small>不错过重要时刻</small></span>{value.kind==='alarm'&&<Check size={16}/>}</button></div>
    <label className="field">计划名称<input autoFocus required maxLength={48} value={value.name} onChange={e=>update('name',e.target.value)} placeholder="例如：今晚早点休息"/></label>
    <div className="form-grid"><label className="field">执行时间<input className="time-input" type="time" required value={value.time} onChange={e=>update('time',e.target.value)}/></label><label className="field">重复方式<select aria-label="重复方式" value={value.repeat} onChange={e=>update('repeat',e.target.value as PlanInput['repeat'])}><option value="once">指定日期 · 仅一次</option><option value="daily">每天</option><option value="weekly">每周 · 自选星期</option></select></label></div>
    {value.repeat==='once'&&<label className="field">执行日期<input type="date" min={localDate(new Date())} required value={value.date} onChange={e=>update('date',e.target.value)}/></label>}
    {value.repeat==='weekly'&&<fieldset className="weekdays"><legend>选择星期</legend>{[1,2,3,4,5,6,0].map(d=><button key={d} type="button" aria-pressed={value.weekdays.includes(d)} className={value.weekdays.includes(d)?'selected':''} onClick={()=>update('weekdays',value.weekdays.includes(d)?value.weekdays.filter(x=>x!==d):[...value.weekdays,d])}>{'日一二三四五六'[d]}</button>)}</fieldset>}
    {plan?.exactAt!==undefined&&<p className="quick-edit-note">原定执行：{new Date(plan.exactAt).toLocaleString('zh-CN',{hour12:false})}。修改日期或时间后，按新的整分钟执行。</p>}<div className="enable-line"><span>启用这个计划</span><Switch value={value.enabled} label="启用这个计划" onChange={()=>update('enabled',!value.enabled)}/></div>
    <div className={`form-hint ${value.kind==='shutdown'?'warning':''}`}>{value.kind==='shutdown'?<AlertTriangle size={17}/>:<Bell size={17}/>}<span>{value.kind==='shutdown'?'提前 5 分钟提醒，到点强制关闭程序并关机。未保存内容可能丢失；提醒时可取消或延后。':'到点弹窗并响铃，最长 60 秒。可以停止或延后 10 分钟。'}</span></div>
    <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>取消</button><button className="primary" disabled={saving} type="submit"><Check size={17}/>{saving?'正在保存…':'保存计划'}</button></div>
  </form></Modal>;
}
function SettingsPanel({settings,onClose,onUpdate,onDemo,onLink,onImport,onExport,fileBusy}:{onImport:()=>void;onExport:()=>void;fileBusy:boolean;onLink:(target:'repository'|'author')=>void;settings:Settings;onClose:()=>void;onUpdate:(s:Settings)=>void;onDemo:()=>void}){return <Modal title="设置与关于" onClose={onClose}><div className="setting"><div><strong><Volume2 size={18}/> 按钮与操作音效</strong><p>短促的电子反馈，不影响闹钟响铃。</p></div><Switch value={settings.sound} label="按钮音效" onChange={()=>onUpdate({...settings,sound:!settings.sound})}/></div><div className="setting vertical"><label htmlFor="volume">提醒音量 <span>{Math.round(settings.volume*100)}%</span></label><input id="volume" type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={e=>onUpdate({...settings,volume:Number(e.target.value)})}/><button className="text-button" onClick={onDemo}><Bell size={15}/> 试听闹钟</button></div><div className="setting"><div><strong><Sparkles size={18}/> 减少动态效果</strong><p>关闭背景轨道和鼠标波纹。</p></div><Switch value={settings.reducedMotion} label="减少动态效果" onChange={()=>onUpdate({...settings,reducedMotion:!settings.reducedMotion})}/></div><div className="settings-note"><Moon size={18}/><p>窗口隐藏后自动暂停装饰动画。<br/>软件不随 Windows 启动，也不会唤醒电脑。</p></div><section className="data-tools"><div><strong><FolderSync size={17}/> 计划备份与迁移</strong><p>只保存计划定义；导入后默认停用。</p></div><div><button className="secondary" disabled={fileBusy} onClick={onImport}><Upload size={16}/> 导入计划</button><button className="secondary" disabled={fileBusy} onClick={onExport}><Download size={16}/> 导出计划</button></div></section><section className="about-product" aria-label="关于星眠"><div className="about-title"><span className="brand-mark"><Moon size={22}/></span><div><h3>星眠 <span>Star Sleep</span></h3><p>版本 {PRODUCT.version} · Windows 桌面版</p></div></div><p className="author-line">第一作者 <button className="text-button" onClick={()=>onLink('author')}>{PRODUCT.author} <ArrowUpRight size={13}/></button></p><p className="author-bio">借助 AI，把日常问题做成实用、耐看的产品。<br/>让夜间的工作有个终点，也给电脑一段休息。</p><div className="about-links"><button className="secondary" onClick={()=>onLink('repository')}><Github size={16}/> GitHub 项目主页 <ArrowUpRight size={15}/></button><span>允许工作使用 · 禁止售卖</span></div></section></Modal>;}
function Reminder({state,onAction,onPause}:{onPause:()=>void;state:Snapshot;onAction:(keys:string[],action:'cancel'|'snooze',minutes?:number)=>void}){
  const firstWarning=Math.min(...state.warnings.map(o=>o.at));
  const warnings=state.warnings.filter(o=>o.at===firstWarning),alarms=state.alarms;
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
  return <dialog ref={ref} className="modal reminder" aria-label="到时提醒" onCancel={e=>e.preventDefault()}>
    {warnings.length>0&&<section><div className="reminder-symbol"><Power size={31}/></div><h2>{warnings.every(w=>w.demo)?'体验一次，安心休息':'电脑即将休息'}</h2><div className="reminder-plans" aria-label="本次关机计划">{warnings.map(w=><div key={w.key}>{w.name}</div>)}</div><p className="reminder-at">执行时间 · {new Date(firstWarning).toLocaleString('zh-CN',{hour12:false})}</p><div className="reminder-count">{countdown(Math.min(...warnings.map(w=>w.at)),state.now).join(':')}</div><div className="reminder-warning">{warnings.every(w=>w.demo)?'这是演示，不会执行实际关机。':'到点将强制关机，未保存的内容可能丢失。'}</div><button className="primary full" onClick={()=>onAction(warnings.map(w=>w.key),'cancel')}>{warnings.every(w=>w.demo)?'结束演示':'取消本次关机'}</button><div className="snooze"><span>本次延后</span>{[10,30,60].map(m=><button className="secondary" key={m} onClick={()=>onAction(warnings.map(w=>w.key),'snooze',m)}>{m} 分钟</button>)}</div></section>}
    {alarms.length>0&&<section className={warnings.length?'alarm-below':''}><div className="reminder-symbol alarm"><Bell size={27}/></div><h2>该留意一下时间了</h2><div className="reminder-plans" aria-label="本次闹钟计划">{alarms.map(a=><div key={a.key}>{a.name}</div>)}</div><div className="alarm-actions"><button className="primary" onClick={()=>onAction(alarms.map(a=>a.key),'cancel')}><VolumeX size={17}/> 停止提醒</button><button className="secondary" onClick={()=>onAction(alarms.map(a=>a.key),'snooze',10)}><RotateCcw size={15}/> 10 分钟后提醒</button></div><small>响铃最长 60 秒</small></section>}
    {[...warnings,...alarms].some(o=>!o.demo)&&<button className="text-button reminder-pause" disabled={!!state.storageError} onClick={onPause}><Pause size={15}/> 暂停全部计划</button>}
  </dialog>;
}
createRoot(document.getElementById('root')!).render(<App/>);

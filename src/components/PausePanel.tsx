import {useState} from 'react';
import {Pause,Clock3} from 'lucide-react';
import type {PauseInput,Snapshot} from '../shared';
import {useClock} from '../clock';
import {fullTime,localDate,timeText} from '../plan-utils';
import {Modal} from './UI';

export function PausePanel({state,busy,onClose,onApply,onManual}:{state:Snapshot;busy:boolean;onClose:()=>void;onApply:(value:PauseInput)=>Promise<boolean>;onManual:()=>Promise<boolean>}){
 const now=useClock(),[mode,setMode]=useState<'duration'|'until'>('duration'),[minutes,setMinutes]=useState(30),[until,setUntil]=useState(()=>{const d=new Date(Date.now()+3600000);return `${localDate(d)}T${timeText(+d)}`;});
 const at=mode==='duration'?now+minutes*60000:+new Date(until),valid=Number.isFinite(at)&&at>now&&at<=now+86400000;
 const affected=state.plans.filter(p=>p.enabled&&p.nextAt!==null&&p.nextAt<=at&&p.nextAt>=now).length;
 return <Modal title="临时暂停计划" onClose={()=>{if(!busy)onClose();}}><form noValidate onSubmit={async e=>{e.preventDefault();if(!valid||busy)return;if(await onApply(mode==='duration'?{minutes}:{until:at}))onClose();}}>
  <p className="muted">现在还想继续用电脑？暂停一会儿，到时仅恢复未来的定时计划。</p>
  {state.paused&&<p className="pause-current" role="status">{state.pauseUntil?`当前将于 ${fullTime(state.pauseUntil)} 恢复`:'当前为手动暂停，没有自动恢复时间'}</p>}
  <div className="settings-tabs" role="group" aria-label="暂停方式"><button type="button" aria-pressed={mode==='duration'} onClick={()=>setMode('duration')}>按时长</button><button type="button" aria-pressed={mode==='until'} onClick={()=>setMode('until')}>指定恢复时间</button></div>
  {mode==='duration'?<div className="quick-presets">{[15,30,60,120].map(n=><button type="button" key={n} aria-pressed={minutes===n} onClick={()=>setMinutes(n)}>{n<60?`${n} 分钟`:`${n/60} 小时`}</button>)}</div>:<label className="field pause-date">恢复日期与时间<input autoFocus aria-label="恢复日期与时间" type="datetime-local" value={until} onChange={e=>setUntil(e.target.value)}/>{!valid&&<span className="field-error">请选择未来 24 小时内的时间</span>}</label>}
  <div className="execution-preview"><Clock3 size={20}/><div><span>预计恢复 · 确认时开始暂停</span><strong>{valid?fullTime(at):'等待有效时间'}</strong></div></div>
  <p className="muted">{affected>0?`${affected} 条计划的最近一次执行落在暂停期间，会被跳过。`:'恢复后不会补执行暂停期间错过的任务。'}暂停会关闭当前提醒并停止响铃。</p>
  <p className="form-hint">Agent 夜间联动会解除，恢复时不会自动重新开启。退出星枢后不运行；重新打开时仍按保存的截止时间处理。存储故障不会被自动恢复解除。</p>
  <div className="modal-actions pause-actions"><button type="button" className="secondary" disabled={busy} onClick={async()=>{if(await onManual())onClose();}}>一直暂停</button><button className="primary" disabled={busy||!valid}><Pause size={16}/>{busy?'正在保存…':state.pauseUntil?'更新恢复时间':'确认临时暂停'}</button></div>
 </form></Modal>;
}

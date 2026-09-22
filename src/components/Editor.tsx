import {useState} from 'react';
import {AlertTriangle,Check,Timer} from 'lucide-react';
import type {Plan,PlanInput,QuickInput,Settings,PresetInput} from '../shared';
import {errorsFor,fullTime,nextTime} from '../plan-utils';
import {useClock} from '../clock';
import {Modal,Switch} from './UI';

export function Editor({initial,plan,copy=false,settings,onClose,onSave,onPreset}:{initial:PlanInput;plan?:Plan;copy?:boolean;settings:Settings;onClose:()=>void;onSave:(p:PlanInput)=>Promise<boolean>;onPreset?:(p:PresetInput)=>void}){
 const [value,setValue]=useState(initial),[saving,setSaving]=useState(false),[confirm,setConfirm]=useState(false),[submitted,setSubmitted]=useState(false),[touched,setTouched]=useState<string[]>([]);
 const now=useClock(),dirty=JSON.stringify(value)!==JSON.stringify(initial);
 const exact=plan?.exactAt!==undefined&&value.date===initial.date&&value.time===initial.time&&value.repeat==='once'?plan.exactAt:undefined;
 const errors=errorsFor(value,now,exact),next=exact??nextTime(value,now);
 const update=<K extends keyof PlanInput>(key:K,v:PlanInput[K])=>setValue(previous=>({...previous,[key]:v}));
 const error=(key:keyof PlanInput)=>(submitted||touched.includes(key))&&errors[key]?<span id={`error-${key}`} className="field-error">{errors[key]}</span>:null;
 const close=()=>{if(!saving){if(dirty)setConfirm(true);else onClose();}};
 return <><Modal title={copy?'复制计划':plan?'编辑计划':'新建时间计划'} onClose={close}><form noValidate onSubmit={async e=>{e.preventDefault();if(saving)return;setSubmitted(true);if(Object.keys(errors).length){document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();return;}setSaving(true);try{await onSave(value);}finally{setSaving(false);}}}>
  <div className="form-grid"><label className="field">到点动作<select aria-label="到点动作" value={value.kind} onChange={e=>update('kind',e.target.value as PlanInput['kind'])}><option value="shutdown">定时关机</option><option value="alarm">闹钟提醒</option></select></label><label className="field">重复方式<select aria-label="重复方式" value={value.repeat} onChange={e=>update('repeat',e.target.value as PlanInput['repeat'])}><option value="once">指定日期 · 仅一次</option><option value="daily">每天</option><option value="weekly">每周 · 自选星期</option></select></label></div>
  <label className="field">计划名称<input aria-label="计划名称" autoFocus maxLength={48} value={value.name} aria-invalid={!!errors.name&&(submitted||touched.includes('name'))} aria-describedby="error-name" onBlur={()=>setTouched(t=>[...t,'name'])} onChange={e=>update('name',e.target.value)} placeholder="例如：夜间构建结束后休息"/>{error('name')}</label>
  <div className="form-grid"><label className="field">执行时间<input aria-label="执行时间" className="time-input" type="time" value={value.time} aria-invalid={!!errors.time&&(submitted||touched.includes('time'))} aria-describedby="error-time" onBlur={()=>setTouched(t=>[...t,'time'])} onChange={e=>update('time',e.target.value)}/>{error('time')}</label>{value.repeat==='once'&&<label className="field">执行日期<input aria-label="执行日期" type="date" value={value.date} aria-invalid={!!errors.date&&(submitted||touched.includes('date'))} aria-describedby="error-date" onBlur={()=>setTouched(t=>[...t,'date'])} onChange={e=>update('date',e.target.value)}/>{error('date')}</label>}</div>
  {value.repeat==='weekly'&&<fieldset className="weekdays"><legend>选择星期</legend>{[1,2,3,4,5,6,0].map(d=><button key={d} type="button" aria-pressed={value.weekdays.includes(d)} onClick={()=>{setTouched(t=>[...t,'weekdays']);update('weekdays',value.weekdays.includes(d)?value.weekdays.filter(x=>x!==d):[...value.weekdays,d]);}}>{'日一二三四五六'[d]}</button>)}{error('weekdays')}</fieldset>}
  <div className="execution-preview"><Timer size={19}/><div><span>{value.enabled?'下次执行时间':'停用保存 · 时间预览'}</span><strong>{next&&!Object.keys(errors).length?fullTime(next):'请填写有效的未来时间'}</strong></div></div>
  {plan?.exactAt!==undefined&&<p className="muted">原定执行：{fullTime(plan.exactAt)}。修改日期或时间后按整分钟执行。</p>}
  {copy&&<p className="muted">副本默认停用，不携带执行记录或临时延后。请确认日期和时间。</p>}
  <div className="enable-line"><span>启用这个计划</span><Switch label="启用这个计划" value={value.enabled} onChange={()=>update('enabled',!value.enabled)}/></div>
  <p className="form-hint"><AlertTriangle size={18}/>{value.kind==='shutdown'?`提前 ${settings.warningMinutes??5} 分钟提醒，到点强制关机，未保存内容可能丢失。`:`响铃最长 ${settings.alarmSeconds??60} 秒，可停止或延后 10 分钟。`}</p>
  <div className="modal-actions">{onPreset&&<button type="button" className="text-button save-preset" disabled={saving} onClick={()=>onPreset({type:'schedule',name:value.name,kind:value.kind,repeat:value.repeat,time:value.time,weekdays:value.weekdays})}>存为常用模板</button>}<button type="button" className="secondary" onClick={close} disabled={saving}>取消</button><button className="primary" disabled={saving}><Check size={17}/>{saving?'正在保存…':'保存计划'}</button></div>
 </form></Modal>{confirm&&<Modal title="放弃未保存的修改？" onClose={()=>setConfirm(false)}><p>修改尚未保存，关闭后将丢弃本次编辑。</p><div className="modal-actions"><button className="secondary" onClick={()=>setConfirm(false)}>继续编辑</button><button className="danger-button" onClick={onClose}>放弃修改</button></div></Modal>}</>;
}

export function QuickPanel({initial,paused,settings,onClose,onSave,onPreset}:{initial:QuickInput;paused:boolean;settings:Settings;onClose:()=>void;onSave:(input:QuickInput)=>Promise<boolean>;onPreset?:(p:PresetInput)=>void}){
 const [value,setValue]=useState(initial),[saving,setSaving]=useState(false),now=useClock();
 const valid=Number.isInteger(value.minutes)&&value.minutes>=1&&value.minutes<=1440;
 return <Modal title="快捷计时" onClose={()=>{if(!saving)onClose();}}><form onSubmit={async e=>{e.preventDefault();if(!valid||saving)return;setSaving(true);try{await onSave(value);}finally{setSaving(false);}}}>
  {value.name&&<p className="quick-template-name">{value.name}</p>}<p className="muted">确认时开始计时，重新打开软件不会重置截止时间。</p><div className="quick-presets">{[[30,'30 分钟'],[60,'1 小时'],[120,'2 小时'],[240,'4 小时']].map(([n,label])=><button type="button" key={n} aria-pressed={value.minutes===n} onClick={()=>setValue({...value,minutes:Number(n)})}>{label}</button>)}</div>
  <div className="form-grid"><label className="field">自定义分钟<input aria-label="自定义分钟" autoFocus type="number" min="1" max="1440" step="1" value={Number.isNaN(value.minutes)?'':value.minutes} onChange={e=>setValue({...value,minutes:e.target.valueAsNumber})}/>{!valid&&<span className="field-error">请输入 1–1440 的整数分钟</span>}</label><label className="field">到点动作<select aria-label="到点动作" value={value.kind} onChange={e=>setValue({...value,kind:e.target.value as QuickInput['kind']})}><option value="shutdown">定时关机</option><option value="alarm">闹钟提醒</option></select></label></div>
  <div className="execution-preview"><Timer size={20}/><div><span>{paused?'保存后保持暂停 · 原定时间':'预计执行时间 · 确认时开始计时'}</span><strong>{valid?fullTime(now+value.minutes*60000):'等待有效时长'}</strong></div></div>
  <p className="form-hint"><AlertTriangle size={18}/>{value.kind==='shutdown'?`到点强制关机，未保存内容可能丢失。不足 ${settings.warningMinutes??5} 分钟时立即提醒。`:`到点响铃，最长 ${settings.alarmSeconds??60} 秒。`}</p>
  <div className="modal-actions">{onPreset&&<button type="button" className="text-button save-preset" disabled={saving||!valid} onClick={()=>onPreset({type:'quick',name:value.name??`${value.minutes} 分钟后${value.kind==='shutdown'?'关机':'提醒'}`,kind:value.kind,minutes:value.minutes})}>存为常用模板</button>}<button type="button" className="secondary" disabled={saving} onClick={onClose}>取消</button><button className="primary" disabled={!valid||saving}>{saving?'正在保存…':paused?'保存快捷计划':'开始计时'}</button></div>
 </form></Modal>;
}

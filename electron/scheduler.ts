import { randomUUID } from 'node:crypto';
import type { Kind, Occurrence, Plan, PlanInput, Snapshot, StoreData, QuickInput, PlanDefinition, Settings } from '../src/shared';
import { classifyImport } from './transfer';
export const WARNING = 5 * 60_000;
export const defaults = (): StoreData => ({ version: 2, paused: false, plans: [], handled: {}, overrides: {}, logs: [], settings: { sound: true, volume: 0.5, reducedMotion: false, warningMinutes: 5, alarmSeconds: 60 } });
const keyFor = (p: Plan, at: number) => `${p.id}:${p.revision}:${at}`;
export function validate(input: PlanInput, now: number) {
  if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 48) throw new Error('请输入 1–48 个字的计划名称');
  if (!['shutdown', 'alarm'].includes(input.kind) || !['once', 'daily', 'weekly'].includes(input.repeat)) throw new Error('计划类型无效');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error('请选择有效的时间');
  if (!Array.isArray(input.weekdays) || input.weekdays.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw new Error('星期设置无效');
  if (input.repeat === 'weekly' && !input.weekdays.length) throw new Error('请至少选择一个星期');
  if (typeof input.enabled !== 'boolean') throw new Error('启用状态无效');
  if (input.repeat === 'once') {
    const date = new Date(`${input.date}T${input.time}:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(+date) || localDate(date) !== input.date) throw new Error('请选择有效的日期');
    if (+date <= now) throw new Error('请选择未来的日期和时间');
  }
}
export function localDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export function candidates(p: Plan, now: number): number[] {
  if (p.repeat === 'once') return [p.exactAt ?? +new Date(`${p.date}T${p.time}:00`)];
  const [h, m] = p.time.split(':').map(Number), values: number[] = [];
  for (let day = -1; day <= 8; day++) {
    const date = new Date(now); date.setDate(date.getDate() + day); date.setHours(h,m,0,0);
    if (p.repeat === 'daily' || p.weekdays.includes(date.getDay())) values.push(+date);
  }
  return values;
}
export class Scheduler {
  revision = 0;
  warnings: Occurrence[] = [];
  alarms: Occurrence[] = [];
  last: number;
  active = true;
  private demoCounter = 0;
  constructor(public data: StoreData, public now: () => number, private persist: () => void, private shutdown: () => void | Promise<void>, private notify: (kind: Kind) => void) { this.last = now(); }
  log(text: string, level: 'info' | 'error' = 'info') { this.revision++; this.data.logs.unshift({ at: this.now(), text, level }); this.data.logs = this.data.logs.slice(0,200); }
  private occurrence(p: Plan, at: number): Occurrence { const key = keyFor(p, at); return { key, planId:p.id, name:p.name, kind:p.kind, at:this.data.overrides[key] ?? at, originalAt:at }; }
  private occurrences(p: Plan, now: number) {
    const all = new Set(candidates(p,now));
    for (const key of Object.keys(this.data.overrides)) if (key.startsWith(`${p.id}:${p.revision}:`)) all.add(Number(key.split(':').at(-1)));
    return [...all].map(at=>this.occurrence(p,at)).filter(o=>Number.isFinite(o.at));
  }
  private done(o: Occurrence, outcome='已取消') { if (!o.demo) { this.data.handled[o.key]=this.now(); delete this.data.overrides[o.key]; const p=this.data.plans.find(p=>p.id===o.planId); if(p?.repeat==='once')p.outcome=outcome; } }
  reconcile(reason = '软件重新打开') {
    this.revision++;
    const now=this.now(); this.warnings=[]; this.alarms=[];
    for (const p of this.data.plans.filter(p=>p.enabled)) for (const o of this.occurrences(p,now)) {
      if (o.at <= now && !this.data.handled[o.key]) { this.done(o,'已错过'); if (p.repeat==='once' || o.at >= this.last) this.log(`${p.name} · 已错过（${reason}）`); }
    }
    // Recurring ledgers are bounded; one-time records remain to distinguish completed from missed.
    for (const [key, at] of Object.entries(this.data.handled)) if (at < now - 30*86400_000 && !this.data.plans.some(p=>p.repeat==='once' && key.startsWith(`${p.id}:`))) delete this.data.handled[key];
    this.last=now; this.persist(); this.tick();
  }
  save(input: PlanInput, id?: string, quickAt?: number) {
    const old = this.data.plans.find(p=>p.id===id);
    const priorDate=old?.exactAt===undefined?old?.date:localDate(new Date(old.exactAt));
    const priorTime=old?.exactAt===undefined?old?.time:`${String(new Date(old.exactAt).getHours()).padStart(2,'0')}:${String(new Date(old.exactAt).getMinutes()).padStart(2,'0')}`;
    const exactAt=quickAt ?? (old?.repeat==='once' && input.repeat==='once' && priorDate===input.date && priorTime===input.time ? old.exactAt : undefined);
    if(exactAt!==undefined && (!Number.isFinite(exactAt)||exactAt<=this.now()))throw new Error('请选择未来的日期和时间');
    validate(input,exactAt===undefined?this.now():-Infinity);
    if (id && !old) throw new Error('该计划已不存在，请刷新后重试');
    const p:Plan={ name:input.name.trim(), kind:input.kind, repeat:input.repeat, date:input.date, time:input.time, weekdays:[...new Set(input.weekdays)].sort(), enabled:input.enabled, id:old?.id??randomUUID(), revision:(old?.revision??0)+1, createdAt:old?.createdAt??this.now(), ...(exactAt===undefined?{}:{exactAt}) };
    if (old) { this.clearPlan(old.id); this.data.plans=this.data.plans.map(x=>x.id===id?p:x); } else this.data.plans.push(p);
    this.log(`${p.name} · ${old?'已修改':'已创建'}`); this.persist(); this.tick();
  }
  private clearPlan(id:string) { this.warnings=this.warnings.filter(o=>o.planId!==id); this.alarms=this.alarms.filter(o=>o.planId!==id); for (const key of Object.keys(this.data.overrides)) if (key.startsWith(id+':')) delete this.data.overrides[key]; }
  quick(input: QuickInput) {
    if(!input||!['shutdown','alarm'].includes(input.kind)||!Number.isInteger(input.minutes)||input.minutes<1||input.minutes>1440)throw new Error('请输入 1–1440 的整数分钟');
    const at=this.now()+input.minutes*60_000,d=new Date(at);
    this.save({name:`${input.minutes} 分钟后${input.kind==='shutdown'?'关机':'提醒'}`,kind:input.kind,repeat:'once',date:localDate(d),time:`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,weekdays:[],enabled:true},undefined,at);
  }
  setPaused(paused: boolean) {
    if(typeof paused!=='boolean')throw new Error('暂停状态无效');
    if(!this.active)throw new Error('自动执行因故障停止，请排查后重新打开软件');
    if(this.data.paused===paused)return;
    this.data.paused=paused;this.warnings=[];this.alarms=[];
    this.log(paused?'已暂停全部计划':'已恢复计划 · 跳过暂停期间错过的任务');this.persist();
    if(!paused)this.reconcile('全部计划恢复');else this.last=this.now();
  }
  updateSettings(value: Settings) {
    const settings = {...this.data.settings, ...value};
    if (!value || typeof settings.sound !== 'boolean' || typeof settings.reducedMotion !== 'boolean' || !Number.isFinite(settings.volume) || settings.volume < 0 || settings.volume > 1 || ![1,5,10,15,30].includes(settings.warningMinutes ?? 5) || ![15,30,60].includes(settings.alarmSeconds ?? 60)) throw new Error('设置无效');
    this.data.settings = {sound:settings.sound, volume:settings.volume, reducedMotion:settings.reducedMotion, warningMinutes:settings.warningMinutes ?? 5, alarmSeconds:settings.alarmSeconds ?? 60};
    this.revision++; this.persist(); this.tick();
  }
  batch(ids: string[], action: 'enable'|'disable'|'delete') {
    if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string') || !['enable','disable','delete'].includes(action)) throw new Error('请选择有效的计划和操作');
    const selected = [...new Set(ids)].map(id => this.data.plans.find(p => p.id === id));
    if (selected.some(p => !p)) throw new Error('部分计划已不存在，请重新选择');
    const now = this.now(), plans = selected as Plan[];
    if (action === 'enable' && plans.some(p => p.repeat === 'once' && !this.occurrences(p, now).some(o => o.at > now && !this.data.handled[o.key]))) throw new Error('选择中含有已结束的单次计划，请修改时间后再启用');
    for (const p of plans) {
      if (action !== 'delete' && p.enabled === (action === 'enable')) continue;
      this.clearPlan(p.id);
      if (action !== 'delete') p.enabled = action === 'enable';
      if (action === 'enable') for (const o of this.occurrences(p, now)) if (o.at <= now && !this.data.handled[o.key]) this.done(o, '已错过');
    }
    if (action === 'delete') this.data.plans = this.data.plans.filter(p => !ids.includes(p.id));
    this.log(`已批量${action === 'enable' ? '启用' : action === 'disable' ? '停用' : '删除'} ${plans.length} 条计划`);
    this.persist(); this.tick();
  }
  skip(id: string, expectedAt: number) {
    const p = this.data.plans.find(p => p.id === id), now = this.now();
    if (!p?.enabled || !Number.isFinite(expectedAt)) throw new Error('该计划当前没有可跳过的执行');
    const next = this.occurrences(p, now).filter(o => !this.data.handled[o.key] && o.at > now).sort((a,b) => a.at - b.at)[0];
    if (!next || next.at !== expectedAt) throw new Error('执行时间已变化，请刷新后重新确认');
    this.done(next, '已跳过');
    this.warnings = this.warnings.filter(o => o.key !== next.key);
    this.log(`${p.name} · 已跳过 ${new Date(next.at).toLocaleString('zh-CN', {hour12:false})}`);
    this.persist(); this.tick();
  }
  importPlans(definitions: PlanDefinition[]) {
    const result=classifyImport(definitions,this.data.plans,this.now());
    const created=result.accepted.map(p=>({...p,enabled:false,id:randomUUID(),revision:1,createdAt:this.now()}));
    if(created.length){this.data.plans.push(...created);this.log(`已导入 ${created.length} 条计划 · 全部停用，核对后启用`);this.persist();}
    return {imported:created.length,duplicate:result.duplicate,expired:result.expired};
  }
  remove(id:string) { const p=this.data.plans.find(p=>p.id===id); if (!p) throw new Error('该计划已不存在'); this.clearPlan(id); this.data.plans=this.data.plans.filter(p=>p.id!==id); this.log(`${p.name} · 已删除`); this.persist(); }
  toggle(id:string) { const p=this.data.plans.find(p=>p.id===id); if (!p) throw new Error('该计划已不存在'); p.enabled=!p.enabled; this.clearPlan(id); if(p.enabled)for(const o of this.occurrences(p,this.now()))if(o.at<this.now()&&!this.data.handled[o.key])this.done(o,'已错过'); this.log(`${p.name} · ${p.enabled?'已启用':'已停用'}`); this.persist(); this.tick(); }
  action(keys:string[], action:'cancel'|'snooze', minutes=10) {
    if (!Array.isArray(keys) || !['cancel','snooze'].includes(action) || ![10,30,60].includes(minutes)) throw new Error('操作参数无效');
    const selected=[...this.warnings,...this.alarms].filter(o=>keys.includes(o.key));
    for (const o of selected) {
      if (action==='snooze' && !o.demo) { delete this.data.handled[o.key]; this.data.overrides[o.key]=this.now()+minutes*60_000; this.log(`${o.name} · 本次延后 ${minutes} 分钟`); }
      else { this.done(o); this.log(`${o.name} · ${o.demo?'演示结束':'已取消本次'}`); }
    }
    this.warnings=this.warnings.filter(o=>!keys.includes(o.key)); this.alarms=this.alarms.filter(o=>!keys.includes(o.key)); this.persist(); this.tick();
  }
  demo(kind: Kind) { const o:Occurrence={ key:`demo:${++this.demoCounter}`,planId:'demo',name:kind==='shutdown'?'关机提醒演示':'闹钟演示',kind,at:this.now()+(kind==='shutdown'?30_000:0),originalAt:this.now(),demo:true, ...(kind==='alarm'?{endsAt:this.now()+(this.data.settings.alarmSeconds ?? 60)*1000}:{}) }; if(kind==='shutdown')this.warnings=[...this.warnings.filter(o=>!o.demo),o];else this.alarms=[...this.alarms.filter(o=>!o.demo),o]; this.revision++; this.notify(kind); }
  stop() { this.active=false; this.warnings=[]; this.alarms=[]; this.revision++; }
  tick() {
    if (!this.active) return;
    const now=this.now();
    const before = [...this.warnings, ...this.alarms].map(o => o.key).join('|');
    if(this.data.paused){
      const expired=this.warnings.some(o=>o.demo&&o.at<=now);
      this.warnings=this.warnings.filter(o=>o.demo&&o.at>now);
      this.alarms=this.alarms.filter(o=>o.demo&&now<(o.endsAt ?? o.at+60_000));
      if(before !== [...this.warnings,...this.alarms].map(o=>o.key).join('|'))this.revision++;
      this.last=now;if(expired){this.log('演示完成 · 未执行实际关机');this.persist();}return;
    }
    if (now < this.last - 2000 || now-this.last > 15_000) { this.reconcile('休眠或系统时间变化'); return; }
    const due:Occurrence[]=[]; let dirty=false;
    for(const p of this.data.plans.filter(p=>p.enabled))for(const o of this.occurrences(p,now)) {
      if(this.data.handled[o.key])continue;
      if(o.at < this.last-1500){this.done(o,'已错过');dirty=true;continue;}
      if(o.at<=now) {
        this.done(o,'已完成');dirty=true;
        this.log(`${o.name} · ${o.kind==='shutdown'?'已到关机时间':'闹钟已触发'}`);
        if(o.kind==='shutdown')due.push(o);else this.alarms.push({...o, endsAt:now+(this.data.settings.alarmSeconds ?? 60)*1000});
      }else if(o.kind==='shutdown' && o.at-now<=(this.data.settings.warningMinutes ?? 5)*60_000 && !this.warnings.some(w=>w.key===o.key)) {this.warnings.push(o);this.notify('shutdown');}
    }
    if(this.alarms.some(a=>!a.demo && a.at>this.last && a.at<=now))this.notify('alarm');
    const expiredDemos=this.warnings.filter(o=>o.demo && o.at<=now);
    if(expiredDemos.length){this.log('演示完成 · 未执行实际关机');dirty=true;}
    this.warnings=this.warnings.filter(o=>o.at>now);
    this.alarms=this.alarms.filter(o=>now<(o.endsAt ?? o.at+60_000));
    if(dirty || before !== [...this.warnings,...this.alarms].map(o=>o.key).join('|'))this.revision++;
    this.last=now;
    if(dirty)this.persist();
    if(due.length) {
      const failure=(e:unknown)=>{for(const o of due){const p=this.data.plans.find(p=>p.id===o.planId);if(p?.repeat==='once')p.outcome='执行失败';}this.log(`关机失败 · ${String(e)}`,'error');this.persist();this.notify('shutdown');};
      try { Promise.resolve(this.shutdown()).catch(failure); }
      catch(e){failure(e);}
    }
  }
  snapshot(safeMode=false):Snapshot {
    const now=this.now();
    return {plans:this.data.plans.map(p=>{
      const next=p.enabled?this.occurrences(p,now).filter(o=>!this.data.handled[o.key] && o.at>=now).sort((a,b)=>a.at-b.at)[0]?.at??null:null;
      const date=p.exactAt===undefined?p.date:localDate(new Date(p.exactAt));
      const time=p.exactAt===undefined?p.time:`${String(new Date(p.exactAt).getHours()).padStart(2,'0')}:${String(new Date(p.exactAt).getMinutes()).padStart(2,'0')}`;
      return {...p,date,time,nextAt:next,status:!p.enabled?'已停用':next?'等待执行':p.repeat==='once'?(p.outcome??'已错过'):'等待下一次'};
    }),warnings:this.warnings,alarms:this.alarms,logs:this.data.logs,settings:this.data.settings,now,safeMode,paused:this.data.paused};
  }
}

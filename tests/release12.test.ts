import test from 'node:test';
import assert from 'node:assert/strict';
import {Scheduler,defaults} from '../electron/scheduler';
import {parseStore} from '../electron/storage';
import {classifyImport} from '../electron/transfer';
import {filterLogs,exportLogText} from '../electron/logs';
import {copyPlan,errorsFor,nextTime,selectPlans,isFinished} from '../src/plan-utils';
import type {PlanInput} from '../src/shared';
const start=+new Date('2027-01-01T23:55:00');
const input=(value:Partial<PlanInput>={}):PlanInput=>({name:'夜间计划',kind:'shutdown',repeat:'daily',date:'',time:'23:59',weekdays:[],enabled:true,...value});
function harness(){let now=start,calls=0,saves=0;const s=new Scheduler(defaults(),()=>now,()=>{saves++;},()=>{calls++;},()=>{});return {s,get calls(){return calls;},get saves(){return saves;},set:(n:number)=>now=n,advance:(seconds:number)=>{for(let i=0;i<seconds;i++){now+=1000;s.tick();}}};}
test('batch enable validates entire selection before any mutation and persists once',()=>{
 const h=harness();h.s.save(input({name:'一',enabled:false}));h.s.save(input({name:'二',enabled:false}));const ids=h.s.data.plans.map(p=>p.id),before=JSON.stringify(h.s.data),saves=h.saves;
 assert.throws(()=>h.s.batch([...ids,'missing'],'enable'));assert.equal(JSON.stringify(h.s.data),before);assert.equal(h.saves,saves);
 h.s.batch([...ids,ids[0]],'enable');assert.equal(h.saves,saves+1);assert.ok(h.s.data.plans.every(p=>p.enabled));assert.equal(h.s.warnings.length,2);
 h.s.batch(ids,'disable');assert.equal(h.s.warnings.length,0);assert.ok(h.s.data.plans.every(p=>!p.enabled));
 h.s.batch(ids,'delete');assert.equal(h.s.data.plans.length,0);
});
test('batch enable rejects expired or finished one-time plans atomically',()=>{
 const h=harness();h.s.save(input({repeat:'once',date:'2027-01-01',time:'23:56',enabled:false}));h.s.save(input({name:'其他',enabled:false}));h.advance(61);const before=JSON.stringify(h.s.data);assert.throws(()=>h.s.batch(h.s.data.plans.map(p=>p.id),'enable'),/已结束/);assert.equal(JSON.stringify(h.s.data),before);
});
test('batch enable of an already enabled plan preserves snooze',()=>{
 const h=harness();h.s.save(input());h.s.action(h.s.warnings.map(w=>w.key),'snooze',30);const at=h.s.snapshot().plans[0].nextAt;h.s.batch([h.s.data.plans[0].id],'enable');assert.equal(h.s.snapshot().plans[0].nextAt,at);
});
test('skip next is durable across midnight and does not disable recurrence',()=>{
 const h=harness();h.s.save(input());const p=h.s.snapshot().plans[0];h.s.skip(p.id,p.nextAt!);assert.equal(h.s.warnings.length,0);assert.equal(h.s.data.plans[0].enabled,true);assert.equal(h.s.snapshot().plans[0].nextAt,+new Date('2027-01-02T23:59:00'));h.advance(300);assert.equal(h.calls,0);
 const restored=new Scheduler(parseStore(JSON.stringify(h.s.data)),()=>start+300000,()=>{},()=>assert.fail(),()=>{});restored.reconcile();assert.equal(restored.snapshot().plans[0].nextAt,+new Date('2027-01-02T23:59:00'));
});
test('skip handles a snoozed occurrence, not another plan or the next recurrence',()=>{
 const h=harness();h.s.save(input());h.s.action(h.s.warnings.map(w=>w.key),'snooze',30);const p=h.s.snapshot().plans[0];h.s.save(input({name:'另一个',time:'00:20'}));h.s.skip(p.id,p.nextAt!);assert.equal(Object.keys(h.s.data.overrides).length,0);assert.equal(h.s.snapshot().plans[0].nextAt,+new Date('2027-01-02T23:59:00'));assert.equal(h.s.snapshot().plans[1].nextAt,+new Date('2027-01-02T00:20:00'));
});
test('skip rejects stale confirmation and exact deadline without skipping tomorrow',()=>{
 const h=harness();h.s.save(input());const p=h.s.snapshot().plans[0];assert.throws(()=>h.s.skip(p.id,p.nextAt!+1));h.set(p.nextAt!);const before=JSON.stringify(h.s.data);assert.throws(()=>h.s.skip(p.id,p.nextAt!),/变化/);assert.equal(JSON.stringify(h.s.data),before);
});
test('skipped single plan is finished; bulk clear leaves recurring and failed plans',()=>{
 const h=harness();h.s.save(input({repeat:'once',date:'2027-01-01'}));const p=h.s.snapshot().plans[0];h.s.skip(p.id,p.nextAt!);h.s.save(input({name:'重复'}));const states=h.s.snapshot().plans;assert.ok(isFinished(states[0]));assert.ok(!isFinished(states[1]));assert.ok(!isFinished({...states[0],outcome:'执行失败'}));
});
test('configurable warning applies to future reminders without removing existing warnings',()=>{
 const h=harness();h.s.updateSettings({...h.s.data.settings,warningMinutes:1});h.s.save(input());assert.equal(h.s.warnings.length,0);h.advance(180);assert.equal(h.s.warnings.length,1);const at=h.s.warnings[0].at;h.s.updateSettings({...h.s.data.settings,warningMinutes:30});assert.equal(h.s.warnings[0].at,at);assert.equal(h.s.warnings.length,1);
});
test('alarm has fixed deadline; duration change only affects subsequent alarms',()=>{
 const h=harness();h.s.updateSettings({...h.s.data.settings,alarmSeconds:15});h.s.quick({minutes:1,kind:'alarm'});h.advance(60);assert.equal(h.s.alarms[0].endsAt,start+75000);h.s.updateSettings({...h.s.data.settings,alarmSeconds:60});h.advance(15);assert.equal(h.s.alarms.length,0);h.s.demo('alarm');assert.equal(h.s.alarms[0].endsAt,start+135000);
});
test('invalid reminder settings do not change state',()=>{
 const h=harness();const before=JSON.stringify(h.s.data);for(const settings of [{...h.s.data.settings,warningMinutes:0},{...h.s.data.settings,alarmSeconds:120},{...h.s.data.settings,volume:NaN}])assert.throws(()=>h.s.updateSettings(settings));assert.equal(JSON.stringify(h.s.data),before);
});
test('v2 old preferences get defaults without changing data version or ledgers',()=>{
 const h=harness();h.s.save(input());h.s.action(h.s.warnings.map(w=>w.key),'snooze',30);h.s.setPaused(true);const old={...h.s.data,settings:{sound:false,volume:.2,reducedMotion:true}};const loaded=parseStore(JSON.stringify(old));assert.equal(loaded.version,2);assert.equal(loaded.paused,true);assert.deepEqual(loaded.overrides,old.overrides);assert.equal(loaded.settings.warningMinutes,5);assert.equal(loaded.settings.alarmSeconds,60);
});
test('idle scheduler does not revise full state or write disk',()=>{
 const h=harness();h.s.save(input({kind:'alarm',time:'23:59'}));const rev=h.s.revision,saves=h.saves;h.advance(60);assert.equal(h.s.revision,rev);assert.equal(h.saves,saves);h.s.demo('alarm');const demoRev=h.s.revision;h.advance(60);assert.equal(h.s.alarms.length,0);assert.ok(h.s.revision>demoRev);
});
test('import preview explains both duplicate and expired entries',()=>{
 const definition=input(),expired=input({name:'过期',repeat:'once',date:'2020-01-01'});const r=classifyImport([definition,definition,expired],[],start);assert.equal(r.accepted.length,1);assert.deepEqual(r.skipped.map(x=>x.reason),['与现有计划或文件内条目重复','单次时间已过期']);
});
test('duplicate definition has no identity, exact deadline, outcome or execution state',()=>{
 const h=harness();h.s.quick({minutes:30,kind:'shutdown'});const source=h.s.data.plans[0],copy=copyPlan(source);assert.equal(copy.enabled,false);assert.equal(copy.repeat,'once');assert.ok(!('id' in copy));assert.ok(!('exactAt' in copy));assert.ok(!('outcome' in copy));assert.ok(copy.name.length<=48);assert.equal(h.s.data.plans.length,1);
});
test('editor validation and next preview cover invalid dates and selected weekdays',()=>{
 assert.match(errorsFor(input({name:' '}),start).name!,/名称/);assert.match(errorsFor(input({repeat:'weekly',weekdays:[]}),start).weekdays!,/星期/);assert.match(errorsFor(input({repeat:'once',date:'2027-02-30'}),start).date!,/日期/);assert.equal(nextTime(input({repeat:'weekly',weekdays:[1],time:'00:00'}),start),+new Date('2027-01-04T00:00:00'));
});
test('plan filters compose, preserve source order and support name and creation sorting',()=>{
 const h=harness();h.s.save(input({name:'Agent 构建',kind:'alarm'}));h.s.save(input({name:'夜间备份',enabled:false}));const rows=h.s.snapshot().plans,before=rows.map(p=>p.id);assert.equal(selectPlans(rows,'agent','alarm','enabled','next').length,1);assert.equal(selectPlans(rows,'','all','disabled','name')[0].name,'夜间备份');assert.deepEqual(rows.map(p=>p.id),before);
});
test('record export matches filtered visible entries and rejects arbitrary parameters',()=>{
 const logs=[{at:start,text:'Agent 创建',level:'info' as const},{at:start,text:'Agent 执行失败',level:'error' as const}];const filter={query:'agent',date:'2027-01-01',errorsOnly:true};assert.equal(filterLogs(logs,filter).length,1);const text=exportLogText(logs,filter);assert.match(text,/执行失败/);assert.doesNotMatch(text,/创建/);assert.throws(()=>filterLogs(logs,{...filter,date:'bad'}));
});

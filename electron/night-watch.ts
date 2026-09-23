import {randomBytes} from 'node:crypto';
import type {AgentProvider,AgentSession,NightSnapshot} from '../src/integration-types';
import type {Occurrence} from '../src/shared';

export const FINISH_INSTRUCTION=(marker:string)=>`星枢夜间联动：只有本次用户要求已全部处理完毕、验证结束、不需要用户回答且没有后台或子任务继续工作时，才在最终答复末尾单独输出 ${marker} 。未完成、等待确认、失败、额度不足或只给出计划时禁止输出此标记。标记仅报告完成，不授予关机权限；是否关机由用户在星枢中单独开启。`;
export interface AgentEvent { provider:AgentProvider; event:string; sessionId:string; name?:string; pid:number; at:number; eventId:string; turnId?:string; message?:string; agentId?:string; tool?:string; backgroundClear?:boolean; }
type Live = AgentSession & { marker:string; turnId?:string; startedAt:number; completedAt?:number; };
const providers=['codex','claude','deepseek'];
export function validateEvent(v:unknown,now:number):AgentEvent {
  const e=v as AgentEvent;
  if(!e||!providers.includes(e.provider)||typeof e.sessionId!=='string'||!e.sessionId||e.sessionId.length>200||typeof e.event!=='string'||e.event.length>60||!Number.isSafeInteger(e.pid)||e.pid<=0||!Number.isFinite(e.at)||Math.abs(now-e.at)>30_000||typeof e.eventId!=='string'||e.eventId.length>100)throw new Error('无效或已过期的 Agent 事件');
  for(const key of ['name','turnId','agentId','tool'] as const)if(e[key]!==undefined&&(typeof e[key]!=='string'||e[key]!.length>500))throw new Error('Agent 事件字段无效');
  if(e.message!==undefined&&(typeof e.message!=='string'||e.message.length>4000))throw new Error('Agent 结束消息过长');
  return e;
}
export class NightWatch {
  private sessions=new Map<string,Live>();
  private seen=new Set<string>();
  armed=false; selected:string[]=[]; settleAt:number|null=null; deadline:number|null=null;
  message='尚未开启夜间联动'; bridgeReady=false; private warningKey=''; private issuing=false;
  constructor(private now:()=>number,private alive:(pid:number)=>boolean,private warningMinutes:()=>number,private execute:()=>void|Promise<void>,private log:(text:string,error?:boolean)=>void,private notify:()=>void,private settleMs=60_000){}
  snapshot():NightSnapshot{return {sessions:[...this.sessions.values()].map(({marker,turnId,startedAt,completedAt,...s})=>({...s,children:[...s.children]})),armed:this.armed,selected:[...this.selected],message:this.message,settleAt:this.settleAt,deadline:this.deadline,bridgeReady:this.bridgeReady};}
  get warning():Occurrence|null{return this.deadline===null?null:{key:this.warningKey,planId:'agent-night',name:'选定 Agent 已报告完成 · 夜间联动',kind:'shutdown',at:this.deadline,originalAt:this.deadline};}
  event(raw:unknown):{context?:string} {
    const e=validateEvent(raw,this.now());
    if(this.seen.has(e.eventId))return {};
    this.seen.add(e.eventId);if(this.seen.size>2000)this.seen.delete(this.seen.values().next().value!);
    const id=`${e.provider}:${e.sessionId}`;let s=this.sessions.get(id);
    if(e.event==='start'){
      if(!s&&this.sessions.size>=200){const old=[...this.sessions.values()].find(x=>!this.selected.includes(x.id)&&x.status!=='running');if(old)this.sessions.delete(old.id);else throw new Error('Agent 会话过多，请重新打开星枢');}
      s={id,provider:e.provider,sessionId:e.sessionId,name:(e.name||e.sessionId).slice(0,80),pid:e.pid,status:'running',detail:'正在处理本轮任务',seenAt:this.now(),children:s?.children??[],marker:`[STARSLEEP_DONE:${randomBytes(16).toString('hex')}]`,turnId:e.turnId,startedAt:this.now()};
      this.sessions.set(id,s);this.changed(id);return {context:FINISH_INSTRUCTION(s.marker)};
    }
    // A connection made mid-turn cannot turn a historical Stop into completion.
    if(!s)return {};
    if(e.pid!==s.pid){s.status='disconnected';s.detail='进程已变化，请在客户端开始新任务';this.changed(id);return {};}
    if(e.turnId&&s.turnId&&e.turnId!==s.turnId)return {};
    s.seenAt=this.now();
    if(e.event==='heartbeat')return {};
    if(e.event==='child-start'){if(e.agentId&&!s.children.includes(e.agentId))s.children.push(e.agentId);s.status='running';s.detail='关联子任务仍在工作';}
    else if(e.event==='child-stop'){s.children=s.children.filter(id=>id!==e.agentId);return {};}
    else if(e.event==='running'){s.status='running';s.detail='正在执行工具或继续工作';}
    else if(e.event==='waiting'){s.status='waiting';s.detail='等待用户输入或审批';}
    else if(e.event==='failed'){s.status='failed';s.detail='发生错误，未报告完成';}
    else if(e.event==='interrupted'||e.event==='end'){s.status='disconnected';s.detail=e.event==='end'?'客户端会话已关闭':'任务已被中断';}
    else if(e.event==='stop'){
      const declared=e.message?.trim().endsWith(s.marker)===true;
      // Claude's current hook contract reports background tasks and recurring work.
      const backgroundOk=e.provider!=='claude'||e.backgroundClear===true;
      if(declared&&backgroundOk&&!s.children.length){s.status='completed';s.detail='Agent 已明确报告本轮全部完成';s.completedAt=this.now();}
      else{s.status='waiting';s.detail=!declared?'本轮结束，但未确认任务全部完成':!backgroundOk?'后台任务或定时工作未确认结束':'仍有子任务未结束';}
    }else return {};
    this.changed(id);return {};
  }
  private changed(id:string){if(!this.armed||!this.selected.includes(id))return;this.settleAt=null;this.deadline=null;this.warningKey='';this.message='继续等待选定任务；新的活动会撤销关机倒计时';}
  arm(ids:unknown){
    if(!this.bridgeReady)throw new Error('Agent 接入尚未就绪');
    if(!Array.isArray(ids)||!ids.length||ids.length>50||ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)throw new Error('请选择 1–50 个不同的 Agent 任务');
    if(ids.some(id=>{const s=this.sessions.get(id);return !s||s.status!=='running'||!this.alive(s.pid);}))throw new Error('只能监控当前正在运行的任务，请先在客户端开始新任务');
    this.armed=true;this.selected=[...ids];this.deadline=null;this.settleAt=null;this.message='已开启 · 等待全部选定任务报告完成';this.log(`夜间联动已开启 · ${ids.length} 个任务`);
  }
  disarm(reason='已取消夜间联动',record=true) {const was=this.armed;this.armed=false;this.deadline=null;this.settleAt=null;this.message=reason;if(was&&record)this.log(reason);}
  action(action:'cancel'|'snooze',minutes=10){if(!this.deadline)return;if(action==='cancel')this.disarm('已取消本次 Agent 联动关机');else{if(![10,30,60].includes(minutes))throw new Error('延后时间无效');this.deadline=this.now()+minutes*60_000;this.message=`已延后 ${minutes} 分钟 · 持续检查任务状态`;this.log(this.message);}}
  tick(blocked=false){
    if(blocked){if(this.armed)this.disarm('计划已暂停或故障，夜间联动已解除');return;}
    for(const s of this.sessions.values())if(s.status!=='disconnected'&&(!this.alive(s.pid)||(s.provider==='deepseek'&&this.now()-s.seenAt>20_000))){s.status='disconnected';s.detail='接入进程退出或连接中断';this.changed(s.id);}
    if(!this.armed||this.issuing)return;
    const selected=this.selected.map(id=>this.sessions.get(id));
    if(selected.some(s=>!s||s.status==='failed'||s.status==='disconnected')){this.disarm('任务失败或失联，夜间联动已解除');return;}
    if(selected.some(s=>s!.status!=='completed'||s!.children.length)){this.settleAt=null;this.deadline=null;return;}
    if(this.settleAt===null){this.settleAt=this.now()+this.settleMs;this.message='全部任务已报告完成 · 正在观察是否继续工作';}
    if(this.now()<this.settleAt)return;
    if(this.deadline===null){this.deadline=this.now()+this.warningMinutes()*60_000;this.warningKey=`agent:${randomBytes(8).toString('hex')}`;this.message='全部任务已报告完成 · 即将关机';this.log('Agent 任务全部报告完成，进入关机提醒');this.notify();return;}
    if(this.now()>=this.deadline){this.issuing=true;this.armed=false;this.deadline=null;this.settleAt=null;this.message='已提交 Agent 联动关机';try{this.log(this.message);Promise.resolve(this.execute()).catch(e=>{this.message=`联动关机失败：${String(e)}`;this.log(this.message,true);}).finally(()=>{this.issuing=false;});}catch(e){this.issuing=false;this.message=`联动关机失败：${String(e)}`;this.log(this.message,true);}}
  }
}

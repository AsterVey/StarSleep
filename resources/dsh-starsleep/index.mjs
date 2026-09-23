import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
export const name='starsleep-night-watch';
export const inject=['systemPrompt'];
export function apply(ctx){
  const connectionPath=JSON.parse(fs.readFileSync(new URL('./connection-path.json',import.meta.url),'utf8')).path;
  const sessions=new Map();let queue=Promise.resolve(),disposed=false;
  const post=async(s,event,extra={})=>{
    try{if(disposed||!fs.existsSync(connectionPath))return {};const c=JSON.parse(fs.readFileSync(connectionPath,'utf8'));if(!Number.isInteger(c.port)||c.port<1||c.port>65535)return {};
      const response=await fetch(`http://127.0.0.1:${c.port}/event`,{method:'POST',headers:{Authorization:`Bearer ${c.token}`,'Content-Type':'application/json'},body:JSON.stringify({provider:'deepseek',event,sessionId:s.id,name:s.name,pid:process.pid,at:Date.now(),eventId:randomUUID(),...extra}),signal:AbortSignal.timeout(2000)});
      if(!response.ok)throw new Error('Bridge rejected event');return await response.json();
    }catch{try{fs.writeFileSync(path.join(path.dirname(connectionPath),'connection-fault.txt'),String(Date.now()));}catch{}return {};}
  };
  const send=(s,event,extra)=>{queue=queue.then(()=>post(s,event,extra));return queue;};
  ctx.on('agent/created',({agent})=>{const s={id:agent.session.id,name:path.basename(agent.session.header.cwd||'DeepSeek'),agent,message:''};sessions.set(s.id,s);});
  ctx.on('agent/pre-step',async(payload,next)=>{
    const s=sessions.get(payload.agent.session.id);
    let context='';
    if(s&&s.turn!==payload.turn){s.turn=payload.turn;s.message='';s.result='';const r=await send(s,'start',{turnId:String(s.turn)});context=r.context||'';}
    const decision=await next();
    // DSH assembles system sections before pre-step. Append the current turn's
    // context to the accepted messages, as its native hook plugins do.
    if(!context||decision.kind!=='enter')return decision;
    const message=Object.freeze({id:randomUUID(),role:'user',source:Object.freeze({kind:'plugin',plugin:name}),content:Object.freeze([Object.freeze({type:'text',text:context})])});
    return {...decision,messages:[...decision.messages,message]};
  });
  ctx.on('session/event',(session,event)=>{
    const s=sessions.get(session.id);if(!s)return;
    if(event.type==='assistant/message'){
      const content=event.data?.message?.content;s.message=typeof content==='string'?content:Array.isArray(content)?content.filter(p=>p.type==='text').map(p=>p.text).join('\n'):'';
    }
    if(event.type==='turn/end'){s.result=event.data?.reason?.kind;if(s.result!=='completed')void send(s,'failed');}
  });
  ctx.on('agent/status',({agent,status})=>{const s=sessions.get(agent.session.id);if(!s)return;if(status==='running'){void send(s,'running');return;}
    // Wait for the whole driver, then verify no queued work or another active agent remains.
    void agent.whenIdle().then(()=>{if(disposed)return;const busy=[...sessions.values()].some(x=>x.agent.status==='running'||x.agent.inbox.nextTurn.length||x.agent.inbox.nextStep.length);if(busy)return;
      for(const item of sessions.values())if(item.result==='completed')void send(item,'stop',{message:item.message.slice(-3900),turnId:String(item.turn)});
    });
  });
  ctx.on('agent/inbox/inserted',({agent})=>{const s=sessions.get(agent.session.id);if(s){s.result='';void send(s,'running');}});
  ctx.on('agent/disposed',({agent})=>{const s=sessions.get(agent.session.id);if(s){void send(s,'end');sessions.delete(s.id);}});
  const timer=setInterval(()=>{for(const s of sessions.values())void send(s,'heartbeat');},5000);timer.unref?.();
  ctx.on('dispose',()=>{clearInterval(timer);disposed=true;sessions.clear();});
}

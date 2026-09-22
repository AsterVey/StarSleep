import { useEffect } from 'react';
import type { RuntimeState } from './shared';
let context:AudioContext|undefined;
const nodes=new Set<OscillatorNode>();
let idle:ReturnType<typeof setTimeout>|undefined;
function getAudio(){context??=new AudioContext();void context.resume();return context;}
function note(ctx:AudioContext,frequency:number,at:number,volume:number,duration=.22){
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.frequency.value=frequency;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(Math.max(.00001,volume*.17),at+.008);gain.gain.exponentialRampToValueAtTime(.00001,at+duration);
  osc.connect(gain);gain.connect(ctx.destination);nodes.add(osc);osc.onended=()=>{nodes.delete(osc);osc.disconnect();gain.disconnect();};osc.start(at);osc.stop(at+duration+.015);return osc;
}
export function tone(type:'click'|'success'|'error',volume=.35){try{const ctx=getAudio();(type==='success'?[560,840]:type==='error'?[220,160]:[920]).forEach((f,i)=>note(ctx,f,ctx.currentTime+i*.12,volume,type==='click'?.055:.2));clearTimeout(idle);idle=setTimeout(()=>{if(!nodes.size)void context?.suspend();},900);}catch{}}
export function useAlarmAudio(runtime:RuntimeState){
  const key=runtime.alarms.map(a=>`${a.key}:${a.endsAt??a.at+60000}`).sort().join('|');
  useEffect(()=>{
    if(!runtime.alarms.length||runtime.storageError)return;
    const active:OscillatorNode[]=[];let timer:ReturnType<typeof setTimeout>|undefined;
    try{
      const ctx=getAudio(),end=Math.max(...runtime.alarms.map(a=>a.endsAt??a.at+60000));
      const remaining=Math.min(60000,Math.max(0,end-Date.now())),start=ctx.currentTime;
      for(let ms=0;ms+520<remaining;ms+=2300)[660,880,660].forEach((f,i)=>active.push(note(ctx,f,start+ms/1000+i*.13,runtime.settings.volume)));
      // AudioContext deadlines remain effective when renderer timers are throttled.
      timer=setTimeout(()=>{if(!nodes.size)void ctx.suspend();},remaining+100);
    }catch{}
    return()=>{clearTimeout(timer);for(const osc of active)try{osc.stop();}catch{};};
  },[key,runtime.settings.volume,runtime.storageError]);
}

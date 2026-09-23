export class ScenePolicy {
 tier=0;frames=0;draws=0;fps=0;idle=false;private started=0;private bad=0;
 constructor(public quality:'adaptive'|'low'|'static'='adaptive'){this.tier=quality==='static'?4:quality==='low'?2:0;}
 sample(now:number,lastInput:number){
  this.idle=now-lastInput>=15000;this.frames++;this.draws++;
  if(!this.started)this.started=now;
  if(now-this.started>=3000){this.fps=this.frames*1000/(now-this.started);const target=this.idle?24:60;
   if(this.quality==='adaptive'){this.bad=this.fps<target*.72?this.bad+1:0;if(this.bad>=2){this.tier=Math.min(4,this.tier+1);this.bad=0;}}
   this.frames=0;this.started=now;
  }
 }
 resume(){this.started=0;this.frames=0;this.bad=0;}
}

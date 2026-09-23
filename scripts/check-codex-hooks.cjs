// Read-only discovery through the installed Codex app-server. No turns or trust changes.
const {spawn}=require('node:child_process');
const readline=require('node:readline');
const path=require('node:path');
const executable=process.env.STARSLEEP_CODEX_EXE;
if(!executable)throw new Error('Set STARSLEEP_CODEX_EXE to the installed codex.exe');
const child=spawn(executable,['app-server'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
const timer=setTimeout(()=>{console.error('Codex hook discovery timed out');process.exitCode=1;child.kill();},25000);
const lines=readline.createInterface({input:child.stdout});
const send=value=>child.stdin.write(JSON.stringify(value)+'\n');
child.stderr.on('data',()=>{}); // Do not print unrelated client configuration or telemetry.
child.on('error',error=>{console.error(error.message);process.exitCode=1;clearTimeout(timer);});
child.on('exit',()=>clearTimeout(timer));
lines.on('line',line=>{
  let value;try{value=JSON.parse(line);}catch{return;}
  if(value.error){console.error(JSON.stringify(value.error));process.exitCode=1;child.kill();return;}
  if(value.id===1){send({method:'initialized'});send({id:2,method:'hooks/list',params:{cwds:[path.resolve(process.cwd())]}});}
  if(value.id===2){
    const entries=value.result.data.map(entry=>({cwd:entry.cwd,errors:entry.errors,warnings:entry.warnings,hooks:entry.hooks.filter(h=>h.handlerType==='command'&&h.command.includes('agent-bridge')&&h.command.includes('agent-hook.ps1')).map(h=>({event:h.eventName,sourcePath:h.sourcePath,enabled:h.enabled,trust:h.trustStatus,label:h.statusMessage}))}));
    console.log(JSON.stringify(entries,null,2));
    if(entries.some(e=>e.errors.length)||!entries.some(e=>e.hooks.length===9))process.exitCode=1;
    clearTimeout(timer);child.kill();
  }
});
send({id:1,method:'initialize',params:{clientInfo:{name:'starsleep_hook_check',version:'1.4.1',title:'StarSleep hook discovery'},capabilities:{experimentalApi:true,requestAttestation:false}}});

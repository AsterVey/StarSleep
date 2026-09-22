const {_electron:electron}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),resultFile=path.join(root,'artifacts/v13/performance.json'),results=process.argv.includes('--resume')&&fs.existsSync(resultFile)?JSON.parse(fs.readFileSync(resultFile,'utf8')).results:[];let app;
(async()=>{
 for(const version of ['1.2.0','1.3.0'])for(const count of [0,1,50,500]){
  if(results.some(r=>r.version===version&&r.count===count))continue;
  const data=path.join(root,'.qa-data',`perf-${version}-${count}-${Date.now()}`);fs.mkdirSync(data,{recursive:true});
  const later=new Date(Date.now()+21600000),time=`${String(later.getHours()).padStart(2,'0')}:${String(later.getMinutes()).padStart(2,'0')}`;
  fs.writeFileSync(path.join(data,'schedules.json'),JSON.stringify({version:2,paused:false,plans:Array.from({length:count},(_,i)=>({id:`sample-${i}`,revision:1,createdAt:Date.now()+i,name:`夜间任务 ${String(i).padStart(3,'0')}`,kind:i%2?'alarm':'shutdown',repeat:'daily',date:'',time,weekdays:[],enabled:true})),handled:{},overrides:{},logs:[],settings:{sound:false,volume:0,reducedMotion:false}}));
  const env={...process.env,STARSLEEP_QA_DATA:data};delete env.ELECTRON_RUN_AS_NODE;
  app=await electron.launch({...(version==='1.2.0'?{executablePath:path.join(root,'release/v1.2.0/win-unpacked/星眠.exe'),args:['--safe-mode']}:{args:[root,'--safe-mode']}),env,timeout:60000});
  const page=await app.firstWindow();await page.getByRole('button',{name:'新建计划',exact:true}).waitFor();
  assert.equal((await page.evaluate(()=>window.starSleep.snapshot())).plans.length,count);
  await app.evaluate(({BrowserWindow,app})=>{const fs=process.getBuiltinModule('fs'),win=BrowserWindow.getAllWindows()[0],send=win.webContents.send.bind(win.webContents),sync=fs.fsyncSync;globalThis.perf={state:0,clock:0,sync:0};win.webContents.send=(name,...args)=>{if(name==='state')globalThis.perf.state++;if(name==='clock')globalThis.perf.clock++;if(name==='agenda')globalThis.perf.agenda++;if(name==='experience')globalThis.perf.experience++;return send(name,...args);};fs.fsyncSync=function(...args){globalThis.perf.sync++;return sync.apply(this,args);};app.getAppMetrics();});
  await page.waitForTimeout(600);await app.evaluate(()=>{globalThis.perf={state:0,clock:0,sync:0,agenda:0,experience:0};});await page.waitForTimeout(3200);const visible=await app.evaluate(({app})=>({...globalThis.perf,metrics:app.getAppMetrics().map(p=>({type:p.type,cpu:p.cpu.percentCPUUsage,memoryKB:p.memory.workingSetSize}))}));
  let mini=null,agenda=null;if(version==='1.3.0'){
    const pid=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.getOSProcessId());
    await page.evaluate(()=>window.starSleep.setMode('mini'));await page.waitForTimeout(600);await app.evaluate(()=>{globalThis.perf={state:0,clock:0,sync:0,agenda:0,experience:0};});await page.waitForTimeout(3200);
    mini=await app.evaluate(({BrowserWindow,app})=>({...globalThis.perf,windows:BrowserWindow.getAllWindows().length,pid:BrowserWindow.getAllWindows()[0].webContents.getOSProcessId(),metrics:app.getAppMetrics().map(p=>({type:p.type,cpu:p.cpu.percentCPUUsage,memoryKB:p.memory.workingSetSize}))}));assert.equal(mini.windows,1);assert.equal(mini.pid,pid);assert.equal(mini.state,0);assert.equal(mini.sync,0);assert.equal(await page.evaluate(()=>document.body.classList.contains('motion-off')),true);
    await page.evaluate(()=>window.starSleep.setMode('full'));await page.getByRole('button',{name:'未来七天',exact:true}).click();await page.waitForTimeout(600);if(count){const a=await page.evaluate(()=>window.starSleep.agenda());const index=a.days.findIndex(d=>d.occurrences.length===count);assert.ok(index>=0);await page.locator('.agenda-days button').nth(index).click();assert.equal(await page.locator('.agenda-event').count(),Math.min(50,count));if(count>50){await page.getByRole('navigation',{name:'预览分页'}).getByRole('button',{name:'下一页'}).click();assert.equal(await page.locator('.agenda-event').count(),50);}}await app.evaluate(()=>{globalThis.perf={state:0,clock:0,sync:0,agenda:0,experience:0};});await page.waitForTimeout(3200);agenda=await app.evaluate(()=>({...globalThis.perf}));assert.equal(agenda.agenda,0);assert.equal(agenda.sync,0);await page.getByRole('button',{name:'列表',exact:true}).click();
  }
  await app.evaluate(({BrowserWindow})=>{BrowserWindow.getAllWindows()[0].hide();globalThis.perf={state:0,clock:0,sync:0};});await new Promise(r=>setTimeout(r,3200));
  const hidden=await app.evaluate(({app})=>({...globalThis.perf,metrics:app.getAppMetrics().map(p=>({type:p.type,cpu:p.cpu.percentCPUUsage,memoryKB:p.memory.workingSetSize}))}));
  const motionStopped=await page.evaluate(()=>document.body.classList.contains('motion-off'));
  assert.equal(hidden.state,0);assert.equal(hidden.sync,0);assert.equal(motionStopped,true);if(version==='1.3.0'){assert.equal(visible.state,0);assert.ok(visible.clock>=2);assert.equal(visible.sync,0);}
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].show());
  let filterMilliseconds=null;if(count){const begin=performance.now();await page.getByLabel('搜索计划').fill('000');await page.waitForFunction(()=>document.querySelectorAll('.plan-row').length===1);filterMilliseconds=Math.round(performance.now()-begin);}
  results.push({version,count,sampleMilliseconds:3200,visible,mini,agenda,hidden,motionStopped,filterMilliseconds});fs.writeFileSync(resultFile,JSON.stringify({results,notes:'Same machine, sequential 3.2 second samples; CPU snapshots are observations, not guarantees.'},null,2));console.log('PASS',version,count,'plans','visible full states:',visible.state,'disk sync:',visible.sync);await app.close();app=null;
 }
 fs.writeFileSync(path.join(root,'artifacts/v13/performance.json'),JSON.stringify({results,notes:'Same machine, sequential 3.2 second samples; CPU snapshots are observations, not guarantees.'},null,2));
})().catch(async e=>{console.error(e);if(app)await app.close().catch(()=>{});process.exitCode=1;});

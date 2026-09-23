const {_electron:electron}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),data=path.join(root,'.qa-data','v15-'+Date.now()),out=process.env.STARSLEEP_QA_OUT||path.join(root,'artifacts/v15');
fs.mkdirSync(data,{recursive:true});fs.mkdirSync(out,{recursive:true});
const env={...process.env,STARSLEEP_QA_DATA:data};delete env.ELECTRON_RUN_AS_NODE;
let app,p;const results=[],errors=[],notes='保存项目文件\n检查 Agent 构建结果，确认后休息。';
const check=async(name,fn)=>{await fn();results.push(name);console.log('PASS',name);};
const state=()=>p.evaluate(()=>window.starSleep.snapshot());
async function shot(name){const image=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].capturePage()).toPNG().toString('base64'));fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(image,'base64'));}
async function launch(){app=await electron.launch({...(process.env.STARSLEEP_QA_EXE?{executablePath:process.env.STARSLEEP_QA_EXE}:{}),args:[...(process.env.STARSLEEP_QA_EXE?[]:[root]),'--safe-mode'],env,timeout:60000});p=await app.firstWindow();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));await p.getByRole('button',{name:'新建计划',exact:true}).waitFor();await p.evaluate(async()=>{const s=await window.starSleep.snapshot();await window.starSleep.settings({...s.settings,sound:false,volume:0});});}
(async()=>{try{
 await launch();
 await check('notes can be edited, searched, copied, templated and exported through desktop controls',async()=>{
  await p.getByRole('button',{name:'新建计划',exact:true}).click();await p.getByLabel('计划名称',{exact:true}).fill('夜间检查提醒');await p.getByLabel('到点动作').selectOption('alarm');await p.getByLabel('计划备注',{exact:true}).fill(notes);await p.getByRole('button',{name:'保存计划',exact:true}).click();await p.getByRole('dialog').waitFor({state:'hidden'});assert.equal((await state()).plans[0].notes,notes);
  await p.keyboard.press('Control+f');await p.getByLabel('搜索计划').fill('构建结果');assert.equal(await p.locator('.plan-row').count(),1);assert.equal(await p.locator('.plan-notes').innerText(),notes);await p.getByLabel('搜索计划').fill('');
  await p.getByRole('button',{name:'复制夜间检查提醒',exact:true}).click();assert.equal(await p.getByLabel('计划备注',{exact:true}).inputValue(),notes);await p.getByRole('button',{name:'保存计划',exact:true}).click();await p.getByRole('dialog').waitFor({state:'hidden'});assert.equal((await state()).plans[1].enabled,false);
  await p.getByRole('button',{name:'编辑夜间检查提醒',exact:true}).click();await p.getByRole('button',{name:'存为常用模板',exact:true}).click();await p.getByRole('button',{name:'保存模板',exact:true}).click();await p.getByRole('dialog',{name:'存为常用模板',exact:true}).waitFor({state:'hidden'});assert.equal((await p.evaluate(()=>window.starSleep.experience())).presets[0].notes,notes);await p.keyboard.press('Escape');
  const file=path.join(data,'export.json');await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},file);assert.equal(await p.evaluate(()=>window.starSleep.exportPlans()),true);assert.equal(JSON.parse(fs.readFileSync(file)).plans[0].notes,notes);
 });
 let deadline;
 await check('temporary pause UI persists deadline and disarms Agent without changing enabled states',async()=>{
  await p.evaluate(()=>window.starSleep.agentDemo());assert.equal((await p.evaluate(()=>window.starSleep.integrations())).night.armed,true);
  await p.getByRole('button',{name:'临时暂停',exact:true}).click();await p.getByRole('button',{name:'15 分钟',exact:true}).click();await p.getByRole('button',{name:'确认临时暂停',exact:true}).click();await p.getByRole('dialog').waitFor({state:'hidden'});const s=await state();deadline=s.pauseUntil;assert.ok(deadline>Date.now()+890000&&deadline<=Date.now()+900000);assert.equal(s.paused,true);assert.deepEqual(s.plans.map(x=>x.enabled),[true,false]);assert.equal((await p.evaluate(()=>window.starSleep.integrations())).night.armed,false);
  await app.evaluate(({Tray})=>{const original=Tray.prototype.setContextMenu;Tray.prototype.setContextMenu=function(menu){globalThis.qaMenu=menu;return original.call(this,menu);};});await p.evaluate(()=>window.starSleep.pauseFor({minutes:30}));await app.evaluate(()=>{const item=globalThis.qaMenu.items.find(i=>i.submenu?.items.some(s=>s.label==='暂停 60 分钟'));if(!item)throw Error('Temporary pause submenu missing');item.submenu.items.find(i=>i.label==='暂停 60 分钟').click();});deadline=(await state()).pauseUntil;assert.ok(deadline>Date.now()+3590000);
 });
 await app.close();await launch();
 await check('restart preserves absolute resume; hidden main process resumes and never rearms Agent',async()=>{
  assert.equal((await state()).pauseUntil,deadline);assert.equal((await state()).plans[0].notes,notes);
  await p.evaluate(()=>window.starSleep.pauseFor({until:Date.now()+1800}));await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].hide());for(let i=0;i<25&&JSON.parse(fs.readFileSync(path.join(data,'schedules.json'))).paused;i++)await new Promise(r=>setTimeout(r,200));assert.equal(JSON.parse(fs.readFileSync(path.join(data,'schedules.json'))).paused,false);await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].show());assert.equal((await p.evaluate(()=>window.starSleep.integrations())).night.armed,false);assert.equal((await state()).pauseUntil,undefined);
  await p.getByRole('button',{name:'临时暂停',exact:true}).click();await p.getByRole('button',{name:'指定恢复时间',exact:true}).click();await p.getByLabel('恢复日期与时间').fill('2000-01-01T00:00');assert.equal(await p.getByRole('button',{name:'确认临时暂停',exact:true}).isDisabled(),true);await p.getByRole('button',{name:'一直暂停',exact:true}).click();assert.equal((await state()).paused,true);assert.equal((await state()).pauseUntil,undefined);await p.evaluate(()=>window.starSleep.pause(false));
 });
 await app.close();
 const file=path.join(data,'schedules.json'),saved=JSON.parse(fs.readFileSync(file)),at=Date.now()+4500,d=new Date(at),date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 saved.plans.push({id:'notes-alarm',revision:1,createdAt:Date.now(),name:'保存工作提醒',notes,kind:'alarm',repeat:'once',date,time:`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,weekdays:[],enabled:true,exactAt:at});fs.writeFileSync(file,JSON.stringify(saved));await launch();
 await check('actual alarm occurrence displays multiline notes and pause clears hidden reminder',async()=>{
  await p.getByRole('dialog',{name:'到时提醒',exact:true}).waitFor();assert.equal(await p.locator('.reminder-notes').innerText(),notes);await shot('reminder');await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].hide());await p.evaluate(()=>window.starSleep.pauseFor({minutes:15}));assert.equal((await state()).alarms.length,0);await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].show());await p.getByRole('dialog').waitFor({state:'hidden'});
 });
 await check('pause and notes controls stay reachable at desktop and 100/125/150/200 percent compact zoom',async()=>{
  for(const [name,w,h,zoom]of [['desktop',1280,820,1],['compact',900,650,1],['zoom125',900,650,1.25],['zoom150',900,650,1.5],['zoom200',900,650,2]]){
   await app.evaluate(({BrowserWindow},{w,h,zoom})=>{const win=BrowserWindow.getAllWindows()[0];win.setSize(w,h);win.webContents.setZoomFactor(zoom);},{w,h,zoom});await p.getByRole('button',{name:'临时暂停',exact:true}).click();await p.waitForTimeout(120);await shot(name+'-pause');const action=p.getByRole('button',{name:'更新恢复时间',exact:true});await action.scrollIntoViewIfNeeded();assert.equal(await action.evaluate(e=>{const r=e.getBoundingClientRect(),v=e.closest('dialog').getBoundingClientRect();return r.top>=v.top&&r.bottom<=v.bottom&&r.right<=innerWidth;}),true);await action.focus();assert.equal(await action.evaluate(e=>document.activeElement===e),true);await shot(name+'-actions');await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
   if(name==='desktop'||name==='zoom200'){await p.getByRole('button',{name:'编辑夜间检查提醒',exact:true}).click();await p.getByLabel('计划备注',{exact:true}).scrollIntoViewIfNeeded();await shot(name+'-notes');await p.getByRole('button',{name:'保存计划',exact:true}).scrollIntoViewIfNeeded();await p.keyboard.press('Escape');}
  }
 });
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors,safe:true,executable:process.env.STARSLEEP_QA_EXE||'development Electron',data},null,2));
 }finally{if(app)await app.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

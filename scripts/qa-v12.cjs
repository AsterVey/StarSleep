const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts',process.env.STARSLEEP_QA_OUTPUT||'v12'),data=path.join(root,'.qa-data','v12-'+Date.now());
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(data,{recursive:true});
const env={...process.env,STARSLEEP_QA_DATA:data};delete env.ELECTRON_RUN_AS_NODE;
const results=[],errors=[];let app,page;
const plan=(name,kind='shutdown')=>({name,kind,repeat:'daily',date:'',time:'23:45',weekdays:[],enabled:true});
const state=()=>page.evaluate(()=>window.starSleep.snapshot());
const check=async(name,fn)=>{await fn();results.push({name,passed:true});console.log('PASS',name);};
async function launch(scale=1){app=await electron.launch({args:[root,'--safe-mode',`--force-device-scale-factor=${scale}`],env,timeout:60000});page=await app.firstWindow();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.getByRole('button',{name:'新建计划',exact:true}).waitFor();await page.evaluate(async()=>{const s=await window.starSleep.snapshot();await window.starSleep.settings({...s.settings,sound:false,volume:0});});}
async function shot(name){await page.screenshot({path:path.join(out,name+'.png')});}
async function closeModal(){await page.getByRole('button',{name:'关闭面板',exact:true}).click();}
(async()=>{
 await launch();await shot('01-empty');
 await check('isolated preload and safe shutdown adapter',async()=>{assert.equal(await page.evaluate(()=>typeof window.require),'undefined');assert.equal((await state()).safeMode,true);});
 await check('editor inline validation, weekly creation and keyboard shortcuts',async()=>{
  await page.keyboard.press('Control+n');await page.getByLabel('计划名称',{exact:true}).fill('');await page.getByRole('button',{name:'保存计划',exact:true}).click();await page.getByText('请输入 1–48 个字的名称',{exact:true}).waitFor();
  await page.getByLabel('计划名称',{exact:true}).fill('夜间 Agent 构建完成后休息');await page.getByLabel('执行时间',{exact:true}).fill('23:45');await page.getByLabel('重复方式',{exact:true}).selectOption('weekly');
  await shot('02-editor');await page.getByRole('button',{name:'保存计划',exact:true}).click();assert.equal((await state()).plans[0].repeat,'weekly');
  await page.keyboard.press('Control+f');assert.equal(await page.getByLabel('搜索计划').evaluate(e=>e===document.activeElement),true);
 });
 await check('dirty editor requires explicit discard and restores trigger focus',async()=>{
  const button=page.getByRole('button',{name:'新建计划',exact:true});await button.click();await page.getByLabel('计划名称',{exact:true}).fill('未保存内容');await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'放弃未保存的修改？'}).waitFor();await page.getByRole('button',{name:'继续编辑'}).click();assert.equal(await page.getByLabel('计划名称',{exact:true}).inputValue(),'未保存内容');await page.keyboard.press('Escape');await page.getByRole('button',{name:'放弃修改'}).click();await page.waitForFunction(()=>!document.querySelector('dialog[open]'),null,{polling:100});assert.equal(await button.evaluate(e=>e===document.activeElement),true);
 });
 await check('quick countdown exact deadline, edit preservation and duplicate disabled',async()=>{
  await page.getByRole('button',{name:'快捷计时',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'2 小时',exact:true}).click();await shot('03-quick');await page.getByRole('button',{name:'开始计时',exact:true}).click();let s=await state();const p=s.plans.find(p=>p.name==='120 分钟后关机');assert.ok(Math.abs(p.exactAt-s.now-7200000)<3000);
  await page.getByRole('button',{name:'编辑120 分钟后关机',exact:true}).click();await page.getByLabel('计划名称',{exact:true}).fill('今晚再工作两小时');await page.getByRole('button',{name:'保存计划',exact:true}).click();assert.equal((await state()).plans.find(x=>x.id===p.id).exactAt,p.exactAt);
  await page.getByRole('button',{name:'复制今晚再工作两小时',exact:true}).click();assert.equal(await page.getByRole('switch',{name:'启用这个计划'}).getAttribute('aria-checked'),'false');await page.getByRole('button',{name:'保存计划',exact:true}).click();s=await state();const copy=s.plans.find(x=>x.name.includes('副本'));assert.equal(copy.enabled,false);assert.equal(copy.exactAt,undefined);assert.notEqual(copy.id,p.id);
 });
 await page.evaluate(p=>window.starSleep.save(p),plan('站起来活动，给自己留一点时间','alarm'));
 await check('search, composed filters, sort and selection reset',async()=>{
  await page.getByLabel('搜索计划').fill('副本');assert.equal(await page.locator('.plan-row').count(),1);await page.getByLabel('全选当前筛选结果').check();await page.getByLabel('搜索计划').fill('');assert.equal(await page.getByLabel('全选当前筛选结果').isChecked(),false);
  await page.getByLabel('计划状态').selectOption('disabled');assert.equal(await page.locator('.plan-row').count(),1);await page.getByRole('button',{name:'闹钟提醒',exact:true}).click();assert.equal(await page.locator('.plan-row').count(),0);await page.getByRole('button',{name:'重置筛选'}).click();await page.getByLabel('排序方式').selectOption('name');assert.equal(await page.locator('.plan-row').count(),4);await page.getByLabel('排序方式').selectOption('next');
 });
 await check('batch disable and enable persist the selected plans',async()=>{
  await page.getByLabel('搜索计划').fill('Agent');await page.getByLabel('全选当前筛选结果').check();await page.getByRole('button',{name:'批量停用',exact:true}).click();assert.equal((await state()).plans.find(p=>p.name.includes('Agent')).enabled,false);await page.getByLabel('全选当前筛选结果').check();await page.getByRole('button',{name:'批量启用',exact:true}).click();assert.equal((await state()).plans.find(p=>p.name.includes('Agent')).enabled,true);await page.getByLabel('搜索计划').fill('');
 });
 await check('skip once confirms exact date and removes only its occurrence',async()=>{
  const s=await state(),p=s.plans.find(p=>p.name==='今晚再工作两小时');await page.getByRole('button',{name:'跳过今晚再工作两小时',exact:true}).click();await page.getByRole('dialog',{name:'跳过下一次执行？'}).waitFor();await shot('04-skip');await page.getByRole('button',{name:'确认跳过'}).click();const after=(await state()).plans.find(x=>x.id===p.id);assert.equal(after.enabled,true);assert.equal(after.outcome,'已跳过');assert.equal(after.nextAt,null);
 });
 await check('cleanup confirmation removes only ended single plans',async()=>{
  await page.getByRole('button',{name:'清理已结束',exact:true}).click();await page.getByRole('button',{name:'保留计划',exact:true}).click();assert.equal((await state()).plans.length,4);await page.getByRole('button',{name:'清理已结束',exact:true}).click();await page.getByRole('button',{name:'删除计划',exact:true}).click();assert.equal((await state()).plans.length,3);
 });
 await check('templates prefill without creating a task',async()=>{
  const before=(await state()).plans.length;await page.locator('.templates summary').click();await page.getByRole('button',{name:'工作日 23:30 关机',exact:true}).click();assert.equal(await page.getByLabel('执行时间',{exact:true}).inputValue(),'23:30');assert.equal(await page.getByLabel('重复方式',{exact:true}).inputValue(),'weekly');await page.keyboard.press('Escape');assert.equal((await state()).plans.length,before);await page.getByRole('button',{name:'30 分钟后提醒',exact:true}).click();assert.equal(await page.getByLabel('到点动作',{exact:true}).inputValue(),'alarm');await page.keyboard.press('Escape');await page.locator('.templates summary').click();
 });
 await check('settings groups and slider preview avoid per-step writes',async()=>{
  await app.evaluate(()=>{const fs=process.getBuiltinModule('fs');const original=fs.fsyncSync;globalThis.syncCount=0;fs.fsyncSync=function(...args){globalThis.syncCount++;return original.apply(this,args);};});
  await page.getByRole('button',{name:'设置',exact:true}).click();const before=await app.evaluate(()=>globalThis.syncCount);
  await page.locator('#volume').evaluate(e=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;for(const n of [.1,.2,.3,.4]){setter.call(e,String(n));e.dispatchEvent(new Event('input',{bubbles:true}));}});assert.equal(await app.evaluate(()=>globalThis.syncCount),before);
  await page.locator('#volume').dispatchEvent('pointerup');await page.waitForTimeout(120);assert.equal(await app.evaluate(()=>globalThis.syncCount),before+1);
  await page.getByLabel('关机提前提醒',{exact:true}).selectOption('10');await page.getByLabel('闹钟响铃时长',{exact:true}).selectOption('15');await shot('05-settings');
  await page.getByRole('button',{name:'外观',exact:true}).click();await page.getByRole('switch',{name:'减少动态效果'}).click();assert.equal((await state()).settings.reducedMotion,true);await page.getByRole('switch',{name:'减少动态效果'}).click();
  await page.getByRole('button',{name:'关于',exact:true}).click();await page.getByRole('button',{name:'AsterVey',exact:true}).waitFor();await shot('06-about');await closeModal();
 });
 await check('import preview explains skips; native file paths stay in main process',async()=>{
  const file=path.join(data,'import.json'),exported=path.join(data,'export.json');const s=await state();fs.writeFileSync(file,JSON.stringify({format:'starsleep-plans',version:1,plans:[s.plans[0],plan('导入的工作计划'),{...plan('过期条目'),repeat:'once',date:'2000-01-01'}]}));
  await app.evaluate(({dialog},{file,exported})=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});dialog.showSaveDialog=async()=>({canceled:false,filePath:exported});},{file,exported});
  await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('button',{name:'数据管理',exact:true}).click();await page.getByRole('button',{name:'导入计划',exact:true}).click();await page.getByRole('dialog',{name:'导入前，核对一下'}).waitFor();await page.getByText('单次时间已过期',{exact:true}).waitFor();await shot('07-import');await page.getByRole('button',{name:'确认导入 1 条',exact:true}).click();assert.equal((await state()).plans.find(p=>p.name==='导入的工作计划').enabled,false);
  await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('button',{name:'数据管理',exact:true}).click();await page.getByRole('button',{name:'导出计划',exact:true}).click();await page.getByText('计划已导出',{exact:true}).waitFor();assert.equal(JSON.parse(fs.readFileSync(exported,'utf8')).plans.length,4);await closeModal();
  fs.writeFileSync(file,'invalid');assert.equal(await page.evaluate(async()=>{try{await window.starSleep.previewImport();return false;}catch{return true;}}),true);assert.equal((await state()).plans.length,4);
 });
 await check('logs search, date and filtered export',async()=>{
  const file=path.join(data,'records.txt');await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},file);await page.getByRole('button',{name:'执行记录',exact:true}).click();await page.getByLabel('搜索记录').fill('跳过');await shot('08-records');await page.getByRole('button',{name:'导出当前记录'}).click();await page.getByText('记录已导出',{exact:true}).waitFor();const text=fs.readFileSync(file,'utf8');assert.match(text,/已跳过/);assert.doesNotMatch(text,/已创建/);await closeModal();
 });
 await check('demo cancellation, immutable settings deadline and global pause',async()=>{
  await page.getByRole('button',{name:'演示提醒',exact:true}).click();await page.getByRole('dialog',{name:'到时提醒'}).waitFor();await shot('09-reminder');await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog',{name:'到时提醒'}).count(),1);await page.getByRole('button',{name:'结束演示'}).click();
  await page.evaluate(()=>window.starSleep.quick({kind:'shutdown',minutes:1}));await page.getByRole('button',{name:'暂停全部计划',exact:true}).click();assert.equal((await state()).paused,true);assert.equal(await page.getByRole('dialog',{name:'到时提醒'}).count(),0);await shot('10-paused');
  await page.evaluate(async()=>{const s=await window.starSleep.snapshot();await window.starSleep.remove(s.plans.find(p=>p.name==='1 分钟后关机').id);});
 });
 await check('pause persists after restart and tray resumes plus opens quick timer',async()=>{
  await app.close();app=null;await launch();assert.equal((await state()).paused,true);
  await app.evaluate(({Menu})=>{const build=Menu.buildFromTemplate;Menu.buildFromTemplate=function(items){globalThis.trayItems=items;return build.call(this,items);};});await page.getByRole('button',{name:'恢复计划',exact:true}).click();
  await app.evaluate(()=>globalThis.trayItems.find(x=>x.label==='暂停全部计划').click());assert.equal((await state()).paused,true);await app.evaluate(()=>globalThis.trayItems.find(x=>x.label==='恢复计划').click());assert.equal((await state()).paused,false);await app.evaluate(()=>globalThis.trayItems.find(x=>x.label==='快捷计时').click());await page.getByRole('dialog',{name:'快捷计时'}).waitFor();await page.keyboard.press('Escape');
 });
 await check('alarm audio stops at fixed deadline while hidden; no full state traffic',async()=>{
  await page.evaluate(async()=>{const s=await window.starSleep.snapshot();await window.starSleep.settings({...s.settings,alarmSeconds:15,volume:0});const create=AudioContext.prototype.createOscillator;window.audioActive=0;AudioContext.prototype.createOscillator=function(){const osc=create.call(this);window.audioActive++;osc.addEventListener('ended',()=>window.audioActive--);return osc;};window.runtimeEvents=[];window.starSleep.runtime(r=>window.runtimeEvents.push(r));await window.starSleep.demo('alarm');});
  await page.getByRole('dialog',{name:'到时提醒'}).waitFor();const deadline=(await state()).alarms[0].endsAt;assert.ok(await page.evaluate(()=>window.audioActive)>0);
  await app.evaluate(({BrowserWindow})=>{const win=BrowserWindow.getAllWindows()[0],send=win.webContents.send.bind(win.webContents);globalThis.stateEvents=0;win.webContents.send=(channel,...args)=>{if(channel==='state')globalThis.stateEvents++;return send(channel,...args);};win.hide();});
  await page.waitForFunction(()=>window.runtimeEvents.some(r=>r.alarms.length===0),null,{polling:100,timeout:19000});assert.equal(await app.evaluate(()=>globalThis.stateEvents),0);await page.waitForFunction(()=>window.audioActive===0,null,{polling:100,timeout:3000});assert.ok(Date.now()-deadline<4000);assert.equal(await page.evaluate(()=>document.body.classList.contains('motion-off')),true);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].show());await page.waitForFunction(()=>!document.querySelector('dialog[open]'),null,{polling:100});
 });
 await check('minimized alarm stops immediately when paused from tray',async()=>{
  await page.evaluate(()=>window.starSleep.demo('alarm'));await page.getByRole('dialog',{name:'到时提醒'}).waitFor();await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].minimize());await app.evaluate(()=>globalThis.trayItems.find(x=>x.label==='暂停全部计划').click());await page.waitForFunction(()=>window.audioActive===0,null,{polling:100,timeout:3000});assert.equal((await state()).alarms.length,0);await app.evaluate(({BrowserWindow})=>{const win=BrowserWindow.getAllWindows()[0];win.restore();win.show();});await page.evaluate(()=>window.starSleep.pause(false));
 });
 await page.waitForTimeout(4600);await shot('11-console');
 await check('minimum window, long names and keyboard remain reachable',async()=>{
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(900,650));await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('footer').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight+1),true);
  assert.equal(await page.locator('.workspace').evaluate(e=>e.scrollHeight<=e.clientHeight+1),true,'compact workspace must not require outer scrolling');
  assert.equal(await page.locator('.plan-note').evaluate(e=>e.getBoundingClientRect().bottom<=e.closest('.workspace').getBoundingClientRect().bottom),true);
  assert.equal(await page.locator('.row-actions').first().evaluate(e=>e.getBoundingClientRect().bottom<=e.closest('.plan-list').getBoundingClientRect().bottom),true,'first plan actions must be visible');
  assert.equal(await page.locator('.safe-indicator').isVisible(),true);await page.getByRole('button',{name:'新建计划',exact:true}).scrollIntoViewIfNeeded();await shot('12-minimum');await page.keyboard.press('Control+f');assert.equal(await page.getByLabel('搜索计划').evaluate(e=>e===document.activeElement),true);
 });
 await check('hidden main timer reaches shutdown adapter in safe mode',async()=>{
  const started=Date.now();await page.evaluate(()=>window.starSleep.quick({kind:'shutdown',minutes:1}));await page.getByRole('dialog',{name:'到时提醒'}).waitFor();await page.evaluate(()=>window.starSleep.window('hide'));
  let reached=false;while(Date.now()-started<70000){const snapshot=await state();reached=snapshot.logs.some(l=>l.at>=started&&l.text.includes('已拦截实际关机'));if(reached)break;await page.waitForTimeout(1000);}
  assert.equal(reached,true,'must observe the safe executor after the actual deadline');assert.ok(Date.now()-started>=59000);assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isVisible()),false);await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].show());
 });
 await check('explicit exit stops process and preserves plans',async()=>{const closed=app.waitForEvent('close');await page.evaluate(()=>window.starSleep.window('quit'));await closed;app=null;assert.ok(JSON.parse(fs.readFileSync(path.join(data,'schedules.json'),'utf8')).plans.length>0);});
 for(const scale of [1.25,1.5,2])await check(`layout and focus at ${scale*100}% scale`,async()=>{await launch(scale);await app.evaluate(({BrowserWindow})=>{const win=BrowserWindow.getAllWindows()[0];win.setSize(1000,700);win.focus();});await page.bringToFront();await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.getByRole('button',{name:'快捷计时',exact:true}).press('Enter');await page.getByLabel('自定义分钟').waitFor();await page.keyboard.press('Escape');await shot(`scale-${scale}`);await app.close();app=null;});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'qa-results.json'),JSON.stringify({results,errors,actualShutdownTested:false},null,2));console.log('Completed',results.length,'desktop checks');
})().catch(async error=>{console.error(error);if(app){try{await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].show());await shot('failure');}catch{}await app.close().catch(()=>{});}fs.writeFileSync(path.join(out,'qa-results.json'),JSON.stringify({results,errors,failure:String(error)},null,2));process.exitCode=1;});

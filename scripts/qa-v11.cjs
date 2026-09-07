const {_electron:electron}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts');
const results=[];let app;
async function check(name,fn){await fn();results.push({name,passed:true});console.log('PASS',name);}
const plan=(name)=>({name,kind:'shutdown',repeat:'daily',date:'',time:'23:45',weekdays:[],enabled:true});
(async()=>{
 const data=path.join(root,'.qa-data','v11-'+Date.now());fs.mkdirSync(data,{recursive:true});
 const env={...process.env,STARSLEEP_QA_DATA:data};delete env.ELECTRON_RUN_AS_NODE;
 app=await electron.launch({args:[root,'--safe-mode'],env,timeout:60000});let page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.getByRole('button',{name:'快捷计时',exact:true}).waitFor();
 await check('quick editor creates exact deadline and is editable',async()=>{
   await page.getByRole('button',{name:'快捷计时',exact:true}).click();
   await page.getByRole('button',{name:'2 小时',exact:true}).click();
   assert.equal(await page.getByLabel('自定义分钟').inputValue(),'120');
   await page.waitForTimeout(250);await page.screenshot({path:path.join(out,'11-quick.png')});
   await page.getByRole('button',{name:'开始计时',exact:true}).click();
   const s=await page.evaluate(()=>window.starSleep.snapshot());assert.ok(Math.abs(s.plans[0].exactAt-s.now-7200000)<2000);
   await page.getByRole('button',{name:'编辑120 分钟后关机',exact:true}).click();
   await page.getByLabel('计划名称',{exact:true}).fill('夜间 Agent 工作 · 完成最后一轮构建与检查后休息');
   await page.getByRole('button',{name:'保存计划',exact:true}).click();
   assert.equal((await page.evaluate(()=>window.starSleep.snapshot())).plans[0].exactAt,s.plans[0].exactAt);
 });
 await page.evaluate(async()=>{await window.starSleep.save({name:'站起来走走，留一点时间给自己',kind:'alarm',repeat:'daily',date:'',time:'21:30',weekdays:[],enabled:true});await window.starSleep.save({name:'工作日自动休息',kind:'shutdown',repeat:'weekly',date:'',time:'23:45',weekdays:[1,2,3,4,5],enabled:true});});
 await page.waitForTimeout(4600);await page.screenshot({path:path.join(out,'10-console-v11.png')});
 await check('pause clears reminders, persists after restart and tray callback resumes',async()=>{
   await page.evaluate(()=>window.starSleep.demo('alarm'));await page.getByRole('button',{name:'停止提醒',exact:true}).click();
   await page.getByRole('button',{name:'暂停全部',exact:true}).click();assert.equal((await page.evaluate(()=>window.starSleep.snapshot())).paused,true);
   await page.waitForTimeout(200);await page.screenshot({path:path.join(out,'12-paused.png')});
   await app.close();app=await electron.launch({args:[root,'--safe-mode'],env,timeout:60000});page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
   await page.getByRole('button',{name:'恢复计划',exact:true}).waitFor();
   await app.evaluate(({Menu})=>{const build=Menu.buildFromTemplate;Menu.buildFromTemplate=function(template){globalThis.testTrayTemplate=template;return build.call(this,template);};});
   await page.getByRole('button',{name:'恢复计划',exact:true}).click();
   await app.evaluate(()=>globalThis.testTrayTemplate.find(i=>i.label==='暂停全部计划').click());
   assert.equal((await page.evaluate(()=>window.starSleep.snapshot())).paused,true);
   await app.evaluate(()=>globalThis.testTrayTemplate.find(i=>i.label==='恢复计划').click());
   assert.equal((await page.evaluate(()=>window.starSleep.snapshot())).paused,false);
 });
 await check('real pending shutdown reminder offers global pause',async()=>{
   await page.evaluate(()=>window.starSleep.quick({kind:'shutdown',minutes:1}));
   await page.getByRole('dialog',{name:'到时提醒'}).waitFor();
   await page.getByRole('button',{name:'暂停全部计划',exact:true}).click();
   assert.equal(await page.getByRole('dialog',{name:'到时提醒'}).count(),0);
   const s=await page.evaluate(()=>window.starSleep.snapshot());assert.equal(s.paused,true);
   await page.evaluate(async()=>{const s=await window.starSleep.snapshot();await window.starSleep.remove(s.plans.find(p=>p.name==='1 分钟后关机').id);await window.starSleep.pause(false);});
 });
 await check('native dialog import preview, confirmation, disabled plans and export',async()=>{
   const file=path.join(data,'import.json'),exported=path.join(data,'export.json');
   const existing=(await page.evaluate(()=>window.starSleep.snapshot())).plans[0];
   fs.writeFileSync(file,JSON.stringify({format:'starsleep-plans',version:1,plans:[existing,plan('从备份恢复的计划'),{...plan('已过期'),repeat:'once',date:'2000-01-01'}]}));
   await app.evaluate(({dialog},{file,exported})=>{dialog.showOpenDialog=async(_window,options)=>{globalThis.importDialogOptions=options;return {canceled:false,filePaths:[file]};};dialog.showSaveDialog=async(_window,options)=>{globalThis.exportDialogOptions=options;return {canceled:false,filePath:exported};};},{file,exported});
   await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('button',{name:'导入计划',exact:true}).click();
   await page.getByRole('dialog',{name:'导入前，核对一下'}).waitFor();
   assert.match(await page.locator('.import-counts').innerText(),/1\s*可导入/);
   await page.screenshot({path:path.join(out,'13-import.png')});
   await page.getByRole('button',{name:'确认导入 1 条',exact:true}).click();
   const imported=(await page.evaluate(()=>window.starSleep.snapshot())).plans.find(p=>p.name==='从备份恢复的计划');assert.equal(imported.enabled,false);
   assert.equal(await page.evaluate(async()=>{try{await window.starSleep.commitImport('invalid-token');return false;}catch{return true;}}),true);
   await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('button',{name:'导出计划',exact:true}).click();
   await page.getByText('计划已导出',{exact:true}).waitFor();const raw=fs.readFileSync(exported,'utf8');const value=JSON.parse(raw);assert.equal(value.plans.length,4);assert.equal(raw.includes('handled'),false);assert.equal(raw.includes(data),false);
   assert.deepEqual(await app.evaluate(()=>globalThis.importDialogOptions.properties),['openFile']);
   await page.getByRole('button',{name:'AsterVey',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'14-about-v11.png')});
   await page.getByRole('button',{name:'关闭面板',exact:true}).click();
   fs.writeFileSync(file,'bad json');const count=(await page.evaluate(()=>window.starSleep.snapshot())).plans.length;
   assert.equal(await page.evaluate(async()=>{try{await window.starSleep.previewImport();return false;}catch{return true;}}),true);
   assert.equal((await page.evaluate(()=>window.starSleep.snapshot())).plans.length,count);
 });
 await check('long names and small window remain within layout',async()=>{
   await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(900,650));await page.waitForTimeout(200);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.equal(await page.locator('footer').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight+1),true);
   const row=page.locator('.plan-row').first();assert.equal(await row.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
   await page.screenshot({path:path.join(out,'15-minimum-v11.png')});
 });
 await check('no renderer errors in enhanced flows',async()=>assert.deepEqual(errors,[]));
 await app.close();app=null;
 for(const scale of [1.25,1.5]){
   await check(`Windows scaling ${scale*100}% layout and keyboard controls`,async()=>{
     app=await electron.launch({args:[root,'--safe-mode',`--force-device-scale-factor=${scale}`],env,timeout:60000});const p=await app.firstWindow();
     await p.getByRole('button',{name:'快捷计时',exact:true}).waitFor();
     await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1000,700));await p.waitForTimeout(200);
     assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
     assert.equal(await p.locator('footer').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight+1),true);
     const button=p.getByRole('button',{name:'快捷计时',exact:true});await button.focus();await button.press('Enter');await p.getByLabel('自定义分钟').waitFor();await p.keyboard.press('Escape');
     await p.screenshot({path:path.join(out,`16-scale-${scale}.png`)});await app.close();app=null;
   });
 }
 fs.writeFileSync(path.join(out,'qa-v11-results.json'),JSON.stringify({results,errors},null,2));console.log('Completed',results.length,'v1.1 desktop checks');
})().catch(async e=>{console.error(e);if(app){try{await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].show());await(await app.firstWindow()).screenshot({path:path.join(out,'v11-failure.png'),timeout:5000});}catch{}await app.close().catch(()=>{});}process.exitCode=1;});

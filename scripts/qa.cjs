const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'artifacts');fs.mkdirSync(out,{recursive:true});
const userData=path.join(root,'.qa-data',`run-${Date.now()}`);
const env={...process.env,STARSLEEP_QA_DATA:userData};delete env.ELECTRON_RUN_AS_NODE;
let app;
const results=[];
let resourceSample=[];
async function check(name,fn){await fn();results.push({name,passed:true});console.log('PASS',name);}
(async()=>{
  app=await electron.launch({executablePath:process.env.STARSLEEP_ELECTRON,args:[root,'--safe-mode'],env,timeout:60000});
  const page=await app.firstWindow();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.getByRole('button',{name:'新建计划',exact:true}).waitFor();
  await page.screenshot({path:path.join(out,'01-empty.png')});
  await check('isolated preload with no Node exposed',async()=>{assert.equal(await page.evaluate(()=>typeof window.require),'undefined');assert.equal(await page.evaluate(()=>typeof window.starSleep.save),'function');assert.equal(await page.evaluate(async()=>(await window.starSleep.snapshot()).safeMode),true);});
  await check('create weekly shutdown through actual editor',async()=>{
    await page.getByRole('button',{name:'新建计划',exact:true}).click();
    await page.getByLabel('计划名称',{exact:true}).fill('夜间自动关机');
    await page.getByLabel('执行时间',{exact:true}).fill('23:45');
    await page.getByLabel('重复方式',{exact:true}).selectOption('weekly');
    await page.getByRole('button',{name:'保存计划',exact:true}).click();
    await page.getByRole('heading',{name:'夜间自动关机',exact:true}).waitFor();
    assert.equal(await page.evaluate(async()=>(await window.starSleep.snapshot()).plans[0].repeat),'weekly');
  });
  await check('add daily alarm and one-time shutdown',async()=>{
    await page.evaluate(async()=>{
      await window.starSleep.save({name:'起来走走，喝杯水',kind:'alarm',repeat:'daily',date:'',time:'21:30',weekdays:[],enabled:true});
      const d=new Date(Date.now()+86400_000);const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      await window.starSleep.save({name:'下载完成后休息',kind:'shutdown',repeat:'once',date,time:'02:00',weekdays:[],enabled:true});
    });
    assert.equal(await page.locator('.plan-row').count(),3);
  });
  await page.waitForTimeout(4700);
  assert.equal(await page.locator('footer').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight+1),true);
  await page.screenshot({path:path.join(out,'02-console.png')});
  await check('filter, toggle and edit',async()=>{
    await page.getByRole('button',{name:'闹钟提醒',exact:true}).click();assert.equal(await page.locator('.plan-row').count(),1);
    await page.getByRole('switch').click();assert.equal(await page.getByRole('switch').getAttribute('aria-checked'),'false');
    await page.getByRole('switch').click();
    await page.getByRole('button',{name:'编辑起来走走，喝杯水',exact:true}).click();
    await page.getByLabel('计划名称',{exact:true}).fill('休息一下，喝杯水');
    await page.getByRole('button',{name:'保存计划',exact:true}).click();
    await page.getByRole('heading',{name:'休息一下，喝杯水'}).waitFor();
    await page.getByRole('button',{name:'全部计划',exact:true}).click();
  });
  await check('editor renders date and recurrence fields',async()=>{
    await page.getByRole('button',{name:'编辑下载完成后休息',exact:true}).click();
    assert.equal(await page.getByLabel('执行日期',{exact:true}).count(),1);
    await page.screenshot({path:path.join(out,'03-editor.png')});
    await page.getByRole('button',{name:'关闭面板',exact:true}).click();
  });
  await check('shutdown reminder demonstration is safe and cancellable',async()=>{
    await page.getByRole('button',{name:'演示提醒',exact:true}).click();
    await page.getByRole('dialog',{name:'到时提醒'}).waitFor();
    await page.getByText('这是演示，不会执行实际关机。',{exact:true}).waitFor();
    await page.screenshot({path:path.join(out,'04-reminder.png')});
    await page.getByRole('button',{name:'结束演示',exact:true}).click();
    assert.equal(await page.getByRole('dialog',{name:'到时提醒'}).count(),0);
  });
  await check('settings, alarm demonstration and sound cleanup',async()=>{
    await page.getByRole('button',{name:'设置',exact:true}).click();
    await page.getByRole('switch',{name:'减少动态效果'}).click();
    assert.equal(await page.evaluate(async()=>(await window.starSleep.snapshot()).settings.reducedMotion),true);
    await page.getByLabel('提醒音量').focus();await page.getByLabel('提醒音量').press('Home');for(let i=0;i<5;i++)await page.getByLabel('提醒音量').press('ArrowRight');
    await page.screenshot({path:path.join(out,'05-settings.png')});
    await page.getByRole('button',{name:'试听闹钟',exact:true}).click();
    await page.getByRole('button',{name:'停止提醒'}).click();
    await page.getByRole('button',{name:'关闭面板',exact:true}).click();
  });
  await check('about panel, keyboard focus and fixed external links',async()=>{
    await app.evaluate(({shell})=>{globalThis.starSleepOriginalOpen=shell.openExternal;globalThis.starSleepOpened=[];shell.openExternal=async url=>{globalThis.starSleepOpened.push(url);};});
    try{
      await page.getByRole('button',{name:'设置',exact:true}).click();
      const author=page.getByRole('button',{name:'AsterVey',exact:true});
      await author.focus();assert.equal(await author.evaluate(e=>e===document.activeElement),true);
      await author.press('Enter');
      await page.getByRole('button',{name:'GitHub 项目主页'}).click();
      const opened=await app.evaluate(()=>globalThis.starSleepOpened);
      assert.deepEqual(opened,['https://github.com/AsterVey','https://github.com/AsterVey/StarSleep']);
      assert.equal(await page.evaluate(async()=>{try{await window.starSleep.openLink('https://example.com');return false;}catch{return true;}}),true);
      await page.screenshot({path:path.join(out,'09-about.png')});
      await page.getByRole('button',{name:'关闭面板',exact:true}).click();
    }finally{await app.evaluate(({shell})=>{shell.openExternal=globalThis.starSleepOriginalOpen;});}
  });
  await check('schedule rows show the actual next execution time',async()=>{
    const state=await page.evaluate(()=>window.starSleep.snapshot());
    const next=state.plans.filter(p=>p.kind==='shutdown'&&p.nextAt).sort((a,b)=>a.nextAt-b.nextAt)[0];
    const row=page.locator('.plan-row').filter({has:page.getByRole('heading',{name:next.name,exact:true})});
    const expected=new Date(next.nextAt).toLocaleTimeString('zh-CN',{hour12:false,hour:'2-digit',minute:'2-digit'});
    assert.ok((await row.locator('.plan-meta').innerText()).includes(expected));
    assert.ok((await row.getAttribute('class')).includes('next-plan'));
  });
  await check('hover ripple canvas draws and does not intercept clicks',async()=>{
    await page.evaluate(async()=>{const s=await window.starSleep.snapshot();await window.starSleep.settings({...s.settings,reducedMotion:false});});
    await page.mouse.move(200,200);await page.mouse.move(400,280,{steps:12});
    assert.equal(await page.locator('.ripples').evaluate(c=>getComputedStyle(c).pointerEvents),'none');
  });
  await check('compact viewport and 150% equivalent layout have no horizontal overflow',async()=>{
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1000,700));await page.waitForTimeout(300);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:path.join(out,'06-compact.png')});
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1240,820));
  });
  await check('minimum viewport keeps footer reachable',async()=>{
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(900,650));await page.waitForTimeout(300);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.locator('footer').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight+1),true);
    await page.screenshot({path:path.join(out,'07-minimum.png')});
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1240,820));
  });
  await check('close hides to tray; timer remains active and animation stops',async()=>{
    await page.getByRole('button',{name:'隐藏到托盘，任务继续',exact:true}).click();
    assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isVisible()),false);
    await page.waitForFunction(()=>document.body.classList.contains('motion-off'),null,{polling:100});
    const a=await page.evaluate(async()=>(await window.starSleep.snapshot()).now);await page.waitForTimeout(1200);const b=await page.evaluate(async()=>(await window.starSleep.snapshot()).now);assert.ok(b>a);
    await page.waitForTimeout(1800);
    resourceSample=await app.evaluate(({app})=>app.getAppMetrics().map(m=>({type:m.type,cpuPercent:m.cpu.percentCPUUsage,memoryMB:Math.round(m.memory.workingSetSize/1024)})));
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].show());
  });
  await check('delete requires confirmation and removes plan',async()=>{
    await page.getByRole('button',{name:'删除下载完成后休息',exact:true}).click();
    await page.getByRole('button',{name:'删除计划',exact:true}).click();
    assert.equal(await page.locator('.plan-row').count(),2);
  });
  await check('hidden main-process timer reaches native adapter in safe mode',async()=>{
    await page.evaluate(async()=>{
      const d=new Date(Math.ceil((Date.now()+5000)/60000)*60000);
      const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const time=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      await window.starSleep.save({name:'安全模式计时验证',kind:'shutdown',repeat:'once',date,time,weekdays:[],enabled:true});
    });
    await page.getByRole('dialog',{name:'到时提醒'}).waitFor();
    await page.evaluate(()=>window.starSleep.window('hide'));
    await page.waitForFunction(async()=>(await window.starSleep.snapshot()).logs.some(l=>l.text.includes('已拦截实际关机')),null,{polling:1000,timeout:70000});
    assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isVisible()),false);
    await page.evaluate(async()=>{const s=await window.starSleep.snapshot();await window.starSleep.remove(s.plans.find(p=>p.name==='安全模式计时验证').id);});
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].show());
  });
  await check('no renderer exceptions',async()=>assert.deepEqual(errors,[]));
  // Explicit quit, including an active demonstration, exercises timer disposal without an OS shutdown request.
  await page.evaluate(()=>window.starSleep.demo('shutdown'));
  const closed=app.waitForEvent('close');
  await page.evaluate(()=>window.starSleep.window('quit'));
  await closed;results.push({name:'explicit quit closes the application and pending warning',passed:true});app=null;
  await check('persisted plans reload; future schedule survives application exit',async()=>{
    app=await electron.launch({executablePath:process.env.STARSLEEP_ELECTRON,args:[root,'--safe-mode'],env,timeout:60000});const p=await app.firstWindow();await p.getByRole('heading',{name:'休息一下，喝杯水'}).waitFor();assert.equal(await p.locator('.plan-row').count(),2);assert.equal(await p.getByRole('dialog',{name:'到时提醒'}).count(),0);
  });
  fs.writeFileSync(path.join(out,'qa-results.json'),JSON.stringify({results,errors,userData,hiddenWindowResourceSample:resourceSample},null,2));
  await app.close();app=null;console.log('Completed',results.length,'desktop integration checks');
})().catch(async e=>{console.error(e);fs.writeFileSync(path.join(out,'qa-failure.txt'),e.stack||String(e));if(app){try{const p=await app.firstWindow();await p.screenshot({path:path.join(out,'qa-failure.png')});await app.close();}catch{}}process.exitCode=1;});

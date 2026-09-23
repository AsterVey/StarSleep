const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),data=path.join(root,'.qa-data','client-themes-'+Date.now()),out=path.join(root,'artifacts/v14');
fs.mkdirSync(data,{recursive:true});fs.mkdirSync(out,{recursive:true});
const env={...process.env,STARSLEEP_QA_DATA:data};delete env.ELECTRON_RUN_AS_NODE;
const launchOptions=scale=>({...(process.env.STARSLEEP_QA_EXE?{executablePath:process.env.STARSLEEP_QA_EXE}:{}),args:[...(process.env.STARSLEEP_QA_EXE?[]:[root]),'--safe-mode',`--force-device-scale-factor=${scale}`],env,timeout:60000});
let app;const results=[],errors=[];
const record=async(name,fn)=>{await fn();results.push({name,passed:true});console.log('PASS',name);};
const native='codex-theme-v1:'+JSON.stringify({variant:'dark',codeThemeId:'codex',theme:{accent:'#88cfff',surface:'#071523',ink:'#e7f4ff'}});
(async()=>{try{
  app=await electron.launch(launchOptions(1));let page=await app.firstWindow();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
  await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1,checkboxChecked:false});});
  await page.getByRole('button',{name:'Agent 与美化',exact:true}).click();await page.getByRole('button',{name:'原界面美化',exact:true}).click();
  await page.getByText('隔离测试客户端',{exact:true}).waitFor();
  await record('pointer ripples tolerate a frame timestamp preceding the input event',async()=>{
    await page.evaluate(()=>{window.__qaRaf=window.requestAnimationFrame;window.requestAnimationFrame=fn=>window.__qaRaf(t=>fn(t-250));});
    try{await page.mouse.move(470,180);await page.waitForTimeout(150);await page.mouse.move(490,200);await page.waitForTimeout(150);}finally{await page.evaluate(()=>{window.requestAnimationFrame=window.__qaRaf;delete window.__qaRaf;});}
    assert.deepEqual(errors,[]);
  });
  await record('Codex native apply and selective restore through desktop controls',async()=>{
    const file=path.join(data,'test-clients/codex/config.toml');fs.mkdirSync(path.dirname(file),{recursive:true});const before='# User comment\nmodel = "original"\n[desktop]\nappearanceTheme = "system"\n';fs.writeFileSync(file,before);
    await page.evaluate(raw=>window.starSleep.themeImportText(raw,'Codex 午夜蓝'),native);await page.getByRole('button',{name:'应用到 Codex',exact:true}).click();
    await page.getByText('已写入隔离测试配置；真实 Codex 外观未改变。',{exact:true}).waitFor();assert.match(fs.readFileSync(file,'utf8'),/appearanceDarkChromeTheme = \{ accent = "#88cfff"/);
    fs.appendFileSync(file,'# changed after applying\n');await page.getByRole('button',{name:'恢复 Codex 原外观',exact:true}).click();await page.getByText('已还原隔离测试配置。',{exact:true}).waitFor();assert.equal(fs.readFileSync(file,'utf8'),before+'# changed after applying\n');
    await page.getByRole('button',{name:'应用到 Codex',exact:true}).click();await page.getByText('已写入隔离测试配置；真实 Codex 外观未改变。',{exact:true}).waitFor();
    fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('appearanceTheme = "dark"','appearanceTheme = "light"'));await page.getByRole('button',{name:'恢复 Codex 原外观',exact:true}).click();await page.getByRole('status').filter({hasText:'外部更改'}).waitFor();assert.match(fs.readFileSync(file,'utf8'),/appearanceTheme = "light"/);
  });
  await record('Claude theme write restores exact previous file and rejects outside changes',async()=>{
    const raw=JSON.stringify({name:'Claude 雾蓝',bgMain:'#071523',textPrimary:'#e7f4ff'});await page.evaluate(text=>window.starSleep.themeImportText(text,'Claude 雾蓝'),raw);await page.getByRole('button',{name:'Claude 雾蓝 Claude Theme Mod',exact:true}).click();
    const file=path.join(data,'test-clients/claude/theme.json');fs.mkdirSync(path.dirname(file),{recursive:true});const previous='{"bgMain":"#eeeeee","textPrimary":"#111111"}\n';fs.writeFileSync(file,previous);
    await page.getByRole('button',{name:'应用到 Claude',exact:true}).click();await page.getByText('已写入隔离测试配置；真实 Claude 外观未改变。',{exact:true}).waitFor();assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).bgMain,'#071523');
    await page.getByRole('button',{name:'恢复 Claude 原外观',exact:true}).click();await page.getByText('已恢复配置前的 Claude 主题文件',{exact:true}).waitFor();assert.equal(fs.readFileSync(file,'utf8'),previous);
    await page.getByRole('button',{name:'三端配置指南',exact:true}).click();await page.getByRole('dialog').waitFor();assert.match(await page.getByRole('dialog').innerText(),/商店版不能/);await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
  });
  await record('configuration controls remain reachable at 900x650 and 125/150/200 percent zoom',async()=>{
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(900,650));
    for(const scale of [1,1.25,1.5,2]){
      if(scale!==1){await app.close();app=await electron.launch(launchOptions(scale));page=await app.firstWindow();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));await page.getByRole('button',{name:'Agent 与美化',exact:true}).click();await page.getByRole('button',{name:'原界面美化',exact:true}).click();await page.getByText('隔离测试客户端',{exact:true}).waitFor();}
      await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(900,650));await page.getByRole('button',{name:'Claude 雾蓝 Claude Theme Mod',exact:true}).click();await page.locator('.integration-body').evaluate(e=>e.scrollTop=0);await page.waitForTimeout(150);await page.screenshot({path:path.join(out,`client-config-${scale}-top.png`)});
      await page.getByRole('button',{name:'恢复 Claude 原外观',exact:true}).scrollIntoViewIfNeeded();
      const visible=await page.getByRole('button',{name:'恢复 Claude 原外观',exact:true}).evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;});assert.equal(visible,true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);await page.screenshot({path:path.join(out,`client-config-${scale}-bottom.png`)});
    }
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1280,820));await page.locator('.integration-body').evaluate(e=>e.scrollTop=0);await page.waitForTimeout(150);await page.screenshot({path:path.join(out,'client-configuration.png')});
  });
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'client-theme-results.json'),JSON.stringify({results,errors,scope:'isolated client files; real native appearance not visually verified'},null,2));
}finally{if(app)await app.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

const {_electron:electron}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),data=path.join(root,'.qa-data','theme-hub-'+Date.now()),out=process.env.STARSLEEP_QA_OUT||path.join(root,'artifacts/v143');
fs.mkdirSync(data,{recursive:true});fs.mkdirSync(out,{recursive:true});
const env={...process.env,STARSLEEP_QA_DATA:data};delete env.ELECTRON_RUN_AS_NODE;
let app;const results=[],errors=[];
const check=async(name,fn)=>{await fn();results.push(name);console.log('PASS',name);};
async function capture(name){const b=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].capturePage()).toPNG().toString('base64'));fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(b,'base64'));}
async function launch(){app=await electron.launch({...(process.env.STARSLEEP_QA_EXE?{executablePath:process.env.STARSLEEP_QA_EXE}:{}),args:[...(process.env.STARSLEEP_QA_EXE?[]:[root]),'--safe-mode'],env,timeout:60000});const p=await app.firstWindow();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1});});await p.getByRole('button',{name:'Agent 与美化',exact:true}).click();await p.getByRole('button',{name:'原界面美化',exact:true}).click();await p.getByText('DeepSeek · 隔离测试客户端',{exact:true}).waitFor();return p;}
(async()=>{try{
 let p=await launch();
 const pack={format:'dsh-dream-skin/pack',version:1,manifest:{id:'qa-mist',name:'Mist · 配置演示',colorScheme:'light',tokens:{'--dsw-alias-bg-base':'#f4f7fb','--dsw-alias-bg-layer-1':'#e9eff6','--dsw-alias-brand-primary':'#6088ba','--dsw-alias-label-primary':'#1f3147','--dsw-alias-label-secondary':'#63778d','--dsw-alias-border-l1':'#ccd9e7','--dsw-alias-border-l2':'#dce5ef'}}};
 const file=path.join(data,'test-clients/deepseek/dream-skin.json'),original={'dsh-dream-skin:skin':'mist','dsh-dream-skin:wallpaper-opacity':'0.2',other:'preserve'};
 await check('DSH import, apply, cancellation, background configuration and selective restore',async()=>{
   fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(original));
   await p.evaluate(raw=>window.starSleep.themeImportText(raw,'dsh.json'),JSON.stringify(pack));
   await p.getByRole('button',{name:'应用到 DeepSeek',exact:true}).click();await p.getByText('已处理隔离测试文件；真实 DeepSeek 外观未改变。',{exact:true}).waitFor();assert.equal(JSON.parse(fs.readFileSync(file))['dsh-dream-skin:skin'],'dream-pack:qa-mist');
   const before=fs.readFileSync(file,'utf8');await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:0});});assert.equal(await p.evaluate(()=>window.starSleep.wallpaperDshApply('tidal-glass')),'已取消');assert.equal(fs.readFileSync(file,'utf8'),before);
   await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1});});await p.getByRole('button',{name:'DeepSeek 背景',exact:true}).click();await p.getByRole('button',{name:'配置到 DeepSeek',exact:true}).click();await p.getByText('已处理隔离测试文件；真实 DeepSeek 外观未改变。',{exact:true}).last().waitFor();assert.match(JSON.parse(fs.readFileSync(file))['dsh-dream-skin:wallpaper'],/^data:image\/png;base64,/);
   await p.getByRole('button',{name:'原界面美化',exact:true}).click();await p.getByRole('button',{name:'恢复 DeepSeek 原外观',exact:true}).click();
   await p.waitForFunction(()=>window.starSleep.integrations().then(s=>!s.dshRestore));assert.deepEqual(JSON.parse(fs.readFileSync(file)),original);
 });
 await check('native file import routes CSS and image, export keeps CSS bytes, filter isolates clients',async()=>{
   const css='/* isolated author CSS */\nbody { color: #112233; }',cssFile=path.join(data,'我的 CSS.css');fs.writeFileSync(cssFile,css);
   await app.evaluate(({dialog},f)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[f]});},cssFile);await p.getByRole('button',{name:'导入美化文件',exact:true}).click();await p.getByText('美化包已加入主题库，尚未应用',{exact:true}).waitFor();await p.getByLabel('适用客户端').selectOption('css');assert.equal(await p.locator('.theme-row').count(),1);assert.equal(await p.getByRole('button',{name:'应用到 DeepSeek',exact:true}).count(),0);
   const target=path.join(data,'export.css');await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},target);await p.getByRole('button',{name:'导出主题文件',exact:true}).click();await p.getByText('主题文件已导出，尚未应用',{exact:true}).waitFor();assert.equal(fs.readFileSync(target,'utf8'),css);
   const img=path.join(root,'resources/wallpapers/cloud-fjord.png');await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},img);await p.getByRole('button',{name:'导入美化文件',exact:true}).click();await p.getByRole('status').filter({hasText:'图片已加入'}).waitFor();assert.equal((await p.evaluate(()=>window.starSleep.wallpaperList())).items.length,3);
   await p.getByLabel('适用客户端').selectOption('claude');assert.equal(await p.locator('.theme-row').count(),0);await p.getByLabel('适用客户端').selectOption('all');
 });
 await app.close();p=await launch();
 await check('restart preserves theme formats; three client guide and actions remain reachable at 100/125/150/200%',async()=>{
   assert.equal((await p.evaluate(()=>window.starSleep.integrations())).themes.length,2);
   for(const [name,w,h,zoom]of [['desktop',1280,820,1],['compact',900,650,1],['zoom125',900,650,1.25],['zoom150',900,650,1.5],['zoom200',900,650,2]]){
     await app.evaluate(({BrowserWindow},{w,h,zoom})=>{const win=BrowserWindow.getAllWindows()[0];win.setSize(w,h);win.webContents.setZoomFactor(zoom);},{w,h,zoom});await p.locator('.integration-body').evaluate(e=>e.scrollTop=0);await p.waitForTimeout(150);await capture(name);
     assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
     const action=p.getByRole('button',{name:'应用到 DeepSeek',exact:true});await action.scrollIntoViewIfNeeded();assert.equal(await action.evaluate(e=>{const r=e.getBoundingClientRect(),v=e.closest('.integration-body').getBoundingClientRect();return r.left>=v.left&&r.right<=v.right+1&&r.top>=v.top&&r.bottom<=v.bottom;}),true);await action.focus();assert.equal(await action.evaluate(e=>document.activeElement===e),true);await capture(name+'-actions');
   }
   await p.getByRole('button',{name:'三端配置指南',exact:true}).click();assert.match(await p.getByRole('dialog').innerText(),/DSH_HOME/);await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'hidden'});
 });
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'theme-hub-results.json'),JSON.stringify({results,errors,data,safe:true,executable:process.env.STARSLEEP_QA_EXE||'development Electron'},null,2));
 }finally{if(app)await app.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

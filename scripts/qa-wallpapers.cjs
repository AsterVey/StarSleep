const { _electron:electron }=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),data=path.join(root,'.qa-data','wallpapers-'+Date.now()),out=path.join(root,'artifacts/v142');
fs.mkdirSync(data,{recursive:true});fs.mkdirSync(out,{recursive:true});
const env={...process.env,STARSLEEP_QA_DATA:data};delete env.ELECTRON_RUN_AS_NODE;
let app;const results=[],errors=[];
async function capture(name){const base64=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].capturePage()).toPNG().toString('base64'));fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(base64,'base64'));}
const check=async(name,fn)=>{await fn();results.push(name);console.log('PASS',name);};
async function launch(){app=await electron.launch({...(process.env.STARSLEEP_QA_EXE?{executablePath:process.env.STARSLEEP_QA_EXE}:{}),args:[...(process.env.STARSLEEP_QA_EXE?[]:[root]),'--safe-mode'],env,timeout:60000});const p=await app.firstWindow();p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));await p.getByRole('button',{name:'Agent 与美化',exact:true}).click();await p.getByRole('button',{name:'DeepSeek 背景',exact:true}).click();await p.getByRole('img',{name:'潮汐琉璃背景大图'}).waitFor();return p;}
(async()=>{try{
 let p=await launch();
 await check('builtin images decode and export exact originals; cancel reports false',async()=>{
  const list=await p.evaluate(()=>window.starSleep.wallpaperList());assert.equal(list.items.length,2);assert.equal(list.items[0].width,1672);
  const target=path.join(data,'export.png');await app.evaluate(({dialog},target)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:target});},target);
  await p.getByRole('button',{name:'导出这张背景',exact:true}).click();await p.getByRole('status').filter({hasText:'背景已导出'}).waitFor();assert.deepEqual(fs.readFileSync(target),fs.readFileSync(path.join(root,'resources/wallpapers/tidal-glass.png')));
  await app.evaluate(({dialog})=>{dialog.showSaveDialog=async()=>({canceled:true});});assert.equal(await p.evaluate(()=>window.starSleep.wallpaperExport('tidal-glass')),false);
 });
 let id;
 await check('native import decodes image, persists it, rejects duplicates and broken files',async()=>{
  const file=path.join(data,'我的山水.png');fs.copyFileSync(path.join(root,'resources/wallpapers/cloud-fjord.png'),file);
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
  await p.getByRole('button',{name:'导入图片',exact:true}).click();await p.getByRole('img',{name:'我的山水背景大图'}).waitFor();id=(await p.evaluate(()=>window.starSleep.wallpaperList())).items.find(i=>!i.builtin).id;
  assert.equal(await p.evaluate(async()=>{try{await window.starSleep.wallpaperImport();return false;}catch{return true;}}),true);
  const broken=path.join(data,'broken.png');fs.writeFileSync(broken,Buffer.from([137,80,78,71,13,10,26,10]));await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},broken);
  assert.equal(await p.evaluate(async()=>{try{await window.starSleep.wallpaperImport();return false;}catch{return true;}}),true);
  assert.equal((await p.evaluate(()=>window.starSleep.wallpaperList())).items.length,3);
 });
 await app.close();p=await launch();
 await check('restart preserves background and removing it keeps exported originals',async()=>{
  assert.equal((await p.evaluate(()=>window.starSleep.wallpaperList())).items.length,3);
  await p.getByRole('button',{name:/我的山水 我的图片/}).click();await p.getByRole('button',{name:'移除背景',exact:true}).click();await p.getByRole('dialog').getByRole('button',{name:'移除背景',exact:true}).click();await p.getByRole('dialog').waitFor({state:'hidden'});assert.equal((await p.evaluate(()=>window.starSleep.wallpaperList())).items.length,2);assert.equal(fs.existsSync(path.join(data,'export.png')),true);
 });
 await check('desktop, compact and 200 percent zoom remain scrollable and keyboard accessible',async()=>{
  for(const [name,w,h,zoom]of [['desktop',1280,820,1],['compact',900,650,1],['zoom200',900,650,2]]){
   await app.evaluate(({BrowserWindow},{w,h,zoom})=>{const win=BrowserWindow.getAllWindows()[0];win.setSize(w,h);win.webContents.setZoomFactor(zoom);},{w,h,zoom});
   await p.locator('.wallpaper-layout').evaluate(e=>e.scrollTop=0);await p.locator('.wallpaper-figure>img').evaluate(img=>img.decode());await p.waitForTimeout(180);await capture(name);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
   const action=p.getByRole('button',{name:'导出这张背景',exact:true});await action.scrollIntoViewIfNeeded();assert.equal(await action.evaluate(e=>{const r=e.getBoundingClientRect(),viewport=e.closest('.wallpaper-layout').getBoundingClientRect();return viewport.height>=140&&r.top>=viewport.top&&r.bottom<=viewport.bottom;}),true);
   await action.focus();assert.equal(await action.evaluate(e=>e===document.activeElement),true);await capture(name+'-actions');
   fs.writeFileSync(path.join(out,name+'-metrics.json'),JSON.stringify(await p.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,scrollWidth:document.documentElement.scrollWidth})),null,2));
  }
 });
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'wallpaper-results.json'),JSON.stringify({results,errors,safe:true,executable:process.env.STARSLEEP_QA_EXE||'development Electron'},null,2));
}finally{if(app)await app.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

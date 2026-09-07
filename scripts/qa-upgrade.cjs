const {_electron:electron}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),data=path.join(root,'.qa-data','upgrade-'+Date.now());
const env={...process.env,STARSLEEP_QA_DATA:data};delete env.ELECTRON_RUN_AS_NODE;
let app;
async function launch(version){app=await electron.launch({executablePath:path.join(root,'release',`v${version}`,'win-unpacked','星眠.exe'),args:['--safe-mode'],env,timeout:60000});const page=await app.firstWindow();await page.getByRole('button',{name:'新建计划',exact:true}).waitFor();assert.equal((await page.evaluate(()=>window.starSleep.snapshot())).safeMode,true);return page;}
(async()=>{
 let page=await launch('1.0.0');await page.evaluate(()=>window.starSleep.save({name:'升级后应保留的工作计划',kind:'shutdown',repeat:'daily',date:'',time:'23:45',weekdays:[],enabled:true}));const old=(await page.evaluate(()=>window.starSleep.snapshot())).plans[0];await app.close();app=null;
 const file=path.join(data,'schedules.json'),original=fs.readFileSync(file,'utf8');assert.equal(JSON.parse(original).version,1);
 page=await launch('1.1.0');const upgraded=await page.evaluate(()=>window.starSleep.snapshot());assert.equal(upgraded.plans[0].id,old.id);assert.equal(upgraded.plans[0].enabled,true);assert.equal(upgraded.paused,false);assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).version,2);assert.equal(fs.readFileSync(path.join(data,'schedules.v1.backup.json'),'utf8'),original);
 await page.getByRole('button',{name:'暂停全部',exact:true}).click();await app.close();app=null;
 page=await launch('1.1.0');assert.equal((await page.evaluate(()=>window.starSleep.snapshot())).paused,true);await app.close();app=null;
 fs.writeFileSync(path.join(root,'artifacts/upgrade-results.json'),JSON.stringify({passed:true,from:'1.0.0',to:'1.1.0',planIdentityPreserved:true,originalV1BackupPreserved:true,pausePersists:true,mode:'packaged applications; isolated data; shutdown intercepted'},null,2));console.log('PASS packaged v1.0.0 → v1.1.0 data upgrade and paused restart');
})().catch(async e=>{console.error(e);if(app)await app.close().catch(()=>{});process.exitCode=1;});

const {_electron:electron}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const executablePath=process.argv[2];if(!executablePath)throw new Error('Pass installed executable path');
 const root=path.resolve(__dirname,'..');const env={...process.env,STARSLEEP_QA_DATA:path.join(root,'.qa-data','installed-'+Date.now())};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath,args:['--safe-mode'],env,timeout:60000});
 try{
  const page=await app.firstWindow();await page.getByRole('button',{name:'新建计划',exact:true}).waitFor();
  assert.equal(await page.evaluate(async()=>(await window.starSleep.snapshot()).safeMode),true);
  assert.equal(await page.evaluate(async()=>(await window.starSleep.snapshot()).plans.length),0);
  await page.getByRole('button',{name:'演示提醒',exact:true}).click();await page.getByRole('button',{name:'结束演示'}).click();
  await page.screenshot({path:path.join(root,'artifacts','08-installed.png')});
  const info=await app.evaluate(({app})=>({packaged:app.isPackaged,version:app.getVersion(),electron:process.versions.electron,executable:process.execPath}));
  assert.equal(info.packaged,true);fs.writeFileSync(path.join(root,'artifacts','installed-smoke.json'),JSON.stringify({passed:true,...info},null,2));console.log(JSON.stringify(info));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

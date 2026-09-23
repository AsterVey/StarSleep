const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),data=path.join(root,'.qa-data','hooks-'+Date.now()),out=path.join(root,'artifacts/hooks-fix');
fs.mkdirSync(data,{recursive:true});fs.mkdirSync(out,{recursive:true});
const codex=path.join(data,'real-codex'),claude=path.join(data,'real-claude');
const env={...process.env,STARSLEEP_QA_DATA:data,CODEX_HOME:codex,CLAUDE_CONFIG_DIR:claude};delete env.ELECTRON_RUN_AS_NODE;
let app;const results=[],errors=[];
const check=async(name,fn)=>{await fn();results.push(name);console.log('PASS',name);};
(async()=>{
  app=await electron.launch({...(process.env.STARSLEEP_QA_EXE?{executablePath:process.env.STARSLEEP_QA_EXE}:{}),args:[...(process.env.STARSLEEP_QA_EXE?[]:[root]),'--safe-mode'],env,timeout:60000});
  const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await page.locator('.agent-entry').click();
  const hooks=path.join(codex,'hooks.json'),simulated=path.join(data,'test-clients/codex/hooks.json');
  await check('cancel real connection leaves files and success message unchanged',async()=>{
    await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:0,checkboxChecked:false});});
    await page.getByRole('button',{name:'接入真实 Codex',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('.connector-row button').disabled);
    assert.equal(fs.existsSync(hooks),false);assert.equal(await page.locator('.integration-feedback').count(),0);
  });
  await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1,checkboxChecked:false});});
  await check('legacy API stays isolated; UI identifies simulation',async()=>{
    await page.evaluate(()=>window.starSleep.agentConnect('codex',true));assert.ok(fs.existsSync(simulated));assert.equal(fs.existsSync(hooks),false);
    const s=await page.evaluate(()=>window.starSleep.integrations());assert.equal(s.installed.codex,true);assert.equal(s.realHooks.codex.installed,false);
    assert.match(await page.locator('.integration-guide').innerText(),/尚未配置真实客户端/);
  });
  await check('explicit real button writes client config and retains safe shutdown mode',async()=>{
    fs.mkdirSync(codex,{recursive:true});fs.writeFileSync(hooks,JSON.stringify({description:'keep',hooks:{Stop:[{hooks:[{type:'command',command:'echo foreign'}]}]}}));
    await page.getByRole('button',{name:'接入真实 Codex',exact:true}).click();await page.getByRole('button',{name:'移除 Codex',exact:true}).waitFor();
    const value=JSON.parse(fs.readFileSync(hooks,'utf8'));assert.equal(value.description,'keep');assert.equal(value.hooks.Stop.length,2);
    assert.ok(fs.readdirSync(codex).some(f=>f.endsWith('.bak')));
    const s=await page.evaluate(()=>window.starSleep.snapshot());assert.equal(s.safeMode,true);
    assert.equal((await page.evaluate(()=>window.starSleep.integrations())).night.armed,false);
    assert.match(await page.locator('.integration-feedback').innerText(),/收到事件前尚未连接/);
    assert.equal(fs.existsSync(path.join(codex,'config.toml')),false);
    await page.screenshot({path:path.join(out,'real-connection.png')});
  });
  if(process.env.STARSLEEP_CODEX_EXE)await check('installed Codex discovers nine hooks without trusting or running them',async()=>{
    const output=execFileSync(process.execPath,[path.join(root,'scripts/check-codex-hooks.cjs')],{env,cwd:root,encoding:'utf8',windowsHide:true,timeout:30000});
    const entries=JSON.parse(output),items=entries.flatMap(e=>e.hooks);assert.equal(items.length,9);assert.ok(items.every(h=>h.trust==='untrusted'));
    fs.writeFileSync(path.join(out,'codex-discovery.json'),output);
  });
  await check('invalid target rejected and removing real connection preserves simulation and foreign hooks',async()=>{
    assert.equal(await page.evaluate(async()=>{try{await window.starSleep.agentConnect('codex',true,'bad');return false;}catch{return true;}}),true);
    await page.getByRole('button',{name:'移除 Codex',exact:true}).click();await page.getByRole('button',{name:'接入真实 Codex',exact:true}).waitFor();
    assert.deepEqual(JSON.parse(fs.readFileSync(hooks,'utf8')),{description:'keep',hooks:{Stop:[{hooks:[{type:'command',command:'echo foreign'}]}]}});
    assert.equal((await page.evaluate(()=>window.starSleep.integrations())).installed.codex,true);
  });
  assert.deepEqual(errors,[]);console.log('DONE',results.length);
})().catch(e=>{console.error(e);process.exitCode=1;errors.push(String(e));}).finally(async()=>{if(app)await app.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2));});

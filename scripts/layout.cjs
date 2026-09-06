const { _electron: electron }=require('playwright');
const path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..');
(async()=>{
 const dirs=fs.readdirSync(path.join(root,'.qa-data')).filter(d=>d.startsWith('run-')).sort();
 const env={...process.env,STARSLEEP_QA_DATA:path.join(root,'.qa-data',dirs.at(-1))};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({args:[root,'--safe-mode'],env});
 try{const p=await app.firstWindow();await p.getByRole('button',{name:'新建计划',exact:true}).waitFor();await p.waitForTimeout(500);
 for(const [w,h,file] of [[1240,820,'02-console.png'],[1000,700,'06-compact.png'],[900,650,'07-minimum.png']]){
   await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows()[0].setSize(...size),[w,h]);await p.waitForTimeout(500);
   console.log(JSON.stringify(await p.evaluate(()=>({viewport:[innerWidth,innerHeight],rects:Object.fromEntries(['.titlebar','.toolbar','.workspace','.orbit-panel','.orbital','.next-event','.orbit-bottom','footer'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,{top:r.top,bottom:r.bottom,height:r.height}]}))}))));
   if(process.argv.includes('--capture'))await p.screenshot({path:path.join(root,'artifacts',file)});
 }
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

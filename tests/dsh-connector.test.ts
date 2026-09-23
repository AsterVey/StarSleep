import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {AgentBridge} from '../electron/agent-bridge';
import {NightWatch} from '../electron/night-watch';

test('DSH injects the current completion token into the first accepted step, once per turn',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'starsleep-dsh-'));
  const night=new NightWatch(Date.now,()=>true,()=>1,()=>assert.fail('must not execute'),()=>{},()=>{});
  const bridge=new AgentBridge(root,night,()=>{});
  const handlers=new Map<string,Function>();
  try{
    await bridge.start();
    fs.copyFileSync(path.resolve('resources/dsh-starsleep/index.mjs'),path.join(root,'index.mjs'));
    fs.writeFileSync(path.join(root,'connection-path.json'),JSON.stringify({path:path.join(bridge.dir,'connection.json')}));
    const connector=await import(pathToFileURL(path.join(root,'index.mjs')).href);
    connector.apply({on:(event:string,fn:Function)=>handlers.set(event,fn)});
    const agent={session:{id:'desktop-test',header:{cwd:'E:/test'}},status:'running'};
    handlers.get('agent/created')!({agent});
    const preStep=handlers.get('agent/pre-step')!;
    const input={kind:'enter',messages:[{id:'original',role:'user',content:[]}],custom:'preserved'};
    const first=await preStep({agent,turn:1},async()=>input);
    assert.equal(first.custom,'preserved');
    assert.equal(first.messages[0],input.messages[0]);
    assert.equal(input.messages.length,1);
    const marker=first.messages[1].content[0].text.match(/\[STARSLEEP_DONE:[a-f0-9]+\]/)[0];
    assert.equal(first.messages[1].source.plugin,'starsleep-night-watch');
    assert.equal(await preStep({agent,turn:1},async()=>input),input);
    const second=await preStep({agent,turn:2},async()=>input);
    const nextMarker=second.messages[1].content[0].text.match(/\[STARSLEEP_DONE:[a-f0-9]+\]/)[0];
    assert.notEqual(nextMarker,marker);
    const rejected={kind:'reject'};
    assert.equal(await preStep({agent,turn:3},async()=>rejected),rejected);
    assert.equal(night.snapshot().sessions.length,1);
  }finally{
    handlers.get('dispose')?.();bridge.stop();
    assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('starsleep-dsh-'));
    fs.rmSync(root,{recursive:true,force:true});
  }
});

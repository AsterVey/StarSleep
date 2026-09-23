import test from 'node:test';
import assert from 'node:assert/strict';
import {UsageCache} from '../electron/usage-cache';
import {usageView} from '../src/usage-utils';
import {filterCommands} from '../src/components/CommandPalette';
test('usage cache coalesces scans, supports forced refresh and expires from completion',async()=>{
 let now=0,calls=0,release!:(n:number)=>void;const cache=new UsageCache(()=>{calls++;return new Promise<number>(r=>release=r);},()=>now,10);
 const first=cache.read();assert.equal(cache.busy,true);assert.equal(cache.read(true),first);await Promise.resolve();assert.equal(calls,1);now=20;release(7);assert.equal(await first,7);assert.equal(await cache.read(),7);assert.equal(calls,1);
 const forced=cache.read(true);await Promise.resolve();assert.equal(calls,2);release(8);await forced;now=31;const expired=cache.read();await Promise.resolve();release(9);assert.equal(await expired,9);assert.equal(calls,3);
});
test('usage failure is retryable and invalid refresh flags never collect',async()=>{let calls=0;const cache=new UsageCache(async()=>{if(++calls===1)throw Error('offline');return 2;});await assert.rejects(cache.read('yes'));assert.equal(calls,0);await assert.rejects(cache.read(),/offline/);assert.equal(cache.busy,false);assert.equal(await cache.read(),2);cache.clear();assert.equal(await cache.read(),2);assert.equal(calls,3);});
test('clock rollback does not extend a cached report indefinitely',async()=>{let now=50,calls=0;const cache=new UsageCache(async()=>++calls,()=>now);assert.equal(await cache.read(),1);now=40;assert.equal(await cache.read(),2);});
test('daily usage merges selected sources and excludes future or out of range records',()=>{
 const a={date:'2026-09-23',source:'codex' as const,input:100,output:20,cacheRead:60,cacheWrite:0,total:180,models:[]};const b={...a,source:'claude' as const,input:10,cacheRead:20,cacheWrite:5,total:55};
 const view=usageView([a,b,{...a,date:'2026-09-24'},{...a,date:'2026-08-01'}],7,'all',new Date('2026-09-23T12:00:00'));
 assert.equal(view.daily.length,1);assert.equal(view.daily[0].total,235);assert.equal(view.inputTotal,195);assert.equal(view.totals.cacheRead,80);assert.equal(view.chart.length,7);assert.equal(usageView([a,b],1,'codex',new Date('2026-09-23T12:00:00')).daily[0].total,180);
});
test('empty usage has no invented input percentage denominator or recorded days',()=>{const view=usageView([],30,'all');assert.equal(view.daily.length,0);assert.equal(view.inputTotal,0);assert.equal(view.chart.length,30);});
test('command search matches Chinese, aliases and multiple terms without running actions',()=>{let runs=0;const list=[{id:'a',label:'Agent 工作台',description:'Token 用量',keywords:'Codex',run:()=>runs++},{id:'b',label:'设置',description:'声音 外观',run:()=>runs++}];assert.equal(filterCommands(list,'codex token')[0].id,'a');assert.equal(filterCommands(list,'声音')[0].id,'b');assert.equal(filterCommands(list,'unknown').length,0);assert.equal(filterCommands(list,' ').length,2);assert.equal(runs,0);});
test('exact command labels rank above incidental description matches',()=>{const commands=[{id:'quick',label:'快捷计时',description:'设置关机时间',run(){}},{id:'settings',label:'设置',description:'声音外观',run(){}}];assert.equal(filterCommands(commands,'设置')[0].id,'settings');});

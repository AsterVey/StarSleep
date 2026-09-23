import type {TokenCounts,UsageDay,UsageRange,UsageSource} from './toolbox-types';
export const zeroTokens=():TokenCounts=>({input:0,output:0,cacheRead:0,cacheWrite:0,total:0});
export function addTokens(a:TokenCounts,b:TokenCounts){for(const key of Object.keys(a) as (keyof TokenCounts)[])a[key]+=b[key];return a;}
export function localDay(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function usageView(days:UsageDay[],range:UsageRange,source:UsageSource|'all',now=new Date()){
 const start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-range+1),from=localDay(start),until=localDay(now);
 const filtered=days.filter(d=>d.date>=from&&d.date<=until&&(source==='all'||source===d.source));
 const totals=zeroTokens(),models=new Map<string,TokenCounts>(),dailyMap=new Map<string,TokenCounts>();
 for(const day of filtered){addTokens(totals,day);dailyMap.set(day.date,addTokens(dailyMap.get(day.date)||zeroTokens(),day));for(const m of day.models){const key=`${day.source==='codex'?'Codex':'Claude Code'} · ${m.name}`;models.set(key,addTokens(models.get(key)||zeroTokens(),m.tokens));}}
 const chart=Array.from({length:range},(_,i)=>{const date=localDay(new Date(start.getFullYear(),start.getMonth(),start.getDate()+i));return {date,total:filtered.filter(d=>d.date===date).reduce((n,d)=>n+d.total,0)};});
 const daily=[...dailyMap].sort((a,b)=>b[0].localeCompare(a[0])).map(([date,tokens])=>({date,...tokens}));
 return {filtered,totals,daily,inputTotal:totals.input+totals.cacheRead+totals.cacheWrite,models:[...models].sort((a,b)=>b[1].total-a[1].total),chart,from,until};
}

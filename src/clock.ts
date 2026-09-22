import { useSyncExternalStore } from 'react';
let now=Date.now();
const listeners=new Set<()=>void>();
export function setClock(value:number){now=value;listeners.forEach(fn=>fn());}
export function useClock(){return useSyncExternalStore(callback=>{listeners.add(callback);return()=>{listeners.delete(callback);};},()=>now);}

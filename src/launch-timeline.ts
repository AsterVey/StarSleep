export const LAUNCH_MS=6400;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
/** Absolute-time choreography. No clock writes or scheduler interaction. */
export function launchFrame(elapsed:number){
 const t=clamp(elapsed/LAUNCH_MS),charge=smooth(t/.2),flight=smooth((t-.18)/.48),arrival=smooth((t-.63)/.27);
 return {t,charge,flight,arrival,travel:flight*650,boost:Math.sin(flight*Math.PI),fade:1-smooth((t-.89)/.11),fov:58+flight*32-arrival*25,roll:Math.sin(flight*Math.PI)*.095,phase:t<.2?'charge':t<.64?'flight':'arrival'} as const;
}

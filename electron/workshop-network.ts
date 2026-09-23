import type {ThemeFetch} from './workshop-core';
import {MAX_THEME_BYTES} from './themes';
export function themeDownloader(fetcher:typeof fetch):ThemeFetch{return async(url,signal,progress)=>{
 const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='raw.githubusercontent.com'||u.username||u.password||!/^\/[^/]+\/[^/]+\/[a-f0-9]{40}\//.test(u.pathname))throw Error('只允许已固定提交的社区文件');
 const timeout=AbortSignal.timeout(60000),combined=AbortSignal.any([signal,timeout]);
 const response=await fetcher(url,{signal:combined,redirect:'error',credentials:'omit'});if(!response.ok)throw Error(`下载失败（HTTP ${response.status}），请稍后重试`);
 const declared=Number(response.headers.get('content-length'))||undefined;if(declared&&declared>MAX_THEME_BYTES)throw Error('文件超过 32 MB');const total=response.headers.get('content-encoding')?undefined:declared;
 const reader=response.body?.getReader();if(!reader)throw Error('服务器没有返回文件');const chunks:Buffer[]=[];let received=0;
 try{for(;;){const part=await reader.read();if(part.done)break;received+=part.value.length;if(received>MAX_THEME_BYTES)throw Error('文件超过 32 MB');chunks.push(Buffer.from(part.value));progress(received,total);}return Buffer.concat(chunks);}finally{await reader.cancel().catch(()=>{});}
};}

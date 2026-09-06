// Native-fetch fallback for networks on which Electron's postinstall downloader stalls.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const version=require('electron/package.json').version;
const filename=`electron-v${version}-win32-x64.zip`;
const dir=path.resolve('.cache/manual');fs.mkdirSync(dir,{recursive:true});
const zip=path.join(dir,'verified-'+filename);
const manifest=await fetch(`https://cdn.npmmirror.com/binaries/electron/v${version}/SHASUMS256.txt`,{signal:AbortSignal.timeout(60000)});
if(!manifest.ok)throw new Error('Unable to read official checksum');
const expected=(await manifest.text()).split('\n').find(line=>line.trim().endsWith(filename))?.split(/\s+/)[0];
if(!expected)throw new Error('Missing official checksum');
const url=`https://cdn.npmmirror.com/binaries/electron/v${version}/${filename}`;
const response=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(20000)});
if(!response.ok)throw new Error(`Download failed: ${response.status}`);
const size=Number(response.headers.get('content-length')),chunkSize=2*1024*1024;
if(!size)throw new Error('Missing content length');
let part=0,total=0;const fd=fs.openSync(zip,'w');fs.ftruncateSync(fd,size);
try { await Promise.all(Array.from({length:6},async()=>{while(true){const start=part++*chunkSize;if(start>=size)return;const end=Math.min(start+chunkSize,size)-1;let chunk;
  for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(url,{headers:{Range:`bytes=${start}-${end}`},signal:AbortSignal.timeout(30000)});if(r.status!==206)throw new Error(`Range response ${r.status}`);chunk=Buffer.from(await r.arrayBuffer());if(chunk.length!==end-start+1)throw new Error('Incomplete range');break;}catch(e){if(attempt===2)throw e;}}
  fs.writeSync(fd,chunk,0,chunk.length,start);total+=chunk.length;console.log(`Downloaded ${Math.round(total/1024/1024)} / ${Math.round(size/1024/1024)} MB`);
}})); } finally {fs.closeSync(fd);}
const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(zip))hash.update(chunk);
if(hash.digest('hex')!==expected)throw new Error('Checksum mismatch; refusing to extract');
console.log('Release manifest SHA-256 verified:',filename);

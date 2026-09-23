import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {atomicJson} from './agent-bridge';
import type {WallpaperItem} from '../src/integration-types';

export const MAX_WALLPAPER_BYTES=10*1024*1024;
type Stored=Omit<WallpaperItem,'thumbnail'> & {file:string;hash?:string};
export type ImageDecoder=(bytes:Buffer)=>{width:number;height:number;thumbnail:string;normalized:Buffer};
const builtins:Stored[]=[
  {id:'tidal-glass',name:'潮汐琉璃',description:'冰蓝玻璃与柔和折光，适合 Mist 浅色界面。',builtin:true,width:1672,height:941,file:'tidal-glass.png'},
  {id:'cloud-fjord',name:'云湾',description:'雾中山水与清晨微光，让长时间工作更安静。',builtin:true,width:1672,height:941,file:'cloud-fjord.png'},
];
export function validateWallpaper(bytes:Buffer,decode:ImageDecoder){
  if(!bytes.length||bytes.length>MAX_WALLPAPER_BYTES)throw new Error('背景图片须小于 10 MB');
  const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  if(!png&&!jpg&&!webp)throw new Error('请选择 PNG、JPEG 或 WebP 图片，不支持 SVG 或动图');
  const image=decode(bytes);
  if(!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width<320||image.height<180||image.width>8192||image.height>8192||image.width*image.height>32_000_000)throw new Error('图片尺寸须至少 320×180，单边不超过 8192 像素，总像素不超过 3200 万');
  if(!image.normalized.length||image.normalized.length>MAX_WALLPAPER_BYTES)throw new Error('图片解码失败或转换后超过 10 MB，请换一张图片');
  return image;
}
export class WallpaperLibrary{
  private dir:string;private index:string;private items:Stored[]=[];private cache=new Map<string,string>();error='';
  constructor(root:string,private assets:string,private decode:ImageDecoder){
    this.dir=path.join(root,'wallpapers');this.index=path.join(this.dir,'library.json');
    if(fs.existsSync(this.index))try{
      const value=JSON.parse(fs.readFileSync(this.index,'utf8'));
      if(value.version!==1||!Array.isArray(value.items)||value.items.length>24||value.items.some((i:any)=>!i||typeof i.id!=='string'||!/^[a-f0-9-]{36}$/.test(i.id)||i.file!==i.id+'.jpg'||i.builtin!==false||typeof i.name!=='string'||i.name.length>80))throw 0;
      this.items=value.items;
    }catch{this.error='个人背景库读取失败，已保留原文件。内置背景仍可使用。';}
  }
  private get(id:unknown){const item=[...builtins,...this.items].find(i=>i.id===id);if(!item)throw new Error('背景不存在，请刷新背景库');return item;}
  private location(i:Stored){return path.join(i.builtin?this.assets:this.dir,i.file);}
  raw(id:unknown){const file=this.location(this.get(id));const fd=fs.openSync(file,'r');try{if(fs.fstatSync(fd).size>MAX_WALLPAPER_BYTES)throw new Error('图片超过 10 MB');const bytes=Buffer.alloc(MAX_WALLPAPER_BYTES+1);const n=fs.readSync(fd,bytes,0,bytes.length,0);if(n>MAX_WALLPAPER_BYTES)throw new Error('图片超过 10 MB');return bytes.subarray(0,n);}finally{fs.closeSync(fd);}}
  list(){return [...builtins,...this.items].map(i=>{let thumbnail=this.cache.get(i.id);if(!thumbnail){thumbnail=this.decode(this.raw(i.id)).thumbnail;this.cache.set(i.id,thumbnail);}const {file,hash,...item}=i;return {...item,thumbnail};});}
  item(id:unknown){return this.get(id);}
  private save(items:Stored[]){if(this.error)throw new Error(this.error);fs.mkdirSync(this.dir,{recursive:true});if(fs.existsSync(this.index))fs.copyFileSync(this.index,this.index+'.bak');atomicJson(this.index,{version:1,items});this.items=items;}
  import(bytes:Buffer,filename:string){
    if(this.error)throw new Error(this.error);if(this.items.length>=24)throw new Error('最多保存 24 张个人背景，请先移除不用的图片');
    const image=validateWallpaper(bytes,this.decode),hash=createHash('sha256').update(image.normalized).digest('hex');
    if(this.items.some(i=>i.hash===hash))throw new Error('这张图片已在背景库中');
    const id=randomUUID(),item:Stored={id,name:path.basename(filename,path.extname(filename)).slice(0,80)||'我的背景',description:'本地导入 · 推荐配合 Mist 使用',builtin:false,width:image.width,height:image.height,file:id+'.jpg',hash};
    fs.mkdirSync(this.dir,{recursive:true});fs.writeFileSync(this.location(item),image.normalized,{flag:'wx'});
    try{this.save([...this.items,item]);}catch(error){fs.unlinkSync(this.location(item));throw error;}
    this.cache.set(id,image.thumbnail);return id;
  }
  remove(id:unknown){const item=this.get(id);if(item.builtin)throw new Error('内置背景不能删除');this.save(this.items.filter(i=>i.id!==id));this.cache.delete(item.id);fs.rmSync(this.location(item),{force:true});}
}

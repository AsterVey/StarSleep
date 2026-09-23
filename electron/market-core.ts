import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import type {GithubRepo,SkillTarget,SkillAudit,AuditFinding,InstalledSkill,RepositorySkills} from '../src/market-types';

export type FetchBytes=(url:string,limit:number)=>Promise<Buffer>;
type TreeFile={path:string;type:string;mode:string;sha:string;size?:number};
type RecordEntry=InstalledSkill & {hashes:Record<string,string>};
type Review={audit:SkillAudit;files:Map<string,Buffer>};
type Operation={version:1;kind:'install'|'remove'|'restore';phase:'prepared'|'complete';record:RecordEntry};
const MAX_FILE=1024*1024,MAX_TOTAL=8*1024*1024;
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
export function repoName(value:unknown):string {
 if(typeof value!=='string'||! /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/.test(value)||value.split('/')[1]==='..')throw new Error('请输入 owner/repo 形式的公开 GitHub 仓库');
 return value;
}
export function safeRelative(value:string){
 if(!value||value.length>240||value.split('/').some(s=>!s||s==='.'||s==='..'||/[\\<>:"|?*\x00-\x1f]/.test(s)||/[. ]$/.test(s)||/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(s)||/^\.git$/i.test(s)))throw new Error('仓库包含不支持的文件路径');
 return value;
}
// Adapted from vercel-labs/skills src/installer.ts sanitizeName (MIT).
// Upstream 7407f3893ad4dceab546ac002c3ef806e4000c73; license shipped in THIRD_PARTY_NOTICES.
export function skillDirectory(name:string){
 const sanitized=name.toLowerCase().replace(/[^a-z0-9._]+/g,'-').replace(/^[.\-]+|[.\-]+$/g,'').substring(0,64)||'unnamed-skill';
 return safeRelative(sanitized);
}
function noLinks(location:string){
 let current=path.resolve(location);while(current!==path.dirname(current)){if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw new Error('目标路径包含符号链接，请使用普通目录');current=path.dirname(current);}
}
export function auditFiles(files:Map<string,Buffer>):{name:string;description:string;findings:AuditFinding[];readme:string}{
 const findings:AuditFinding[]=[],readme=files.get('SKILL.md')?.toString('utf8')||'';
 const front=readme.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1]||'';
 const field=(key:string)=>{const lines=front.split(/\r?\n/),i=lines.findIndex(s=>s.startsWith(key+':'));if(i<0)return '';const raw=lines[i].slice(key.length+1).trim();if(/^[|>][-+]?$/.test(raw)){const result:string[]=[];for(let n=i+1;n<lines.length&&/^\s/.test(lines[n]);n++)result.push(lines[n].trim());return result.join(' ');}return raw.replace(/^['"]|['"]$/g,'');};
 const name=field('name'),description=field('description');
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)||name.length>64||!description)findings.push({level:'block',file:'SKILL.md',message:'缺少有效的 name / description 元数据；暂不能自动安装。'});
 const rules:[RegExp,string][]=[
  [/\b(curl|wget|Invoke-WebRequest)\b.*\|.*\b(sh|bash|iex|Invoke-Expression)\b/i,'下载后立即执行命令'],
  [/\b(rm\s+-[a-z]*r[a-z]*f|Remove-Item\b.*-Recurse|format\s+[a-z]:|shutdown\s+\/)/i,'删除、格式化或关机操作'],
  [/ignore\s+(all\s+)?(previous|prior|system)\s+(instructions|rules)|忽略.{0,6}(之前|系统).{0,6}(指令|规则)/i,'可能改写 Agent 的指令边界'],
  [/\.ssh|credentials|API[_-]?KEY|access[_-]?token|\.env\b/i,'可能读取凭据或需要密钥配置'],
  [/\b(eval\s*\(|exec\s*\(|child_process|subprocess|Invoke-Expression|EncodedCommand)\b/i,'动态执行或调用子进程'],
  [/https?:\/\//i,'外部网址或联网依赖，请确认目标'],
  [/\.\.\//,'引用技能目录之外的文件，可能需要额外依赖'],
 ];
 for(const [file,bytes]of files){
  if(/\.(exe|dll|msi|com|scr|node|wasm|zip|gz|7z|jar|pyc)$/i.test(file)||bytes.subarray(0,8000).includes(0)){findings.push({level:'block',file,message:'包含二进制或压缩内容，本版无法审查，停止自动安装。'});continue;}
  if(/\.(py|js|ts|mjs|cjs|sh|ps1|bat|cmd)$/i.test(file))findings.push({level:'review',file,message:'包含可执行脚本；安装不执行，但 Agent 使用时可能执行。'});
  bytes.toString('utf8').split(/\r?\n/).forEach((line,index)=>{for(const[pattern,message]of rules)if(pattern.test(line)&&findings.length<300)findings.push({level:'review',file,line:index+1,message});});
 }
 if(findings.length>=300)findings.push({level:'review',file:'',message:'结果已截取前 300 项，请结合文件原文审查。'});
 if(!findings.length)findings.push({level:'info',file:'SKILL.md',message:'未命中当前静态规则；这不代表技能已通过完整安全审计。'});
 return {name,description,findings,readme};
}
export class SkillMarket {
 private repositories=new Map<string,{value:RepositorySkills;tree:TreeFile[]}>();
 private reviews=new Map<string,Review>();
 private searchCache=new Map<string,{at:number;data:any}>();
 private records:RecordEntry[]=[];
 error='';
 constructor(private root:string,readonly targets:Record<SkillTarget,string>,private fetchBytes:FetchBytes){
  const prefs=path.join(root,'skill-targets.json');if(fs.existsSync(prefs)){try{const p=JSON.parse(fs.readFileSync(prefs,'utf8'));if(p.version!==1||!p.targets||Object.entries(p.targets).some(([k,v])=>!['codex','claude','deepseek'].includes(k)||typeof v!=='string'||!path.isAbsolute(v)))throw Error();Object.assign(targets,p.targets);}catch{this.error='技能目标配置损坏，已停用安装和卸载，请检查 skill-targets.json。';}}
  const file=path.join(root,'skill-installs.json');
  if(fs.existsSync(file)){try{const data=JSON.parse(fs.readFileSync(file,'utf8'));if(data.version!==1||!Array.isArray(data.installs)||data.installs.some((r:any)=>!r||typeof r.id!=='string'||! /^[a-f0-9-]{36}$/.test(r.id)||!['codex','claude','deepseek'].includes(r.target)||typeof r.name!=='string'||skillDirectory(r.name)!==r.name||typeof r.destination!=='string'||!['installed','removed'].includes(r.status)||typeof r.hashes!=='object'||!r.hashes||Object.entries(r.hashes).some(([p,h])=>safeRelative(p)!==p||typeof h!=='string'||! /^[a-f0-9]{64}$/.test(h))))throw Error();this.records=data.installs;}catch{this.error='安装记录损坏，已停止安装与卸载；原有 Skills 和定时计划不受影响。';}}
  if(!this.error)this.recover();
 }
 private operationFile(){return path.join(this.root,'skill-operation.json');}
 private journal(operation:Operation){
  fs.mkdirSync(this.root,{recursive:true});const file=this.operationFile(),fd=fs.openSync(file+'.tmp','w');
  try{fs.writeFileSync(fd,JSON.stringify(operation));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(file+'.tmp',file);
 }
 private operationPaths(op:Operation){
  const r=op.record;if(!r||!Object.hasOwn(this.targets,r.target)||typeof r.id!=='string'||!/^[-a-f0-9]{36}$/.test(r.id)||typeof r.name!=='string'||skillDirectory(r.name)!==r.name||!r.hashes||Object.entries(r.hashes).some(([p,h])=>safeRelative(p)!==p||typeof h!=='string'||!/^\w{64}$/.test(h)))throw Error('操作记录无效');
  const destination=path.join(this.targets[r.target],r.name);if(path.resolve(destination)!==path.resolve(r.destination))throw Error('安装目录已变化');
  const staging=path.join(path.dirname(this.targets[r.target]),'.starsleep-staging',r.id),disabled=this.disabled(r);
  return op.kind==='install'?{from:staging,to:destination}:op.kind==='remove'?{from:destination,to:disabled}:{from:disabled,to:destination};
 }
 private finish(op:Operation){
  const record={...op.record,status:op.kind==='remove'?'removed' as const:'installed' as const};
  this.save([...this.records.filter(r=>r.id!==record.id),record]);this.journal({...op,phase:'complete'});
 }
 private recover(){
  const file=this.operationFile();if(!fs.existsSync(file))return;
  try{const op=JSON.parse(fs.readFileSync(file,'utf8')) as Operation;if(op.version!==1||!['install','remove','restore'].includes(op.kind)||!['prepared','complete'].includes(op.phase))throw Error('操作记录格式无效');
   const {from,to}=this.operationPaths(op);if(op.phase==='complete')return;
   noLinks(from);noLinks(to);const a=fs.existsSync(from),b=fs.existsSync(to);
   if(a&&!b){this.verify(op.record,from);fs.mkdirSync(path.dirname(to),{recursive:true});fs.renameSync(from,to);this.finish(op);}
   else if(!a&&b){this.verify(op.record,to);this.finish(op);}
   else throw Error('源目录与目标目录状态冲突');
  }catch{this.error='有待处理的 Skills 操作：目录或文件与操作记录不一致。已保留所有文件，请在配置体检中核对；计划不受影响。';}
 }
 private transact(kind:Operation['kind'],record:RecordEntry){
  const op:Operation={version:1,kind,phase:'prepared',record},locations=this.operationPaths(op);
  this.journal(op);try{fs.renameSync(locations.from,locations.to);this.finish(op);}catch(e){this.error='Skills 操作未完成，文件已保留；请重启以核对并恢复操作记录。';throw e;}
 }
 inspect(){return this.records.map(r=>{try{this.verify(r,this.location(r.id));return {id:r.id,name:r.name,target:r.target,status:'ok',detail:r.status==='removed'?'移除备份完整':'安装文件完整'};}catch{return {id:r.id,name:r.name,target:r.target,status:'attention',detail:'文件缺失或已修改；保留用户内容，请人工核对'};}});}
 private async json(url:string){return JSON.parse((await this.fetchBytes(url,12*1024*1024)).toString('utf8'));}
 configureTarget(target:SkillTarget,folder:string){if(this.error)throw new Error(this.error);if(!Object.hasOwn(this.targets,target)||!path.isAbsolute(folder))throw new Error('目标无效');if(this.records.some(r=>r.target===target))throw new Error('此目标已有安装或备份记录，暂不能更换目录，以免丢失管理关系');noLinks(folder);const next={...this.targets,[target]:folder};fs.mkdirSync(this.root,{recursive:true});const file=path.join(this.root,'skill-targets.json');fs.writeFileSync(file+'.tmp',JSON.stringify({version:1,targets:next}));if(fs.existsSync(file))fs.copyFileSync(file,file+'.bak');fs.renameSync(file+'.tmp',file);this.targets[target]=folder;}
 private metadata(data:any):GithubRepo{return {name:repoName(data.full_name),description:String(data.description||'没有提供项目简介').slice(0,600),stars:Number(data.stargazers_count)||0,updated:String(data.pushed_at||''),archived:!!data.archived,license:String(data.license?.spdx_id||'未声明'),branch:String(data.default_branch||'main')};}
 async search(query:unknown,sort:unknown,page:unknown){
  if(typeof query!=='string'||query.trim().length<2||query.length>160||!['relevance','stars','updated'].includes(String(sort))||!Number.isInteger(page)||Number(page)<1||Number(page)>10)throw new Error('请输入 2–160 字的关键词；最多查看前 10 页');
  const params=new URLSearchParams({q:query.trim()+' archived:false',per_page:'12',page:String(page)});if(sort!=='relevance')params.set('sort',String(sort));const url='https://api.github.com/search/repositories?'+params;
  const cached=this.searchCache.get(url);if(cached&&Date.now()-cached.at<300000)return cached.data;
  const value=await this.json(url),data={items:(value.items||[]).map((r:any)=>this.metadata(r)),total:Math.min(Number(value.total_count)||0,120),partial:!!value.incomplete_results};
  if(this.searchCache.size>30)this.searchCache.clear();this.searchCache.set(url,{at:Date.now(),data});return data;
 }
 async discover(repo:string):Promise<RepositorySkills>{
  repoName(repo);const meta=this.metadata(await this.json(`https://api.github.com/repos/${repo}`));
  const commit=await this.json(`https://api.github.com/repos/${repo}/commits/${encodeURIComponent(meta.branch)}`);
  if(!/^[a-f0-9]{40}$/.test(commit.sha))throw new Error('无法确定仓库提交版本');
  const tree=await this.json(`https://api.github.com/repos/${repo}/git/trees/${commit.sha}?recursive=1`);
  if(tree.truncated||!Array.isArray(tree.tree)||tree.tree.length>50000)throw new Error('仓库目录过大，无法完整检查；请选择较小的技能仓库');
  const skills=tree.tree.filter((f:TreeFile)=>f.type==='blob'&&/(^|\/)SKILL.md$/.test(f.path)).map((f:TreeFile)=>({path:f.path==='SKILL.md'?'':f.path.slice(0,-9),name:f.path==='SKILL.md'?repo.split('/')[1]:f.path.split('/').at(-2)!}));
  const value={repo:meta,commit:commit.sha,skills};if(this.repositories.size>=10)this.repositories.delete(this.repositories.keys().next().value!);this.repositories.set(meta.name,{value,tree:tree.tree});return value;
 }
 async audit(repo:string,commit:string,skillPath:string):Promise<SkillAudit>{
  const found=this.repositories.get(repo);if(!found||found.value.commit!==commit||!found.value.skills.some(s=>s.path===skillPath))throw new Error('请重新发现仓库中的 Skills');
  const prefix=skillPath?skillPath+'/':'';
  const entries=found.tree.filter(f=>f.path.startsWith(prefix)&&f.type!=='tree');
  if(!entries.length||entries.length>150)throw new Error('技能包超过 150 个文件，暂不支持自动安装');
  let total=0;const seen=new Set<string>();
  for(const f of entries){const name=safeRelative(f.path.slice(prefix.length));if(seen.has(name.toLowerCase()))throw new Error('技能包含大小写冲突路径');seen.add(name.toLowerCase());if(!['100644','100755'].includes(f.mode)||f.type!=='blob')throw new Error('技能包含符号链接或子模块，无法完整审查');if(!Number.isSafeInteger(f.size)||f.size!>MAX_FILE||(total+=f.size!)>MAX_TOTAL)throw new Error('技能大小超出限制（单文件 1 MB / 总共 8 MB）');}
  const files=new Map<string,Buffer>();
  for(let i=0;i<entries.length;i+=4)await Promise.all(entries.slice(i,i+4).map(async f=>{const bytes=await this.fetchBytes(`https://raw.githubusercontent.com/${repo}/${commit}/${f.path.split('/').map(encodeURIComponent).join('/')}`,MAX_FILE);const sha=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');if(sha!==f.sha)throw new Error('下载文件与已选提交不一致，请重新审查');files.set(f.path.slice(prefix.length),bytes);}));
  // Preserve nearest ancestor license/notice alongside the selected subtree.
  const ancestors=skillPath.split('/');ancestors.pop();const parents:string[]=[];while(ancestors.length){parents.push(ancestors.join('/')+'/');ancestors.pop();}parents.push('');
  for(const basename of ['LICENSE','LICENSE.md','LICENSE.txt','NOTICE','NOTICE.md','COPYING']){
   if([...files.keys()].some(p=>p.toLowerCase()===basename.toLowerCase()))continue;
   const entry=parents.map(p=>found.tree.find(f=>f.path===p+basename&&f.type==='blob')).find(Boolean);if(!entry)continue;
   if(!['100644','100755'].includes(entry.mode)||!entry.size||entry.size>MAX_FILE||(total+=entry.size)>MAX_TOTAL)throw new Error('上级许可文件无法安全读取');
   const bytes=await this.fetchBytes(`https://raw.githubusercontent.com/${repo}/${commit}/${entry.path.split('/').map(encodeURIComponent).join('/')}`,MAX_FILE);
   if(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')!==entry.sha)throw new Error('许可文件与提交版本不一致');files.set(basename,bytes);
  }
  const result=auditFiles(files);if(found.value.repo.archived)result.findings.push({level:'review',file:'',message:'作者已归档此仓库，后续可能不再维护。'});
  if(['未声明','NOASSERTION'].includes(found.value.repo.license))result.findings.push({level:'review',file:'',message:'仓库未提供可识别许可证，请查看作者的使用条款。'});
  const audit:SkillAudit={token:randomUUID(),repo,commit,path:skillPath,...result,files:[...files].map(([p,b])=>({path:p,bytes:b.length})).sort((a,b)=>a.path.localeCompare(b.path)),expires:Date.now()+30*60000,license:found.value.repo.license};
  if(this.reviews.size>=3)this.reviews.delete(this.reviews.keys().next().value!);this.reviews.set(audit.token,{audit,files});return audit;
 }
 review(token:string){const found=this.reviews.get(token);if(!found||found.audit.expires<Date.now())throw new Error('审查已过期，请重新审查技能');return found;}
 file(token:string,file:string){const bytes=this.review(token).files.get(file);if(!bytes)throw new Error('文件不在审查清单中');if(bytes.includes(0))return '二进制文件不提供文本预览。';return bytes.toString('utf8');}
 installable(token:string){const review=this.review(token);if(review.audit.findings.some(f=>f.level==='block'))throw new Error('此技能存在阻止安装的问题，请先联系作者修复');return review;}
 list(){return this.records.map(({hashes,...r})=>r);}
 private save(next:RecordEntry[]){
  if(this.error)throw new Error(this.error);fs.mkdirSync(this.root,{recursive:true});const file=path.join(this.root,'skill-installs.json'),temp=file+'.tmp';
  try{fs.writeFileSync(temp,JSON.stringify({version:1,installs:next},null,2));if(fs.existsSync(file))fs.copyFileSync(file,file+'.bak');fs.renameSync(temp,file);this.records=next;}catch{throw new Error('无法保存安装记录，操作已停止');}
 }
 install(token:string,target:SkillTarget):InstalledSkill{
  if(this.error)throw new Error(this.error);if(!Object.hasOwn(this.targets,target))throw new Error('不支持的安装目标');const {audit,files}=this.installable(token),base=this.targets[target],name=skillDirectory(audit.name),destination=path.join(base,name);
  noLinks(destination);if(fs.existsSync(destination))throw new Error('同名技能已存在，不会覆盖。请先在安装记录中处理旧版本或改用其他技能');
  const id=randomUUID(),stage=path.join(path.dirname(base),'.starsleep-staging',id);noLinks(stage);fs.mkdirSync(stage,{recursive:true});fs.mkdirSync(base,{recursive:true});
  const hashes:Record<string,string>=Object.create(null);
  for(const [p,b]of files){const dest=path.join(stage,safeRelative(p));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,b,{flag:'wx'});hashes[p]=hash(b);}
  const record:RecordEntry={id,name,repo:audit.repo,commit:audit.commit,skillPath:audit.path,target,destination,installedAt:Date.now(),status:'installed',hashes};
  this.transact('install',record);const {hashes:_,...publicRecord}=record;return publicRecord;
 }
 private record(id:string){const r=this.records.find(r=>r.id===id);if(!r)throw new Error('安装记录不存在');const dest=path.join(this.targets[r.target],skillDirectory(r.name));if(path.resolve(dest)!==path.resolve(r.destination))throw new Error('安装目标已变化，请手动检查原目录');return r;}
 private disabled(r:RecordEntry){return path.join(path.dirname(this.targets[r.target]),'.starsleep-disabled',r.id);}
 private verify(r:RecordEntry,folder:string){
  noLinks(folder);if(!fs.existsSync(folder))throw new Error('技能目录已不存在，请检查本地文件');let count=0;
  const walk=(dir:string)=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name),relative=path.relative(folder,full).split(path.sep).join('/');if(entry.isSymbolicLink())throw new Error('技能目录已修改，停止操作');if(entry.isDirectory())walk(full);else {const expected=r.hashes[relative];if(!expected||fs.statSync(full).size>MAX_FILE||hash(fs.readFileSync(full))!==expected)throw new Error('文件已被修改或新增，已保留全部内容，请手动处理');count++;}}};walk(folder);if(count!==Object.keys(r.hashes).length)throw new Error('技能文件已被修改或删除，停止操作');
 }
 remove(id:string){if(this.error)throw new Error(this.error);const r=this.record(id);if(r.status!=='installed')throw new Error('此技能已移除');this.verify(r,r.destination);const disabled=this.disabled(r);noLinks(disabled);fs.mkdirSync(path.dirname(disabled),{recursive:true});if(fs.existsSync(disabled))throw new Error('备份已存在，请检查后重试');this.transact('remove',r);}
 restore(id:string){if(this.error)throw new Error(this.error);const r=this.record(id);if(r.status!=='removed')throw new Error('技能已处于安装状态');const backup=this.disabled(r);this.verify(r,backup);noLinks(r.destination);if(fs.existsSync(r.destination))throw new Error('同名目录已存在，无法恢复');fs.mkdirSync(path.dirname(r.destination),{recursive:true});this.transact('restore',r);}
 location(id:string){const r=this.record(id);return r.status==='removed'?this.disabled(r):r.destination;}
}

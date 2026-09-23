export type SkillTarget = 'codex' | 'claude' | 'deepseek';
export interface GithubRepo { name:string; description:string; stars:number; updated:string; archived:boolean; license:string; branch:string }
export interface SkillCandidate { path:string; name:string }
export interface RepositorySkills { repo:GithubRepo; commit:string; skills:SkillCandidate[] }
export interface AuditFinding { level:'block'|'review'|'info'; file:string; line?:number; message:string }
export interface SkillAudit { token:string; repo:string; commit:string; path:string; name:string; description:string; files:{path:string;bytes:number}[]; findings:AuditFinding[]; readme:string; expires:number; license:string }
export interface InstalledSkill { id:string; name:string; repo:string; commit:string; skillPath:string; target:SkillTarget; destination:string; installedAt:number; status:'installed'|'removed' }
export interface MarketState { installs:InstalledSkill[]; error?:string; targets:{id:SkillTarget;name:string;path:string;detail:string}[] }
export interface MarketApi {
 githubSearch(query:string,sort:'relevance'|'stars'|'updated',page:number):Promise<{items:GithubRepo[];total:number;partial:boolean}>;
 githubSkills(repo:string):Promise<RepositorySkills>;
 skillAudit(repo:string,commit:string,path:string):Promise<SkillAudit>;
 skillAuditFile(token:string,path:string):Promise<string>;
 skillInstall(token:string,target:SkillTarget):Promise<InstalledSkill>;
 skillZip(token:string):Promise<boolean>;
 marketState():Promise<MarketState>;
 marketTarget(target:SkillTarget):Promise<boolean>;
 skillUninstall(id:string):Promise<void>;
 skillRestore(id:string):Promise<void>;
 marketReveal(id:string):Promise<void>;
 marketOpen(repo:string):Promise<void>;
}

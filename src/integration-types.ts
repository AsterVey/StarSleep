export type AgentProvider = 'codex' | 'claude' | 'deepseek';
export type AgentStatus = 'running' | 'waiting' | 'completed' | 'failed' | 'disconnected';
export interface AgentSession { id:string; provider:AgentProvider; sessionId:string; name:string; status:AgentStatus; detail:string; seenAt:number; pid:number; children:string[]; }
export interface NightSnapshot { sessions:AgentSession[]; armed:boolean; selected:string[]; message:string; settleAt:number|null; deadline:number|null; bridgeReady:boolean; }
export type ThemeFormat = 'codex-native' | 'dsh-appearance' | 'dsh-dreamskin' | 'claude-json' | 'dreamskin-zip' | 'custom-css';
export interface ThemeItem { id:string; name:string; format:ThemeFormat; colors:string[]; importedAt:number; note:string; style?:'light'|'dark'; }
export interface ThemeClient {ready:boolean;label:string;detail:string;configPath:string;}
export interface ThemeClients {codex:ThemeClient;claude:ThemeClient;deepseek?:ThemeClient;}
export interface WallpaperItem {id:string;name:string;description:string;builtin:boolean;width:number;height:number;thumbnail:string;}
export interface WallpaperSnapshot {items:WallpaperItem[];error:string;}
export interface IntegrationSnapshot { night:NightSnapshot; themes:ThemeItem[]; installed:{codex:boolean;claude:boolean}; realHooks?:{codex:{installed:boolean;path:string};claude:{installed:boolean;path:string}}; clients?:ThemeClients; codexRestore?:boolean; dshRestore?:boolean; error?:string; }
export interface IntegrationApi {
  wallpaperList():Promise<WallpaperSnapshot>;
  wallpaperImport():Promise<string|false>;
  wallpaperPreview(id:string):Promise<string>;
  wallpaperExport(id:string):Promise<boolean>;
  wallpaperRemove(id:string):Promise<void>;
  wallpaperDshApply(id:string):Promise<string>;
  themeDshSelect():Promise<IntegrationSnapshot|false>;
  themeDshApply(id:string):Promise<string>;
  themeDshRestore():Promise<string>;
  integrations():Promise<IntegrationSnapshot>;
  integrationChanged(callback:(value:IntegrationSnapshot)=>void):()=>void;
  agentArm(ids:string[]):Promise<IntegrationSnapshot>;
  agentDisarm():Promise<IntegrationSnapshot>;
  agentConnect(provider:'codex'|'claude',install:boolean,real?:boolean):Promise<IntegrationSnapshot|false>;
  agentExportDsh():Promise<boolean>;
  agentDemo():Promise<IntegrationSnapshot>;
  themeImport():Promise<IntegrationSnapshot|string|false>;
  themeImportText(text:string,name:string):Promise<IntegrationSnapshot>;
  themeCopy(id:string):Promise<string>;
  themeExport(id:string):Promise<boolean>;
  themeRemove(id:string):Promise<IntegrationSnapshot>;
  themeClaudeApply(id:string):Promise<string>;
  themeClaudeRestore():Promise<string>;
  themeClients():Promise<IntegrationSnapshot>;
  themeCodexApply(id:string):Promise<string>;
  themeCodexRestore():Promise<string>;
  integrationLink(target:'codex-theme'|'dsh-theme'|'claude-theme'|'guide'):Promise<void>;
}

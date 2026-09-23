import type {MarketApi} from './market-types';
export type UsageSource='codex'|'claude';
export type UsageRange=1|7|30;
export interface TokenCounts {input:number;output:number;cacheRead:number;cacheWrite:number;total:number}
export interface UsageDay extends TokenCounts {date:string;source:UsageSource;models:{name:string;tokens:TokenCounts}[]}
export interface UsageStatus {source:UsageSource;path:string;status:'ready'|'empty'|'missing'|'error';detail:string}
export interface UsageReport {generatedAt:number;days:UsageDay[];sources:UsageStatus[];engine:string}
export type ResourceCategory='skills'|'plugins'|'mcp'|'tools';
export interface ResourceItem {id:string;name:string;owner:string;category:ResourceCategory;clients:string[];summary:string;useCase:string;setup:string;license:string;url:string;checked:string}
export interface ResourceMark {favorite:boolean;note:string}
export interface LocalSkill {id:string;name:string;description:string;client:string;path:string}
export interface ToolboxState {marks:Record<string,ResourceMark>;error?:string;paths:Record<UsageSource,string>}
export interface ToolboxApi extends MarketApi {
 toolboxState():Promise<ToolboxState>;
 usageRead(force?:boolean):Promise<UsageReport>;
 usageSelect(source:UsageSource):Promise<ToolboxState|false>;
 usageReset(source:UsageSource):Promise<ToolboxState>;
 usageExport(range:UsageRange,source:UsageSource|'all'):Promise<boolean>;
 resourceMark(id:string,mark:ResourceMark):Promise<ToolboxState>;
 resourceOpen(id:string):Promise<void>;
 resourceCopy(id:string):Promise<void>;
 localSkills():Promise<{items:LocalSkill[];warnings:string[]}>;
 skillReveal(id:string):Promise<void>;
}

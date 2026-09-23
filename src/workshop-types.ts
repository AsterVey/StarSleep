import type {AgentProvider,ThemeFormat,ThemeClients} from './integration-types';
export interface CommunityTheme {id:string;name:string;author:string;client:AgentProvider;style:'light'|'dark';format:ThemeFormat;version:string;loader:string;license:string;source:string;checked:string;colors:string[];description:string;download?:{url:string;filename:string;sha256:string};licenseText?:string;}
export interface DownloadTask {id:string;resourceId:string;status:'downloading'|'done'|'cancelled'|'failed';received:number;total?:number;themeId?:string;error?:string;at:number;}
export interface ThemeProvenance {resourceId?:string;source?:string;version?:string;writtenAt?:number;confirmedAt?:number;client?:AgentProvider;}
export interface WorkshopState {favorites:string[];tasks:DownloadTask[];themes:Record<string,ThemeProvenance>;error?:string;}
export interface HealthItem {name:string;status:'ok'|'attention';detail:string;next:string;}
export interface HealthReport {at:number;safe:boolean;items:HealthItem[];clients?:ThemeClients;}
export interface WorkshopApi {
 themeCreate(input:import('./theme-studio').StudioDraft):Promise<import('./integration-types').ThemeItem>;
 workshopCatalog():Promise<CommunityTheme[]>;
 workshopState():Promise<WorkshopState>;
 workshopChanged(callback:(state:WorkshopState)=>void):()=>void;
 workshopDownload(id:string):Promise<void>;
 workshopCancel(id:string):Promise<void>;
 workshopFavorite(id:string,favorite:boolean):Promise<WorkshopState>;
 workshopOpen(id:string):Promise<void>;
 workshopConfirm(id:string):Promise<WorkshopState>;
 themeDrop(file:File):Promise<void>;
 clientHealth():Promise<HealthReport>;
 exportHealth():Promise<boolean>;
}

import type {IntegrationApi} from './integration-types';
import type {ToolboxApi} from './toolbox-types';
import type {WorkshopApi} from './workshop-types';
export type Kind = 'shutdown' | 'alarm';
export type Repeat = 'once' | 'daily' | 'weekly';
export interface PlanInput { name: string; kind: Kind; repeat: Repeat; date: string; time: string; weekdays: number[]; enabled: boolean; notes?: string }
export interface Plan extends PlanInput { id: string; revision: number; createdAt: number; outcome?: string; exactAt?: number }
export interface QuickInput { kind: Kind; minutes: number; name?: string; notes?: string }
export type PauseInput = {minutes:number;until?:never} | {until:number;minutes?:never};
export type WindowMode = 'full' | 'mini';
export type PresetInput = ({ type: 'schedule'; name: string; kind: Kind; repeat: Repeat; time: string; weekdays: number[] } | { type: 'quick'; name: string; kind: Kind; minutes: number }) & {notes?:string};
export type Preset = PresetInput & { id: string };
export type SpaceNode='control'|'agent'|'workshop'|'system';
export interface ExperiencePrefs { interaction: boolean; miniPinned: boolean; startupAnimation?:boolean; sceneMode?:'immersive'|'classic'; motionQuality?:'adaptive'|'low'|'static'; cameraZoom?:number; panels?:Partial<Record<SpaceNode,{width:number;height:number}>> }
export interface ExperienceSnapshot { presets: Preset[]; prefs: ExperiencePrefs; mode: WindowMode; error?: string; notice?: string }
export interface AgendaDay { date: string; occurrences: Occurrence[] }
export interface Agenda { days: AgendaDay[]; generatedAt: number }
export interface PlanDefinition extends PlanInput { exactAt?: number }
export interface ImportPreview { token: string; total: number; imported: number; duplicate: number; expired: number; names: string[]; skipped: {name: string; reason: string}[] }
export interface Occurrence { key: string; planId: string; name: string; kind: Kind; at: number; originalAt: number; demo?: boolean; endsAt?: number; notes?: string }
export interface LogEntry { at: number; text: string; level: 'info' | 'error' }
export interface Settings { sound: boolean; volume: number; reducedMotion: boolean; warningMinutes?: number; alarmSeconds?: number }
export interface LogFilter { query: string; date: string; errorsOnly: boolean }
export interface RuntimeState { warnings: Occurrence[]; alarms: Occurrence[]; settings: Settings; now: number; paused: boolean; pauseUntil?:number; storageError?: string }
export interface StoreData { version: 2; paused: boolean; pauseUntil?:number; plans: Plan[]; handled: Record<string, number>; overrides: Record<string, number>; logs: LogEntry[]; settings: Settings }
export interface Snapshot { plans: (Plan & { nextAt: number | null; status: string })[]; warnings: Occurrence[]; alarms: Occurrence[]; logs: LogEntry[]; settings: Settings; now: number; safeMode: boolean; paused: boolean; pauseUntil?:number; storageError?: string }
export interface Api extends IntegrationApi,ToolboxApi,WorkshopApi {
  experience(): Promise<ExperienceSnapshot>;
  savePreset(value: PresetInput, id?: string): Promise<ExperienceSnapshot>;
  removePreset(id: string): Promise<ExperienceSnapshot>;
  experiencePrefs(prefs: ExperiencePrefs): Promise<ExperienceSnapshot>;
  setMode(mode: WindowMode): Promise<ExperienceSnapshot>;
  panelOpen(open: boolean): void;
  experienceChanged(callback: (value: ExperienceSnapshot) => void): () => void;
  miniRequest(callback: () => void): () => void;
  agenda(): Promise<Agenda>;
  agendaWatch(watch: boolean): void;
  agendaChanged(callback: (value: Agenda) => void): () => void;
  snapshot(): Promise<Snapshot>;
  save(input: PlanInput, id?: string): Promise<Snapshot>;
  remove(id: string): Promise<Snapshot>;
  toggle(id: string): Promise<Snapshot>;
  batch(ids: string[], action: 'enable' | 'disable' | 'delete'): Promise<Snapshot>;
  skip(id: string, at: number): Promise<Snapshot>;
  act(keys: string[], action: 'cancel' | 'snooze', minutes?: number): Promise<Snapshot>;
  settings(value: Settings): Promise<Snapshot>;
  demo(kind: Kind): Promise<Snapshot>;
  quick(input: QuickInput): Promise<Snapshot>;
  pause(paused: boolean): Promise<Snapshot>;
  pauseFor(input:PauseInput):Promise<Snapshot>;
  exportPlans(): Promise<boolean>;
  exportLogs(filter: LogFilter): Promise<boolean>;
  previewImport(): Promise<ImportPreview | null>;
  commitImport(token: string): Promise<{ state: Snapshot; imported: number; duplicate: number; expired: number }>;
  cancelImport(): Promise<void>;
  openLink(target: 'repository' | 'author'): Promise<void>;
  window(action: 'minimize' | 'hide' | 'quit'): void;
  subscribe(callback: (state: Snapshot) => void): () => void;
  clock(callback: (now: number) => void): () => void;
  runtime(callback: (state: RuntimeState) => void): () => void;
  quickRequest(callback: () => void): () => void;
  visibility(callback: (visible: boolean) => void): () => void;
}
declare global { interface Window { starSleep?: Api } }

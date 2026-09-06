export type Kind = 'shutdown' | 'alarm';
export type Repeat = 'once' | 'daily' | 'weekly';
export interface PlanInput { name: string; kind: Kind; repeat: Repeat; date: string; time: string; weekdays: number[]; enabled: boolean }
export interface Plan extends PlanInput { id: string; revision: number; createdAt: number; outcome?: string }
export interface Occurrence { key: string; planId: string; name: string; kind: Kind; at: number; originalAt: number; demo?: boolean }
export interface LogEntry { at: number; text: string; level: 'info' | 'error' }
export interface Settings { sound: boolean; volume: number; reducedMotion: boolean }
export interface StoreData { version: 1; plans: Plan[]; handled: Record<string, number>; overrides: Record<string, number>; logs: LogEntry[]; settings: Settings }
export interface Snapshot { plans: (Plan & { nextAt: number | null; status: string })[]; warnings: Occurrence[]; alarms: Occurrence[]; logs: LogEntry[]; settings: Settings; now: number; safeMode: boolean; storageError?: string }
export interface Api {
  snapshot(): Promise<Snapshot>;
  save(input: PlanInput, id?: string): Promise<Snapshot>;
  remove(id: string): Promise<Snapshot>;
  toggle(id: string): Promise<Snapshot>;
  act(keys: string[], action: 'cancel' | 'snooze', minutes?: number): Promise<Snapshot>;
  settings(value: Settings): Promise<Snapshot>;
  demo(kind: Kind): Promise<Snapshot>;
  openLink(target: 'repository' | 'author'): Promise<void>;
  window(action: 'minimize' | 'hide' | 'quit'): void;
  subscribe(callback: (state: Snapshot) => void): () => void;
  visibility(callback: (visible: boolean) => void): () => void;
}
declare global { interface Window { starSleep?: Api } }

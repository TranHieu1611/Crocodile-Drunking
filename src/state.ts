import { CONFIG, type ExerciseKind, type ToothKind } from './config';

export interface Player {
  id: string;
  name: string;
  color: string;
  couple: boolean;
  water: boolean;
}

export interface Settings {
  sexy: boolean;
  outside: boolean;
  phone: boolean;
  bet: boolean;
  pickSeconds: number;
  boss: boolean;
  sound: boolean;
}

export type Reason = 'drink' | 'godsave' | 'hardDone' | 'hardFail' | 'buddyA' | 'buddyB' | 'buddyFree' | 'slow' | 'partySelf' | 'partyAll' | 'pushup' | 'squat' | 'exerciseFail';

export interface LogEntry {
  playerId: string;
  reason: Reason;
  ly: number;
  sips: number;
  /** Số cái hít đất / squat (nếu có). */
  reps?: number;
}

export interface Stats {
  bitten: number;
  godSaves: number;
  hardDone: number;
  hardFail: number;
  dragged: number;
  slow: number;
  ly: number;
  sips: number;
}

export type Pending =
  | { kind: 'drink'; a: string; result?: 'save' | 'drink' }
  | { kind: 'wheel'; a: string; result?: 'self' | 'all' }
  | { kind: 'exercise'; ex: ExerciseKind; a: string; value?: number; angle?: number }
  | { kind: 'hard'; a: string; cardId: string; text: string; seconds: number; coupleHint: boolean; boss: boolean }
  | { kind: 'buddy'; a: string; b: string; cardId: string; text: string; seconds: number; boss: boolean };

export interface RoundState {
  n: number;
  teeth: ToothKind[];
  revealed: boolean[];
  log: LogEntry[];
}

export interface GameState {
  players: Player[];
  settings: Settings;
  round: RoundState;
  current: string | null;
  last: string | null;
  pending: Pending | null;
  phase: 'idle' | 'picking' | 'resolving' | 'roundEnd';
  used: { hard: string[]; buddy: string[] };
  stats: Record<string, Stats>;
  lastQuip: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  sexy: true,
  outside: true,
  phone: true,
  bet: true,
  pickSeconds: CONFIG.PICK_SECONDS_DEFAULT,
  boss: true,
  sound: true,
};

export function emptyStats(): Stats {
  return { bitten: 0, godSaves: 0, hardDone: 0, hardFail: 0, dragged: 0, slow: 0, ly: 0, sips: 0 };
}

export function saveGame(s: GameState | null): void {
  try {
    if (s) localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(CONFIG.STORAGE_KEY);
  } catch {
    /* bỏ qua */
  }
}

export function loadGame(): GameState | null {
  try {
    const s = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (!s) return null;
    const g = JSON.parse(s) as GameState;
    if (!g || !Array.isArray(g.players) || !g.round || g.round.teeth?.length !== CONFIG.TEETH) return null;
    return g;
  } catch {
    return null;
  }
}

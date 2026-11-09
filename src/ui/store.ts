import { CONFIG } from '../config';
import { loadCustomCards, mergedCards, type CardData } from '../cards';
import { DEFAULT_SETTINGS, saveGame, type GameState, type Player, type Settings } from '../state';
import { setSound } from '../audio';

const ROSTER_KEY = 'rcs.roster.v1';

export type Screen = 'intro' | 'rules' | 'setup' | 'game' | 'roundEnd' | 'session' | 'cards';

export const store = {
  g: null as GameState | null,
  roster: [] as Player[],
  settings: { ...DEFAULT_SETTINGS } as Settings,
  /** Màn quay lại sau khi đóng "Thẻ của hội". */
  back: 'setup' as Screen,
};

let navImpl: (s: Screen) => void = () => {};
export function setNav(f: (s: Screen) => void): void {
  navImpl = f;
}
export function nav(s: Screen): void {
  navImpl(s);
}

export function persist(): void {
  saveGame(store.g);
}

export function cardData(): CardData {
  return mergedCards(loadCustomCards());
}

let uid = 0;
export function newId(): string {
  return 'p' + Date.now().toString(36) + (uid++).toString(36);
}

export function freeColor(used: string[]): string {
  return CONFIG.PLAYER_COLORS.find((c) => !used.includes(c)) ?? CONFIG.PLAYER_COLORS[used.length % CONFIG.PLAYER_COLORS.length];
}

export function defaultRoster(n = 8): Player[] {
  const out: Player[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ id: newId(), name: '', color: CONFIG.PLAYER_COLORS[i], couple: false, water: false });
  }
  return out;
}

export function saveRoster(): void {
  try {
    localStorage.setItem(ROSTER_KEY, JSON.stringify({ roster: store.roster, settings: store.settings }));
  } catch {
    /* bỏ qua */
  }
}

export function loadRoster(): void {
  try {
    const s = localStorage.getItem(ROSTER_KEY);
    if (s) {
      const v = JSON.parse(s);
      if (Array.isArray(v.roster) && v.roster.length >= CONFIG.MIN_PLAYERS) store.roster = v.roster;
      if (v.settings) store.settings = { ...DEFAULT_SETTINGS, ...v.settings };
    }
  } catch {
    /* bỏ qua */
  }
  if (!store.roster.length) store.roster = defaultRoster();
  setSound(store.settings.sound);
}

export function displayName(p: Player, i: number): string {
  return p.name.trim() || `Người ${i + 1}`;
}

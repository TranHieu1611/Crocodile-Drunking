import raw from '../croc_cards.json';
import { CONFIG } from './config';

export type Tag = 'couple' | 'sexy' | 'phone' | 'outside';
export type DeckName = 'hard' | 'buddy';

export interface Card {
  id: string;
  text: string;
  tags: Tag[];
  seconds: number;
  boss?: boolean;
  custom?: boolean;
}

export interface CardData {
  hard: Card[];
  buddy: Card[];
  safe_quips: string[];
  bet_reminder: string;
}

export const BASE_CARDS: CardData = {
  hard: raw.hard as Card[],
  buddy: raw.buddy as Card[],
  safe_quips: raw.safe_quips,
  bet_reminder: raw.bet_reminder,
};

export interface CustomCard extends Card {
  deck: DeckName;
}

export function loadCustomCards(): CustomCard[] {
  try {
    const s = localStorage.getItem(CONFIG.CUSTOM_CARDS_KEY);
    const v = s ? JSON.parse(s) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function saveCustomCards(cards: CustomCard[]): void {
  try {
    localStorage.setItem(CONFIG.CUSTOM_CARDS_KEY, JSON.stringify(cards));
  } catch {
    /* bỏ qua */
  }
}

export function mergedCards(custom: CustomCard[]): CardData {
  return {
    ...BASE_CARDS,
    hard: [...BASE_CARDS.hard, ...custom.filter((c) => c.deck === 'hard')],
    buddy: [...BASE_CARDS.buddy, ...custom.filter((c) => c.deck === 'buddy')],
  };
}

/** Những placeholder người chơi mà thẻ nhắc tới. */
export function mentions(text: string): Array<'A' | 'B' | 'L' | 'R'> {
  const out: Array<'A' | 'B' | 'L' | 'R'> = [];
  for (const k of ['A', 'B', 'L', 'R'] as const) if (text.includes(`{${k}}`)) out.push(k);
  return out;
}

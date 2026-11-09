// Mọi hằng số chỉnh game gom ở đây.
export const CONFIG = {
  TEETH: 12,
  POISON: { drink: 2, hard: 1, buddy: 1, wheel: 1, pushup: 1, squat: 1 } as const,
  /** Các số trên vòng quay của răng vận động. */
  REPS: { pushup: [1, 2, 3, 4, 5], squat: [4, 5, 6, 7, 8, 9, 10] } as const,
  /** Răng Vòng Quay: xác suất "cả bàn cùng uống" (còn lại: tự uống). */
  PARTY_CHANCE: 0.5,
  GOD_SAVE: 0.1,
  PICK_SECONDS_DEFAULT: 5,
  PICK_SECONDS_OPTIONS: [3, 5, 8, 10, 0] as const, // 0 = tắt đồng hồ
  BOSS_INTERVAL: 3,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 12,
  ROULETTE_MS: [2500, 3000] as const,
  SHUFFLE_MS: 1000,
  HARD_FAIL_DRINKS: 2,
  DANGER_THRESHOLD: 0.7,
  STORAGE_KEY: 'rcs.game.v1',
  CUSTOM_CARDS_KEY: 'rcs.cards.v1',
  PLAYER_COLORS: [
    '#FF7A59', '#4FC3F7', '#FFD54F', '#BA68C8', '#81C784', '#F06292',
    '#4DB6AC', '#FFB74D', '#9575CD', '#E57373', '#AED581', '#64B5F6',
  ],
};

export type ToothKind = 'safe' | 'drink' | 'hard' | 'buddy' | 'wheel' | 'pushup' | 'squat';
export type ExerciseKind = 'pushup' | 'squat';
export type PoisonKind = Exclude<ToothKind, 'safe'>;
export const POISON_KINDS: PoisonKind[] = ['drink', 'hard', 'buddy', 'wheel', 'pushup', 'squat'];

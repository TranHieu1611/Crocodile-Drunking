// Logic thuần — KHÔNG đụng DOM.
import { CONFIG, POISON_KINDS, type ExerciseKind, type PoisonKind, type ToothKind } from './config';
import { mentions, type Card, type CardData, type DeckName } from './cards';
import { emptyStats, type GameState, type LogEntry, type Player, type Reason, type Settings } from './state';

export type Rng = () => number;

export function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickOne<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ---------- Hàm (vòng) ----------

export function makeTeeth(rng: Rng): ToothKind[] {
  const t: ToothKind[] = [];
  for (let i = 0; i < CONFIG.POISON.drink; i++) t.push('drink');
  for (let i = 0; i < CONFIG.POISON.hard; i++) t.push('hard');
  for (let i = 0; i < CONFIG.POISON.buddy; i++) t.push('buddy');
  for (let i = 0; i < CONFIG.POISON.wheel; i++) t.push('wheel');
  for (let i = 0; i < CONFIG.POISON.pushup; i++) t.push('pushup');
  for (let i = 0; i < CONFIG.POISON.squat; i++) t.push('squat');
  while (t.length < CONFIG.TEETH) t.push('safe');
  return shuffle(t, rng);
}

export const POISON_TOTAL = Object.values(CONFIG.POISON).reduce((s, n) => s + n, 0);

export function isBossRound(n: number, s: Settings): boolean {
  return s.boss && n % CONFIG.BOSS_INTERVAL === 0;
}

export function createGame(players: Player[], settings: Settings, rng: Rng = Math.random): GameState {
  const stats: GameState['stats'] = {};
  for (const p of players) stats[p.id] = emptyStats();
  return {
    players,
    settings,
    round: { n: 1, teeth: makeTeeth(rng), revealed: Array(CONFIG.TEETH).fill(false), log: [] },
    current: null,
    last: null,
    pending: null,
    phase: 'idle',
    used: { hard: [], buddy: [] },
    stats,
    lastQuip: null,
  };
}

export function nextRound(g: GameState, rng: Rng = Math.random): void {
  g.round = { n: g.round.n + 1, teeth: makeTeeth(rng), revealed: Array(CONFIG.TEETH).fill(false), log: [] };
  g.current = null;
  g.pending = null;
  g.phase = 'idle';
  g.lastQuip = null;
}

export function poisonLeft(g: GameState): number {
  return g.round.teeth.filter((k, i) => k !== 'safe' && !g.round.revealed[i]).length;
}

/** Răng độc còn lại / tổng, theo từng loại. */
export function poisonByKind(g: GameState): Record<PoisonKind, { left: number; total: number }> {
  const out = {} as Record<PoisonKind, { left: number; total: number }>;
  for (const k of POISON_KINDS) out[k] = { left: 0, total: 0 };
  g.round.teeth.forEach((k, i) => {
    if (k === 'safe') return;
    out[k].total++;
    if (!g.round.revealed[i]) out[k].left++;
  });
  return out;
}

export function teethLeft(g: GameState): number {
  return g.round.revealed.filter((r) => !r).length;
}

export function dangerPct(g: GameState): number {
  const left = teethLeft(g);
  return left === 0 ? 0 : Math.round((poisonLeft(g) / left) * 100);
}

/** Chế độ vòng tròn: mọi người đã chọn răng đủ một lượt trong hàm này. */
export function lapDone(g: GameState): boolean {
  return (g.settings.pickMode ?? 'random') === 'circle' && (g.round.turns ?? 0) >= g.players.length;
}

/** Hết hàm khi dính đủ răng độc — hoặc (vòng tròn) cả bàn đã chọn đủ một lượt. */
export function roundOver(g: GameState): boolean {
  return poisonLeft(g) === 0 || lapDone(g);
}

// ---------- Người chơi ----------

/**
 * Chọn người chơi lượt tiếp theo theo chế độ:
 * - random: ngẫu nhiên, không trùng người vừa chơi.
 * - bag: ngẫu nhiên nhưng ai đã chơi thì loại ra, đủ một vòng mới làm lại.
 * - circle: lần lượt theo thứ tự chỗ ngồi.
 */
export function pickPlayer(g: GameState, rng: Rng = Math.random): string {
  const mode = g.settings.pickMode ?? 'random';
  let p: Player;
  if (mode === 'circle') {
    const i = g.players.findIndex((x) => x.id === g.last);
    p = g.players[(i + 1) % g.players.length];
  } else if (mode === 'bag') {
    const ids = new Set(g.players.map((x) => x.id));
    let done = (g.picked ?? []).filter((id) => ids.has(id));
    let pool = g.players.filter((x) => !done.includes(x.id));
    if (!pool.length) {
      done = [];
      // Vòng mới: vẫn tránh lặp lại người vừa chơi.
      pool = g.players.length > 1 ? g.players.filter((x) => x.id !== g.last) : g.players;
    }
    p = pickOne(pool, rng);
    g.picked = [...done, p.id];
  } else {
    const pool = g.players.length > 1 ? g.players.filter((x) => x.id !== g.last) : g.players;
    p = pickOne(pool, rng);
  }
  g.current = p.id;
  g.last = p.id;
  g.phase = 'picking';
  return p.id;
}

export function neighbors(g: GameState, id: string): { L: Player; R: Player } {
  const n = g.players.length;
  const i = g.players.findIndex((p) => p.id === id);
  return { L: g.players[(i - 1 + n) % n], R: g.players[(i + 1) % n] };
}

export function playerById(g: GameState, id: string): Player {
  const p = g.players.find((x) => x.id === id);
  if (!p) throw new Error('Không tìm thấy người chơi ' + id);
  return p;
}

// ---------- Ghi nhận ----------

export function addLog(g: GameState, playerId: string, reason: Reason, ly = 0, sips = 0, reps?: number): void {  const e: LogEntry = { playerId, reason, ly, sips, ...(reps ? { reps } : {}) };
  g.round.log.push(e);
  const s = (g.stats[playerId] ??= {
    bitten: 0, godSaves: 0, hardDone: 0, hardFail: 0, dragged: 0, slow: 0, ly: 0, sips: 0,
  });
  s.ly += ly;
  s.sips += sips;
  if (reason === 'godsave') s.godSaves++;
  if (reason === 'hardDone') s.hardDone++;
  if (reason === 'hardFail') s.hardFail++;
  if (reason === 'buddyB') s.dragged++;
  if (reason === 'slow') s.slow++;
}

/** Người chơi hiện tại bấm răng idx. Trả về loại răng. */
export function revealTooth(g: GameState, idx: number, slow = false): ToothKind {
  if (g.round.revealed[idx]) throw new Error('Răng đã bị chọn');
  if (!g.current) throw new Error('Chưa chọn người');
  g.round.revealed[idx] = true;
  g.round.turns = (g.round.turns ?? 0) + 1;
  const kind = g.round.teeth[idx];
  if (slow) addLog(g, g.current, 'slow', 0, 1);
  if (kind !== 'safe') g.stats[g.current].bitten++;
  return kind;
}

export function randomFreeTooth(g: GameState, rng: Rng = Math.random): number {
  const free = g.round.revealed.map((r, i) => (r ? -1 : i)).filter((i) => i >= 0);
  return pickOne(free, rng);
}

// ---------- Vòng quay God Save ----------

export interface SpinResult {
  save: boolean;
  /** Góc kim dừng (độ, 0 = đỉnh, theo chiều kim đồng hồ) trên bánh xe. Ô God Save chiếm [0, 36). */
  angle: number;
}

export function spinGodSave(rng: Rng = Math.random): SpinResult {
  const save = rng() < CONFIG.GOD_SAVE;
  const slice = 360 * CONFIG.GOD_SAVE;
  // Tránh mép ô 3° để kim không nằm trên vạch.
  const pad = 3;
  const angle = save ? pad + rng() * (slice - 2 * pad) : slice + pad + rng() * (360 - slice - 2 * pad);
  return { save, angle };
}

// ---------- Vòng quay "Răng Vòng Quay" ----------

/** Số ô trên bánh xe Vòng Quay; ô chẵn = tự uống, ô lẻ = cả bàn uống. */
export const PARTY_SLICES = 6;

export interface PartySpin {
  all: boolean;
  /** Góc kim dừng (độ, 0 = đỉnh, theo chiều kim đồng hồ). */
  angle: number;
}

export function spinParty(rng: Rng = Math.random): PartySpin {
  const all = rng() < CONFIG.PARTY_CHANCE;
  const step = 360 / PARTY_SLICES;
  const pad = 9;
  // Chọn ngẫu nhiên 1 ô đúng loại rồi 1 góc bên trong ô đó.
  const k = Math.floor(rng() * (PARTY_SLICES / 2)) * 2 + (all ? 1 : 0);
  const angle = k * step + pad + rng() * (step - 2 * pad);
  return { all, angle };
}

/** Ô nào đang nằm dưới kim ở góc `angle`. */
export function partySliceIsAll(angle: number): boolean {
  return Math.floor((((angle % 360) + 360) % 360) / (360 / PARTY_SLICES)) % 2 === 1;
}

// ---------- Thẻ ----------

export function tagsAllowed(c: Card, s: Settings): boolean {
  if (c.tags.includes('sexy') && !s.sexy) return false;
  if (c.tags.includes('outside') && !s.outside) return false;
  if (c.tags.includes('phone') && !s.phone) return false;
  return true;
}

/** Ai được thẻ nhắc tới, ứng với A (và B nếu có). */
export function mentionedPlayers(g: GameState, c: Card, a: string, b?: string): Player[] {
  const { L, R } = neighbors(g, a);
  const map = { A: playerById(g, a), B: b ? playerById(g, b) : undefined, L, R };
  const out: Player[] = [];
  for (const k of mentions(c.text)) {
    const p = map[k];
    if (p && !out.includes(p)) out.push(p);
  }
  if (!out.some((p) => p.id === a)) out.push(map.A);
  return out;
}

export function coupleOk(g: GameState, c: Card, a: string, b?: string): boolean {
  if (!c.tags.includes('couple')) return true;
  return mentionedPlayers(g, c, a, b).every((p) => p.couple);
}

function boostBoss(cands: Card[], boss: boolean): Card[] {
  const bossCards = cands.filter((c) => c.boss);
  if (boss && bossCards.length) return bossCards;
  return cands.filter((c) => !c.boss);
}

/** Lấy thẻ chưa dùng; nếu hết → xáo lại (xóa lịch sử các thẻ hợp lệ). */
function takeUnused(g: GameState, deck: DeckName, cands: Card[], rng: Rng): Card {
  let fresh = cands.filter((c) => !g.used[deck].includes(c.id));
  if (!fresh.length) {
    const ids = new Set(cands.map((c) => c.id));
    g.used[deck] = g.used[deck].filter((id) => !ids.has(id));
    fresh = cands;
  }
  const card = pickOne(fresh, rng);
  g.used[deck].push(card.id);
  return card;
}

export interface HardDraw {
  card: Card;
  coupleHint: boolean;
}

export function drawHard(g: GameState, data: CardData, a: string, rng: Rng = Math.random): HardDraw {
  const boss = isBossRound(g.round.n, g.settings);
  let cands = data.hard.filter((c) => tagsAllowed(c, g.settings) && coupleOk(g, c, a));
  if (!cands.length) cands = data.hard.filter((c) => !c.tags.length);
  if (!cands.length) cands = data.hard;
  const pool = boostBoss(cands, boss);
  const card = takeUnused(g, 'hard', pool.length ? pool : cands, rng);
  const m = mentions(card.text);
  const coupleHint = card.tags.includes('couple') && !m.includes('L') && !m.includes('R');
  return { card, coupleHint };
}

export interface BuddyDraw {
  card: Card;
  b: string;
}

export function drawBuddy(g: GameState, data: CardData, a: string, rng: Rng = Math.random): BuddyDraw {
  const boss = isBossRound(g.round.n, g.settings);
  const others = g.players.filter((p) => p.id !== a);
  const validBs = (c: Card) => others.filter((p) => coupleOk(g, c, a, p.id));
  let cands = data.buddy.filter((c) => tagsAllowed(c, g.settings) && validBs(c).length > 0);
  if (!cands.length) cands = data.buddy.filter((c) => tagsAllowed(c, g.settings) && !c.tags.includes('couple'));
  if (!cands.length) cands = data.buddy.filter((c) => !c.tags.length);
  if (!cands.length) cands = data.buddy;
  const pool = boostBoss(cands, boss);
  const card = takeUnused(g, 'buddy', pool.length ? pool : cands, rng);
  const bs = validBs(card);
  const b = pickOne(bs.length ? bs : others, rng);
  return { card, b: b.id };
}

// ---------- Văn bản ----------

/** Thay {A}/{B}/{L}/{R}. `wrap` cho phép bọc tên (vd: tô màu). */
export function fillText(
  g: GameState,
  text: string,
  a: string,
  b?: string,
  wrap: (p: Player) => string = (p) => p.name,
): string {
  const { L, R } = neighbors(g, a);
  const map: Record<string, Player | undefined> = { A: playerById(g, a), B: b ? playerById(g, b) : undefined, L, R };
  return text.replace(/\{([ABLR])\}/g, (m, k: string) => (map[k] ? wrap(map[k]!) : m));
}

/** Chế độ nước lọc: "uống X ly/ngụm" → "uống X ly nước lọc". */
export function waterize(text: string, water: boolean): string {
  if (!water) return text;
  return text.replace(/(uống(?: thêm)? (\d+|một|1) )(ly|ngụm)(?! nước lọc)/gi, (_m, pre: string) => `${pre}ly nước lọc`);
}

// ---------- Tổng kết ----------

export const REASON_LABEL: Record<Reason, string> = {
  drink: 'Răng Uống',
  godsave: 'God Save',
  hardDone: 'Cực khó — làm được',
  hardFail: 'Cực khó thua',
  buddyA: 'Răng Uống Cùng',
  buddyB: 'Bị kéo uống cùng',
  buddyFree: 'Bị kéo nhưng thoát',
  partySelf: 'Vòng Quay — tự uống',
  partyAll: 'Vòng Quay — cả bàn uống',
  pushup: 'Hít đất',
  squat: 'Squat',
  exerciseFail: 'Không nổi → uống',
  slow: 'Chậm tay',
};

export interface RoundSummaryRow {
  player: Player;
  entries: LogEntry[];
  ly: number;
  sips: number;
}

export function roundSummary(g: GameState): { drank: RoundSummaryRow[]; survived: Player[] } {
  const drank: RoundSummaryRow[] = [];
  const survived: Player[] = [];
  for (const p of g.players) {
    const entries = g.round.log.filter((e) => e.playerId === p.id);
    const ly = entries.reduce((s, e) => s + e.ly, 0);
    const sips = entries.reduce((s, e) => s + e.sips, 0);
    if (ly + sips > 0) drank.push({ player: p, entries, ly, sips });
    else survived.push(p);
  }
  return { drank, survived };
}

export interface Award {
  emoji: string;
  title: string;
  players: Player[];
  value: number;
  unit: string;
}

export function sessionAwards(g: GameState): Award[] {
  const best = (f: (id: string) => number, min: boolean): { players: Player[]; value: number } => {
    const vals = g.players.map((p) => ({ p, v: f(p.id) }));
    const target = min ? Math.min(...vals.map((x) => x.v)) : Math.max(...vals.map((x) => x.v));
    return { players: vals.filter((x) => x.v === target).map((x) => x.p), value: target };
  };
  const st = (id: string) => g.stats[id] ?? emptyStats();
  const defs: Array<[string, string, (id: string) => number, boolean, string]> = [
    ['🍺', 'Mồi Ngon Của Cá Sấu', (id) => st(id).bitten, false, 'lần bị gặm'],
    ['🙏', 'Được Trời Thương', (id) => st(id).godSaves, false, 'lần God Save'],
    ['🔥', 'Liều Mạng', (id) => st(id).hardDone, false, 'thử thách cực khó'],
    ['🧲', 'Nam Châm Xui', (id) => st(id).dragged, false, 'lần bị kéo'],
    ['🛡️', 'Bất Tử', (id) => st(id).bitten, true, 'lần bị gặm'],
  ];
  return defs
    .map(([emoji, title, f, min, unit]) => ({ emoji, title, unit, ...best(f, min) }))
    .filter((a) => a.title === 'Bất Tử' || a.value > 0);
}

// ---------- Vòng quay số cái (hít đất / squat) ----------

export interface CountSpin {
  value: number;
  index: number;
  /** Góc kim dừng (độ, 0 = đỉnh, theo chiều kim đồng hồ). */
  angle: number;
}

/** Quay đều giữa các ô `values`; trả về giá trị và góc nằm gọn trong ô đó. */
export function spinCount(values: readonly number[], rng: Rng = Math.random): CountSpin {
  const index = Math.floor(rng() * values.length);
  const step = 360 / values.length;
  const pad = Math.min(8, step / 5);
  const angle = index * step + pad + rng() * (step - 2 * pad);
  return { value: values[index], index, angle };
}

export function repsValues(ex: ExerciseKind): readonly number[] {
  return CONFIG.REPS[ex];
}

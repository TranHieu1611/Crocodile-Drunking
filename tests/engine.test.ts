import { describe, it, expect } from 'vitest';
import {
  createGame, makeTeeth, revealTooth, pickPlayer, roundOver, poisonLeft, nextRound, spinGodSave,
  drawHard, drawBuddy, mentionedPlayers, isBossRound, waterize, dangerPct, fillText, randomFreeTooth,
} from '../src/engine';
import { BASE_CARDS, type Card, type CardData } from '../src/cards';
import { DEFAULT_SETTINGS, type Player, type Settings } from '../src/state';
import { CONFIG } from '../src/config';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function players(n: number, couple: (i: number) => boolean = () => false): Player[] {
  return Array.from({ length: n }, (_, i) => ({
    id: 'p' + i, name: 'Người ' + i, color: CONFIG.PLAYER_COLORS[i % 12], couple: couple(i), water: false,
  }));
}

const S = (o: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...o });

describe('hàm cá sấu', () => {
  it('luôn đúng 12 răng với 4 răng độc (2/1/1)', () => {
    const rng = seeded(1);
    for (let i = 0; i < 2000; i++) {
      const t = makeTeeth(rng);
      expect(t.length).toBe(12);
      expect(t.filter((k) => k === 'drink').length).toBe(2);
      expect(t.filter((k) => k === 'hard').length).toBe(1);
      expect(t.filter((k) => k === 'buddy').length).toBe(1);
      expect(t.filter((k) => k === 'safe').length).toBe(8);
    }
  });

  it('vị trí răng độc phân bố đều', () => {
    const rng = seeded(2);
    const hits = Array(12).fill(0);
    for (let i = 0; i < 12000; i++) makeTeeth(rng).forEach((k, j) => k !== 'safe' && hits[j]++);
    for (const h of hits) expect(h / 12000).toBeGreaterThan(0.3);
  });

  it('hàm kết thúc đúng khi đủ 4 răng độc', () => {
    const rng = seeded(3);
    for (let r = 0; r < 300; r++) {
      const g = createGame(players(8), S(), rng);
      let poison = 0;
      while (!roundOver(g)) {
        pickPlayer(g, rng);
        const k = revealTooth(g, randomFreeTooth(g, rng));
        if (k !== 'safe') poison++;
        expect(poisonLeft(g)).toBe(4 - poison);
      }
      expect(poison).toBe(4);
      nextRound(g, rng);
      expect(g.round.n).toBe(2);
      expect(poisonLeft(g)).toBe(4);
    }
  });

  it('nguy cơ % = răng độc còn / răng còn', () => {
    const g = createGame(players(4), S(), seeded(4));
    expect(dangerPct(g)).toBe(33);
    g.current = 'p0';
    const safe = g.round.teeth.indexOf('safe');
    revealTooth(g, safe);
    expect(dangerPct(g)).toBe(Math.round((4 / 11) * 100));
  });

  it('không chọn trùng người liên tiếp', () => {
    const rng = seeded(5);
    for (const n of [2, 3, 8, 12]) {
      const g = createGame(players(n), S(), rng);
      let prev = '';
      for (let i = 0; i < 3000; i++) {
        const id = pickPlayer(g, rng);
        expect(id).not.toBe(prev);
        prev = id;
      }
    }
  });
});

describe('vòng quay God Save', () => {
  it('xấp xỉ 10% trên 10.000 lần và kim dừng đúng ô', () => {
    const rng = seeded(6);
    let saves = 0;
    for (let i = 0; i < 10000; i++) {
      const r = spinGodSave(rng);
      const inSlice = r.angle >= 0 && r.angle < 36;
      expect(inSlice).toBe(r.save);
      if (r.save) saves++;
    }
    expect(saves / 10000).toBeGreaterThan(0.09);
    expect(saves / 10000).toBeLessThan(0.11);
  });
});

describe('lọc thẻ', () => {
  const drawManyHard = (g: ReturnType<typeof createGame>, data: CardData, a: string, n = 400) =>
    Array.from({ length: n }, () => drawHard(g, data, a, Math.random).card);

  it('tắt 18+/outside/phone thì không bao giờ rút thẻ đó', () => {
    const g = createGame(players(8, () => true), S({ sexy: false, outside: false, phone: false }));
    for (let r = 1; r <= 6; r++) {
      g.round.n = r;
      for (const c of drawManyHard(g, BASE_CARDS, 'p0', 200)) {
        expect(c.tags.some((t) => t === 'sexy' || t === 'outside' || t === 'phone')).toBe(false);
      }
      for (let i = 0; i < 200; i++) {
        const { card } = drawBuddy(g, BASE_CARDS, 'p0');
        expect(card.tags.some((t) => t === 'sexy' || t === 'outside' || t === 'phone')).toBe(false);
      }
    }
  });

  it('thẻ couple không bao giờ nhắm vào người chưa bật OK cặp (hard)', () => {
    const rng = seeded(7);
    for (let trial = 0; trial < 200; trial++) {
      const ps = players(8, () => rng() < 0.5);
      const g = createGame(ps, S(), rng);
      g.round.n = 1 + Math.floor(rng() * 6);
      const a = ps[Math.floor(rng() * 8)].id;
      for (let i = 0; i < 30; i++) {
        const { card } = drawHard(g, BASE_CARDS, a, rng);
        if (card.tags.includes('couple')) {
          for (const p of mentionedPlayers(g, card, a)) expect(p.couple).toBe(true);
        }
      }
    }
  });

  it('thẻ couple không bao giờ nhắm vào người chưa bật OK cặp (buddy) và B ≠ A', () => {
    const rng = seeded(8);
    for (let trial = 0; trial < 300; trial++) {
      const ps = players(2 + Math.floor(rng() * 10), () => rng() < 0.4);
      const g = createGame(ps, S(), rng);
      g.round.n = 1 + Math.floor(rng() * 6);
      const a = ps[Math.floor(rng() * ps.length)].id;
      for (let i = 0; i < 20; i++) {
        const { card, b } = drawBuddy(g, BASE_CARDS, a, rng);
        expect(b).not.toBe(a);
        if (card.tags.includes('couple')) {
          for (const p of mentionedPlayers(g, card, a, b)) expect(p.couple).toBe(true);
        }
      }
    }
  });

  it('không ai bật OK cặp → không có thẻ couple', () => {
    const g = createGame(players(8), S());
    for (let i = 0; i < 300; i++) {
      g.round.n = 1 + (i % 6);
      expect(drawHard(g, BASE_CARDS, 'p1').card.tags).not.toContain('couple');
      expect(drawBuddy(g, BASE_CARDS, 'p1').card.tags).not.toContain('couple');
    }
  });

  it('thẻ boss chỉ ở Hàm Trùm và được ưu tiên ở đó', () => {
    const g = createGame(players(8, () => true), S());
    for (let n = 1; n <= 9; n++) {
      g.round.n = n;
      for (let i = 0; i < 50; i++) {
        const h = drawHard(g, BASE_CARDS, 'p0').card;
        const b = drawBuddy(g, BASE_CARDS, 'p0').card;
        expect(!!h.boss).toBe(isBossRound(n, g.settings));
        expect(!!b.boss).toBe(isBossRound(n, g.settings));
      }
    }
    g.settings.boss = false;
    g.round.n = 3;
    for (let i = 0; i < 50; i++) expect(drawHard(g, BASE_CARDS, 'p0').card.boss).toBeFalsy();
  });

  it('không lặp thẻ cho tới khi hết deck', () => {
    const g = createGame(players(8, () => true), S());
    const valid = BASE_CARDS.hard.filter((c) => !c.boss);
    const seen = new Set<string>();
    for (let i = 0; i < valid.length; i++) seen.add(drawHard(g, BASE_CARDS, 'p0').card.id);
    expect(seen.size).toBe(valid.length);
    // Hết deck → xáo lại, vẫn rút được
    expect(drawHard(g, BASE_CARDS, 'p0').card).toBeTruthy();
  });

  it('hard couple không có {L}/{R}: chỉ cần A bật OK cặp, có gợi ý', () => {
    const only: CardData = {
      ...BASE_CARDS,
      hard: [BASE_CARDS.hard.find((c) => c.id === 'h01') as Card],
    };
    const ps = players(4, (i) => i === 0);
    const g = createGame(ps, S());
    const r = drawHard(g, only, 'p0');
    expect(r.card.id).toBe('h01');
    expect(r.coupleHint).toBe(true);
  });
});

describe('văn bản', () => {
  it('thay placeholder với L/R theo chỗ ngồi', () => {
    const g = createGame(players(4), S());
    expect(fillText(g, '{A}-{L}-{R}', 'p0')).toBe('Người 0-Người 3-Người 1');
    expect(fillText(g, '{B} với {A}', 'p2', 'p1')).toBe('Người 1 với Người 2');
  });

  it('chế độ nước lọc', () => {
    expect(waterize('Chịu thua, uống 2 ly', true)).toBe('Chịu thua, uống 2 ly nước lọc');
    expect(waterize('Uống 1 ly', true)).toBe('Uống 1 ly nước lọc');
    expect(waterize('uống thêm 1 ngụm vì chậm', true)).toBe('uống thêm 1 ly nước lọc vì chậm');
    expect(waterize('uống 2 ly', false)).toBe('uống 2 ly');
  });
});

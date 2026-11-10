import { CONFIG, POISON_KINDS, type PoisonKind } from '../config';
import { avatar, esc, icon, nameChip, reducedMotion, wait } from './dom';
import { Croc, crocHTML } from './croc';
import { ringHTML, setRing } from './fx';
import { modal, confirmBox, editPlayers, showRules } from './modals';
import { showOverlay, type Outcome } from './overlays';
import { store, persist, nav, cardData, saveRoster } from './store';
import {
  POISON_TOTAL, addLog, dangerPct, drawBuddy, drawHard, isBossRound, pickOne, pickPlayer, playerById,
  poisonByKind, poisonLeft, randomFreeTooth, revealTooth, roundOver, waterize,
} from '../engine';
import { sfx, vibrate, startHeartbeat, stopHeartbeat, setSound, unlockAudio } from '../audio';
import type { Pending } from '../state';

let croc: Croc | null = null;
let timer: number | null = null;
let busy = false;
let paused = false;
let root: HTMLElement;

function stopTimer(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
}

const TOOTH_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];

/** Phím tắt cho bản desktop. */
function onKey(e: KeyboardEvent): void {
  const g = store.g;
  if (!g || !croc || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (document.querySelector('#app .modal')) return;
  if ((e.key === ' ' || e.key === 'Enter') && g.phase === 'idle' && !busy && !paused) {
    if ((e.target as HTMLElement).closest?.('button') && e.key === 'Enter') return;
    e.preventDefault();
    void shufflePick();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    openMenu();
  } else {
    const i = TOOTH_KEYS.indexOf(e.key);
    if (i >= 0 && g.phase === 'picking') {
      e.preventDefault();
      croc.lookAt(i);
      void choose(i, false);
    }
  }
}

// ---------- Chế độ Vòng tròn: tự chuyển lượt, không cần nút quay ----------
let autoTimer: number | null = null;

function clearAuto(): void {
  if (autoTimer !== null) clearTimeout(autoTimer);
  autoTimer = null;
}

function isCircle(): boolean {
  return (store.g?.settings.pickMode ?? 'random') === 'circle';
}

function nextInCircle(): string | null {
  const g = store.g!;
  if (!g.players.length) return null;
  const i = g.players.findIndex((x) => x.id === g.last);
  return g.players[(i + 1) % g.players.length].id;
}

/** Sau một khoảng nghỉ, tự gọi tên người kế tiếp theo chỗ ngồi. */
function scheduleAuto(delay = 1500): void {
  if (!isCircle()) return;
  clearAuto();
  autoTimer = window.setTimeout(() => {
    autoTimer = null;
    const g = store.g;
    if (!g || !croc || !isCircle() || g.phase !== 'idle') return;
    if (busy || paused || document.querySelector('#app .modal')) {
      scheduleAuto(700);
      return;
    }
    void shufflePick();
  }, delay);
}

export function leaveGame(): void {
  clearAuto();
  document.removeEventListener('keydown', onKey);
  stopTimer();
  stopHeartbeat();
  croc?.destroy();
  croc = null;
}

export function renderGame(host: HTMLElement): void {
  root = host;
  const g = store.g!;
  const boss = isBossRound(g.round.n, g.settings);
  host.innerHTML = `
  <section class="screen game${boss ? ' boss' : ''}">
    <div class="g-side">
    <header class="ghead">
      <button class="icon-btn gh-back" data-back aria-label="Về màn thiết lập" title="Về màn thiết lập (giữ ván)">${icon('left')}</button>
      <div class="gh-round"><span class="lbl">Hàm</span><b>${g.round.n}</b></div>
      <div class="gh-stat st-poison"><span class="lbl"><span class="only-m">Răng độc</span><span class="only-d">Răng độc còn lại</span></span><b class="v-poison"></b></div>
      <div class="gh-stat st-danger"><span class="lbl"><span class="only-m">Nguy cơ</span><span class="only-d">Nguy cơ bị gặm</span></span><b class="v-danger"></b></div>
      <button class="icon-btn gh-menu" data-menu aria-label="Menu">${icon('menu')}</button>
    </header>
    <div class="pbar n${Math.min(g.players.length, 12)}"></div>
    <div class="action"></div>
    <p class="msg" aria-live="polite"></p>
    <div class="legend" aria-label="Răng độc còn lại"></div>
    <p class="keys only-d"><kbd>Space</kbd> quay chọn người · <kbd>1</kbd>–<kbd>9</kbd> <kbd>0</kbd> <kbd>-</kbd> <kbd>=</kbd> chọn răng · <kbd>Esc</kbd> menu</p>
    </div>
    <div class="croc-host">${crocHTML()}${boss ? `<div class="boss-banner"><span>HÀM TRÙM</span><small>Thẻ nặng đô đã được thả ra</small></div>` : ''}</div>
  </section>`;
  croc = new Croc(host.querySelector('.croc') as HTMLElement);
  croc.setBoss(boss);

  const teeth = host.querySelector('.teeth') as HTMLElement;
  teeth.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLButtonElement>('.tooth');
    if (!t || t.disabled) return;
    void choose(Number(t.dataset.i), false);
  });
  teeth.addEventListener('pointerover', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('.tooth');
    if (t && !(t as HTMLButtonElement).disabled) croc?.lookAt(Number(t.dataset.i));
  });
  teeth.addEventListener('pointerdown', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('.tooth');
    if (t && !(t as HTMLButtonElement).disabled) croc?.lookAt(Number(t.dataset.i));
  });
  teeth.addEventListener('focusin', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('.tooth');
    if (t) croc?.lookAt(Number(t.dataset.i));
  });
  teeth.addEventListener('pointerleave', () => croc?.lookAt(null));
  host.querySelector('[data-menu]')!.addEventListener('click', openMenu);
  host.querySelector('[data-back]')!.addEventListener('click', backToSetup);
  document.removeEventListener('keydown', onKey);
  document.addEventListener('keydown', onKey);

  if (g.lastQuip) setMsg(esc(g.lastQuip));
  refresh();

  if (g.pending) {
    croc.close();
    resolvePending(g.pending);
  } else if (g.phase === 'roundEnd' || roundOver(g)) {
    nav('roundEnd');
  } else if (g.phase === 'picking' && g.current) {
    startPicking(false);
  } else if (g.phase === 'idle') {
    scheduleAuto(900);
  }
}

const KIND_INFO: Record<PoisonKind, { name: string; desc: string }> = {
  drink: { name: 'Răng Uống', desc: 'Quay God Save 10%, trượt thì 1 ly' },
  hard: { name: 'Cực Khó', desc: 'Thử thách, chịu thua 2 ly' },
  buddy: { name: 'Uống Cùng', desc: 'Uống 1 ly + kéo thêm 1 người' },
  wheel: { name: 'Vòng Quay', desc: 'Mình uống hoặc cả bàn uống' },
  pushup: { name: 'Hít Đất', desc: 'Quay ra 1–5 cái' },
  squat: { name: 'Squat', desc: 'Quay ra 4–10 cái' },
};

/** Chú thích: còn lại răng độc loại nào. */
function drawLegend(): void {
  const el = root.querySelector('.legend');
  if (!el) return;
  const by = poisonByKind(store.g!);
  el.innerHTML =
    `<p class="lgd-title only-d">Răng độc còn lại</p>` +
    POISON_KINDS.map((k) => {
      const { left, total } = by[k];
      return `<div class="lgd${left === 0 ? ' done' : ''}" title="${KIND_INFO[k].name}: ${KIND_INFO[k].desc}"><i class="dot ${k}"></i><span class="lgd-m"><b>${KIND_INFO[k].name}</b><small class="only-d">${KIND_INFO[k].desc}</small></span><span class="lgd-n">${left}/${total}</span></div>`;
    }).join('');
}

function setMsg(html: string): void {
  const el = root.querySelector('.msg');
  if (el) el.innerHTML = html;
}

function refresh(): void {
  const g = store.g!;
  root.querySelector('.v-poison')!.textContent = `${poisonLeft(g)}/${POISON_TOTAL}`;
  const d = dangerPct(g);
  const dEl = root.querySelector('.v-danger') as HTMLElement;
  dEl.textContent = `${d}%`;
  const hot = d >= CONFIG.DANGER_THRESHOLD * 100 && poisonLeft(g) > 0;
  dEl.classList.toggle('hot', hot);
  root.querySelector('.st-danger')?.classList.toggle('hot', hot);
  if (hot && !paused && g.settings.sound) startHeartbeat();
  else stopHeartbeat();
  drawLegend();
  drawPlayers();
  drawAction();
  croc?.sync(g.round.teeth, g.round.revealed, g.phase === 'picking' && !busy && !paused);
}

function drawPlayers(highlight?: string): void {
  const g = store.g!;
  const on = highlight ?? (g.phase === 'picking' || g.phase === 'resolving' ? g.current : null);
  const bag = (g.settings.pickMode ?? 'random') === 'bag';
  const picked = new Set(g.picked ?? []);
  // Đủ một vòng rồi thì không làm mờ ai nữa (vòng mới sắp bắt đầu).
  if (bag && g.players.every((p) => picked.has(p.id)) && g.phase === 'idle') picked.clear();
  root.querySelector('.pbar')!.innerHTML = g.players
    .map((p) => {
      const played = bag && picked.has(p.id) && p.id !== on;
      return `<div class="pb${p.id === on ? ' on' : ''}${played ? ' played' : ''}" ${played ? 'title="Đã chơi vòng này"' : ''}>${avatar(p)}<span>${esc(p.name)}</span></div>`;
    })
    .join('');
}

function drawAction(): void {
  const g = store.g!;
  const el = root.querySelector('.action') as HTMLElement;
  if (g.phase === 'idle') {
    const mode = g.settings.pickMode ?? 'random';
    if (mode === 'circle') {
      // Theo lượt: không cần nút quay — tự gọi người kế tiếp.
      const nextId = nextInCircle();
      const next = nextId ? playerById(g, nextId) : null;
      el.innerHTML = `<div class="next-up">
        <div class="nu-m"><span class="nu-l">Tiếp theo</span><span class="nu-p">${next ? `${avatar(next, 'sm')}${nameChip(next)}` : ''}</span></div>
        <button class="btn ghost sm" data-pick>${icon('right', 16)} Gọi ngay</button>
      </div>
      <p class="pick-sub">Vòng tròn · Lượt ${Math.min((g.round.turns ?? 0) + 1, g.players.length)}/${g.players.length} · đủ ${g.players.length} người thì sang hàm mới</p>`;
    } else {
      let sub = '';
      if (mode === 'bag') {
        const ids = new Set(g.players.map((p) => p.id));
        const n = (g.picked ?? []).filter((id) => ids.has(id)).length % g.players.length;
        sub = `<p class="pick-sub">Không lặp · còn ${g.players.length - n}/${g.players.length} người chưa chơi vòng này</p>`;
      }
      el.innerHTML = `<button class="btn primary big spin-btn" data-pick>${icon('shuffle')} Quay chọn người</button>${sub}`;
    }
    el.querySelector('[data-pick]')!.addEventListener('click', () => {
      clearAuto();
      void shufflePick();
    });
  } else if (g.phase === 'picking' && g.current) {
    const p = playerById(g, g.current);
    const bet = g.settings.bet ? `<p class="bet">${icon('users', 16)}<span>${fillBet(p)}</span></p>` : '';
    const ring = g.settings.pickSeconds > 0 ? ringHTML() : '';
    el.innerHTML = `<div class="call-card"><div class="call">${ring}<div class="call-m"><span class="call-k">Đến lượt</span><p class="call-t">${nameChip(p)} chọn 1 răng!</p></div></div>${bet}</div>`;
  } else if (g.phase === 'resolving' && g.current) {
    el.innerHTML = `<div class="call-card bitten"><div class="call"><div class="call-m"><span class="call-k">Ối!</span><p class="call-t">${nameChip(playerById(g, g.current))} bị gặm!</p></div></div></div>`;
  }
}

function fillBet(p: { name: string; color: string; id: string }): string {
  return esc(cardData().bet_reminder).replace('{A}', nameChip(playerById(store.g!, p.id)));
}

async function shufflePick(): Promise<void> {
  if (busy) return;
  unlockAudio();
  busy = true;
  const g = store.g!;
  setMsg('');
  const btn = root.querySelector('[data-pick]') as HTMLButtonElement | null;
  if (btn) btn.disabled = true;
  const mode = g.settings.pickMode ?? 'random';
  const chosen = pickPlayer(g, Math.random);
  g.phase = 'idle'; // giữ idle cho tới khi hiệu ứng xong (tránh chọn răng sớm)
  // Chế độ "không lặp": chỉ nhảy qua những người chưa chơi trong vòng này.
  const done = new Set((g.picked ?? []).filter((id) => id !== chosen));
  const ids = g.players.map((p) => p.id).filter((id) => mode !== 'bag' || !done.has(id));
  if (mode === 'circle' && !reducedMotion()) {
    drawPlayers(chosen);
    sfx.tick();
    await wait(260);
  } else if (!reducedMotion() && ids.length > 1) {
    const steps = 14 + Math.floor(Math.random() * ids.length);
    let i = Math.floor(Math.random() * ids.length);
    // Tính để bước cuối rơi đúng người được chọn.
    const target = ids.indexOf(chosen);
    i = (target - steps + ids.length * 10) % ids.length;
    const total = CONFIG.SHUFFLE_MS;
    for (let s = 0; s <= steps; s++) {
      drawPlayers(ids[(i + s) % ids.length]);
      sfx.tick();
      const k = s / steps;
      await wait((total / steps) * (0.35 + 1.6 * k * k));
    }
  }
  g.phase = 'picking';
  persist();
  sfx.pick();
  vibrate(40);
  busy = false;
  startPicking(true);
}

function startPicking(fresh: boolean): void {
  const g = store.g!;
  refresh();
  stopTimer();
  const total = g.settings.pickSeconds;
  if (!total) return;
  const ring = root.querySelector('.action .ring') as HTMLElement | null;
  if (!ring) return;
  const lead = fresh && g.settings.bet ? 1800 : 0; // cho cả bàn kịp giơ tay cược
  let remain = total;
  setRing(ring, remain, total);
  const startAt = Date.now() + lead;
  timer = window.setInterval(() => {
    if (paused || busy) return;
    const now = Date.now();
    if (now < startAt) return;
    const prev = Math.ceil(remain);
    remain = Math.max(0, total - (now - startAt) / 1000);
    setRing(ring, remain, total);
    if (Math.ceil(remain) !== prev && remain > 0) sfx.timerBeep();
    if (remain <= 0) {
      stopTimer();
      void choose(randomFreeTooth(g), true);
    }
  }, 100);
}

async function choose(idx: number, slow: boolean): Promise<void> {
  const g = store.g!;
  if (busy || paused || g.phase !== 'picking' || !g.current || g.round.revealed[idx]) return;
  busy = true;
  stopTimer();
  const a = playerById(g, g.current);
  const kind = revealTooth(g, idx, slow);
  croc?.lookAt(idx);
  const slowMsg = slow
    ? `<b class="warn">Chậm tay!</b> ${nameChip(a)} ${esc(waterize('uống thêm 1 ngụm', a.water))}. `
    : '';

  if (kind === 'safe') {
    const quip = pickOne(cardData().safe_quips, Math.random);
    g.lastQuip = quip;
    g.phase = 'idle';
    persist();
    sfx.knock();
    vibrate(20);
    croc?.shake();
    busy = false;
    setTimeout(() => croc?.lookAt(null), 600);
    if (roundOver(g)) {
      // Vòng tròn: người cuối cùng của vòng vừa chọn xong.
      await endRound(`${slowMsg}${esc(quip)}`, 1200);
      return;
    }
    refresh();
    setMsg(`${slowMsg}${esc(quip)}`);
    scheduleAuto(slow ? 2200 : 1500);
    return;
  }

  // Răng độc → chuẩn bị nội dung trước rồi mới diễn hiệu ứng.
  const data = cardData();
  const boss = isBossRound(g.round.n, g.settings);
  let pending: Pending;
  if (kind === 'drink') pending = { kind: 'drink', a: a.id };
  else if (kind === 'wheel') pending = { kind: 'wheel', a: a.id };
  else if (kind === 'pushup' || kind === 'squat') pending = { kind: 'exercise', ex: kind, a: a.id };
  else if (kind === 'hard') {
    const { card, coupleHint } = drawHard(g, data, a.id);
    pending = { kind: 'hard', a: a.id, cardId: card.id, text: card.text, seconds: card.seconds, coupleHint, boss: boss && !!card.boss };
  } else {
    const { card, b } = drawBuddy(g, data, a.id);
    pending = { kind: 'buddy', a: a.id, b, cardId: card.id, text: card.text, seconds: card.seconds, boss: boss && !!card.boss };
  }
  g.pending = pending;
  g.phase = 'resolving';
  g.lastQuip = null;
  persist();
  refresh();
  setMsg(slowMsg);

  croc?.close();
  sfx.crunch();
  vibrate(300);
  bite(kind);
  await wait(reducedMotion() ? 250 : 750);
  resolvePending(pending);
}

function bite(kind: string): void {
  const app = document.getElementById('app')!;
  const f = document.createElement('div');
  f.className = `flash-screen k-${kind}`;
  app.appendChild(f);
  setTimeout(() => f.remove(), 700);
  if (!reducedMotion()) {
    app.classList.remove('quake');
    void app.offsetWidth;
    app.classList.add('quake');
    setTimeout(() => app.classList.remove('quake'), 500);
  }
}

function resolvePending(p: Pending): void {
  busy = true;
  refresh();
  showOverlay(p, (o) => void finish(p, o));
}

async function finish(p: Pending, o: Outcome): Promise<void> {
  const g = store.g!;
  const a = playerById(g, p.a);
  let msg = '';
  if (o.kind === 'drink') {
    if (o.save) {
      addLog(g, a.id, 'godsave');
      msg = `${nameChip(a)} được God Save cứu!`;
    } else {
      addLog(g, a.id, 'drink', 1);
      msg = `${nameChip(a)} ${esc(waterize('uống 1 ly', a.water))}.`;
    }
  } else if (o.kind === 'hard') {
    if (o.done) {
      addLog(g, a.id, 'hardDone');
      msg = `${nameChip(a)} vượt thử thách cực khó!`;
    } else {
      addLog(g, a.id, 'hardFail', CONFIG.HARD_FAIL_DRINKS);
      msg = `${nameChip(a)} chịu thua, ${esc(waterize(`uống ${CONFIG.HARD_FAIL_DRINKS} ly`, a.water))}.`;
    }
  } else if (o.kind === 'exercise') {
    const verb = o.ex === 'pushup' ? 'hít đất' : 'squat';
    if (o.done) {
      addLog(g, a.id, o.ex, 0, 0, o.value);
      msg = `${nameChip(a)} đã ${verb} ${o.value} cái — khoẻ!`;
    } else {
      addLog(g, a.id, 'exerciseFail', 1);
      msg = `${nameChip(a)} không ${verb} nổi, ${esc(waterize('uống 1 ly', a.water))}.`;
    }
  } else if (o.kind === 'wheel') {
    if (o.all) {
      for (const x of g.players) addLog(g, x.id, 'partyAll', 1);
      msg = `<b>Cả bàn cùng uống!</b> ${nameChip(a)} quay trúng ô CẢ BÀN.`;
    } else {
      addLog(g, a.id, 'partySelf', 1);
      msg = `${nameChip(a)} ${esc(waterize('uống 1 ly', a.water))} một mình.`;
    }
  } else if (p.kind === 'buddy' && o.kind === 'buddy') {
    const b = playerById(g, p.b);
    addLog(g, a.id, 'buddyA', 1);
    if (o.ok) {
      addLog(g, b.id, 'buddyFree');
      msg = `${nameChip(a)} uống, ${nameChip(b)} thoát!`;
    } else {
      addLog(g, b.id, 'buddyB', 1);
      msg = `${nameChip(a)} và ${nameChip(b)} cùng cạn!`;
    }
  }
  g.pending = null;
  g.phase = 'idle';
  persist();
  croc?.open();
  croc?.lookAt(null);
  busy = false;
  if (roundOver(g)) {
    await endRound(msg);
    return;
  }
  refresh();
  setMsg(msg);
  scheduleAuto(1800);
}

/** Kết thúc hàm: cá sấu ợ một cái rồi sang màn tổng kết. */
async function endRound(msg: string, delay = 450): Promise<void> {
  const g = store.g!;
  clearAuto();
  g.phase = 'roundEnd';
  persist();
  refresh();
  const why = poisonLeft(g) === 0
    ? `Đủ ${POISON_TOTAL} răng độc — hết hàm!`
    : `Cả ${g.players.length} người đã chọn răng — hết vòng, hết hàm!`;
  setMsg(`${msg} <b>${why}</b>`);
  stopHeartbeat();
  await wait(delay);
  sfx.burp();
  croc?.burp();
  await wait(reducedMotion() ? 400 : 1100);
  nav('roundEnd');
}

// ---------- Menu ----------

/** Về màn thiết lập để chỉnh lại — ván đang chơi vẫn được giữ. */
function backToSetup(): void {
  const g = store.g!;
  if (busy || g.pending) return;
  clearAuto();
  if (g.phase === 'picking' && g.current) {
    // Huỷ lượt đang gọi tên (chưa chọn răng) để khỏi bị phạt chậm tay — và trả lại lượt cho người đó.
    const id = g.current;
    const i = g.players.findIndex((x) => x.id === id);
    if ((g.settings.pickMode ?? 'random') === 'circle' && i >= 0) {
      g.last = g.players[(i - 1 + g.players.length) % g.players.length].id;
    } else if (g.picked) {
      g.picked = g.picked.filter((x) => x !== id);
    }
    g.phase = 'idle';
    g.current = null;
  }
  store.roster = g.players.map((p) => ({ ...p }));
  store.settings = { ...g.settings };
  saveRoster();
  persist();
  nav('setup');
}

function setPaused(on: boolean): void {
  paused = on;
  refresh();
  if (on) clearAuto();
  else if (store.g?.phase === 'idle') scheduleAuto(800);
}

function openMenu(): void {
  const g = store.g!;
  const m = modal(`
    <div class="menu">
      <div class="m-head"><h2 class="m-title">Menu</h2><button class="icon-btn" data-close aria-label="Đóng">${icon('x')}</button></div>
      <button class="mi" data-a="pause">${icon('pause')} Tạm dừng</button>
      <button class="mi" data-a="players">${icon('users')} Sửa người chơi</button>
      <button class="mi" data-a="cards">${icon('cards')} Thêm thẻ của hội</button>
      <button class="mi" data-a="mode">${icon('users')} Chọn người: ${{ random: 'Ngẫu nhiên', bag: 'Không lặp', circle: 'Vòng tròn' }[g.settings.pickMode ?? 'random']}</button>
      <button class="mi" data-a="sound">${icon(g.settings.sound ? 'volume' : 'mute')} Âm thanh: ${g.settings.sound ? 'Bật' : 'Tắt'}</button>
      <button class="mi" data-a="rules">${icon('book')} Luật chơi</button>
      <button class="mi danger" data-a="end">${icon('flag')} Kết thúc ván</button>
    </div>`);
  m.el.querySelector('.menu')!.addEventListener('click', async (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-a]');
    if (!b) return;
    const act = b.dataset.a;
    m.close();
    if (act === 'pause') {
      setPaused(true);
      const pm = modal(
        `<div class="paused"><h2 class="m-title">Tạm dừng</h2><p class="m-body">Đi vệ sinh, gọi thêm mồi, rót thêm bia…</p><button class="btn primary big" data-close>${icon('play')} Chơi tiếp</button></div>`,
        'dialog',
      );
      const obs = new MutationObserver(() => {
        if (!pm.el.isConnected) {
          obs.disconnect();
          setPaused(false);
        }
      });
      obs.observe(pm.el.parentElement!, { childList: true });
    } else if (act === 'players') {
      setPaused(true);
      editPlayers(() => {
        setPaused(false);
        drawPlayers();
        drawAction();
      });
    } else if (act === 'cards') {
      store.back = 'game';
      nav('cards');
    } else if (act === 'mode') {
      const order = ['random', 'bag', 'circle'] as const;
      const cur = g.settings.pickMode ?? 'random';
      g.settings.pickMode = order[(order.indexOf(cur) + 1) % order.length];
      store.settings.pickMode = g.settings.pickMode;
      g.picked = [];
      persist();
      saveRoster();
      refresh();
      clearAuto();
      if (g.phase === 'idle') scheduleAuto(1200);
      openMenu();
    } else if (act === 'sound') {
      g.settings.sound = !g.settings.sound;
      store.settings.sound = g.settings.sound;
      setSound(g.settings.sound);
      persist();
      saveRoster();
      refresh();
    } else if (act === 'rules') {
      showRules();
    } else if (act === 'end') {
      setPaused(true);
      const ok = await confirmBox('Kết thúc ván?', 'Xem tổng kết buổi nhậu và trao danh hiệu.', 'Kết thúc', 'Chơi tiếp');
      setPaused(false);
      if (ok) nav('session');
    }
  });
}

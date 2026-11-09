import { CONFIG } from '../config';
import { avatar, esc, icon, nameChip, reducedMotion, wait } from './dom';
import { Croc, crocHTML } from './croc';
import { ringHTML, setRing } from './fx';
import { modal, confirmBox, editPlayers, showRules } from './modals';
import { showOverlay, type Outcome } from './overlays';
import { store, persist, nav, cardData, saveRoster } from './store';
import {
  POISON_TOTAL, addLog, dangerPct, drawBuddy, drawHard, isBossRound, pickOne, pickPlayer, playerById,
  poisonLeft, randomFreeTooth, revealTooth, roundOver, waterize,
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

export function leaveGame(): void {
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
      <div class="gh-round"><span class="lbl">Hàm</span><b>${g.round.n}</b></div>
      <div class="gh-stat"><span class="lbl">Răng độc còn</span><b class="v-poison"></b></div>
      <div class="gh-stat"><span class="lbl">Nguy cơ bị gặm</span><b class="v-danger"></b></div>
      <button class="icon-btn" data-menu aria-label="Menu">${icon('menu')}</button>
    </header>
    <div class="pbar n${Math.min(g.players.length, 12)}"></div>
    <div class="action"></div>
    <p class="msg" aria-live="polite"></p>
    <div class="legend">
      <span><i class="dot drink"></i>Uống ×2</span>
      <span><i class="dot hard"></i>Cực khó ×1</span>
      <span><i class="dot buddy"></i>Uống cùng ×1</span>
    </div>
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
  }
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
  if (hot && !paused && g.settings.sound) startHeartbeat();
  else stopHeartbeat();
  drawPlayers();
  drawAction();
  croc?.sync(g.round.teeth, g.round.revealed, g.phase === 'picking' && !busy && !paused);
}

function drawPlayers(highlight?: string): void {
  const g = store.g!;
  const on = highlight ?? (g.phase === 'picking' || g.phase === 'resolving' ? g.current : null);
  root.querySelector('.pbar')!.innerHTML = g.players
    .map((p) => `<div class="pb${p.id === on ? ' on' : ''}">${avatar(p)}<span>${esc(p.name)}</span></div>`)
    .join('');
}

function drawAction(): void {
  const g = store.g!;
  const el = root.querySelector('.action') as HTMLElement;
  if (g.phase === 'idle') {
    el.innerHTML = `<button class="btn primary big spin-btn" data-pick>${icon('shuffle')} Quay chọn người</button>`;
    el.querySelector('[data-pick]')!.addEventListener('click', () => void shufflePick());
  } else if (g.phase === 'picking' && g.current) {
    const p = playerById(g, g.current);
    const bet = g.settings.bet ? `<p class="bet">${icon('users', 16)}<span>${fillBet(p)}</span></p>` : '';
    const ring = g.settings.pickSeconds > 0 ? ringHTML() : '';
    el.innerHTML = `<div class="call">${ring}<p class="call-t">Cá sấu gọi tên ${nameChip(p)}, chọn 1 răng!</p></div>${bet}`;
  } else if (g.phase === 'resolving' && g.current) {
    el.innerHTML = `<div class="call"><p class="call-t">${nameChip(playerById(g, g.current))} bị gặm!</p></div>`;
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
  const chosen = pickPlayer(g, Math.random);
  g.phase = 'idle'; // giữ idle cho tới khi hiệu ứng xong (tránh chọn răng sớm)
  const ids = g.players.map((p) => p.id);
  if (!reducedMotion() && ids.length > 1) {
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
    refresh();
    setMsg(`${slowMsg}${esc(quip)}`);
    setTimeout(() => croc?.lookAt(null), 600);
    return;
  }

  // Răng độc → chuẩn bị nội dung trước rồi mới diễn hiệu ứng.
  const data = cardData();
  const boss = isBossRound(g.round.n, g.settings);
  let pending: Pending;
  if (kind === 'drink') pending = { kind: 'drink', a: a.id };
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
  } else if (p.kind === 'buddy') {
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
    g.phase = 'roundEnd';
    persist();
    refresh();
    setMsg(`${msg} <b>Đủ ${POISON_TOTAL} răng độc — hết hàm!</b>`);
    stopHeartbeat();
    await wait(450);
    sfx.burp();
    croc?.burp();
    await wait(reducedMotion() ? 400 : 1100);
    nav('roundEnd');
    return;
  }
  refresh();
  setMsg(msg);
}

// ---------- Menu ----------

function setPaused(on: boolean): void {
  paused = on;
  refresh();
}

function openMenu(): void {
  const g = store.g!;
  const m = modal(`
    <div class="menu">
      <div class="m-head"><h2 class="m-title">Menu</h2><button class="icon-btn" data-close aria-label="Đóng">${icon('x')}</button></div>
      <button class="mi" data-a="pause">${icon('pause')} Tạm dừng</button>
      <button class="mi" data-a="players">${icon('users')} Sửa người chơi</button>
      <button class="mi" data-a="cards">${icon('cards')} Thêm thẻ của hội</button>
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

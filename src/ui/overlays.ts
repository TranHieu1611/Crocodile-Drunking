import { CONFIG } from '../config';
import { avatar, icon, nameChip, esc } from './dom';
import { modal, type ModalHandle } from './modals';
import { wheelHTML, partyWheelHTML, countWheelHTML, betWheelHTML, spinWheel, markWin, confetti, ringHTML, setRing } from './fx';
import { store, persist } from './store';
import { PARTY_SLICES, fillText, playerById, repsValues, spinBet, spinCount, spinGodSave, spinParty, waterize } from '../engine';
import { sfx, vibrate } from '../audio';
import type { Pending } from '../state';

export type Outcome =
  | { kind: 'drink'; save: boolean }
  | { kind: 'hard'; done: boolean }
  | { kind: 'buddy'; ok: boolean }
  | { kind: 'wheel'; all: boolean }
  | { kind: 'exercise'; ex: 'pushup' | 'squat'; value: number; done: boolean }
  | { kind: 'bet'; drink: boolean };

function who(id: string): string {
  const p = playerById(store.g!, id);
  return `<div class="ov-who">${avatar(p, 'lg')}<span class="ov-name">${esc(p.name)}</span></div>`;
}

function cardTimer(host: HTMLElement, seconds: number): () => void {
  const ring = host.querySelector('.ring') as HTMLElement;
  const btn = host.querySelector('[data-timer]') as HTMLButtonElement;
  let remain = seconds;
  let t: number | null = null;
  setRing(ring, remain, seconds);
  const stop = () => {
    if (t !== null) clearInterval(t);
    t = null;
  };
  btn.addEventListener('click', () => {
    if (t !== null) {
      stop();
      btn.innerHTML = `${icon('play', 18)} Tiếp tục đếm`;
      return;
    }
    if (remain <= 0) remain = seconds;
    btn.innerHTML = `${icon('pause', 18)} Dừng`;
    const end = Date.now() + remain * 1000;
    t = window.setInterval(() => {
      const prev = Math.ceil(remain);
      remain = Math.max(0, (end - Date.now()) / 1000);
      setRing(ring, remain, seconds);
      if (Math.ceil(remain) !== prev && remain <= 3 && remain > 0) sfx.timerBeep();
      if (remain <= 0) {
        stop();
        sfx.buzz();
        vibrate([120, 80, 120]);
        ring.classList.add('done');
        ring.querySelector('.ring-num')!.textContent = 'Hết!';
        btn.innerHTML = `${icon('refresh', 18)} Đếm lại`;
      }
    }, 100);
  });
  return stop;
}

function timerBlock(seconds: number): string {
  return `<div class="ov-timer">${ringHTML('big')}<div class="ov-timer-r"><span class="lbl">${seconds} giây</span><button class="btn ghost sm" data-timer>${icon('timer', 18)} Bắt đầu đếm</button></div></div>`;
}

export function showOverlay(p: Pending, done: (o: Outcome) => void): ModalHandle {
  const g = store.g!;
  const a = playerById(g, p.a);
  const chip = (x: Parameters<typeof nameChip>[0]) => nameChip(x);

  if (p.kind === 'drink') {
    const m = modal(
      `<div class="ov-in">
        <div class="ov-kicker">${icon('tooth', 18)} Răng Uống</div>
        <h2 class="ov-title">BỊ GẶM!</h2>
        ${who(p.a)}
        ${wheelHTML()}
        <div class="ov-result" aria-live="polite"></div>
        <div class="ov-actions">
          <button class="btn red big" data-spin>QUAY</button>
          <button class="btn primary big hidden" data-next>Tiếp tục</button>
        </div>
      </div>`,
      'ov ov-drink',
      false,
    );
    const res = m.el.querySelector('.ov-result') as HTMLElement;
    const spinBtn = m.el.querySelector('[data-spin]') as HTMLButtonElement;
    const next = m.el.querySelector('[data-next]') as HTMLButtonElement;
    const show = (save: boolean, fresh: boolean) => {
      res.innerHTML = save
        ? `<div class="res save"><b>GOD SAVE!</b><span>Thoát nạn — trời thương ${esc(a.name)}</span></div>`
        : `<div class="res bad"><b>${esc(waterize('Uống 1 ly', a.water))}</b><span>Cá sấu không tha cho ${esc(a.name)}</span></div>`;
      if (fresh) {
        if (save) {
          sfx.ting();
          confetti(m.el.querySelector('.modal-box') as HTMLElement);
        } else {
          sfx.buzz();
          vibrate(300);
          m.el.classList.remove('flash');
          void m.el.offsetWidth;
          m.el.classList.add('flash');
        }
      }
      spinBtn.classList.add('hidden');
      next.classList.remove('hidden');
      next.focus();
    };
    const wheel = m.el.querySelector('.wheel-wrap') as HTMLElement;
    if (p.result) {
      const angle = p.result === 'save' ? 18 : 198;
      (wheel.querySelector('.wheel-rot') as SVGGElement).style.transform = `rotate(${360 - angle}deg)`;
      markWin(wheel, angle);
      show(p.result === 'save', false);
    }
    spinBtn.addEventListener('click', async () => {
      spinBtn.disabled = true;
      const r = spinGodSave();
      p.result = r.save ? 'save' : 'drink';
      persist();
      await spinWheel(wheel, r.angle);
      show(r.save, true);
    });
    next.addEventListener('click', () => {
      m.close();
      done({ kind: 'drink', save: p.result === 'save' });
    });
    return m;
  }

  if (p.kind === 'hard') {
    const text = waterize(fillText(g, p.text.replace(/^HÀM TRÙM:\s*/, ''), p.a, undefined, chip), a.water);
    const okCouple = g.players.filter((x) => x.couple && x.id !== p.a);
    const hint = p.coupleHint
      ? `<p class="card-hint">${icon('heart', 16)} Chỉ chọn người đã bật OK cặp: ${okCouple.length ? okCouple.map((x) => esc(x.name)).join(', ') : 'chưa có ai'}</p>`
      : '';
    const m = modal(
      `<div class="ov-in">
        <div class="ov-kicker">${icon('tooth', 18)} Răng Cực Khó ${p.boss ? '<span class="tag-boss">HÀM TRÙM</span>' : ''}</div>
        <h2 class="ov-title">BỊ GẶM!</h2>
        ${who(p.a)}
        <div class="card k-hard"><p>${text}</p>${hint}</div>
        ${timerBlock(p.seconds)}
        <div class="ov-actions col">
          <button class="btn primary big" data-ok>${icon('check')} Làm được rồi</button>
          <button class="btn purple" data-fail>${esc(waterize(`Chịu thua, uống ${CONFIG.HARD_FAIL_DRINKS} ly`, a.water))}</button>
        </div>
      </div>`,
      'ov ov-hard',
      false,
    );
    const stop = cardTimer(m.el, p.seconds);
    m.el.querySelector('[data-ok]')!.addEventListener('click', () => {
      stop();
      sfx.ting();
      m.close();
      done({ kind: 'hard', done: true });
    });
    m.el.querySelector('[data-fail]')!.addEventListener('click', () => {
      stop();
      sfx.buzz();
      vibrate(200);
      m.close();
      done({ kind: 'hard', done: false });
    });
    return m;
  }

  if (p.kind === 'bet') {
    const ws = p.winners.map((id) => g.players.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x);
    const m = modal(
      `<div class="ov-in">
        <div class="ov-kicker">${icon('users', 18)} Cược nhanh</div>
        <h2 class="ov-title">CƯỢC THẮNG!</h2>
        <div class="bet-win">${ws.map((x) => `<span class="bw-p">${avatar(x, 'sm')}${esc(x.name)}</span>`).join('')}</div>
        <p class="ov-sure">${ws.length} người đoán trúng ${chip(a)} bị gặm — quay xem ${esc(a.name)} có phải <b>uống thêm 1 ly</b> không</p>
        ${betWheelHTML(ws.length)}
        <div class="ov-result" aria-live="polite"></div>
        <div class="ov-actions">
          <button class="btn bet-btn big" data-spin>QUAY</button>
          <button class="btn primary big hidden" data-next>Tiếp tục</button>
        </div>
      </div>`,
      'ov ov-bet',
      false,
    );
    const res = m.el.querySelector('.ov-result') as HTMLElement;
    const spinBtn = m.el.querySelector('[data-spin]') as HTMLButtonElement;
    const next = m.el.querySelector('[data-next]') as HTMLButtonElement;
    const wheel = m.el.querySelector('.wheel-wrap') as HTMLElement;
    const show = (drink: boolean, fresh: boolean) => {
      res.innerHTML = drink
        ? `<div class="res bad"><b>${esc(waterize('Uống thêm 1 ly', a.water))}</b><span>Cả bàn đoán trúng, ${esc(a.name)} chịu trận</span></div>`
        : `<div class="res save"><b>THOÁT NẠN!</b><span>Cược thắng nhưng ${esc(a.name)} vẫn lách được</span></div>`;
      if (fresh) {
        if (drink) {
          sfx.buzz();
          vibrate(250);
        } else {
          sfx.ting();
          confetti(m.el.querySelector('.modal-box') as HTMLElement);
        }
      }
      spinBtn.classList.add('hidden');
      next.classList.remove('hidden');
      next.focus();
    };
    if (p.result && p.angle !== undefined) {
      (wheel.querySelector('.wheel-rot') as SVGGElement).style.transform = `rotate(${360 - p.angle}deg)`;
      markWin(wheel, p.angle);
      show(p.result === 'drink', false);
    }
    spinBtn.addEventListener('click', async () => {
      spinBtn.disabled = true;
      const r = spinBet(ws.length);
      p.result = r.drink ? 'drink' : 'free';
      p.angle = r.angle;
      persist();
      await spinWheel(wheel, r.angle);
      show(r.drink, true);
    });
    next.addEventListener('click', () => {
      m.close();
      done({ kind: 'bet', drink: p.result === 'drink' });
    });
    return m;
  }

  if (p.kind === 'exercise') {
    const ex = p.ex;
    const name = ex === 'pushup' ? 'Hít Đất' : 'Squat';
    const verb = ex === 'pushup' ? 'hít đất' : 'squat';
    const values = repsValues(ex);
    const m = modal(
      `<div class="ov-in">
        <div class="ov-kicker">${icon(ex === 'pushup' ? 'pushup' : 'squat', 18)} Răng ${name}</div>
        <h2 class="ov-title">BỊ GẶM!</h2>
        ${who(p.a)}
        <p class="ov-sure">Quay xem <b>${esc(a.name)}</b> phải ${verb} bao nhiêu cái</p>
        ${countWheelHTML(values, ex)}
        <div class="ov-result" aria-live="polite"></div>
        <div class="ov-actions col">
          <button class="btn ex-btn big" data-spin>QUAY</button>
          <button class="btn primary big hidden" data-ok>${icon('check')} Làm xong rồi</button>
          <button class="btn ghost hidden" data-fail>${esc(waterize('Không nổi, uống 1 ly', a.water))}</button>
        </div>
      </div>`,
      `ov ov-ex ov-${ex}`,
      false,
    );
    const res = m.el.querySelector('.ov-result') as HTMLElement;
    const spinBtn = m.el.querySelector('[data-spin]') as HTMLButtonElement;
    const ok = m.el.querySelector('[data-ok]') as HTMLButtonElement;
    const fail = m.el.querySelector('[data-fail]') as HTMLButtonElement;
    const wheel = m.el.querySelector('.wheel-wrap') as HTMLElement;
    const show = (v: number, fresh: boolean) => {
      res.innerHTML = `<div class="res ex"><b>${v} CÁI ${verb.toUpperCase()}!</b><span>Cả bàn đếm to: 1, 2, 3…</span></div>`;
      if (fresh) {
        sfx.ting();
        vibrate([60, 40, 60]);
      }
      spinBtn.classList.add('hidden');
      ok.classList.remove('hidden');
      fail.classList.remove('hidden');
      ok.focus();
    };
    if (p.value !== undefined && p.angle !== undefined) {
      (wheel.querySelector('.wheel-rot') as SVGGElement).style.transform = `rotate(${360 - p.angle}deg)`;
      markWin(wheel, p.angle);
      show(p.value, false);
    }
    spinBtn.addEventListener('click', async () => {
      spinBtn.disabled = true;
      const r = spinCount(values);
      p.value = r.value;
      p.angle = r.angle;
      persist();
      await spinWheel(wheel, r.angle);
      show(r.value, true);
    });
    ok.addEventListener('click', () => {
      m.close();
      done({ kind: 'exercise', ex, value: p.value ?? values[0], done: true });
    });
    fail.addEventListener('click', () => {
      sfx.buzz();
      m.close();
      done({ kind: 'exercise', ex, value: p.value ?? values[0], done: false });
    });
    return m;
  }

  if (p.kind === 'wheel') {
    const m = modal(
      `<div class="ov-in">
        <div class="ov-kicker">${icon('tooth', 18)} Răng Vòng Quay</div>
        <h2 class="ov-title">BỊ GẶM!</h2>
        ${who(p.a)}
        <p class="ov-sure">Quay xem ai uống: <b>${esc(a.name)}</b> hay <b>cả bàn</b>?</p>
        ${partyWheelHTML(PARTY_SLICES)}
        <div class="ov-result" aria-live="polite"></div>
        <div class="ov-actions">
          <button class="btn orange big" data-spin>QUAY</button>
          <button class="btn primary big hidden" data-next>Tiếp tục</button>
        </div>
      </div>`,
      'ov ov-wheel',
      false,
    );
    const res = m.el.querySelector('.ov-result') as HTMLElement;
    const spinBtn = m.el.querySelector('[data-spin]') as HTMLButtonElement;
    const next = m.el.querySelector('[data-next]') as HTMLButtonElement;
    const wheel = m.el.querySelector('.wheel-wrap') as HTMLElement;
    const show = (all: boolean, fresh: boolean) => {
      const waterAny = g.players.some((x) => x.water);
      res.innerHTML = all
        ? `<div class="res all"><b>CẢ BÀN CÙNG UỐNG!</b><span>Mỗi người 1 ly${waterAny ? ' (ai lái xe thì nước lọc)' : ''} — 1, 2, 3 dzô!</span></div>`
        : `<div class="res bad"><b>${esc(waterize('Uống 1 ly', a.water))}</b><span>${esc(a.name)} tự xử một mình</span></div>`;
      if (fresh) {
        if (all) {
          sfx.ting();
          confetti(m.el.querySelector('.modal-box') as HTMLElement, ['#FF9F43', '#FFC93C', '#FFF6E8', '#B8FF3C']);
        } else {
          sfx.buzz();
        }
        vibrate(all ? [80, 60, 80, 60, 160] : 300);
      }
      spinBtn.classList.add('hidden');
      next.classList.remove('hidden');
      next.focus();
    };
    if (p.result) {
      const step = 360 / PARTY_SLICES;
      const angle = (p.result === 'all' ? 1 : 0) * step + step / 2;
      (wheel.querySelector('.wheel-rot') as SVGGElement).style.transform = `rotate(${360 - angle}deg)`;
      markWin(wheel, angle);
      show(p.result === 'all', false);
    }
    spinBtn.addEventListener('click', async () => {
      spinBtn.disabled = true;
      const r = spinParty();
      p.result = r.all ? 'all' : 'self';
      persist();
      await spinWheel(wheel, r.angle);
      show(r.all, true);
    });
    next.addEventListener('click', () => {
      m.close();
      done({ kind: 'wheel', all: p.result === 'all' });
    });
    return m;
  }

  const b = playerById(g, p.b);
  const text = waterize(fillText(g, p.text.replace(/^HÀM TRÙM:\s*/, ''), p.a, p.b, chip), a.water);
  const m = modal(
    `<div class="ov-in">
      <div class="ov-kicker">${icon('tooth', 18)} Răng Uống Cùng ${p.boss ? '<span class="tag-boss">HÀM TRÙM</span>' : ''}</div>
      <h2 class="ov-title">BỊ GẶM!</h2>
      <p class="ov-sure">${chip(a)} chắc chắn ${esc(waterize('uống 1 ly', a.water))}</p>
      <div class="pair">
        <div class="pair-p">${avatar(a, 'lg')}<span>${esc(a.name)}</span></div>
        <svg class="pair-arrow" viewBox="0 0 60 24" aria-hidden="true"><path d="M2 12h50M42 3l10 9-10 9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <div class="pair-p dragged">${avatar(b, 'lg')}<span>${esc(b.name)}</span><em>bị kéo</em></div>
      </div>
      <div class="card k-buddy"><p>${text}</p></div>
      ${timerBlock(p.seconds)}
      <div class="ov-vote-t">Cả bàn bỏ phiếu</div>
      <div class="ov-actions col">
        <button class="btn primary" data-ok>Cả nhà OK → ${esc(b.name)} thoát</button>
        <button class="btn yellow" data-no>Không OK → ${esc(b.name)} ${esc(waterize('uống 1 ly', b.water))} cùng ${esc(a.name)}</button>
      </div>
    </div>`,
    'ov ov-buddy',
    false,
  );
  const stop = cardTimer(m.el, p.seconds);
  m.el.querySelector('[data-ok]')!.addEventListener('click', () => {
    stop();
    sfx.ting();
    m.close();
    done({ kind: 'buddy', ok: true });
  });
  m.el.querySelector('[data-no]')!.addEventListener('click', () => {
    stop();
    sfx.buzz();
    m.close();
    done({ kind: 'buddy', ok: false });
  });
  return m;
}

import { CONFIG } from '../config';
import { avatar, icon, nameChip, esc } from './dom';
import { modal, type ModalHandle } from './modals';
import { wheelHTML, spinWheel, confetti, ringHTML, setRing } from './fx';
import { store, persist } from './store';
import { fillText, playerById, spinGodSave, waterize } from '../engine';
import { sfx, vibrate } from '../audio';
import type { Pending } from '../state';

export type Outcome =
  | { kind: 'drink'; save: boolean }
  | { kind: 'hard'; done: boolean }
  | { kind: 'buddy'; ok: boolean };

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

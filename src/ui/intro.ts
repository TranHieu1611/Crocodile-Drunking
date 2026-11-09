// Màn chào + luật chơi dạng trang (luồng: Chào → Luật → Nhập tên).
import { CONFIG } from '../config';
import { Croc, crocHTML } from './croc';
import { icon, reducedMotion } from './dom';
import { SLIDES } from './modals';
import { store, nav } from './store';
import { loadGame } from '../state';
import { sfx, unlockAudio, vibrate, setSound } from '../audio';

let introCroc: Croc | null = null;
let loopTimer: number | null = null;

export function leaveIntro(): void {
  if (loopTimer !== null) clearTimeout(loopTimer);
  loopTimer = null;
  introCroc?.destroy();
  introCroc = null;
}

function fireflies(n = 14): string {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = Math.round(Math.random() * 100);
    const y = Math.round(20 + Math.random() * 75);
    const d = (4 + Math.random() * 6).toFixed(1);
    const dl = (-Math.random() * 8).toFixed(1);
    s += `<i style="left:${x}%;top:${y}%;animation-duration:${d}s;animation-delay:${dl}s"></i>`;
  }
  return `<div class="fireflies" aria-hidden="true">${s}</div>`;
}

export function renderIntro(root: HTMLElement): void {
  const saved = loadGame();
  root.innerHTML = `
  <section class="screen intro">
    ${fireflies()}
    <div class="intro-copy">
      <p class="intro-kicker">Game nhậu · 2–12 người</p>
      <h1 class="intro-title"><span>Răng</span><span>Cá Sấu</span></h1>
      <p class="intro-tag">12 cái răng. <b>4 cái có độc.</b><br>Tới lượt bạn thò tay vào miệng nó.</p>
      <ul class="intro-pills">
        <li><i class="dot drink"></i>Uống</li>
        <li><i class="dot hard"></i>Cực khó</li>
        <li><i class="dot buddy"></i>Kéo bạn uống cùng</li>
      </ul>
      <div class="intro-cta">
        <button class="btn primary big pulse" data-go>Vào chơi ${icon('right')}</button>
        ${
          saved
            ? `<button class="btn ghost" data-resume>${icon('refresh', 18)} Chơi tiếp ván cũ · Hàm ${saved.round.n} · ${saved.players.length} người</button>`
            : ''
        }
      </div>
      <p class="intro-foot">Chỉ dành cho người đủ 18 tuổi · Uống có trách nhiệm · Đã uống không lái xe</p>
    </div>
    <div class="intro-stage">
      <div class="croc-host">${crocHTML()}</div>
      <p class="intro-try">Thử bấm một cái răng xem…</p>
    </div>
  </section>`;

  introCroc = new Croc(root.querySelector('.croc') as HTMLElement);
  const croc = introCroc;
  croc.sync(Array(CONFIG.TEETH).fill('safe'), Array(CONFIG.TEETH).fill(false), true);
  let snapping = false;

  const snap = () => {
    if (snapping) return;
    snapping = true;
    croc.close();
    sfx.crunch();
    vibrate(200);
    setTimeout(() => {
      croc.open();
      snapping = false;
    }, 650);
  };

  root.querySelector('.teeth')!.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLButtonElement>('.tooth');
    if (!t || snapping) return;
    unlockAudio();
    const i = Number(t.dataset.i);
    croc.lookAt(i);
    if (Math.random() < 0.3) {
      t.classList.add('bad');
      t.dataset.kind = ['drink', 'hard', 'buddy'][Math.floor(Math.random() * 3)];
      snap();
      root.querySelector('.intro-try')!.textContent = 'RẮC! Vào chơi thật đi nào…';
      setTimeout(() => {
        t.classList.remove('bad');
        t.dataset.kind = '';
      }, 1400);
    } else {
      t.classList.add('down');
      sfx.knock();
      croc.shake();
      setTimeout(() => t.classList.remove('down'), 1200);
    }
  });
  root.querySelector('.teeth')!.addEventListener('pointerover', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('.tooth');
    if (t) croc.lookAt(Number(t.dataset.i));
  });

  // Cá sấu tự đảo mắt, thỉnh thoảng đớp một cái.
  if (!reducedMotion()) {
    const loop = () => {
      loopTimer = window.setTimeout(() => {
        if (!introCroc) return;
        if (Math.random() < 0.35 && !snapping) {
          snapping = true;
          croc.close();
          setTimeout(() => {
            croc.open();
            snapping = false;
          }, 420);
        } else croc.lookAt(Math.floor(Math.random() * CONFIG.TEETH));
        loop();
      }, 1800 + Math.random() * 1800);
    };
    loop();
  }

  root.querySelector('[data-go]')!.addEventListener('click', () => {
    unlockAudio();
    sfx.pick();
    nav('rules');
  });
  root.querySelector('[data-resume]')?.addEventListener('click', () => {
    const g = loadGame();
    if (!g) return nav('rules');
    store.g = g;
    setSound(g.settings.sound);
    unlockAudio();
    nav('game');
  });
}

// ---------- Luật chơi (trang) ----------

function tooth(color: string, extra = ''): string {
  return `<svg viewBox="0 0 40 44" class="rt" ${extra}><path d="M5 42 C5 30 12 12 18.5 3.5 Q20 1.5 21.5 3.5 C28 12 35 30 35 42 Z" fill="${color}"/></svg>`;
}

const ART = [
  () => {
    const kinds = ['safe', 'drink', 'safe', 'safe', 'hard', 'safe', 'drink', 'safe', 'safe', 'buddy', 'safe', 'safe'];
    const col: Record<string, string> = { safe: '#F4EBD0', drink: '#FF5A4E', hard: '#C084FC', buddy: '#FFC93C' };
    return `<div class="art-teeth">${kinds.map((k, i) => `<span style="animation-delay:${i * 60}ms">${tooth(col[k])}</span>`).join('')}</div>`;
  },
  () =>
    `<div class="art-wheel"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="#FF5A4E"/><path d="M60 60 L60 4 A56 56 0 0 1 92.9 14.7 Z" fill="#FFC93C"/><circle cx="60" cy="60" r="56" fill="none" stroke="#FFF6E8" stroke-width="4"/><circle cx="60" cy="60" r="9" fill="#FFF6E8"/></svg><b>10%</b><span>GOD SAVE</span></div>`,
  () =>
    `<div class="art-pair"><div>${tooth('#C084FC')}<b>2 ly</b><span>nếu chịu thua</span></div><div>${tooth('#FFC93C')}<b>+1 người</b><span>bị kéo theo</span></div></div>`,
  () =>
    `<div class="art-icons"><div class="ai boss">${icon('flag', 30)}<span>Hàm Trùm</span></div><div class="ai couple">${icon('heart', 30)}<span>OK cặp</span></div><div class="ai water">${icon('water', 30)}<span>Nước lọc</span></div></div>`,
];

export function renderRulesPage(root: HTMLElement): void {
  let i = 0;
  root.innerHTML = `
  <section class="screen rules-page">
    <header class="rp-head">
      <button class="icon-btn" data-back aria-label="Quay lại">${icon('left')}</button>
      <span class="rp-step"></span>
      <button class="link" data-skip>Bỏ qua</button>
    </header>
    <div class="rp-body"></div>
    <div class="rp-foot">
      <div class="dots">${SLIDES.map(() => '<i></i>').join('')}</div>
      <div class="row2"><button class="btn ghost" data-prev>${icon('left')} Trước</button><button class="btn primary" data-next></button></div>
    </div>
  </section>`;
  const body = root.querySelector('.rp-body') as HTMLElement;
  const draw = () => {
    root.querySelector('.rp-step')!.textContent = `Luật chơi ${i + 1}/${SLIDES.length}`;
    body.innerHTML = `<div class="rp-slide"><div class="rp-art">${ART[i]()}</div><h2 class="rp-title">${SLIDES[i].t}</h2><p class="rp-text">${SLIDES[i].b}</p></div>`;
    root.querySelectorAll('.rp-foot .dots i').forEach((d, k) => d.classList.toggle('on', k === i));
    (root.querySelector('[data-prev]') as HTMLButtonElement).disabled = i === 0;
    root.querySelector('[data-next]')!.innerHTML =
      i === SLIDES.length - 1 ? `Nhập tên người chơi ${icon('right')}` : `Tiếp ${icon('right')}`;
  };
  const toSetup = () => {
    store.g = null;
    nav('setup');
  };
  root.querySelector('[data-prev]')!.addEventListener('click', () => {
    if (i > 0) i--;
    draw();
  });
  root.querySelector('[data-next]')!.addEventListener('click', () => {
    if (i === SLIDES.length - 1) toSetup();
    else {
      i++;
      sfx.tick();
      draw();
    }
  });
  root.querySelector('[data-skip]')!.addEventListener('click', toSetup);
  root.querySelector('[data-back]')!.addEventListener('click', () => nav('intro'));
  // Vuốt trái/phải trên mobile, phím mũi tên trên desktop.
  let x0: number | null = null;
  body.addEventListener('pointerdown', (e) => (x0 = e.clientX));
  body.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0 && i < SLIDES.length - 1) i++;
    else if (dx > 0 && i > 0) i--;
    draw();
  });
  root.tabIndex = -1;
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') (root.querySelector('[data-next]') as HTMLButtonElement).click();
    if (e.key === 'ArrowLeft' && i > 0) {
      i--;
      draw();
    }
  });
  root.focus({ preventScroll: true });
  draw();
}

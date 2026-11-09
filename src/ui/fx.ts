import { CONFIG } from '../config';
import { sfx } from '../audio';
import { reducedMotion } from './dom';

const R = 132;
const C = 150;

function pt(a: number, r = R): string {
  const rad = (a * Math.PI) / 180;
  return `${(C + r * Math.sin(rad)).toFixed(2)} ${(C - r * Math.cos(rad)).toFixed(2)}`;
}

function slice(a0: number, a1: number, cls: string): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  return `<path class="${cls}" d="M${C} ${C} L${pt(a0)} A${R} ${R} 0 ${large} 1 ${pt(a1)} Z"/>`;
}

function label(a: number, text: string, cls: string): string {
  const [x, y] = pt(a, R * 0.64).split(' ');
  return `<text class="${cls}" x="${x}" y="${y}" transform="rotate(${a} ${x} ${y})" text-anchor="middle" dominant-baseline="middle">${text}</text>`;
}

export function wheelHTML(): string {
  const save = 360 * CONFIG.GOD_SAVE;
  const n = 9;
  const step = (360 - save) / n;
  let s = slice(0, save, 'w-save');
  for (let i = 0; i < n; i++) {
    const a0 = save + i * step;
    s += slice(a0, a0 + step, i % 2 ? 'w-drink2' : 'w-drink');
    s += label(a0 + step / 2, 'UỐNG', 'w-txt');
  }
  s += label(save / 2, 'GOD SAVE', 'w-txt w-txt-save');
  return `
  <div class="wheel-wrap">
    <svg class="wheel-pointer" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 38 L6 6 Q20 0 34 6 Z"/></svg>
    <svg class="wheel" viewBox="0 0 300 300" role="img" aria-label="Vòng quay God Save">
      <g class="wheel-rot">${s}<circle cx="${C}" cy="${C}" r="${R}" class="w-rim"/></g>
      <circle cx="${C}" cy="${C}" r="22" class="w-hub"/>
    </svg>
  </div>`;
}

/** Quay bánh xe để kim (ở đỉnh) chỉ đúng góc `angle` trên bánh. */
export function spinWheel(root: HTMLElement, angle: number): Promise<void> {
  const g = root.querySelector<SVGGElement>('.wheel-rot')!;
  const rm = reducedMotion();
  const [lo, hi] = CONFIG.ROULETTE_MS;
  const dur = rm ? 500 : lo + Math.random() * (hi - lo);
  const turns = rm ? 1 : 5;
  const final = 360 * turns + (360 - angle);
  const t0 = performance.now();
  let lastTick = 0;
  return new Promise((res) => {
    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 4);
      const rot = final * e;
      g.style.transform = `rotate(${rot}deg)`;
      const tick = Math.floor(rot / 36);
      if (tick !== lastTick) {
        lastTick = tick;
        sfx.tick();
      }
      if (t < 1) requestAnimationFrame(frame);
      else res();
    };
    requestAnimationFrame(frame);
  });
}

export function confetti(host: HTMLElement, colors = ['#FFC93C', '#FFE08A', '#FFF6E8', '#B8FF3C']): void {
  if (reducedMotion()) return;
  const cv = document.createElement('canvas');
  cv.className = 'confetti';
  host.appendChild(cv);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = host.clientWidth;
  const h = host.clientHeight;
  cv.width = w * dpr;
  cv.height = h * dpr;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  const parts = Array.from({ length: 140 }, () => ({
    x: w / 2 + (Math.random() - 0.5) * 60,
    y: h * 0.42,
    vx: (Math.random() - 0.5) * 13,
    vy: -Math.random() * 15 - 4,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.4,
    s: 5 + Math.random() * 7,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const t0 = performance.now();
  const frame = (now: number) => {
    const t = now - t0;
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.vy += 0.42;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.globalAlpha = Math.max(0, 1 - t / 2200);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (t < 2200) requestAnimationFrame(frame);
    else cv.remove();
  };
  requestAnimationFrame(frame);
}

/** Đồng hồ vòng tròn SVG. */
export function ringHTML(cls = ''): string {
  return `<div class="ring ${cls}"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19" class="ring-bg"/><circle cx="22" cy="22" r="19" class="ring-fg" pathLength="100"/></svg><span class="ring-num"></span></div>`;
}

export function setRing(el: HTMLElement, remain: number, total: number): void {
  const fg = el.querySelector<SVGCircleElement>('.ring-fg');
  if (fg) fg.style.strokeDashoffset = String(100 - (remain / total) * 100);
  const num = el.querySelector('.ring-num');
  if (num) num.textContent = String(Math.ceil(remain));
  el.classList.toggle('urgent', remain <= 2);
}

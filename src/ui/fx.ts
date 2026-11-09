import { CONFIG } from '../config';
import { sfx } from '../audio';
import { reducedMotion } from './dom';

const R = 128; // bán kính mặt bánh
const C = 150; // tâm (viewBox 300×300)
const BULBS = 24;

function xy(a: number, r: number): [number, number] {
  const rad = (a * Math.PI) / 180;
  return [C + r * Math.sin(rad), C - r * Math.cos(rad)];
}
function pt(a: number, r = R): string {
  const [x, y] = xy(a, r);
  return `${x.toFixed(2)} ${y.toFixed(2)}`;
}

interface Seg {
  a0: number;
  a1: number;
  cls: string;
  /** Nhãn (SVG) ở hệ cục bộ: (0,0) là tâm nhãn; `o` = 1 nếu -y hướng ra vành, -1 nếu ngược lại. */
  label: (o: number) => string;
}

/** Cốc bia nhỏ tại (x, y) cục bộ. */
function mug(x: number, y: number, s = 1): string {
  const w = 12 * s, h = 15 * s;
  return `<g class="mug"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${2.5 * s}"/><path d="M${x + w / 2} ${y - h / 4} h${4 * s} v${h / 2} h${-4 * s}" fill="none"/><path d="M${x - w / 2 - 1} ${y - h / 2} q${w / 4} ${-5 * s} ${w / 2 + 1} 0 q${w / 4} ${-5 * s} ${w / 2 + 1} 0" class="foam"/></g>`;
}

function wheelSVG(segs: Seg[], aria: string, hubText: string): string {
  let body = '';
  segs.forEach((g, i) => {
    const large = g.a1 - g.a0 > 180 ? 1 : 0;
    const mid = (g.a0 + g.a1) / 2;
    const flip = mid > 90 && mid < 270; // nửa dưới: xoay 180° cho chữ đứng thẳng
    const [lx, ly] = xy(mid, R * 0.6);
    body += `<g class="slice ${g.cls}${flip ? ' flip' : ''}" data-k="${i}" data-a0="${g.a0}" data-a1="${g.a1}" data-mid="${mid}">
      <path d="M${C} ${C} L${pt(g.a0)} A${R} ${R} 0 ${large} 1 ${pt(g.a1)} Z"/>
      <g class="lab-n" transform="translate(${lx.toFixed(2)} ${ly.toFixed(2)}) rotate(${mid})">${g.label(1)}</g>
      <g class="lab-f" transform="translate(${lx.toFixed(2)} ${ly.toFixed(2)}) rotate(${mid + 180})">${g.label(-1)}</g>
    </g>`;
  });
  // vạch ngăn
  for (const g of segs) body += `<line x1="${C}" y1="${C}" x2="${pt(g.a0).split(' ')[0]}" y2="${pt(g.a0).split(' ')[1]}" class="w-div"/>`;
  let bulbs = '';
  for (let i = 0; i < BULBS; i++) {
    const [x, y] = xy((360 / BULBS) * i, R + 9);
    bulbs += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" class="bulb b${i % 2}"/>`;
  }
  return `
    <svg class="wheel" viewBox="0 0 300 300" role="img" aria-label="${aria}">
      <circle cx="${C}" cy="${C}" r="${R + 16}" class="w-frame"/>
      ${bulbs}
      <g class="wheel-rot">${body}<circle cx="${C}" cy="${C}" r="${R}" class="w-rim"/></g>
      <circle cx="${C}" cy="${C}" r="27" class="w-hub"/>
      <text x="${C}" y="${C + 1}" class="w-hub-txt" text-anchor="middle" dominant-baseline="middle">${hubText}</text>
    </svg>`;
}

const POINTER = `<svg class="wheel-pointer" viewBox="0 0 48 56" aria-hidden="true"><path d="M24 54 L6 12 A19 19 0 1 1 42 12 Z" class="ptr"/><circle cx="24" cy="18" r="7" class="ptr-dot"/></svg>`;

/** Dòng chữ 2 tầng trong ô (cục bộ). `y0` là tâm khối chữ. */
function twoLines(a: string, b: string, cls: string, y0: number, size = 17): string {
  return `<text class="${cls}" x="0" y="${y0 - size * 0.55}" text-anchor="middle" dominant-baseline="middle" style="font-size:${size}px">${a}</text>
    <text class="${cls}" x="0" y="${y0 + size * 0.55}" text-anchor="middle" dominant-baseline="middle" style="font-size:${size}px">${b}</text>`;
}

export function wheelHTML(): string {
  const save = 360 * CONFIG.GOD_SAVE;
  const n = 3;
  const step = (360 - save) / n;
  const segs: Seg[] = [
    { a0: 0, a1: save, cls: 'w-save', label: (o) => twoLines('GOD', 'SAVE', 'w-txt w-txt-save', 8 * o, 14) + `<path transform="translate(0 ${-40 * o}) scale(1.5)" d="M0 -6 l2.2 4.6 5 .7 -3.6 3.5 .9 5 -4.5 -2.4 -4.5 2.4 .9 -5 -3.6 -3.5 5 -.7 Z" class="star"/>` },
  ];
  for (let i = 0; i < n; i++) {
    const a0 = save + i * step;
    segs.push({ a0, a1: a0 + step, cls: i % 2 ? 'w-drink2' : 'w-drink', label: (o) => mug(0, -32 * o, 1.2) + twoLines('UỐNG', '1 LY', 'w-txt', 14 * o, 21) });
  }
  return `
  <div class="wheel-wrap gs" data-step="36">
    ${POINTER}
    ${wheelSVG(segs, 'Vòng quay God Save', 'QUAY')}
  </div>
  <div class="pw-legend">
    <span><i class="sw save"></i>God Save — thoát nạn <em>10%</em></span>
    <span><i class="sw drink"></i>Uống 1 ly <em>90%</em></span>
  </div>`;
}

/** Bánh xe Răng Vòng Quay: các ô xen kẽ "MÌNH UỐNG" / "CẢ BÀN". */
export function partyWheelHTML(slices: number): string {
  const step = 360 / slices;
  const segs: Seg[] = [];
  for (let i = 0; i < slices; i++) {
    const all = i % 2 === 1;
    const icons = (o: number) => (all ? mug(-14, -34 * o, 0.85) + mug(0, -38 * o, 0.95) + mug(14, -34 * o, 0.85) : mug(0, -36 * o, 1.1));
    segs.push({
      a0: i * step,
      a1: (i + 1) * step,
      cls: all ? 'pw-all' : 'pw-self',
      label: (o) => icons(o) + (all ? twoLines('CẢ', 'BÀN', 'w-txt pw-txt-all', 6 * o, 19) : twoLines('MÌNH', 'UỐNG', 'w-txt pw-txt-self', 6 * o, 16)),
    });
  }
  return `
  <div class="wheel-wrap party" data-step="${step}">
    ${POINTER}
    ${wheelSVG(segs, 'Vòng quay: mình uống hoặc cả bàn uống', 'QUAY')}
  </div>
  <div class="pw-legend">
    <span><i class="sw self"></i>Mình uống 1 ly <em>50%</em></span>
    <span><i class="sw all"></i>Cả bàn cùng uống <em>50%</em></span>
  </div>`;
}

/** Bánh xe số cái (hít đất / squat): mỗi ô một con số. */
export function countWheelHTML(values: readonly number[], ex: 'pushup' | 'squat'): string {
  const step = 360 / values.length;
  const segs: Seg[] = values.map((v, i) => ({
    a0: i * step,
    a1: (i + 1) * step,
    cls: `cw-${ex}${i % 2 ? ' alt' : ''}`,
    label: (o: number) =>
      `<text class="w-txt cw-num" x="0" y="${-6 * o}" text-anchor="middle" dominant-baseline="middle" style="font-size:${values.length > 6 ? 36 : 40}px">${v}</text>` +
      `<text class="w-txt cw-unit" x="0" y="${o > 0 ? 24 : 36}" text-anchor="middle" dominant-baseline="middle" style="font-size:12px">CÁI</text>`,
  }));
  const name = ex === 'pushup' ? 'hít đất' : 'squat';
  return `
  <div class="wheel-wrap cw ${ex}" data-step="${step}">
    ${POINTER}
    ${wheelSVG(segs, `Vòng quay số cái ${name}`, 'QUAY')}
  </div>
  <div class="pw-legend"><span><i class="sw ${ex}"></i>Từ ${values[0]} đến ${values[values.length - 1]} cái ${name}, mỗi số cơ hội như nhau</span></div>`;
}

/** Làm nổi ô đang nằm dưới kim ở góc `angle`. */
export function markWin(root: HTMLElement, angle: number): void {
  const a = ((angle % 360) + 360) % 360;
  root.querySelectorAll<SVGGElement>('.slice').forEach((s) => {
    const a0 = Number(s.dataset.a0);
    const a1 = Number(s.dataset.a1);
    s.classList.toggle('win', a >= a0 && a < a1);
    // Bánh đã xoay (360 - angle)° → xoay chữ lại cho đứng thẳng theo vị trí mới trên màn hình.
    const screen = (((Number(s.dataset.mid) - a) % 360) + 360) % 360;
    s.classList.toggle('flip', screen > 90 && screen < 270);
  });
  root.classList.add('won');
}

/** Quay bánh xe để kim (ở đỉnh) chỉ đúng góc `angle` trên bánh. */
export function spinWheel(root: HTMLElement, angle: number): Promise<void> {
  const g = root.querySelector<SVGGElement>('.wheel-rot')!;
  const ptr = root.querySelector<SVGElement>('.wheel-pointer');
  const step = Number(root.dataset.step) || 36;
  root.classList.remove('won');
  root.classList.add('spinning');
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
      const tick = Math.floor(rot / step);
      if (tick !== lastTick) {
        lastTick = tick;
        sfx.tick();
        if (ptr && !rm) {
          ptr.classList.remove('flick');
          void ptr.getBoundingClientRect();
          ptr.classList.add('flick');
        }
      }
      if (t < 1) requestAnimationFrame(frame);
      else {
        root.classList.remove('spinning');
        markWin(root, angle);
        res();
      }
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

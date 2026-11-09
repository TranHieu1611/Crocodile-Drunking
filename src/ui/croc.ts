// Hàm cá sấu vẽ bằng SVG + 12 răng là <button>.
import { CONFIG, type ToothKind } from '../config';
import { reducedMotion } from './dom';

const W = 360;
const H = 440;
const CX = 180;
const ARC_Y = 265; // tâm cung chữ U
const TOP_Y = 188; // điểm bắt đầu đoạn thẳng của chữ U (dưới mép hàm trên)
const R_TEETH = 126;
const EYES = [
  { x: 108, y: 58 },
  { x: 252, y: 58 },
];

interface ToothPos {
  x: number;
  y: number;
  rot: number;
}

/** 12 vị trí răng đều nhau theo đường cong chữ U, mỗi răng xoay hướng vào tâm miệng. */
export function toothPositions(n = CONFIG.TEETH): ToothPos[] {
  const straight = ARC_Y - TOP_Y;
  const arc = Math.PI * R_TEETH;
  const total = straight * 2 + arc;
  const pad = 14;
  const step = (total - pad * 2) / (n - 1);
  const out: ToothPos[] = [];
  for (let i = 0; i < n; i++) {
    const s = pad + i * step;
    let x: number, y: number, dx: number, dy: number;
    if (s < straight) {
      x = CX - R_TEETH;
      y = TOP_Y + s;
      dx = 1;
      dy = 0;
    } else if (s < straight + arc) {
      const t = (s - straight) / R_TEETH; // 0..π, từ trái qua đáy sang phải
      x = CX - R_TEETH * Math.cos(t);
      y = ARC_Y + R_TEETH * Math.sin(t);
      dx = CX - x;
      dy = ARC_Y - y;
    } else {
      x = CX + R_TEETH;
      y = ARC_Y - (s - straight - arc);
      dx = -1;
      dy = 0;
    }
    // Răng mặc định hướng lên; xoay để mũi răng chỉ vào trong.
    const rot = (Math.atan2(dx, -dy) * 180) / Math.PI;
    out.push({ x, y, rot });
  }
  return out;
}

const TOOTH_SVG =
  '<svg viewBox="0 0 40 44" aria-hidden="true"><path class="t-shape" d="M5 42 C5 30 12 12 18.5 3.5 Q20 1.5 21.5 3.5 C28 12 35 30 35 42 Z"/><path class="t-shine" d="M14 34 C14.5 26 17 17 19.5 11"/></svg>';

function upperTeeth(): string {
  let s = '';
  for (let i = 0; i < 9; i++) {
    const x = 70 + i * 27.5;
    s += `<path d="M${x - 9} 176 L${x} 196 L${x + 9} 176 Z" class="lip-tooth"/>`;
  }
  return s;
}

export function crocHTML(): string {
  const pos = toothPositions();
  const teeth = pos
    .map(
      (p, i) =>
        `<button class="tooth" data-i="${i}" aria-label="Răng số ${i + 1}" style="left:${(p.x / W) * 100}%;top:${(p.y / H) * 100}%;--rot:${p.rot}deg">${TOOTH_SVG}</button>`,
    )
    .join('');
  const bump = (e: { x: number; y: number }) => `<circle cx="${e.x}" cy="${e.y + 6}" r="40" class="c-up"/>`;
  const eye = (e: { x: number; y: number }, i: number) => `
    <g class="eye" style="transform-origin:${e.x}px ${e.y}px">
      <ellipse cx="${e.x}" cy="${e.y}" rx="21" ry="23" class="eye-white"/>
      <g class="pupil" data-eye="${i}"><ellipse cx="${e.x}" cy="${e.y + 2}" rx="5" ry="14" class="eye-pupil"/><circle cx="${e.x + 2}" cy="${e.y - 6}" r="2.6" fill="#fff"/></g>
    </g>
    <path d="M${e.x - 26} ${e.y - 18} Q${e.x} ${e.y - 34} ${e.x + 26} ${e.y - 18}" class="brow"/>`;
  return `
  <div class="croc" role="group" aria-label="Hàm cá sấu">
    <svg class="croc-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <path class="c-low" d="M13 170 L13 ${ARC_Y} A167 167 0 0 0 347 ${ARC_Y} L347 170 Z"/>
      <path class="c-low-shade" d="M24 ${ARC_Y + 30} A160 160 0 0 0 336 ${ARC_Y + 30}" />
      <path class="c-mouth" d="M48 170 L48 ${ARC_Y} A132 132 0 0 0 312 ${ARC_Y} L312 170 Z"/>
      <path class="c-tongue" d="M180 222 C236 222 252 290 236 340 C224 378 136 378 124 340 C108 290 124 222 180 222 Z"/>
      <path class="c-tongue-line" d="M180 246 L180 330"/>
    </svg>
    <div class="teeth">${teeth}</div>
    <svg class="croc-flap" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <path class="c-up" d="M13 160 L13 ${ARC_Y} A167 167 0 0 0 347 ${ARC_Y} L347 160 Z"/>
      <path class="c-up-shade" d="M40 ${ARC_Y + 10} A140 140 0 0 0 320 ${ARC_Y + 10}"/>
      <g class="flap-dots"><circle cx="120" cy="250" r="7"/><circle cx="180" cy="236" r="8"/><circle cx="240" cy="250" r="7"/><circle cx="150" cy="300" r="6"/><circle cx="210" cy="300" r="6"/><circle cx="180" cy="350" r="7"/></g>
    </svg>
    <svg class="croc-head" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      ${upperTeeth()}
      ${EYES.map(bump).join('')}
      <rect x="16" y="64" width="328" height="118" rx="54" class="c-up"/>
      <path d="M40 150 Q180 196 320 150" class="c-up-shade"/>
      <g class="head-dots"><circle cx="70" cy="120" r="6"/><circle cx="290" cy="120" r="6"/><circle cx="92" cy="148" r="4.5"/><circle cx="268" cy="148" r="4.5"/></g>
      <ellipse cx="160" cy="112" rx="8" ry="5.5" class="nostril" transform="rotate(-18 160 112)"/>
      <ellipse cx="200" cy="112" rx="8" ry="5.5" class="nostril" transform="rotate(18 200 112)"/>
      <g class="scar">
        <path d="M222 78 L292 140"/><path d="M236 92 L250 80"/><path d="M252 106 L266 94"/><path d="M268 120 L282 108"/>
      </g>
      ${EYES.map(eye).join('')}
    </svg>
    <div class="burp-bubble" aria-hidden="true">Ợ!</div>
  </div>`;
}

export class Croc {
  el: HTMLElement;
  private blinkTimer: number | null = null;
  private pupils: SVGGElement[];
  private pos = toothPositions();

  constructor(el: HTMLElement) {
    this.el = el;
    this.pupils = Array.from(el.querySelectorAll<SVGGElement>('.pupil'));
    this.startBlink();
  }

  teeth(): HTMLButtonElement[] {
    return Array.from(this.el.querySelectorAll<HTMLButtonElement>('.tooth'));
  }

  sync(kinds: ToothKind[], revealed: boolean[], enabled: boolean): void {
    this.teeth().forEach((t, i) => {
      t.classList.toggle('down', revealed[i] && kinds[i] === 'safe');
      t.classList.toggle('bad', revealed[i] && kinds[i] !== 'safe');
      t.dataset.kind = revealed[i] ? kinds[i] : '';
      t.disabled = revealed[i] || !enabled;
      t.setAttribute('aria-label', `Răng số ${i + 1}${revealed[i] ? ' (đã chọn)' : ''}`);
    });
  }

  lookAt(i: number | null): void {
    this.pupils.forEach((p, k) => {
      if (i === null) {
        p.style.transform = '';
        return;
      }
      const e = EYES[k];
      const t = this.pos[i];
      const dx = t.x - e.x;
      const dy = t.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      p.style.transform = `translate(${((dx / d) * 9).toFixed(1)}px, ${((dy / d) * 6).toFixed(1)}px)`;
    });
  }

  private flash(cls: string, ms: number): void {
    this.el.classList.remove(cls);
    void this.el.offsetWidth;
    this.el.classList.add(cls);
    setTimeout(() => this.el.classList.remove(cls), ms);
  }

  shake(): void {
    if (!reducedMotion()) this.flash('wobble', 300);
  }

  close(): void {
    this.el.classList.add('closed');
  }

  open(): void {
    this.el.classList.remove('closed');
  }

  burp(): void {
    this.flash('burp', 900);
  }

  setBoss(on: boolean): void {
    this.el.classList.toggle('boss', on);
  }

  private startBlink(): void {
    const loop = () => {
      this.blinkTimer = window.setTimeout(() => {
        if (!this.el.isConnected) return;
        this.flash('blink', 160);
        loop();
      }, 2200 + Math.random() * 4000);
    };
    loop();
  }

  destroy(): void {
    if (this.blinkTimer !== null) clearTimeout(this.blinkTimer);
  }
}

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

// ---------- Hình vẽ ----------
const LIP_Y0 = 180; // mép môi trên ở hai bên
const LIP_SAG = 18; // độ võng của môi ở giữa
/** y của mép môi trên tại x (cung bậc hai đối xứng). */
function lipY(x: number): number {
  const t = (346 - x) / 332;
  return LIP_Y0 + 2 * t * (1 - t) * (LIP_SAG * 2);
}

function upperTeeth(): string {
  let s = '';
  for (let i = 0; i < 10; i++) {
    const x = 62 + i * 26;
    const y = lipY(x) - 3;
    const h = i === 1 || i === 8 ? 24 : 16; // 2 răng nanh dài hơn
    s += `<path d="M${x - 8} ${y} Q${x - 2} ${y + h * 0.7} ${x} ${y + h} Q${x + 2} ${y + h * 0.7} ${x + 8} ${y} Z" class="lip-tooth"/>`;
  }
  return s;
}

/** Vảy xếp theo cung tròn trên hàm dưới. */
function jawScales(): string {
  let s = '';
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * (i + 0.5)) / n;
    const x = CX - 150 * Math.cos(a);
    const y = ARC_Y + 150 * Math.sin(a);
    const rot = (a * 180) / Math.PI - 90;
    s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="13" ry="7" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }
  for (const y of [190, 222]) {
    s += `<ellipse cx="30" cy="${y}" rx="7" ry="12"/><ellipse cx="330" cy="${y}" rx="7" ry="12"/>`;
  }
  return s;
}

let uid = 0;

export function crocHTML(): string {
  const id = `cr${uid++}`;
  const pos = toothPositions();
  const teeth = pos
    .map(
      (p, i) =>
        `<button class="tooth" data-i="${i}" aria-label="Răng số ${i + 1}" style="left:${(p.x / W) * 100}%;top:${(p.y / H) * 100}%;--rot:${p.rot}deg">${TOOTH_SVG}</button>`,
    )
    .join('');

  const lipPath = `Q180 ${LIP_Y0 + LIP_SAG * 2} 14 ${LIP_Y0}`;
  const headPath = `M14 ${LIP_Y0} C8 138 26 96 66 84 C92 77 116 88 140 82 C162 74 198 74 220 82 C244 88 268 77 294 84 C334 96 352 138 346 ${LIP_Y0} ${lipPath} Z`;

  const bump = (e: { x: number; y: number }) =>
    `<circle cx="${e.x}" cy="${e.y + 6}" r="41" fill="url(#${id}-up)" class="outline"/>`;
  const eye = (e: { x: number; y: number }, i: number) => `
    <g class="eye" style="transform-origin:${e.x}px ${e.y}px">
      <clipPath id="${id}-eye${i}"><ellipse cx="${e.x}" cy="${e.y}" rx="22" ry="24"/></clipPath>
      <ellipse cx="${e.x}" cy="${e.y}" rx="22" ry="24" class="eye-white"/>
      <g clip-path="url(#${id}-eye${i})">
        <g class="pupil" data-eye="${i}">
          <circle cx="${e.x}" cy="${e.y + 2}" r="15.5" class="eye-iris"/>
          <circle cx="${e.x}" cy="${e.y + 2}" r="15.5" class="eye-iris-ring"/>
          <ellipse cx="${e.x}" cy="${e.y + 2}" rx="3.8" ry="13" class="eye-pupil"/>
          <circle cx="${e.x + 5}" cy="${e.y - 5}" r="3.6" fill="#fff"/>
          <circle cx="${e.x - 5}" cy="${e.y + 9}" r="1.6" fill="#fff" opacity=".8"/>
        </g>
        <path d="M${e.x - 24} ${e.y - 26} L${e.x + 24} ${e.y - 26} L${e.x + 24} ${e.y - 15} Q${e.x} ${e.y - 9} ${e.x - 24} ${e.y - 15} Z" class="eyelid"/>
      </g>
      <ellipse cx="${e.x}" cy="${e.y}" rx="22" ry="24" class="eye-rim"/>
    </g>`;

  return `
  <div class="croc" role="group" aria-label="Hàm cá sấu">
    <svg class="croc-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-low" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3C8E4C"/><stop offset="1" stop-color="#1F5129"/>
        </linearGradient>
        <radialGradient id="${id}-mouth" cx=".5" cy=".55" r=".6">
          <stop offset="0" stop-color="#2A0512"/><stop offset=".55" stop-color="#4A0E26"/><stop offset="1" stop-color="#6E1A3A"/>
        </radialGradient>
        <radialGradient id="${id}-tongue" cx=".45" cy=".35" r=".7">
          <stop offset="0" stop-color="#D2557D"/><stop offset="1" stop-color="#8E2A4C"/>
        </radialGradient>
      </defs>
      <path class="c-low outline" fill="url(#${id}-low)" d="M13 170 L13 ${ARC_Y} A167 167 0 0 0 347 ${ARC_Y} L347 170 Z"/>
      <g class="jaw-scales">${jawScales()}</g>
      <path class="c-gum" d="M48 170 L48 ${ARC_Y} A132 132 0 0 0 312 ${ARC_Y} L312 170 Z"/>
      <path class="c-mouth" fill="url(#${id}-mouth)" d="M56 170 L56 ${ARC_Y} A124 124 0 0 0 304 ${ARC_Y} L304 170 Z"/>
      <ellipse cx="180" cy="215" rx="62" ry="22" class="c-throat"/>
      <g class="tongue">
        <path class="c-tongue" fill="url(#${id}-tongue)" d="M180 226 C238 224 254 292 238 342 C226 380 134 380 122 342 C106 292 122 228 180 226 Z"/>
        <path class="c-tongue-line" d="M180 252 C176 280 184 306 180 334"/>
        <ellipse cx="156" cy="262" rx="12" ry="22" class="c-tongue-shine" transform="rotate(14 156 262)"/>
      </g>
    </svg>
    <div class="teeth">${teeth}</div>
    <svg class="croc-flap" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-flap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#4FA45F"/><stop offset="1" stop-color="#2E7A3F"/>
        </linearGradient>
      </defs>
      <path class="outline" fill="url(#${id}-flap)" d="M13 160 L13 ${ARC_Y} A167 167 0 0 0 347 ${ARC_Y} L347 160 Z"/>
      <path class="c-up-shade" d="M40 ${ARC_Y + 10} A140 140 0 0 0 320 ${ARC_Y + 10}"/>
      <g class="flap-dots"><ellipse cx="120" cy="250" rx="12" ry="8"/><ellipse cx="180" cy="236" rx="13" ry="9"/><ellipse cx="240" cy="250" rx="12" ry="8"/><ellipse cx="150" cy="300" rx="10" ry="7"/><ellipse cx="210" cy="300" rx="10" ry="7"/><ellipse cx="180" cy="350" rx="11" ry="7"/></g>
    </svg>
    <svg class="croc-head" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-up" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#5DBA6B"/><stop offset=".55" stop-color="#3F8F4F"/><stop offset="1" stop-color="#2F7A40"/>
        </linearGradient>
      </defs>
      <g class="breathe">
        ${upperTeeth()}
        <path class="drool" d="M118 ${lipY(118) - 2} q-3 14 0 26 q4 6 7 0 q2 -12 -1 -26 Z"/>
        ${EYES.map(bump).join('')}
        <path d="${headPath}" fill="url(#${id}-up)" class="outline"/>
        <path d="M44 156 Q180 ${LIP_Y0 + LIP_SAG * 2 - 10} 316 156" class="c-up-shade"/>
        <g class="ridges"><path d="M150 84 l8 -12 l8 12 Z"/><path d="M172 80 l8 -14 l8 14 Z"/><path d="M194 84 l8 -12 l8 12 Z"/></g>
        <g class="head-dots"><ellipse cx="72" cy="122" rx="9" ry="6"/><ellipse cx="288" cy="122" rx="9" ry="6"/><ellipse cx="96" cy="146" rx="6" ry="4"/><ellipse cx="264" cy="146" rx="6" ry="4"/><ellipse cx="120" cy="112" rx="5" ry="3.5"/><ellipse cx="240" cy="112" rx="5" ry="3.5"/></g>
        <ellipse cx="62" cy="152" rx="18" ry="9" class="blush"/><ellipse cx="298" cy="152" rx="18" ry="9" class="blush"/>
        <g class="snout">
          <ellipse cx="158" cy="118" rx="16" ry="12" class="nose-bump"/>
          <ellipse cx="202" cy="118" rx="16" ry="12" class="nose-bump"/>
          <ellipse cx="160" cy="119" rx="6.5" ry="4.5" class="nostril" transform="rotate(-20 160 119)"/>
          <ellipse cx="200" cy="119" rx="6.5" ry="4.5" class="nostril" transform="rotate(20 200 119)"/>
        </g>
        <path d="M60 ${LIP_Y0 - 4} Q180 ${LIP_Y0 + LIP_SAG * 2 + 2} 300 ${LIP_Y0 - 4}" class="lip-line"/>
        <g class="scar">
          <path d="M222 92 L292 150"/><path d="M236 104 L250 92"/><path d="M252 117 L266 105"/><path d="M268 130 L282 118"/>
        </g>
        ${EYES.map(eye).join('')}
      </g>
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

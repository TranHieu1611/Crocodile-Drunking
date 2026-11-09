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
  { x: 126, y: 72 },
  { x: 234, y: 72 },
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
  '<svg viewBox="0 0 40 44" aria-hidden="true"><path class="t-shape" d="M6 42 C5 28 10 12 16 5.5 Q20 1.5 24 5.5 C30 12 35 28 34 42 Z"/><path class="t-shine" d="M14 34 C14.5 26 17 17 19.5 11"/></svg>';

// ---------- Hình vẽ ----------
// Phong cách "đồ chơi nhựa bóng": xanh lá tươi, nhìn thẳng, mày nhíu, mắt dữ, mõm to với 2 lỗ mũi lớn,
// môi đỏ, răng trắng. Hàm dưới chữ U với 12 răng là nút bấm.
const LIP_Y0 = 182;
const LIP_SAG = 14;
function lipY(x: number): number {
  const t = (346 - x) / 332;
  return LIP_Y0 + 2 * t * (1 - t) * (LIP_SAG * 2);
}

/** Hàng răng nhỏ của hàm trên. */
function upperTeeth(): string {
  let s = '';
  for (let i = 0; i < 9; i++) {
    const x = 66 + i * 28.5;
    const y = lipY(x) - 4;
    const h = 18;
    s += `<path d="M${x - 10} ${y} L${x - 2} ${y + h} Q${x} ${y + h + 2} ${x + 2} ${y + h} L${x + 10} ${y} Z" class="lip-tooth"/>`;
  }
  return s;
}

/** Răng trắng quanh mép hàm khi ngậm miệng. */
function flapTeeth(): string {
  let s = '';
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * i) / n;
    const r = 160;
    const x = CX - r * Math.cos(a);
    const y = ARC_Y + r * Math.sin(a);
    const nx = -Math.cos(a);
    const ny = Math.sin(a);
    const tx = -ny;
    const ty = nx;
    const tipx = x + nx * 13, tipy = y + ny * 13;
    s += `<path d="M${(x + tx * 8).toFixed(1)} ${(y + ty * 8).toFixed(1)} Q${(tipx + tx * 6).toFixed(1)} ${(tipy + ty * 6).toFixed(1)} ${tipx.toFixed(1)} ${tipy.toFixed(1)} Q${(tipx - tx * 6).toFixed(1)} ${(tipy - ty * 6).toFixed(1)} ${(x - tx * 8).toFixed(1)} ${(y - ty * 8).toFixed(1)} Z" class="lip-tooth"/>`;
  }
  return s;
}

/** Hoạ tiết vảy + dải đổ bóng (mỗi SVG cần bản riêng vì id). */
function skinDefs(p: string): string {
  return `
    <pattern id="${p}-scale" width="24" height="16" patternUnits="userSpaceOnUse">
      <path d="M0 16 Q12 3 24 16 M-12 8 Q0 -5 12 8 M12 8 Q24 -5 36 8" fill="none" stroke="#04431A" stroke-width="1.7" opacity=".4"/>
      <path d="M4 14 Q12 6 20 14 M-8 6 Q0 -2 8 6 M16 6 Q24 -2 32 6" fill="none" stroke="#8BF297" stroke-width="1.1" opacity=".3"/>
    </pattern>
    <linearGradient id="${p}-shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset=".3" stop-color="#012A0C" stop-opacity="0"/><stop offset="1" stop-color="#012A0C" stop-opacity=".55"/>
    </linearGradient>
    <radialGradient id="${p}-hi" cx=".3" cy=".2" r=".6">
      <stop offset="0" stop-color="#C9FFB8" stop-opacity=".45"/><stop offset="1" stop-color="#C9FFB8" stop-opacity="0"/>
    </radialGradient>`;
}

/** Phủ vảy + bóng + vùng sáng lên một hình. */
function skin(d: string, p: string): string {
  return `<path d="${d}" style="fill:url(#${p}-scale)"/><path d="${d}" style="fill:url(#${p}-shade)"/><path d="${d}" style="fill:url(#${p}-hi)"/>`;
}

/** Gai nhọn (vảy sừng) — đáy giấu sau thân, chỉ lộ mũi gai. */
function spike(x: number, y: number, h: number, w: number, rot: number, fill: string): string {
  return `<path d="M${x - w} ${y} L${x} ${y - h} L${x + w} ${y} Z" transform="rotate(${rot} ${x} ${y})" style="fill:${fill}" class="outline spike"/>`;
}

/** Bướu xương sần (osteoderm) có điểm sáng. */
function knob(x: number, y: number, r: number): string {
  return `<g class="knob"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.72}" class="knob-b"/><ellipse cx="${x - r * 0.3}" cy="${y - r * 0.3}" rx="${r * 0.4}" ry="${r * 0.25}" class="knob-h"/></g>`;
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

  const snoutPath = `M14 ${LIP_Y0} C8 128 40 100 100 98 L260 98 C320 100 352 128 346 ${LIP_Y0} Q180 ${LIP_Y0 + LIP_SAG * 2} 14 ${LIP_Y0} Z`;
  const domePath = 'M64 126 C54 52 106 12 180 12 C254 12 306 52 296 126 Z';

  const eye = (e: { x: number; y: number }, i: number) => {
    const s = i === 0 ? 1 : -1; // 1 = mắt trái
    const tilt = 10 * s;
    return `
    <g class="eye" style="transform-origin:${e.x}px ${e.y}px">
      <g transform="rotate(${tilt} ${e.x} ${e.y})">
        <clipPath id="${id}-eye${i}"><ellipse cx="${e.x}" cy="${e.y}" rx="31" ry="25"/></clipPath>
        <ellipse cx="${e.x}" cy="${e.y}" rx="31" ry="25" class="eye-white"/>
        <g clip-path="url(#${id}-eye${i})">
          <ellipse cx="${e.x}" cy="${e.y + 14}" rx="31" ry="10" class="eye-shade"/>
          <ellipse cx="${e.x + 6 * s}" cy="${e.y - 22}" rx="36" ry="13" class="eye-shadow"/>
          <g class="pupil" data-eye="${i}">
            <circle cx="${e.x + 2 * s}" cy="${e.y + 3}" r="14" class="eye-iris"/>
            <circle cx="${e.x + 2 * s}" cy="${e.y + 3}" r="7.5" class="eye-pupil"/>
            <circle cx="${e.x + 7 * s}" cy="${e.y - 3}" r="3.6" fill="#fff"/>
          </g>
        </g>
        <ellipse cx="${e.x}" cy="${e.y}" rx="31" ry="25" class="eye-rim"/>
      </g>
    </g>
    ${spike(e.x - 26 * s, e.y - 38, 16, 8, -30 * s, `url(#${id}-up)`)}
    ${spike(e.x - 4 * s, e.y - 42, 14, 7, -10 * s, `url(#${id}-up)`)}
    <path class="brow" d="M${e.x - 44 * s} ${e.y - 30} Q${e.x - 4 * s} ${e.y - 50} ${e.x + 40 * s} ${e.y - 8} L${e.x + 34 * s} ${e.y + 4} Q${e.x - 6 * s} ${e.y - 30} ${e.x - 42 * s} ${e.y - 14} Z" style="fill:url(#${id}-up)"/>
    <path class="brow-shade" d="M${e.x - 40 * s} ${e.y - 18} Q${e.x - 6 * s} ${e.y - 34} ${e.x + 34 * s} ${e.y + 2}"/>
    <path class="gloss-line" d="M${e.x - 34 * s} ${e.y - 30} Q${e.x - 6 * s} ${e.y - 44} ${e.x + 24 * s} ${e.y - 20}"/>`;
  };

  const nostril = (x: number, k: number) => `
    <g class="nostril-g">
      <circle cx="${x}" cy="140" r="36" fill="url(#${id}-up)" class="outline"/>
      <ellipse cx="${x}" cy="142" rx="24" ry="21" class="nostril"/>
      <path d="M${x - 16 + k * 2} 136 Q${x - 6} 124 ${x + 10} 130 Q${x - 4} 132 ${x - 14 + k * 2} 146 Z" class="nostril-glint"/>
      <ellipse cx="${x - 10}" cy="114" rx="12" ry="5" class="gloss" transform="rotate(-18 ${x - 10} 114)"/>
    </g>`;

  return `
  <div class="croc" role="group" aria-label="Hàm cá sấu">
    <div class="croc-shadow" aria-hidden="true"></div>
    <svg class="croc-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-low" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2EC243"/><stop offset=".7" stop-color="#169A2C"/><stop offset="1" stop-color="#0B6E1D"/>
        </linearGradient>
        <radialGradient id="${id}-mouth" cx=".5" cy=".42" r=".62">
          <stop offset="0" stop-color="#6E0710"/><stop offset=".55" stop-color="#B0121B"/><stop offset="1" stop-color="#D81D25"/>
        </radialGradient>
        <radialGradient id="${id}-tongue" cx=".45" cy=".3" r=".75">
          <stop offset="0" stop-color="#FF5A5F"/><stop offset="1" stop-color="#D3141D"/>
        </radialGradient>
      </defs>
      ${skinDefs(`${id}a`).replace(/^/, '<defs>') + '</defs>'}
      <path class="outline" fill="url(#${id}-low)" d="M13 170 L13 ${ARC_Y} A167 167 0 0 0 347 ${ARC_Y} L347 170 Z"/>
      ${skin(`M13 170 L13 ${ARC_Y} A167 167 0 0 0 347 ${ARC_Y} L347 170 Z`, `${id}a`)}
      ${knob(28, 196, 7)}${knob(332, 196, 7)}${knob(30, 236, 6)}${knob(330, 236, 6)}
      <path class="gloss-line wide" d="M30 220 L30 ${ARC_Y} A150 150 0 0 0 96 392"/>
      <path class="c-lip" d="M44 170 L44 ${ARC_Y} A136 136 0 0 0 316 ${ARC_Y} L316 170 Z"/>
      <path class="c-mouth" style="fill:url(#${id}-mouth)" d="M60 170 L60 ${ARC_Y} A120 120 0 0 0 300 ${ARC_Y} L300 170 Z"/>
      <ellipse cx="180" cy="214" rx="76" ry="22" class="c-throat"/>
      <path d="M60 170 L300 170 L300 194 Q180 236 60 194 Z" class="mouth-shadow"/>
      <g class="tongue">
        <path class="c-tongue" style="fill:url(#${id}-tongue)" d="M180 236 C236 236 250 296 236 336 C224 370 136 370 124 336 C110 296 124 236 180 236 Z"/>
        <ellipse cx="156" cy="266" rx="16" ry="9" class="gloss" transform="rotate(-24 156 266)"/>
      </g>
    </svg>
    <div class="teeth">${teeth}</div>
    <svg class="croc-flap" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-flap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3CCB4E"/><stop offset="1" stop-color="#128A28"/>
        </linearGradient>
      </defs>
      <defs>${skinDefs(`${id}b`)}</defs>
      ${flapTeeth()}
      <path class="outline" fill="url(#${id}-flap)" d="M13 160 L13 ${ARC_Y} A162 162 0 0 0 347 ${ARC_Y} L347 160 Z"/>
      ${skin(`M13 160 L13 ${ARC_Y} A162 162 0 0 0 347 ${ARC_Y} L347 160 Z`, `${id}b`)}
      ${[[120, 240], [180, 228], [240, 240], [150, 290], [210, 290], [180, 342]].map(([x, y]) => knob(x, y, 10)).join('')}
      <ellipse cx="110" cy="236" rx="40" ry="10" class="gloss" transform="rotate(-20 110 236)"/>
    </svg>
    <svg class="croc-head" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-up" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#43D355"/><stop offset=".55" stop-color="#1FAE36"/><stop offset="1" stop-color="#0E7F24"/>
        </linearGradient>
        ${skinDefs(`${id}c`)}
      </defs>
      <g class="breathe">
        ${upperTeeth()}
        ${[
          [100, 44, 18, 9, -38], [124, 26, 22, 10, -22], [152, 16, 24, 10, -8], [180, 13, 28, 11, 0],
          [208, 16, 24, 10, 8], [236, 26, 22, 10, 22], [260, 44, 18, 9, 38],
        ]
          .map(([x, y, h, w, r]) => spike(x, y + 8, h, w, r, `url(#${id}-up)`))
          .join('')}
        <path d="${domePath}" fill="url(#${id}-up)" class="outline"/>
        ${skin(domePath, `${id}c`)}
        ${knob(150, 38, 8)}${knob(180, 32, 9)}${knob(210, 38, 8)}${knob(166, 54, 6)}${knob(194, 54, 6)}
        <ellipse cx="150" cy="24" rx="30" ry="6" class="gloss" transform="rotate(-8 150 24)"/>
        ${EYES.map(eye).join('')}
        <ellipse cx="180" cy="102" rx="150" ry="16" class="cast-shadow"/>
        <path d="${snoutPath}" fill="url(#${id}-up)" class="outline"/>
        ${skin(snoutPath, `${id}c`)}
        ${knob(60, 128, 8)}${knob(300, 128, 8)}${knob(44, 154, 6)}${knob(316, 154, 6)}${knob(180, 108, 7)}${knob(160, 122, 5)}${knob(200, 122, 5)}
        <path d="M60 112 Q180 92 300 112" class="gloss-line wide"/>
        <path d="M180 112 L180 166" class="snout-groove"/>
        <g class="snout">${nostril(112, 0)}${nostril(248, 1)}</g>
        <path d="M40 ${LIP_Y0 - 6} Q180 ${LIP_Y0 + LIP_SAG * 2 - 4} 320 ${LIP_Y0 - 6}" class="lip-red"/>
        <g class="scar">
          <path d="M150 104 L210 170"/><path d="M160 122 L176 112"/><path d="M174 138 L190 128"/><path d="M188 154 L204 144"/>
        </g>
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
      p.style.transform = `translate(${((dx / d) * 8).toFixed(1)}px, ${((dy / d) * 5).toFixed(1)}px)`;
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

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
  { x: 74, y: 128 },
  { x: 286, y: 128 },
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
// Phong cách hoạt hình dễ thương: xanh oliu, viền đen đậm, mắt tròn to, mũi tròn, miệng cười.
// Góc nhìn: há miệng hướng về người chơi — mõm (hàm trên) dựng lên, hàm dưới chữ U với 12 răng.
const LIP_Y0 = 180;
const LIP_SAG = 16;
function lipY(x: number): number {
  const t = (346 - x) / 332;
  return LIP_Y0 + 2 * t * (1 - t) * (LIP_SAG * 2);
}

/** Răng tròn trịnh hàm trên. */
function upperTeeth(): string {
  let s = '';
  for (let i = 0; i < 9; i++) {
    const x = 64 + i * 29;
    const y = lipY(x) - 4;
    const h = i === 1 || i === 7 ? 24 : 17;
    s += `<path d="M${x - 9} ${y} C${x - 9} ${y + h * 0.6} ${x - 4} ${y + h} ${x} ${y + h} C${x + 4} ${y + h} ${x + 9} ${y + h * 0.6} ${x + 9} ${y} Z" class="lip-tooth"/>`;
  }
  return s;
}

/** Răng tròn chìa ra hai bên mõm. */
function sideFangs(): string {
  const pts: Array<[number, number, number, number]> = [
    [66, 101, -0.8, -0.6],
    [92, 85, -0.9, -0.44],
  ];
  let s = '';
  for (const [x0, y, nx0, ny] of pts) {
    for (const side of [1, -1]) {
      const x = side === 1 ? x0 : W - x0;
      const nx = nx0 * side;
      const tx = -ny;
      const ty = nx;
      const b1x = x + tx * 7, b1y = y + ty * 7;
      const b2x = x - tx * 7, b2y = y - ty * 7;
      const tipx = x + nx * 14, tipy = y + ny * 14;
      s += `<path d="M${b1x.toFixed(1)} ${b1y.toFixed(1)} Q${(tipx + tx * 6).toFixed(1)} ${(tipy + ty * 6).toFixed(1)} ${tipx.toFixed(1)} ${tipy.toFixed(1)} Q${(tipx - tx * 6).toFixed(1)} ${(tipy - ty * 6).toFixed(1)} ${b2x.toFixed(1)} ${b2y.toFixed(1)} Z" class="lip-tooth"/>`;
    }
  }
  return s;
}

/** Đốm trên da (mõm). */
function snoutSpots(): string {
  const spots: Array<[number, number, number, number]> = [
    [150, 96, 9, 6], [214, 90, 8, 5.5], [196, 136, 11, 7], [130, 140, 8, 5.5], [242, 128, 7, 5], [176, 70, 6, 4],
  ];
  return spots.map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('');
}

/** Đốm trên hàm dưới. */
function jawSpots(): string {
  let s = '';
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * (i + 0.5)) / n;
    const x = CX - 150 * Math.cos(a);
    const y = ARC_Y + 150 * Math.sin(a);
    s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${i % 2 ? 7 : 9}" ry="${i % 2 ? 5 : 6}"/>`;
  }
  return s;
}

/** Răng tròn đan cài quanh mép hàm khi ngậm miệng. */
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
    const L = i % 2 ? 15 : 11;
    const tipx = x + nx * L, tipy = y + ny * L;
    s += `<path d="M${(x + tx * 7).toFixed(1)} ${(y + ty * 7).toFixed(1)} Q${(tipx + tx * 6).toFixed(1)} ${(tipy + ty * 6).toFixed(1)} ${tipx.toFixed(1)} ${tipy.toFixed(1)} Q${(tipx - tx * 6).toFixed(1)} ${(tipy - ty * 6).toFixed(1)} ${(x - tx * 7).toFixed(1)} ${(y - ty * 7).toFixed(1)} Z" class="lip-tooth"/>`;
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
  const headPath =
    `M14 ${LIP_Y0} C8 150 26 116 50 108 C70 98 92 92 104 70 Q110 54 120 44 C130 30 148 22 180 22 ` +
    `C212 22 230 30 240 44 Q250 54 256 70 C268 92 290 98 310 108 C334 116 352 150 346 ${LIP_Y0} ${lipPath} Z`;

  const eye = (e: { x: number; y: number }, i: number) => {
    const s = i === 0 ? 1 : -1;
    return `
    <circle cx="${e.x}" cy="${e.y - 2}" r="34" fill="url(#${id}-up)" class="outline eye-bump"/>
    <path d="M${e.x - 24 * s} ${e.y - 30} Q${e.x - 6 * s} ${e.y - 36} ${e.x + 14 * s} ${e.y - 30}" class="bump-shine"/>
    <g class="eye" style="transform-origin:${e.x}px ${e.y}px">
      <clipPath id="${id}-eye${i}"><ellipse cx="${e.x}" cy="${e.y}" rx="20" ry="24"/></clipPath>
      <ellipse cx="${e.x}" cy="${e.y}" rx="20" ry="24" class="eye-white"/>
      <g clip-path="url(#${id}-eye${i})">
        <g class="pupil" data-eye="${i}">
          <ellipse cx="${e.x + 2 * s}" cy="${e.y - 4}" rx="10" ry="11.5" class="eye-pupil"/>
          <circle cx="${e.x + 5 * s}" cy="${e.y - 9}" r="4" fill="#fff"/>
          <circle cx="${e.x - 1 * s}" cy="${e.y + 1}" r="1.8" fill="#fff"/>
        </g>
        <path d="M${e.x - 22} ${e.y - 26} L${e.x + 22} ${e.y - 26} L${e.x + 22} ${e.y - 18} Q${e.x} ${e.y - 12} ${e.x - 22} ${e.y - 18} Z" class="eyelid"/>
      </g>
      <ellipse cx="${e.x}" cy="${e.y}" rx="20" ry="24" class="eye-rim"/>
      <path d="M${e.x - 17} ${e.y - 31} Q${e.x} ${e.y - 38} ${e.x + 17} ${e.y - 31}" class="lid-line"/>
    </g>
    <path d="M${e.x - 22 * s} ${e.y - 40} L${e.x + 16 * s} ${e.y - 28}" class="boss-brow"/>`;
  };

  return `
  <div class="croc" role="group" aria-label="Hàm cá sấu">
    <svg class="croc-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-low" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#86A535"/><stop offset="1" stop-color="#58761D"/>
        </linearGradient>
        <radialGradient id="${id}-mouth" cx=".5" cy=".5" r=".62">
          <stop offset="0" stop-color="#5A0E1E"/><stop offset=".6" stop-color="#8E1C30"/><stop offset="1" stop-color="#B8303F"/>
        </radialGradient>
        <radialGradient id="${id}-tongue" cx=".45" cy=".35" r=".7">
          <stop offset="0" stop-color="#F7A3AF"/><stop offset="1" stop-color="#DA6679"/>
        </radialGradient>
      </defs>
      <path class="outline" fill="url(#${id}-low)" d="M13 170 L13 ${ARC_Y} A167 167 0 0 0 347 ${ARC_Y} L347 170 Z"/>
      <g class="jaw-spots">${jawSpots()}</g>
      <path class="c-gum outline-thin" d="M46 170 L46 ${ARC_Y} A134 134 0 0 0 314 ${ARC_Y} L314 170 Z"/>
      <path class="c-mouth" style="fill:url(#${id}-mouth)" d="M58 170 L58 ${ARC_Y} A122 122 0 0 0 302 ${ARC_Y} L302 170 Z"/>
      <ellipse cx="180" cy="212" rx="70" ry="20" class="c-throat"/>
      <g class="tongue">
        <path class="c-tongue outline-thin" style="fill:url(#${id}-tongue)" d="M180 232 C232 230 246 292 234 340 C224 378 136 378 126 340 C114 292 128 234 180 232 Z"/>
        <path class="c-tongue-line" d="M180 256 C176 282 184 308 180 334"/>
        <ellipse cx="156" cy="268" rx="10" ry="20" class="c-tongue-shine" transform="rotate(14 156 268)"/>
      </g>
    </svg>
    <div class="teeth">${teeth}</div>
    <svg class="croc-flap" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-flap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#97B743"/><stop offset="1" stop-color="#617F22"/>
        </linearGradient>
      </defs>
      ${flapTeeth()}
      <path class="outline" fill="url(#${id}-flap)" d="M13 160 L13 ${ARC_Y} A162 162 0 0 0 347 ${ARC_Y} L347 160 Z"/>
      <g class="spots"><ellipse cx="130" cy="230" rx="11" ry="7"/><ellipse cx="226" cy="246" rx="9" ry="6"/><ellipse cx="170" cy="296" rx="12" ry="8"/><ellipse cx="246" cy="318" rx="8" ry="5.5"/><ellipse cx="112" cy="320" rx="9" ry="6"/><ellipse cx="190" cy="362" rx="8" ry="5.5"/></g>
      <ellipse cx="96" cy="250" rx="14" ry="44" class="shine" transform="rotate(18 96 250)"/>
    </svg>
    <svg class="croc-head" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-up" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#A2C24C"/><stop offset=".55" stop-color="#7E9C2E"/><stop offset="1" stop-color="#617F22"/>
        </linearGradient>
      </defs>
      <g class="breathe">
        ${upperTeeth()}
        ${sideFangs()}
        <path d="${headPath}" fill="url(#${id}-up)" class="outline"/>
        <ellipse cx="136" cy="80" rx="11" ry="34" class="shine" transform="rotate(32 136 80)"/>
        <g class="spots">${snoutSpots()}</g>
        <path d="M22 ${LIP_Y0 - 24} Q24 ${LIP_Y0 + 2} 52 ${LIP_Y0 - 2}" class="smile"/>
        <path d="M338 ${LIP_Y0 - 24} Q336 ${LIP_Y0 + 2} 308 ${LIP_Y0 - 2}" class="smile"/>
        <g class="snout">
          <ellipse cx="180" cy="36" rx="38" ry="24" fill="url(#${id}-up)" class="outline"/>
          <ellipse cx="166" cy="30" rx="7" ry="6" class="nostril"/>
          <ellipse cx="194" cy="30" rx="7" ry="6" class="nostril"/>
          <ellipse cx="160" cy="22" rx="9" ry="4" class="shine"/>
        </g>
        <g class="scar">
          <path d="M206 82 L254 146"/><path d="M218 96 L232 86"/><path d="M230 112 L244 102"/><path d="M242 128 L256 118"/>
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
      p.style.transform = `translate(${((dx / d) * 7).toFixed(1)}px, ${((dy / d) * 7).toFixed(1)}px)`;
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

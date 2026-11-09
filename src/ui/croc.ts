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
  { x: 60, y: 136 },
  { x: 300, y: 136 },
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
// Góc nhìn: cá sấu há miệng hướng về người chơi. Hàm trên (mõm dài, thuôn) dựng lên phía trên,
// chóp mõm có bướu lỗ mũi, mắt híp nằm sát gốc hàm; hàm dưới hình chữ U với 12 răng.
const LIP_Y0 = 180; // mép môi trên ở hai bên
const LIP_SAG = 16; // độ võng của môi ở giữa
/** y của mép môi trên tại x (cung bậc hai đối xứng). */
function lipY(x: number): number {
  const t = (346 - x) / 332;
  return LIP_Y0 + 2 * t * (1 - t) * (LIP_SAG * 2);
}

function upperTeeth(): string {
  let s = '';
  for (let i = 0; i < 11; i++) {
    const x = 50 + i * 26;
    const y = lipY(x) - 3;
    const h = i === 1 || i === 9 ? 26 : i === 4 || i === 6 ? 20 : 15;
    s += `<path d="M${x - 8} ${y} Q${x - 2} ${y + h * 0.7} ${x} ${y + h} Q${x + 2} ${y + h * 0.7} ${x + 8} ${y} Z" class="lip-tooth"/>`;
  }
  return s;
}

/** Răng chìa ra hai bên mõm — đặc trưng của cá sấu. */
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
      const tx = -ny; // tiếp tuyến ⟂ pháp tuyến
      const ty = nx;
      const b1 = `${(x + tx * 6).toFixed(1)} ${(y + ty * 6).toFixed(1)}`;
      const b2 = `${(x - tx * 6).toFixed(1)} ${(y - ty * 6).toFixed(1)}`;
      const tip = `${(x + nx * 13).toFixed(1)} ${(y + ny * 13).toFixed(1)}`;
      s += `<path d="M${b1} L${tip} L${b2} Z" class="lip-tooth"/>`;
    }
  }
  return s;
}

/** Vảy giáp trên mõm, xếp hàng thu hẹp dần về chóp. */
function snoutScutes(): string {
  let s = '';
  const rows: Array<[number, number[]]> = [
    [70, [22]],
    [90, [24, 48]],
    [110, [26, 52, 78]],
    [132, [28, 56, 84]],
    [154, [30, 60, 90, 118]],
  ];
  for (const [y, xs] of rows) {
    for (const dx of xs) {
      for (const side of [-1, 1]) {
        const x = CX + side * dx;
        s += `<rect x="${x - 8}" y="${y - 5}" width="16" height="10" rx="4.5"/>`;
      }
    }
  }
  return s;
}

/** Vảy hàm dưới xếp theo cung tròn. */
function jawScales(): string {
  let s = '';
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * (i + 0.5)) / n;
    const x = CX - 150 * Math.cos(a);
    const y = ARC_Y + 150 * Math.sin(a);
    const rot = (a * 180) / Math.PI - 90;
    s += `<rect x="${(x - 10).toFixed(1)}" y="${(y - 6).toFixed(1)}" width="20" height="12" rx="5" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
  }
  for (const y of [188, 216, 244]) s += `<rect x="22" y="${y - 9}" width="14" height="18" rx="5"/><rect x="324" y="${y - 9}" width="14" height="18" rx="5"/>`;
  return s;
}

/** Răng đan cài quanh mép hàm khi ngậm miệng. */
function flapTeeth(): string {
  let s = '';
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * i) / n;
    const r = 164;
    const x = CX - r * Math.cos(a);
    const y = ARC_Y + r * Math.sin(a);
    const nx = -Math.cos(a);
    const ny = Math.sin(a);
    const tx = -ny;
    const ty = nx;
    const L = i % 2 ? 14 : 10;
    s += `<path d="M${(x + tx * 6).toFixed(1)} ${(y + ty * 6).toFixed(1)} L${(x + nx * L).toFixed(1)} ${(y + ny * L).toFixed(1)} L${(x - tx * 6).toFixed(1)} ${(y - ty * 6).toFixed(1)} Z" class="lip-tooth"/>`;
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
  // Mõm dài thuôn dần lên chóp, hai bên lượn sóng như cá sấu thật.
  const headPath =
    `M14 ${LIP_Y0} C8 150 26 116 50 108 C70 98 92 92 104 70 Q110 54 118 46 C128 32 146 14 180 12 ` +
    `C214 14 232 32 242 46 Q250 54 256 70 C268 92 290 98 310 108 C334 116 352 150 346 ${LIP_Y0} ${lipPath} Z`;

  const eye = (e: { x: number; y: number }, i: number) => {
    const tilt = i === 0 ? 12 : -12;
    return `
    <g class="eye-socket">
      <ellipse cx="${e.x}" cy="${e.y}" rx="31" ry="25" fill="url(#${id}-up)" class="outline"/>
      <g class="brow-bumps"><ellipse cx="${e.x - 16}" cy="${e.y - 19}" rx="8" ry="6"/><ellipse cx="${e.x}" cy="${e.y - 23}" rx="9" ry="6.5"/><ellipse cx="${e.x + 16}" cy="${e.y - 19}" rx="8" ry="6"/></g>
    </g>
    <g class="eye" style="transform-origin:${e.x}px ${e.y}px">
      <g transform="rotate(${tilt} ${e.x} ${e.y})">
        <clipPath id="${id}-eye${i}"><ellipse cx="${e.x}" cy="${e.y}" rx="17" ry="12"/></clipPath>
        <ellipse cx="${e.x}" cy="${e.y}" rx="17" ry="12" class="eye-white"/>
        <g clip-path="url(#${id}-eye${i})">
          <g class="pupil" data-eye="${i}">
            <circle cx="${e.x}" cy="${e.y + 1}" r="10.5" class="eye-iris"/>
            <circle cx="${e.x}" cy="${e.y + 1}" r="10.5" class="eye-iris-ring"/>
            <ellipse cx="${e.x}" cy="${e.y + 1}" rx="2.4" ry="10" class="eye-pupil"/>
            <circle cx="${e.x + 4}" cy="${e.y - 3}" r="2.4" fill="#fff"/>
          </g>
          <path d="M${e.x - 19} ${e.y - 14} L${e.x + 19} ${e.y - 14} L${e.x + 19} ${e.y - 3} Q${e.x} ${e.y + 1} ${e.x - 19} ${e.y - 5} Z" class="eyelid"/>
        </g>
        <ellipse cx="${e.x}" cy="${e.y}" rx="17" ry="12" class="eye-rim"/>
      </g>
    </g>`;
  };

  return `
  <div class="croc" role="group" aria-label="Hàm cá sấu">
    <svg class="croc-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-low" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#55874A"/><stop offset="1" stop-color="#284A27"/>
        </linearGradient>
        <radialGradient id="${id}-mouth" cx=".5" cy=".5" r=".62">
          <stop offset="0" stop-color="#2A0512"/><stop offset=".55" stop-color="#4A0E26"/><stop offset="1" stop-color="#6E1A3A"/>
        </radialGradient>
        <radialGradient id="${id}-tongue" cx=".45" cy=".35" r=".7">
          <stop offset="0" stop-color="#CC5079"/><stop offset="1" stop-color="#8A284A"/>
        </radialGradient>
      </defs>
      <path class="outline" fill="url(#${id}-low)" d="M13 170 L13 ${ARC_Y} A167 167 0 0 0 347 ${ARC_Y} L347 170 Z"/>
      <g class="jaw-scales">${jawScales()}</g>
      <path class="c-gum" d="M48 170 L48 ${ARC_Y} A132 132 0 0 0 312 ${ARC_Y} L312 170 Z"/>
      <path class="c-mouth" fill="url(#${id}-mouth)" d="M56 170 L56 ${ARC_Y} A124 124 0 0 0 304 ${ARC_Y} L304 170 Z"/>
      <ellipse cx="180" cy="212" rx="70" ry="20" class="c-throat"/>
      <g class="tongue">
        <path class="c-tongue" fill="url(#${id}-tongue)" d="M180 232 C232 230 246 292 234 340 C224 378 136 378 126 340 C114 292 128 234 180 232 Z"/>
        <path class="c-tongue-line" d="M180 256 C176 282 184 308 180 334"/>
        <ellipse cx="158" cy="266" rx="10" ry="20" class="c-tongue-shine" transform="rotate(14 158 266)"/>
      </g>
    </svg>
    <div class="teeth">${teeth}</div>
    <svg class="croc-flap" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-flap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#5E9050"/><stop offset="1" stop-color="#335C2D"/>
        </linearGradient>
      </defs>
      ${flapTeeth()}
      <path class="outline" fill="url(#${id}-flap)" d="M13 160 L13 ${ARC_Y} A162 162 0 0 0 347 ${ARC_Y} L347 160 Z"/>
      <g class="scutes">${[200, 236, 272, 308, 344]
        .map((y, r) =>
          [-1, 1]
            .flatMap((sd) => [22, 56, 90].slice(0, 3 - Math.floor(r / 2)).map((dx) => `<rect x="${CX + sd * dx - 9}" y="${y - 6}" width="18" height="12" rx="5"/>`))
            .join(''),
        )
        .join('')}</g>
      <path class="c-up-shade" d="M180 190 L180 380"/>
    </svg>
    <svg class="croc-head" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-up" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7DAA55"/><stop offset=".5" stop-color="#4E8243"/><stop offset="1" stop-color="#355F2C"/>
        </linearGradient>
      </defs>
      <g class="breathe">
        ${upperTeeth()}
        ${sideFangs()}
        <path class="drool" d="M124 ${lipY(124) - 2} q-3 14 0 26 q4 6 7 0 q2 -12 -1 -26 Z"/>
        <path d="${headPath}" fill="url(#${id}-up)" class="outline"/>
        <g class="scutes">${snoutScutes()}</g>
        <path d="M180 52 L180 168" class="snout-groove"/>
        <path d="M40 160 Q180 ${LIP_Y0 + LIP_SAG * 2 - 14} 320 160" class="c-up-shade"/>
        <g class="snout">
          <ellipse cx="180" cy="32" rx="30" ry="17" class="nose-bump outline-thin"/>
          <ellipse cx="168" cy="32" rx="5.5" ry="7" class="nostril" transform="rotate(-25 168 32)"/>
          <ellipse cx="192" cy="32" rx="5.5" ry="7" class="nostril" transform="rotate(25 192 32)"/>
        </g>
        <path d="M54 ${LIP_Y0 - 3} Q180 ${LIP_Y0 + LIP_SAG * 2 + 1} 306 ${LIP_Y0 - 3}" class="lip-line"/>
        <g class="scar">
          <path d="M210 70 L262 140"/><path d="M222 84 L236 74"/><path d="M234 101 L248 91"/><path d="M246 118 L260 108"/>
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
      p.style.transform = `translate(${((dx / d) * 5).toFixed(1)}px, ${((dy / d) * 3).toFixed(1)}px)`;
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

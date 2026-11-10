import type { Player } from '../state';

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function $(sel: string, root: ParentNode = document): HTMLElement {
  const el = root.querySelector(sel);
  if (!el) throw new Error('Thiếu phần tử ' + sel);
  return el as HTMLElement;
}

export const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const last = parts[parts.length - 1];
  return Array.from(last)[0].toUpperCase();
}

/** Nội dung bên trong avatar: con vật nếu đã chọn, không thì chữ cái đầu. */
export function avatarInner(p: Pick<Player, 'name' | 'animal'>, name = p.name): string {
  return p.animal
    ? `<span class="av-in av-emo">${p.animal}</span>`
    : `<span class="av-in">${esc(initials(name))}</span>`;
}

export function avatar(p: Player, cls = ''): string {
  return `<span class="av ${cls}${p.animal ? ' has-emo' : ''}" style="--pc:${p.color}" data-pid="${p.id}">${avatarInner(p)}</span>`;
}

/** Danh sách avatar con vật. */
export const ANIMALS: Array<[string, string]> = [
  ['🐊', 'Cá sấu'], ['🐸', 'Ếch'], ['🐢', 'Rùa'], ['🦎', 'Thằn lằn'], ['🐍', 'Rắn'], ['🦆', 'Vịt'],
  ['🐶', 'Chó'], ['🐱', 'Mèo'], ['🐭', 'Chuột'], ['🐹', 'Hamster'], ['🐰', 'Thỏ'], ['🦊', 'Cáo'],
  ['🐻', 'Gấu'], ['🐼', 'Gấu trúc'], ['🐨', 'Koala'], ['🐯', 'Hổ'], ['🦁', 'Sư tử'], ['🐮', 'Bò'],
  ['🐷', 'Heo'], ['🐵', 'Khỉ'], ['🐔', 'Gà'], ['🐧', 'Cánh cụt'], ['🐦', 'Chim'], ['🦉', 'Cú'],
  ['🦄', 'Kỳ lân'], ['🐴', 'Ngựa'], ['🦓', 'Ngựa vằn'], ['🦒', 'Hươu cao cổ'], ['🐘', 'Voi'], ['🦛', 'Hà mã'],
  ['🐙', 'Bạch tuộc'], ['🦀', 'Cua'], ['🦞', 'Tôm hùm'], ['🐠', 'Cá'], ['🐬', 'Cá heo'], ['🦈', 'Cá mập'],
  ['🐳', 'Cá voi'], ['🦭', 'Hải cẩu'], ['🐌', 'Ốc sên'], ['🦋', 'Bướm'], ['🐝', 'Ong'], ['🐞', 'Bọ rùa'],
  ['🦔', 'Nhím'], ['🦥', 'Lười'], ['🦦', 'Rái cá'], ['🦘', 'Kangaroo'], ['🐲', 'Rồng'], ['🦖', 'Khủng long'],
];

/** Tên người chơi tô màu (chip). */
export function nameChip(p: Player): string {
  return `<span class="pn" style="--pc:${p.color}">${esc(p.name)}</span>`;
}

const ICONS: Record<string, string> = {
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  play: '<path d="M7 5l12 7-12 7z"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 5M22 9l-5 5"/>',
  cards: '<rect x="3" y="6" width="12" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M9 8h6"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  shuffle: '<path d="M3 7h3.5c4 0 6 10 10 10H21M3 17h3.5c1.6 0 2.8-1.6 3.9-3.5M14.6 9.5C15.7 8 16.9 7 18.5 7H21"/><path d="M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  water: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  pushup: '<circle cx="19" cy="8" r="2"/><path d="M3 19h18M4 17l12-5 2 1M9 15v4M16 12l1 7"/>',
  squat: '<circle cx="12" cy="4" r="2"/><path d="M6 9h12M12 6v6l-4 3v5M12 12l4 3v5"/>',
  tooth: '<path d="M6 4c2-1.5 4 0 6 0s4-1.5 6 0c2 1.6 1.5 5-0.5 8-1 1.6-1 8-3 8s-1.5-5-2.5-5-0.5 5-2.5 5-2-6.4-3-8C4.5 9 4 5.6 6 4z"/>',
};

export function icon(name: keyof typeof ICONS | string, size = 22): string {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ''}</svg>`;
}

import { CONFIG } from '../config';
import { esc, icon, initials } from './dom';
import { store, nav, saveRoster, newId, freeColor, displayName, persist } from './store';
import { showRules } from './modals';
import { createGame } from '../engine';
import { setSound, unlockAudio } from '../audio';
import type { Settings } from '../state';

type BoolKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

const TOGGLES: Array<[BoolKey, string, string]> = [
  ['sexy', 'Thử thách 18+', 'Thẻ gợi cảm, nóng bỏng'],
  ['outside', 'Thẻ liên quan người ngoài', 'Gọi điện, nhắn tin, đăng story'],
  ['phone', 'Thẻ điện thoại riêng tư', 'Xem ảnh, đọc tin nhắn'],
  ['bet', 'Cược nhanh', 'Nhắc cả bàn đoán trước mỗi lượt'],
  ['boss', 'Hàm Trùm', `Mỗi ${CONFIG.BOSS_INTERVAL} hàm, thẻ nặng đô hơn`],
  ['sound', 'Âm thanh', 'Tiếng tick, rắc, ting'],
];

function toggle(name: string, checked: boolean, label = ''): string {
  return `<label class="tg"><input type="checkbox" ${name} ${checked ? 'checked' : ''}><span class="tg-track"><span class="tg-dot"></span></span>${label}</label>`;
}

function crocLogo(): string {
  return `<svg class="logo" viewBox="0 0 64 48" aria-hidden="true">
    <path d="M4 22 Q4 6 20 6 L44 6 Q60 6 60 22 Z" fill="#3F8F4F"/>
    <circle cx="20" cy="9" r="7" fill="#3F8F4F"/><circle cx="44" cy="9" r="7" fill="#3F8F4F"/>
    <circle cx="20" cy="8" r="4" fill="#fff"/><rect x="19" y="5" width="2" height="6" rx="1" fill="#0E1A12"/>
    <circle cx="44" cy="8" r="4" fill="#fff"/><rect x="43" y="5" width="2" height="6" rx="1" fill="#0E1A12"/>
    <path d="M4 26 L60 26 Q60 46 32 46 Q4 46 4 26 Z" fill="#2C6B3A"/>
    <path d="M10 26 L54 26 Q54 40 32 40 Q10 40 10 26 Z" fill="#5E1530"/>
    <path d="M12 26 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6" fill="none" stroke="#F4EBD0" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M14 22 l3 -4 l3 4 M24 22 l3 -4 l3 4 M34 22 l3 -4 l3 4 M44 22 l3 -4 l3 4" fill="#F4EBD0"/>
  </svg>`;
}

export function renderSetup(root: HTMLElement): void {
  const s = store.settings;
  root.innerHTML = `
  <section class="screen setup">
    <header class="setup-head">
      ${crocLogo()}
      <h1 class="title">Răng Cá Sấu</h1>
      <p class="sub"><span class="only-m">Game nhậu chuyền tay · 1 điện thoại giữa bàn</span><span class="only-d">Game nhậu cho 2–12 người · mở trên laptop hoặc chuyền tay điện thoại</span></p>
      <button class="link" data-rules>${icon('book', 18)} Luật chơi</button>
    </header>

    <div class="setup-players">
    <div class="sec-title"><span>Người chơi <b class="count"></b></span><span class="hint"><span class="only-m">Chạm</span><span class="only-d">Bấm</span> avatar để đổi màu · thứ tự = chỗ ngồi</span></div>
    <div class="pgrid"></div>
    <button class="btn ghost wide" data-add>${icon('plus')} Thêm người chơi</button>
    </div>

    <div class="setup-side">
    <div class="info">
      <div class="info-title">${icon('tooth', 18)} 7 răng độc mỗi hàm</div>
      <ul>
        <li><i class="dot drink"></i><b>Uống ×2</b> — God Save 10%</li>
        <li><i class="dot hard"></i><b>Cực khó ×1</b> — thua 2 ly</li>
        <li><i class="dot buddy"></i><b>Uống cùng ×1</b> — kéo 1 người</li>
        <li><i class="dot wheel"></i><b>Vòng quay ×1</b> — mình uống hoặc cả bàn</li>
        <li><i class="dot pushup"></i><b>Hít đất ×1</b> — quay 1–5 cái</li>
        <li><i class="dot squat"></i><b>Squat ×1</b> — quay 4–10 cái</li>
      </ul>
    </div>

    <div class="sec-title"><span>Cài đặt</span></div>
    <div class="settings">
      ${TOGGLES.map(
        ([k, t, d]) => `<div class="set-row"><div><div class="set-t">${t}</div><div class="set-d">${d}</div></div>${toggle(`data-set="${k}"`, s[k])}</div>`,
      ).join('')}
      <div class="set-row col"><div><div class="set-t">Đồng hồ chọn răng</div><div class="set-d">Hết giờ: app chọn hộ + phạt 1 ngụm</div></div>
        <div class="seg">${CONFIG.PICK_SECONDS_OPTIONS.map(
          (n) => `<button data-sec="${n}" class="${s.pickSeconds === n ? 'on' : ''}">${n ? n + 's' : 'Tắt'}</button>`,
        ).join('')}</div>
      </div>
    </div>
    <button class="link center" data-cards>${icon('cards', 18)} Thêm thẻ của hội</button>
    </div>

    <div class="start-bar"><button class="btn primary big" data-start>Mở miệng cá sấu</button></div>
  </section>`;

  const grid = root.querySelector('.pgrid') as HTMLElement;
  const draw = () => {
    grid.innerHTML = store.roster
      .map(
        (p, i) => `<div class="pcard" data-id="${p.id}">
        <button class="av av-btn" style="--pc:${p.color}" data-color aria-label="Đổi màu"><span class="av-in">${esc(initials(displayName(p, i)))}</span></button>
        <div class="pcard-main">
          <input class="pname" value="${esc(p.name)}" placeholder="Người ${i + 1}" maxlength="16" aria-label="Tên người chơi ${i + 1}" enterkeyhint="next">
          <div class="pcard-tgs">
            ${toggle('data-k="couple"', p.couple, '<span class="tg-l">OK cặp</span>')}
            <label class="mini-tg" title="Nước lọc (lái xe)"><input type="checkbox" data-k="water" ${p.water ? 'checked' : ''}><span>${icon('water', 16)}</span></label>
          </div>
        </div>
        <button class="icon-btn sm pdel" data-del aria-label="Xóa" ${store.roster.length <= CONFIG.MIN_PLAYERS ? 'disabled' : ''}>${icon('x', 16)}</button>
      </div>`,
      )
      .join('');
    root.querySelector('.count')!.textContent = `${store.roster.length}/${CONFIG.MAX_PLAYERS}`;
    (root.querySelector('[data-add]') as HTMLButtonElement).disabled = store.roster.length >= CONFIG.MAX_PLAYERS;
  };
  draw();

  grid.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    const card = t.closest('.pcard') as HTMLElement;
    const idx = store.roster.findIndex((x) => x.id === card.dataset.id);
    const p = store.roster[idx];
    if (t.classList.contains('pname')) {
      p.name = t.value;
      card.querySelector('.av-in')!.textContent = initials(displayName(p, idx));
    } else if (t.dataset.k === 'couple') p.couple = t.checked;
    else if (t.dataset.k === 'water') p.water = t.checked;
    saveRoster();
  });
  grid.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (e.key !== 'Enter' || !t.classList.contains('pname')) return;
    e.preventDefault();
    const inputs = Array.from(grid.querySelectorAll<HTMLInputElement>('.pname'));
    const next = inputs[inputs.indexOf(t as HTMLInputElement) + 1];
    if (next) next.focus();
    else t.blur();
  });
  grid.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const card = t.closest('.pcard') as HTMLElement | null;
    if (!card) return;
    const p = store.roster.find((x) => x.id === card.dataset.id)!;
    if (t.closest('[data-color]')) {
      const used = store.roster.filter((x) => x !== p).map((x) => x.color);
      const cols = CONFIG.PLAYER_COLORS;
      let i = cols.indexOf(p.color);
      for (let k = 0; k < cols.length; k++) {
        i = (i + 1) % cols.length;
        if (!used.includes(cols[i])) break;
      }
      p.color = cols[i];
      (t.closest('[data-color]') as HTMLElement).style.setProperty('--pc', p.color);
      saveRoster();
    } else if (t.closest('[data-del]')) {
      store.roster = store.roster.filter((x) => x !== p);
      saveRoster();
      draw();
    }
  });
  root.querySelector('[data-add]')!.addEventListener('click', () => {
    store.roster.push({ id: newId(), name: '', color: freeColor(store.roster.map((p) => p.color)), couple: false, water: false });
    saveRoster();
    draw();
    const inputs = grid.querySelectorAll<HTMLInputElement>('.pname');
    inputs[inputs.length - 1]?.focus();
  });

  root.querySelector('.settings')!.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    const k = t.dataset.set as BoolKey | undefined;
    if (!k) return;
    store.settings[k] = t.checked;
    if (k === 'sound') setSound(t.checked);
    saveRoster();
  });
  root.querySelector('.seg')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    store.settings.pickSeconds = Number(b.dataset.sec);
    root.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b));
    saveRoster();
  });
  root.querySelector('[data-rules]')!.addEventListener('click', showRules);
  root.querySelector('[data-cards]')!.addEventListener('click', () => {
    store.back = 'setup';
    nav('cards');
  });
  root.querySelector('[data-start]')!.addEventListener('click', () => {
    unlockAudio();
    const players = store.roster.map((p, i) => ({ ...p, name: displayName(p, i).trim() }));
    // Trùng tên → thêm số để phân biệt.
    const seen = new Map<string, number>();
    for (const p of players) {
      const k = p.name.toLowerCase();
      const n = (seen.get(k) ?? 0) + 1;
      seen.set(k, n);
      if (n > 1) p.name = `${p.name} ${n}`;
    }
    store.g = createGame(players, { ...store.settings });
    persist();
    nav('game');
  });
}

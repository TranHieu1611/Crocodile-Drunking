import { CONFIG } from '../config';
import { ANIMALS, avatarInner, esc, icon, initials } from './dom';
import { store, nav, saveRoster, newId, freeColor, displayName, persist } from './store';
import { showRules, confirmBox, modal } from './modals';
import { createGame } from '../engine';
import { setSound, unlockAudio } from '../audio';
import { emptyStats, type PickMode, type Player, type Settings } from '../state';

const PICK_MODES: Array<[PickMode, string]> = [
  ['random', 'Ngẫu nhiên'],
  ['bag', 'Không lặp'],
  ['circle', 'Vòng tròn'],
];
const PICK_MODE_DESC: Record<PickMode, string> = {
  random: 'Quay ngẫu nhiên, chỉ không trùng người vừa chơi',
  bag: 'Quay ngẫu nhiên, ai chơi rồi thì loại — đủ một vòng mới quay lại',
  circle: 'Lần lượt theo thứ tự chỗ ngồi (người 1 → 2 → 3 …)',
};

type BoolKey = { [K in keyof Settings]-?: Settings[K] extends boolean ? K : never }[keyof Settings];

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
      ${
        store.g
          ? `<div class="resume-bar"><div class="rb-m">${icon('flag', 18)}<span><b>Ván đang chơi · Hàm ${store.g.round.n} · ${store.g.players.length} người</b><small>Sửa người chơi / cài đặt bên dưới rồi bấm “Chơi tiếp”</small></span></div><button class="btn primary" data-resume>${icon('play', 18)} Chơi tiếp ván này</button></div>`
          : ''
      }
    </header>

    <div class="setup-players">
    <div class="sec-title"><span>Người chơi <b class="count"></b></span><span class="hint">Thứ tự = chỗ ngồi quanh bàn</span></div>
    <div class="phelp">
      <span>${icon('refresh', 14)} <b>Bấm avatar</b> để chọn con vật &amp; màu</span>
      <span>${icon('left', 14)}${icon('right', 14)} <b>Dời chỗ</b> để xếp đúng chỗ ngồi (ảnh hưởng thẻ “người bên trái/phải” và chế độ Vòng tròn)</span>
      <span><i class="tg-mini"></i> <b>OK cặp</b>: đồng ý nhận thử thách đụng chạm (ôm, ngồi đùi, nhảy slow…)</span>
      <span>${icon('water', 14)} <b>Nước lọc</b>: ai lái xe thì uống nước lọc thay rượu bia</span>
    </div>
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
      <div class="set-row col"><div><div class="set-t">Bộ thẻ thử thách</div><div class="set-d ds-desc"></div></div>
        <div class="seg ds">
          <button data-ds="easy" class="${(s.deckSet ?? 'easy') === 'easy' ? 'on' : ''}">Dễ thở</button>
          <button data-ds="main" class="${s.deckSet === 'main' ? 'on' : ''}">Chính (nặng đô)</button>
        </div>
      </div>
      <div class="set-row col"><div><div class="set-t">Cách chọn người</div><div class="set-d pm-desc"></div></div>
        <div class="seg pm">${PICK_MODES.map(
          ([m, label]) => `<button data-pm="${m}" class="${(s.pickMode ?? 'random') === m ? 'on' : ''}">${label}</button>`,
        ).join('')}</div>
      </div>
      ${TOGGLES.map(
        ([k, t, d]) => `<div class="set-row"><div><div class="set-t">${t}</div><div class="set-d">${d}</div></div>${toggle(`data-set="${k}"`, s[k])}</div>`,
      ).join('')}
      <div class="set-row col"><div><div class="set-t">Đồng hồ chọn răng</div><div class="set-d">Hết giờ: app chọn hộ + phạt 1 ngụm</div></div>
        <div class="seg secs">${CONFIG.PICK_SECONDS_OPTIONS.map(
          (n) => `<button data-sec="${n}" class="${s.pickSeconds === n ? 'on' : ''}">${n ? n + 's' : 'Tắt'}</button>`,
        ).join('')}</div>
      </div>
    </div>
    <button class="link center" data-cards>${icon('cards', 18)} Thêm thẻ của hội</button>
    </div>

    <div class="start-bar"><button class="btn primary big" data-start>${store.g ? 'Bắt đầu ván mới' : 'Mở miệng cá sấu'}</button></div>
  </section>`;

  const grid = root.querySelector('.pgrid') as HTMLElement;
  const draw = () => {
    grid.innerHTML = store.roster
      .map(
        (p, i) => `<div class="pcard" data-id="${p.id}">
        <span class="seat" title="Chỗ ngồi số ${i + 1}">${i + 1}</span>
        <button class="av av-btn${p.animal ? ' has-emo' : ''}" style="--pc:${p.color}" data-avatar aria-label="Chọn avatar">${avatarInner(p, displayName(p, i))}<span class="av-edit">${icon('refresh', 11)}</span></button>
        <div class="pcard-main">
          <input class="pname" value="${esc(p.name)}" placeholder="Người ${i + 1}" maxlength="16" aria-label="Tên người chơi ${i + 1}" enterkeyhint="next">
          <div class="pcard-tgs">
            ${toggle('data-k="couple"', p.couple, '<span class="tg-l">OK cặp</span>')}
            <label class="mini-tg wide" title="Nước lọc: ai lái xe thì uống nước lọc thay rượu bia"><input type="checkbox" data-k="water" ${p.water ? 'checked' : ''}><span>${icon('water', 15)}<em>Nước lọc</em></span></label>
          </div>
        </div>
        <div class="pcard-tools">
          <button class="icon-btn sm" data-move="-1" aria-label="Dời lên trước" title="Dời lên trước" ${i === 0 ? 'disabled' : ''}>${icon('left', 15)}</button>
          <button class="icon-btn sm" data-move="1" aria-label="Dời ra sau" title="Dời ra sau" ${i === store.roster.length - 1 ? 'disabled' : ''}>${icon('right', 15)}</button>
          <button class="icon-btn sm" data-del aria-label="Xóa" title="Xóa người chơi" ${store.roster.length <= CONFIG.MIN_PLAYERS ? 'disabled' : ''}>${icon('x', 15)}</button>
        </div>
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
      if (!p.animal) card.querySelector('.av-in')!.textContent = initials(displayName(p, idx));
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
    const mv = t.closest<HTMLElement>('[data-move]');
    if (t.closest('[data-avatar]')) {
      const idx = store.roster.indexOf(p);
      pickAvatar(p, displayName(p, idx), () => {
        saveRoster();
        draw();
      });
    } else if (mv) {
      const i = store.roster.indexOf(p);
      const j = i + Number(mv.dataset.move);
      if (j < 0 || j >= store.roster.length) return;
      [store.roster[i], store.roster[j]] = [store.roster[j], store.roster[i]];
      saveRoster();
      draw();
      grid.querySelector<HTMLElement>(`.pcard[data-id="${p.id}"]`)?.classList.add('moved');
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
  root.querySelector('.seg.secs')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    store.settings.pickSeconds = Number(b.dataset.sec);
    root.querySelectorAll('.seg.secs button').forEach((x) => x.classList.toggle('on', x === b));
    saveRoster();
  });
  const dsDesc = root.querySelector('.ds-desc') as HTMLElement;
  const showDs = () =>
    (dsDesc.textContent =
      (store.settings.deckSet ?? 'easy') === 'easy'
        ? 'Nhẹ nhàng, hầu hết làm được ngay — hợp để khởi động'
        : 'Đủ đô hơn: có 18+, gọi điện, điện thoại riêng (tắt bớt bằng công tắc bên dưới)');
  showDs();
  root.querySelector('.seg.ds')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!b) return;
    store.settings.deckSet = b.dataset.ds as 'easy' | 'main';
    root.querySelectorAll('.seg.ds button').forEach((x) => x.classList.toggle('on', x === b));
    showDs();
    saveRoster();
  });
  const pmDesc = root.querySelector('.pm-desc') as HTMLElement;
  const showPm = () => (pmDesc.textContent = PICK_MODE_DESC[store.settings.pickMode ?? 'random']);
  showPm();
  root.querySelector('.seg.pm')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!b) return;
    store.settings.pickMode = b.dataset.pm as PickMode;
    root.querySelectorAll('.seg.pm button').forEach((x) => x.classList.toggle('on', x === b));
    showPm();
    saveRoster();
  });
  root.querySelector('[data-rules]')!.addEventListener('click', showRules);
  root.querySelector('[data-cards]')!.addEventListener('click', () => {
    store.back = 'setup';
    nav('cards');
  });
  root.querySelector('[data-start]')!.addEventListener('click', async () => {
    unlockAudio();
    if (store.g) {
      const ok = await confirmBox(
        'Bắt đầu ván mới?',
        `Ván đang chơi (Hàm ${store.g.round.n}) sẽ bị bỏ. Muốn giữ ván thì bấm “Chơi tiếp ván này”.`,
        'Ván mới',
        'Không',
      );
      if (!ok) return;
    }
    store.g = createGame(finalPlayers(), { ...store.settings });
    persist();
    nav('game');
  });
  root.querySelector('[data-resume]')?.addEventListener('click', () => {
    unlockAudio();
    applyToCurrentGame();
    nav('game');
  });
}

/** Bảng chọn avatar: con vật + màu nền. */
function pickAvatar(p: Player, name: string, done: () => void): void {
  const used = store.roster.filter((x) => x !== p).map((x) => x.color);
  const m = modal(`
    <div class="avp">
      <div class="m-head"><h2 class="m-title">Avatar của ${esc(name)}</h2><button class="icon-btn" data-close aria-label="Đóng">${icon('x')}</button></div>
      <div class="avp-preview"><span class="av lg avp-av" style="--pc:${p.color}"></span></div>
      <p class="avp-t">Con vật</p>
      <div class="avp-grid">
        <button class="avp-a txt" data-a="" title="Chữ cái đầu tên">${esc(initials(name))}</button>
        ${ANIMALS.map(([e, n]) => `<button class="avp-a" data-a="${e}" title="${n}" aria-label="${n}">${e}</button>`).join('')}
      </div>
      <p class="avp-t">Màu nền</p>
      <div class="avp-cols">${CONFIG.PLAYER_COLORS.map(
        (c) => `<button class="avp-c${used.includes(c) ? ' used' : ''}" data-c="${c}" style="--pc:${c}" title="${used.includes(c) ? 'Người khác đang dùng' : ''}" aria-label="Màu ${c}"></button>`,
      ).join('')}</div>
      <button class="btn primary wide" data-close>Xong</button>
    </div>`);
  const prev = m.el.querySelector('.avp-av') as HTMLElement;
  const paint = () => {
    prev.style.setProperty('--pc', p.color);
    prev.classList.toggle('has-emo', !!p.animal);
    prev.innerHTML = avatarInner(p, name);
    m.el.querySelectorAll<HTMLElement>('.avp-a').forEach((b) => b.classList.toggle('on', (b.dataset.a || undefined) === p.animal));
    m.el.querySelectorAll<HTMLElement>('.avp-c').forEach((b) => b.classList.toggle('on', b.dataset.c === p.color));
  };
  paint();
  m.el.querySelector('.avp')!.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const a = t.closest<HTMLElement>('[data-a]');
    const c = t.closest<HTMLElement>('[data-c]');
    if (a) p.animal = a.dataset.a || undefined;
    else if (c) p.color = c.dataset.c!;
    else return;
    paint();
    done();
  });
}

/** Tên cuối cùng (điền tên mặc định, thêm số nếu trùng). */
function finalPlayers(): Player[] {
  const players = store.roster.map((p, i) => ({ ...p, name: displayName(p, i).trim() }));
  const seen = new Map<string, number>();
  for (const p of players) {
    const k = p.name.toLowerCase();
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    if (n > 1) p.name = `${p.name} ${n}`;
  }
  return players;
}

/** Áp dụng người chơi + cài đặt vừa sửa vào ván đang chơi (giữ nguyên hàm, răng, thống kê). */
function applyToCurrentGame(): void {
  const g = store.g!;
  g.settings = { ...store.settings };
  g.players = finalPlayers();
  const ids = new Set(g.players.map((p) => p.id));
  for (const p of g.players) g.stats[p.id] ??= emptyStats();
  if (g.current && !ids.has(g.current)) {
    g.current = null;
    if (g.phase === 'picking') g.phase = 'idle';
  }
  if (g.last && !ids.has(g.last)) g.last = null;
  if (g.picked) g.picked = g.picked.filter((id) => ids.has(id));
  setSound(g.settings.sound);
  persist();
}

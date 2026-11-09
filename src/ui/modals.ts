import { CONFIG } from '../config';
import { esc, icon, avatar } from './dom';
import { store, persist, newId, freeColor } from './store';
import { emptyStats } from '../state';

export interface ModalHandle {
  el: HTMLElement;
  close: () => void;
}

export function modal(html: string, cls = 'sheet', dismissable = true): ModalHandle {
  const host = document.getElementById('app')!;
  const el = document.createElement('div');
  el.className = `modal ${cls}`;
  el.innerHTML = `<div class="modal-back"></div><div class="modal-box" role="dialog" aria-modal="true">${html}</div>`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const close = () => {
    el.classList.remove('in');
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
  };
  if (dismissable) el.querySelector('.modal-back')!.addEventListener('click', close);
  el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  const focusable =
    el.querySelector<HTMLElement>('.modal-box .btn.primary') ?? el.querySelector<HTMLElement>('.modal-box button, .modal-box input');
  focusable?.focus({ preventScroll: true });
  return { el, close };
}

export function confirmBox(title: string, body: string, yes: string, no: string): Promise<boolean> {
  return new Promise((res) => {
    const m = modal(
      `<h2 class="m-title">${title}</h2><p class="m-body">${body}</p>
       <div class="row2"><button class="btn ghost" data-no>${no}</button><button class="btn primary" data-yes>${yes}</button></div>`,
      'dialog',
      false,
    );
    m.el.querySelector('[data-yes]')!.addEventListener('click', () => (m.close(), res(true)));
    m.el.querySelector('[data-no]')!.addEventListener('click', () => (m.close(), res(false)));
  });
}

// ---------- Luật chơi ----------

export const SLIDES = [
  {
    t: 'Cá sấu có 12 răng',
    b: 'Mỗi hàm, cá sấu giấu <b>7 răng độc</b> trong 12 răng. Bấm <b>Quay chọn người</b>, ai bị gọi tên có <b>5 giây</b> chọn 1 răng. Chậm tay → app chọn hộ và phạt thêm 1 ngụm.',
  },
  {
    t: 'Răng Uống ×2',
    b: 'Dính răng đỏ: hàm sập, <b>quay vòng may mắn</b>. Trúng ô <b>GOD SAVE (10%)</b> thì thoát, còn lại uống <b>1 ly</b>.',
  },
  {
    t: 'Cực Khó · Uống Cùng · Vòng Quay',
    b: 'Răng tím: rút 1 <b>thử thách cực khó</b>. Làm được thì qua, chịu thua thì uống <b>2 ly</b>.<br><br>Răng vàng: bạn chắc chắn uống 1 ly, app <b>kéo thêm 1 người</b> làm thử thách cùng. Cả bàn bỏ phiếu cho người bị kéo có thoát hay không.<br><br>Răng cam: <b>quay vòng</b> — trúng <b>MÌNH UỐNG</b> thì bạn uống 1 ly, trúng <b>CẢ BÀN</b> thì cả bàn cùng dzô!',
  },
  {
    t: 'Hít Đất · Squat',
    b: 'Răng xanh dương: quay ra số cái <b>hít đất (1–5)</b>. Răng hồng: quay ra số cái <b>squat (4–10)</b>.<br><br>Cả bàn đếm to. Không làm nổi thì <b>uống 1 ly</b> thay thế.',
  },
  {
    t: 'Hàm Trùm & an toàn',
    b: 'Cứ <b>3 hàm</b> có 1 <b>Hàm Trùm</b> với thẻ nặng đô hơn. Thẻ đụng chạm chỉ rút cho người bật <b>OK cặp</b>. Ai lái xe thì bật <b>nước lọc</b>. Uống có trách nhiệm, đã uống thì không lái xe!',
  },
];

export function showRules(): void {
  let i = 0;
  const m = modal(
    `<div class="rules">
      <div class="rules-top"><span class="rules-step"></span><button class="icon-btn" data-close aria-label="Đóng">${icon('x')}</button></div>
      <div class="rules-body"></div>
      <div class="dots">${SLIDES.map(() => '<i></i>').join('')}</div>
      <div class="row2"><button class="btn ghost" data-prev>${icon('left')} Trước</button><button class="btn primary" data-next>Tiếp ${icon('right')}</button></div>
    </div>`,
    'dialog',
  );
  const draw = () => {
    m.el.querySelector('.rules-step')!.textContent = `Luật chơi ${i + 1}/${SLIDES.length}`;
    m.el.querySelector('.rules-body')!.innerHTML = `<h2 class="m-title">${SLIDES[i].t}</h2><p class="m-body">${SLIDES[i].b}</p>`;
    m.el.querySelectorAll('.dots i').forEach((d, k) => d.classList.toggle('on', k === i));
    (m.el.querySelector('[data-prev]') as HTMLButtonElement).disabled = i === 0;
    m.el.querySelector('[data-next]')!.innerHTML = i === SLIDES.length - 1 ? `Hiểu rồi ${icon('check')}` : `Tiếp ${icon('right')}`;
  };
  m.el.querySelector('[data-prev]')!.addEventListener('click', () => {
    i = Math.max(0, i - 1);
    draw();
  });
  m.el.querySelector('[data-next]')!.addEventListener('click', () => {
    if (i === SLIDES.length - 1) m.close();
    else {
      i++;
      draw();
    }
  });
  draw();
}

// ---------- Sửa người chơi giữa ván ----------

export function editPlayers(onDone: () => void): void {
  const g = store.g!;
  const busy = (id: string) => g.current === id || g.pending !== null;
  const m = modal(`<div class="ep"><div class="m-head"><h2 class="m-title">Người chơi</h2><button class="icon-btn" data-close aria-label="Đóng">${icon('x')}</button></div><div class="ep-list"></div>
    <button class="btn ghost wide" data-add>${icon('plus')} Thêm người chơi</button>
    <button class="btn primary wide" data-close>Xong</button></div>`);
  const list = m.el.querySelector('.ep-list') as HTMLElement;
  const draw = () => {
    list.innerHTML = g.players
      .map(
        (p) => `<div class="ep-row" data-id="${p.id}">
        ${avatar(p)}
        <input class="ep-name" value="${esc(p.name)}" maxlength="16" aria-label="Tên">
        <label class="mini-tg" title="OK thử thách cặp"><input type="checkbox" data-k="couple" ${p.couple ? 'checked' : ''}><span>${icon('heart', 16)}</span></label>
        <label class="mini-tg" title="Nước lọc"><input type="checkbox" data-k="water" ${p.water ? 'checked' : ''}><span>${icon('water', 16)}</span></label>
        <button class="icon-btn sm" data-del ${g.players.length <= CONFIG.MIN_PLAYERS || busy(p.id) ? 'disabled' : ''} aria-label="Xóa">${icon('trash', 18)}</button>
      </div>`,
      )
      .join('');
    (m.el.querySelector('[data-add]') as HTMLButtonElement).disabled = g.players.length >= CONFIG.MAX_PLAYERS;
  };
  list.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    const row = t.closest('.ep-row') as HTMLElement;
    const p = g.players.find((x) => x.id === row.dataset.id)!;
    if (t.classList.contains('ep-name')) p.name = t.value.trim() || p.name;
    else if (t.dataset.k === 'couple') p.couple = t.checked;
    else if (t.dataset.k === 'water') p.water = t.checked;
    persist();
  });
  list.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('[data-del]');
    if (!b) return;
    const id = (b.closest('.ep-row') as HTMLElement).dataset.id!;
    g.players = g.players.filter((p) => p.id !== id);
    if (g.last === id) g.last = null;
    persist();
    draw();
  });
  m.el.querySelector('[data-add]')!.addEventListener('click', () => {
    const id = newId();
    g.players.push({ id, name: `Người ${g.players.length + 1}`, color: freeColor(g.players.map((p) => p.color)), couple: false, water: false });
    g.stats[id] = emptyStats();
    persist();
    draw();
  });
  const obs = new MutationObserver(() => {
    if (!m.el.isConnected) {
      obs.disconnect();
      onDone();
    }
  });
  obs.observe(m.el.parentElement!, { childList: true });
  draw();
}

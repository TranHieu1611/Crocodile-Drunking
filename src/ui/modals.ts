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

const POISON_N = Object.values(CONFIG.POISON).reduce((s, n) => s + n, 0);
const P = CONFIG.REPS;

export const SLIDES = [
  {
    t: `Cá sấu có ${CONFIG.TEETH} răng`,
    b: `Mỗi hàm, cá sấu giấu <b>${POISON_N} răng độc</b> trong ${CONFIG.TEETH} răng, còn lại là răng an toàn. Ai được gọi tên thì chọn 1 răng trong thời gian đồng hồ (mặc định <b>${CONFIG.PICK_SECONDS_DEFAULT} giây</b>, chỉnh được hoặc tắt). Chậm tay → app chọn hộ và phạt thêm <b>1 ngụm</b>.<br><br><b>Cược nhanh</b>: ai đoán người đang chọn sẽ bị gặm thì bấm tên mình. Đoán sai (răng an toàn) → mỗi người 1 ngụm. Đoán trúng → người bị gặm quay vòng <b>Cược thắng</b>: 1 ô thoát + mỗi người cược trúng thêm 1 ô <b>uống thêm 1 ly</b> (1 người cược = 50/50).`,
  },
  {
    t: 'Ai chọn răng?',
    b: 'Chọn ở màn thiết lập (hoặc Menu giữa ván):<br><b>Ngẫu nhiên</b> — quay chọn bất kỳ, chỉ không trùng người vừa chơi.<br><b>Không lặp</b> — ai chơi rồi thì loại, đủ một vòng mới quay lại.<br><b>Vòng tròn</b> — lần lượt theo chỗ ngồi, app tự gọi người kế tiếp, không cần quay.',
  },
  {
    t: `Răng Uống ×${CONFIG.POISON.drink}`,
    b: `Dính răng đỏ: hàm sập, <b>quay vòng God Save</b>. Trúng ô <b>GOD SAVE (${Math.round(CONFIG.GOD_SAVE * 100)}%)</b> thì thoát nạn, còn lại uống <b>1 ly</b>.`,
  },
  {
    t: 'Cực Khó · Uống Cùng',
    b: `<b>Răng tím</b>: rút 1 thử thách cực khó, có đồng hồ đếm giờ. Cả bàn công nhận làm được thì qua, chịu thua uống <b>${CONFIG.HARD_FAIL_DRINKS} ly</b>.<br><br><b>Răng vàng</b>: bạn chắc chắn uống 1 ly, app <b>kéo thêm 1 người</b> làm thử thách cùng bạn. Cả bàn bỏ phiếu: OK thì người bị kéo thoát, không OK thì uống cùng bạn.`,
  },
  {
    t: 'Vòng Quay',
    b: `<b>Răng cam</b>: quay vòng ${Math.round((1 - CONFIG.PARTY_CHANCE) * 100)}/${Math.round(CONFIG.PARTY_CHANCE * 100)} — trúng <b>MÌNH UỐNG</b> thì bạn uống 1 ly, trúng <b>CẢ BÀN</b> thì tất cả cùng dzô 1 ly!`,
  },
  {
    t: 'Hít Đất · Squat',
    b: `<b>Răng xanh dương</b>: quay ra số cái <b>hít đất (${P.pushup[0]}–${P.pushup[P.pushup.length - 1]})</b>. <b>Răng hồng</b>: quay ra số cái <b>squat (${P.squat[0]}–${P.squat[P.squat.length - 1]})</b>.<br><br>Cả bàn đếm to. Không làm nổi thì <b>uống 1 ly</b> thay thế.`,
  },
  {
    t: 'Hết hàm & Hàm Trùm',
    b: `Hàm kết thúc khi dính đủ <b>${POISON_N} răng độc</b> — riêng chế độ <b>Vòng tròn</b> còn kết thúc khi <b>cả bàn đã chọn đủ 1 lượt</b>. Sau mỗi hàm có bảng tổng kết ai uống bao nhiêu.<br><br>Cứ <b>${CONFIG.BOSS_INTERVAL} hàm</b> có 1 <b>Hàm Trùm</b>: cá sấu có sẹo, thẻ nặng đô hơn. Bấm <b>Kết thúc ván</b> trong Menu để trao danh hiệu cả buổi.`,
  },
  {
    t: 'Chỗ ngồi & an toàn',
    b: 'Thứ tự người chơi = <b>chỗ ngồi quanh bàn</b> (dời bằng nút ‹ ›) — quyết định "người bên trái/phải" trong thẻ và thứ tự Vòng tròn. Bấm <b>←</b> giữa ván để sửa mà không mất ván.<br><br>Thẻ đụng chạm chỉ rút cho người bật <b>OK cặp</b>. Ai lái xe bật <b>Nước lọc</b>. Uống có trách nhiệm — đã uống thì không lái xe!',
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

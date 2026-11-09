import { esc, icon } from './dom';
import { store, nav } from './store';
import { loadCustomCards, saveCustomCards, type CustomCard, type DeckName, type Tag } from '../cards';

const TAGS: Array<[Tag, string]> = [
  ['couple', 'Đụng chạm (cặp)'],
  ['sexy', '18+'],
  ['outside', 'Người ngoài'],
  ['phone', 'Điện thoại riêng'],
];

export function renderCards(root: HTMLElement): void {
  let deck: DeckName = 'hard';
  root.innerHTML = `
  <section class="screen cards-ed">
    <header class="sub-head"><button class="icon-btn" data-back aria-label="Quay lại">${icon('left')}</button><h1 class="title sm">Thẻ của hội</h1></header>
    <form class="cform">
      <div class="seg deck">
        <button type="button" data-deck="hard" class="on">Cực khó</button>
        <button type="button" data-deck="buddy">Uống cùng</button>
      </div>
      <label class="fl">Nội dung thử thách
        <textarea name="text" rows="4" maxlength="240" required></textarea>
      </label>
      <p class="hint ph-hint"></p>
      <div class="tagrow">${TAGS.map(([t, l]) => `<label class="tchk"><input type="checkbox" name="tag" value="${t}"><span>${l}</span></label>`).join('')}</div>
      <div class="row2">
        <label class="fl">Số giây<input name="seconds" type="number" min="5" max="300" value="30" inputmode="numeric"></label>
        <label class="tchk boss-chk"><input type="checkbox" name="boss"><span>Chỉ ở Hàm Trùm</span></label>
      </div>
      <button class="btn primary wide" type="submit">${icon('plus')} Thêm thẻ</button>
    </form>
    <div class="sec-title"><span>Thẻ đã thêm <b class="count"></b></span></div>
    <div class="clist"></div>
  </section>`;

  const form = root.querySelector('form') as HTMLFormElement;
  const phHint = root.querySelector('.ph-hint') as HTMLElement;
  const ta = form.querySelector('textarea') as HTMLTextAreaElement;
  const setDeck = (d: DeckName) => {
    deck = d;
    root.querySelectorAll('[data-deck]').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.deck === d));
    phHint.innerHTML =
      d === 'hard'
        ? 'Dùng <code>{A}</code> = người dính răng, <code>{L}</code>/<code>{R}</code> = người ngồi trái/phải.'
        : 'Dùng <code>{B}</code> = người bị kéo, <code>{A}</code> = người dính răng.';
    ta.placeholder = d === 'hard' ? '{A} hát một bài bằng giọng của {L}…' : '{B} cõng {A} đi một vòng bàn…';
  };
  setDeck('hard');

  const list = root.querySelector('.clist') as HTMLElement;
  const draw = () => {
    const cards = loadCustomCards();
    root.querySelector('.count')!.textContent = String(cards.length);
    list.innerHTML = cards.length
      ? cards
          .map(
            (c) => `<div class="citem"><div class="citem-m"><span class="chip k-${c.deck}">${c.deck === 'hard' ? 'Cực khó' : 'Uống cùng'}</span>${c.boss ? '<span class="chip r-hardFail">Trùm</span>' : ''}${c.tags.map((t) => `<span class="chip">${TAGS.find((x) => x[0] === t)?.[1] ?? t}</span>`).join('')}<span class="chip">${c.seconds}s</span><p>${esc(c.text)}</p></div><button class="icon-btn sm" data-del="${c.id}" aria-label="Xóa thẻ">${icon('trash', 18)}</button></div>`,
          )
          .join('')
      : '<p class="empty">Chưa có thẻ nào. Viết thử thách “đặc sản” của hội bạn ở trên nhé!</p>';
  };
  draw();

  root.querySelector('.deck')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-deck]');
    if (b) setDeck(b.dataset.deck as DeckName);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    let text = String(fd.get('text') ?? '').trim();
    if (!text) return;
    if (!text.includes('{A}') && !text.includes('{B}')) text = (deck === 'hard' ? '{A} ' : '{B} ') + text;
    const card: CustomCard = {
      id: 'c' + Date.now().toString(36),
      deck,
      text,
      tags: fd.getAll('tag') as Tag[],
      seconds: Math.min(300, Math.max(5, Number(fd.get('seconds')) || 30)),
      boss: fd.get('boss') === 'on' || undefined,
      custom: true,
    };
    saveCustomCards([card, ...loadCustomCards()]);
    form.reset();
    setDeck(deck);
    draw();
  });
  list.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-del]');
    if (!b) return;
    saveCustomCards(loadCustomCards().filter((c) => c.id !== b.dataset.del));
    draw();
  });
  root.querySelector('[data-back]')!.addEventListener('click', () => nav(store.g && store.back === 'game' ? 'game' : 'setup'));
}

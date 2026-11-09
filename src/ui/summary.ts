import { avatar, esc, icon } from './dom';
import { store, persist, nav } from './store';
import { REASON_LABEL, createGame, isBossRound, nextRound, roundSummary, sessionAwards } from '../engine';
import { saveGame, type LogEntry } from '../state';
import { confetti } from './fx';

function amount(ly: number, sips: number, water: boolean): string {
  const parts: string[] = [];
  if (ly) parts.push(`${ly} ly`);
  if (sips) parts.push(`${sips} ngụm`);
  return parts.join(' + ') + (water ? ' nước lọc' : '');
}

function reasonChips(entries: LogEntry[]): string {
  return entries
    .map((e) => `<span class="chip r-${e.reason}">${REASON_LABEL[e.reason]}${e.reps ? ` ×${e.reps}` : ''}</span>`)
    .join('');
}

export function renderRoundEnd(root: HTMLElement): void {
  const g = store.g!;
  const { drank, survived } = roundSummary(g);
  const pct = Math.round((drank.length / g.players.length) * 100);
  const nextBoss = isBossRound(g.round.n + 1, g.settings);
  root.innerHTML = `
  <section class="screen summary">
    <p class="kicker">Tổng kết hàm ${g.round.n}</p>
    <div class="big-stat"><b>${drank.length}</b><span>/${g.players.length} người đã uống</span></div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div class="rows">
      ${drank
        .map(
          (r) => `<div class="srow">${avatar(r.player)}<div class="srow-m"><b>${esc(r.player.name)}</b><div class="chips">${reasonChips(r.entries)}</div></div><span class="amt">${amount(r.ly, r.sips, r.player.water)}</span></div>`,
        )
        .join('')}
    </div>
    ${
      survived.length
        ? `<p class="kicker">Sống sót</p><div class="surv">${survived
            .map((p) => {
              const e = g.round.log.filter((x) => x.playerId === p.id);
              return `<div class="surv-p">${avatar(p)}<span>${esc(p.name)}</span>${e.length ? `<div class="chips">${reasonChips(e)}</div>` : ''}</div>`;
            })
            .join('')}</div>`
        : ''
    }
    ${nextBoss ? `<p class="boss-warn">Hàm tiếp theo là HÀM TRÙM</p>` : ''}
    <div class="start-bar"><button class="btn primary big" data-next>Hàm tiếp theo</button></div>
  </section>`;
  root.querySelector('[data-next]')!.addEventListener('click', () => {
    nextRound(g);
    persist();
    nav('game');
  });
}

export function renderSession(root: HTMLElement): void {
  const g = store.g!;
  saveGame(null); // ván đã kết thúc → không hỏi chơi tiếp nữa
  const awards = sessionAwards(g);
  const rows = g.players
    .map((p) => ({ p, s: g.stats[p.id] }))
    .sort((x, y) => y.s.ly - x.s.ly || y.s.bitten - x.s.bitten);
  root.innerHTML = `
  <section class="screen session">
    <p class="kicker">Tổng kết buổi · ${g.round.n} hàm</p>
    <h1 class="title">Danh hiệu</h1>
    <div class="awards">
      ${awards
        .map(
          (a) => `<div class="award"><span class="aw-e">${a.emoji}</span><div class="aw-m"><b>${a.title}</b><span>${a.players
            .map((p) => esc(p.name))
            .join(', ')}</span></div><span class="aw-v">${a.value}<small>${a.unit}</small></span></div>`,
        )
        .join('')}
    </div>
    <div class="table-wrap">
      <table class="stats">
        <thead><tr><th>Người chơi</th><th title="Bị gặm">Gặm</th><th title="God Save">GS</th><th title="Cực khó làm được / thua">Cực khó</th><th title="Bị kéo uống cùng">Kéo</th><th>Ly</th><th>Ngụm</th></tr></thead>
        <tbody>${rows
          .map(
            ({ p, s }) =>
              `<tr><td><span class="td-p">${avatar(p, 'sm')}${esc(p.name)}${p.water ? ` ${icon('water', 14)}` : ''}</span></td><td>${s.bitten}</td><td>${s.godSaves}</td><td>${s.hardDone}/${s.hardFail}</td><td>${s.dragged}</td><td><b>${s.ly}</b></td><td>${s.sips}</td></tr>`,
          )
          .join('')}</tbody>
      </table>
    </div>
    <div class="start-bar col">
      <button class="btn primary big" data-again>${icon('refresh')} Ván mới (giữ người chơi)</button>
      <button class="btn ghost" data-setup>Về màn thiết lập</button>
    </div>
  </section>`;
  requestAnimationFrame(() => confetti(root.querySelector('.screen') as HTMLElement, ['#B8FF3C', '#FFC93C', '#C084FC', '#FF5A4E', '#FFF6E8']));
  root.querySelector('[data-again]')!.addEventListener('click', () => {
    store.g = createGame(
      g.players.map((p) => ({ ...p })),
      { ...g.settings },
    );
    persist();
    nav('game');
  });
  root.querySelector('[data-setup]')!.addEventListener('click', () => {
    store.g = null;
    nav('setup');
  });
}

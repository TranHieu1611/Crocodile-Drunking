import './styles/fonts.css';
import './styles/app.css';
import './styles/layout.css';
import './styles/croc.css';
import './styles/swamp.css';
import './styles/wheel.css';
import './styles/exercise.css';
import { store, setNav, loadRoster, type Screen } from './ui/store';
import { renderIntro, renderRulesPage, leaveIntro } from './ui/intro';
import { renderSetup } from './ui/setup';
import { renderGame, leaveGame } from './ui/game';
import { renderRoundEnd, renderSession } from './ui/summary';
import { renderCards } from './ui/cardsEditor';
import { swampHTML } from './ui/swamp';

declare const __SINGLE__: boolean;

const app = document.getElementById('app')!;
let screen: Screen | null = null;

function go(s: Screen): void {
  if (screen === 'game') leaveGame();
  if (screen === 'intro') leaveIntro();
  if ((s === 'game' || s === 'roundEnd' || s === 'session') && !store.g) s = 'setup';
  screen = s;
  app.dataset.screen = s;
  app.querySelectorAll('.modal').forEach((m) => m.remove());
  const view = document.createElement('div');
  view.className = 'view';
  app.querySelector('.view')?.remove();
  app.prepend(view);
  if (s === 'intro') renderIntro(view);
  else if (s === 'rules') renderRulesPage(view);
  else if (s === 'setup') renderSetup(view);
  else if (s === 'game') renderGame(view);
  else if (s === 'roundEnd') renderRoundEnd(view);
  else if (s === 'session') renderSession(view);
  else renderCards(view);
  view.scrollTop = 0;
  window.scrollTo(0, 0);
}

app.insertAdjacentHTML('afterbegin', swampHTML());
setNav(go);
loadRoster();
go('intro');

if (!__SINGLE__ && 'serviceWorker' in navigator && location.protocol.startsWith('http') && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

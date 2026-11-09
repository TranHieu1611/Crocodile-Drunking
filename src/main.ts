import './styles/fonts.css';
import './styles/app.css';
import { loadGame, saveGame } from './state';
import { store, setNav, loadRoster, type Screen } from './ui/store';
import { renderSetup } from './ui/setup';
import { renderGame, leaveGame } from './ui/game';
import { renderRoundEnd, renderSession } from './ui/summary';
import { renderCards } from './ui/cardsEditor';
import { confirmBox } from './ui/modals';
import { setSound } from './audio';

declare const __SINGLE__: boolean;

const app = document.getElementById('app')!;
let screen: Screen | null = null;

function go(s: Screen): void {
  if (screen === 'game') leaveGame();
  if ((s === 'game' || s === 'roundEnd' || s === 'session') && !store.g) s = 'setup';
  screen = s;
  app.querySelectorAll('.modal').forEach((m) => m.remove());
  const view = document.createElement('div');
  view.className = 'view';
  app.querySelector('.view')?.remove();
  app.prepend(view);
  if (s === 'setup') renderSetup(view);
  else if (s === 'game') renderGame(view);
  else if (s === 'roundEnd') renderRoundEnd(view);
  else if (s === 'session') renderSession(view);
  else renderCards(view);
  view.scrollTop = 0;
  window.scrollTo(0, 0);
}

setNav(go);

async function boot(): Promise<void> {
  loadRoster();
  const saved = loadGame();
  go('setup');
  if (saved) {
    const names = saved.players.map((p) => p.name).join(', ');
    const yes = await confirmBox(
      'Chơi tiếp ván cũ?',
      `Hàm ${saved.round.n} · ${saved.players.length} người: ${names.replace(/[<>&]/g, '')}`,
      'Chơi tiếp',
      'Ván mới',
    );
    if (yes) {
      store.g = saved;
      setSound(saved.settings.sound);
      go('game');
    } else {
      saveGame(null);
    }
  }
}

void boot();

if (!__SINGLE__ && 'serviceWorker' in navigator && location.protocol.startsWith('http') && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

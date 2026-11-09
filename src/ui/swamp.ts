// Hình nền đầm lầy về đêm: trăng, sương, rặng cây, mặt nước gợn, lau sậy, lá súng, hoa sen,
// bong bóng, đom đóm và đôi mắt cá sấu thỉnh thoảng ló lên. Chỉ trang trí — không bắt sự kiện.

function rnd(a: number, b: number): string {
  return (a + Math.random() * (b - a)).toFixed(1);
}

function fireflies(n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) {
    s += `<i style="left:${rnd(2, 98)}%;top:${rnd(12, 82)}%;animation-duration:${rnd(4, 9)}s;animation-delay:-${rnd(0, 8)}s"></i>`;
  }
  return `<div class="sw-flies">${s}</div>`;
}

function reeds(): string {
  // Cỏ lau / bồn bồn: lá dài + thân có bông.
  return `<svg viewBox="0 0 220 420" preserveAspectRatio="xMinYMax meet">
    <g class="sw-sway s1"><path d="M30 420 Q20 300 44 170" class="stem"/><rect x="36" y="150" width="15" height="58" rx="7" class="cattail"/><path d="M44 150 l0 -22" class="stem thin"/></g>
    <g class="sw-sway s2"><path d="M70 420 Q72 290 96 120" class="stem"/><rect x="88" y="98" width="16" height="64" rx="8" class="cattail"/><path d="M96 98 l2 -24" class="stem thin"/></g>
    <g class="sw-sway s3"><path d="M118 420 Q126 330 150 230" class="stem"/><rect x="143" y="210" width="13" height="48" rx="6.5" class="cattail"/></g>
    <g class="sw-sway s2"><path d="M8 420 C10 330 0 260 -6 200 C20 270 30 340 26 420 Z" class="blade"/></g>
    <g class="sw-sway s1"><path d="M52 420 C60 330 78 260 120 190 C96 270 80 340 72 420 Z" class="blade"/></g>
    <g class="sw-sway s3"><path d="M96 420 C112 360 150 320 196 300 C160 340 128 380 116 420 Z" class="blade"/></g>
    <g class="sw-sway s1"><path d="M140 420 C146 380 170 352 214 344 C182 366 162 392 158 420 Z" class="blade"/></g>
  </svg>`;
}

function pad(x: string, y: string, s: number, d: string, lotus = false): string {
  return `<svg class="sw-pad" style="left:${x};top:${y};width:${s}px;animation-delay:-${d}s" viewBox="0 0 100 50">
    <path d="M50 25 L96 18 A46 22 0 1 1 82 8 Z" class="pad"/>
    <path d="M50 25 L20 14 M50 25 L18 34 M50 25 L60 44" class="vein"/>
    ${lotus ? '<g class="lotus"><path d="M44 22 Q38 8 46 2 Q50 10 50 20 Z"/><path d="M56 22 Q62 8 54 2 Q50 10 50 20 Z"/><path d="M50 21 Q46 6 50 -2 Q54 6 50 21 Z" class="l2"/></g>' : ''}
  </svg>`;
}

export function swampHTML(): string {
  let ripples = '';
  for (let i = 0; i < 5; i++) ripples += `<i class="sw-ripple" style="left:${rnd(8, 88)}%;top:${rnd(25, 80)}%;animation-delay:-${rnd(0, 6)}s"></i>`;
  let bubbles = '';
  for (let i = 0; i < 6; i++) bubbles += `<i class="sw-bubble" style="left:${rnd(10, 90)}%;animation-delay:-${rnd(0, 9)}s;animation-duration:${rnd(5, 9)}s"></i>`;
  return `
  <div class="swamp" aria-hidden="true">
    <div class="sw-moon"></div>
    <div class="sw-fog f1"></div>
    <svg class="sw-trees" viewBox="0 0 1000 200" preserveAspectRatio="none">
      <path d="M0 200 L0 120 Q30 80 60 110 Q80 60 120 95 Q150 40 190 90 Q220 70 250 100 Q290 30 330 85 Q360 60 390 105 Q430 50 470 90 Q500 75 530 100 Q570 35 610 88 Q640 65 670 102 Q710 45 750 92 Q780 70 810 104 Q850 40 890 90 Q930 60 960 100 Q980 85 1000 95 L1000 200 Z"/>
    </svg>
    <div class="sw-water">
      <svg class="sw-wave" viewBox="0 0 1000 20" preserveAspectRatio="none"><path d="M0 10 Q50 0 100 10 T200 10 T300 10 T400 10 T500 10 T600 10 T700 10 T800 10 T900 10 T1000 10 L1000 20 L0 20 Z"/></svg>
      <div class="sw-glint"></div>
      ${ripples}
      <div class="sw-eyes"><svg viewBox="0 0 120 34"><ellipse cx="60" cy="30" rx="58" ry="10" class="snout"/><ellipse cx="34" cy="20" rx="16" ry="12" class="bump"/><ellipse cx="86" cy="20" rx="16" ry="12" class="bump"/><g class="glow"><ellipse cx="34" cy="17" rx="8" ry="5"/><ellipse cx="86" cy="17" rx="8" ry="5"/></g><rect x="33" y="12" width="2" height="10" rx="1" class="slit"/><rect x="85" y="12" width="2" height="10" rx="1" class="slit"/></svg></div>
      ${pad('12%', '30%', 70, '1')}
      ${pad('64%', '52%', 90, '3', true)}
      ${pad('82%', '22%', 54, '2')}
      ${pad('36%', '66%', 60, '4')}
      ${bubbles}
    </div>
    <div class="sw-fog f2"></div>
    <div class="sw-reeds left">${reeds()}</div>
    <div class="sw-reeds right">${reeds()}</div>
    ${fireflies(18)}
  </div>`;
}

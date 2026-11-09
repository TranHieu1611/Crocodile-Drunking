// Tạo icon PNG cho PWA (không cần thư viện): vẽ cá sấu đơn giản bằng pixel.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function draw(S, maskable) {
  const px = Buffer.alloc(S * S * 4);
  const u = (v) => v / 512; // toạ độ chuẩn hoá theo hệ 512
  const inRR = (x, y, r) => { const q = (a) => Math.max(0, Math.abs(a - .5) - (.5 - r)); return Math.hypot(q(x), q(y)) <= r; };
  const shapes = (x, y) => {
    // trả về màu tại (x,y) trong hệ 0..1
    const X = x * 512, Y = y * 512;
    if (!maskable && !inRR(x, y, u(112))) return null;
    let c = '#0E1A12';
    const inCirc = (cx, cy, r) => (X - cx) ** 2 + (Y - cy) ** 2 <= r * r;
    const inEll = (cx, cy, rx, ry) => ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1;
    // hàm dưới
    const lowOuter = Y >= 280 && inEll(256, 280, 196, 160);
    const lowInner = Y >= 280 && inEll(256, 280, 152, 118);
    if (lowOuter) c = '#2C6B3A';
    if (lowInner) c = '#5E1530';
    // răng dưới zigzag
    if (lowInner && Y < 324) { const t = ((X - 110) % 48 + 48) % 48; const h = 44 * (1 - Math.abs(t - 24) / 24); if (Y - 280 < h) c = '#F4EBD0'; }
    // hàm trên
    if ((Y <= 250 && Y >= 160 && X >= 60 && X <= 452 && (Y >= 205 || inEll(256, 250, 196, 90))) || inCirc(176, 150, 58) || inCirc(336, 150, 58)) c = '#3F8F4F';
    if (Y > 250 && Y < 280 && X > 100 && X < 412) { const t = ((X - 100) % 60 + 60) % 60; if (t < 44 && (Y - 250) < 30 * (1 - Math.abs(t - 22) / 22)) c = '#F4EBD0'; }
    if (inEll(176, 142, 32, 34) || inEll(336, 142, 32, 34)) c = '#FFFDF2';
    if (inEll(176, 142, 8, 24) || inEll(336, 142, 8, 24)) c = '#0E1A12';
    if (inCirc(226, 214, 9) || inCirc(286, 214, 9)) c = '#1E4D2A';
    return c;
  };
  const pad = maskable ? 0.1 : 0;
  const SS = 3;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sj = 0; sj < SS; sj++) for (let si = 0; si < SS; si++) {
      let x = (i + (si + .5) / SS) / S, y = (j + (sj + .5) / SS) / S;
      x = (x - pad) / (1 - 2 * pad); y = (y - pad) / (1 - 2 * pad);
      const col = x < 0 || x > 1 || y < 0 || y > 1 ? (maskable ? '#0E1A12' : null) : shapes(x, y);
      if (col) { const [R, G, B] = hex(col); r += R; g += G; b += B; a += 255; }
    }
    const n = SS * SS, o = (j * S + i) * 4;
    const cnt = a / 255 || 1;
    px[o] = r / cnt; px[o + 1] = g / cnt; px[o + 2] = b / cnt; px[o + 3] = a / n;
  }
  const raw = Buffer.alloc(S * (S * 4 + 1));
  for (let j = 0; j < S; j++) { raw[j * (S * 4 + 1)] = 0; px.copy(raw, j * (S * 4 + 1) + 1, j * S * 4, (j + 1) * S * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

writeFileSync('public/icon-192.png', draw(192, false));
writeFileSync('public/icon-512.png', draw(512, false));
writeFileSync('public/icon-maskable-512.png', draw(512, true));
writeFileSync('public/apple-touch-icon.png', draw(180, true));
console.log('icons ok');

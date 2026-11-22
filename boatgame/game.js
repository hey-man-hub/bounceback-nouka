const cv = document.getElementById('game'), ctx = cv.getContext('2d');
const W = 960, H = 540;
function fitCanvas() {
  const sc = Math.min(globalThis.devicePixelRatio || 1, 2), w = Math.min(Math.round(cv.clientWidth * sc), 1920) || W, h = Math.round(w * H / W);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
}
fitCanvas();
const keys = {}; const mouse = { x: W / 2, y: 300, down: false };
let mode = 'menu', lastMode = 'menu', paused = false, t = 0;
const rnd = (a, b) => a + Math.random() * (b - a);
const BROWN = '#3b2a1a';
function poly(p, fill, seed = 1, lw = 3) {
  ctx.beginPath();
  p.forEach(([x, y], i) => { x += Math.sin(seed * 7 + i * 2.3) * 1.8; y += Math.cos(seed * 5 + i * 1.7) * 1.8; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = BROWN; ctx.lineJoin = 'round'; ctx.stroke();
}
function blob(x, y, rx, ry, fill, seed = 1) { const p = []; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; p.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); } poly(p, fill, seed); }
function text(s, x, y, size = 20, col = '#eccccc', al = 'center', mw) {
  ctx.font = `bold ${size}px "Comic Sans MS",cursive`; ctx.textAlign = al; ctx.lineWidth = 4; ctx.strokeStyle = BROWN; ctx.strokeText(s, x, y, mw); ctx.fillStyle = col; ctx.fillText(s, x, y, mw);
}
function palm(x, y, s) { poly([[x - 4, y], [x + 4, y], [x + 2, y - 60], [x - 2, y - 60]], '#7a5230', s);
  for (let i = 0; i < 4; i++) blob(x + (i - 1.5) * 16, y - 62 + Math.abs(i - 1.5) * 5, 18, 7, '#3f9a45', s + i); }
function wave(y, amp, speed, col, off = 0) { ctx.beginPath(); for (let x = 0; x <= W; x += 20) { const yy = y + Math.sin((x + off) / 30 + t * speed) * amp; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke(); }
function button(label, x, y, w, h) { poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], '#c98b3c', 3); text(label, x + w / 2, y + h / 2 + 7, 22); return { x, y, w, h }; }
const hit = (b, m) => m.x > b.x && m.x < b.x + b.w && m.y > b.y && m.y < b.y + b.h;
const FISH = [];
const addFish = (r, col, names) => names.forEach(n => FISH.push({ name: n, rarity: r, col }));
addFish('Common', '#a9a58a', ['rohu', 'catla', 'pangasius catfish', 'tilapia', 'climbing perch', 'spotted catfish', 'pabda catfish', 'mola carplet', 'stinging catfish', 'walking catfish']);
addFish('Uncommon', '#6fbf73', ['hilsa', 'snakehead murrel', 'stripped snakehead', 'tiretrack eel', 'bata fish', 'gulsha catfish', 'freshwater prawn', 'bronze featherback', 'clown knifefish', 'wallago catfish']);
addFish('Rare', '#4f8fe0', ['asian seabass', 'black rohu', 'mrigal carp', 'long whiskered catfish', 'silver pomfret']);
addFish('Legendary', '#f0c030', ['golden hilsa', 'padma river dragon', 'shadowfish', 'royal catfish', 'rainbow pomfret']);
const RARITY_ODDS = [['Common', 55], ['Uncommon', 28], ['Rare', 12], ['Legendary', 5]];
const RARITY_SPEED = { Common: .52, Uncommon: .66, Rare: .8, Legendary: .95 };
const RARITY_ZONE = { Common: .235, Uncommon: .215, Rare: .195, Legendary: .175 };
const ZONE_SPEED = 1.1;
const collection = {};
function pickFish() {
  let r = rnd(0, 100), rar = 'Common';
  for (const [n, w] of RARITY_ODDS) { if (r < w) { rar = n; break; } r -= w; }
  const list = FISH.filter(f => f.rarity === rar); return list[Math.floor(Math.random() * list.length)];
}
function drawFish(f, x, y, s = 1, flip = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * flip, s);
  poly([[-22, 0], [-34, -12], [-34, 12]], f.col, 2); blob(0, 0, 26, 13, f.col, 3); blob(12, -3, 3, 3, '#fff', 4);
  ctx.restore();
}
const LANES = [270, 350, 430], TOP = 240, BOT = 460, BX = 220;
const OBS_TYPES = ['rock', 'fishpile', 'plastic'];
const randType = () => OBS_TYPES[Math.floor(rnd(0, 3))];
let C;
function startCareer(showHelp = false) {
  C = { scroll: 0, y: LANES[1], vy: 0, lane: 1, kb: 0, hearts: 3, bonus: 0, obs: [], ports: [], pax: false, from: -1,
    inv: 0, help: showHelp, fx: [], dead: 0, msg: '', msgT: 0, nextObs: 700, spd: 200, cruise: 200, level: 1, nextPort: 1000, portId: 0 };
  for (const id in padTouch) delete padTouch[id];
  keys.a = keys.d = false; mode = lastMode = 'career'; paused = false;
}
const say = s => { C.msg = s; C.msgT = 2.2; };
const nearPort = x => C.ports.some(p => x > p.x - 120 && x < p.x + p.w + 120);
function inPortZone() { const bw = C.scroll + BX; return C.lane === 0 ? C.ports.find(p => bw > p.x && bw < p.x + p.w) : null; }
function careerKey(k) {
  if (C.help) { C.help = false; return; }
  if (C.dead) return;
  if (k === 'h') { C.help = true; return; }
  if (k === 'arrowup' || k === 'w') { if (C.lane > 0) C.lane--; else C.vy -= 300; }
  if (k === 'arrowdown' || k === 's') { if (C.lane < 2) C.lane++; else C.vy += 300; }
  if (k === 'f') {
    const p = inPortZone(); if (!p) return;
    if (C.spd > C.cruise * .4) { say(isTouch ? 'Slow down first (hold SLOW)!' : 'Slow down first (hold A)!'); return; }
    if (!C.pax && p.pax) { p.pax = false; C.pax = true; C.from = p.id; say('Passenger aboard! Take them to the next port.'); }
    else if (C.pax && p.id !== C.from) { C.pax = false; C.bonus += 200; say('Delivered! +200 points'); }
    else say(C.pax ? 'Take them to a different port.' : 'No passenger waiting here.');
  }
}
function burst(x, y, n, col) { for (let i = 0; i < n; i++) C.fx.push({ x, y, vx: rnd(-150, 150), vy: rnd(-200, 50), l: rnd(.4, .9), col }); }
function updCareer(dt) {
  if (C.help) return;
  const c = C; c.msgT -= dt; c.inv -= dt;
  c.fx.forEach(f => { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 400 * dt; f.l -= dt; }); c.fx = c.fx.filter(f => f.l > 0);
  if (c.dead) {
    const prev = c.dead;
    c.dead += dt;
    if (prev < 0.8 && c.dead >= 0.8) burst(BX, c.y, 18, '#fff');
    if (prev < 1.2 && c.dead >= 1.2) burst(BX, c.y + 10, 22, '#9be');
    if (c.dead > 3.8) mode = 'over';
    return;
  }

  c.vy += ((LANES[c.lane] - c.y) * 60 - c.vy * 7) * dt; c.y += c.vy * dt;
  if (c.y < TOP) { c.y = TOP; c.vy = Math.abs(c.vy) * .8 + 80; burst(BX, c.y - 20, 6, '#9be'); }
  if (c.y > BOT) { c.y = BOT; c.vy = -Math.abs(c.vy) * .8 - 80; burst(BX, c.y + 10, 6, '#9be'); }

  const sc = Math.floor(c.scroll / 10) + c.bonus, cruise = Math.min(600, 200 + sc * 0.15);
  c.level = 1 + Math.floor(sc / 200); c.cruise = cruise;
  const target = (keys.a || keys.arrowleft) ? cruise * .25 : (keys.d || keys.arrowright) ? cruise * 1.3 : cruise;
  c.spd += (target - c.spd) * Math.min(1, 2.5 * dt);
  c.kb *= Math.exp(-4 * dt); c.scroll = Math.max(0, c.scroll + (c.spd - c.kb) * dt);
  while (c.scroll + 1200 > c.nextPort) { c.ports.push({ x: c.nextPort, w: 240, id: c.portId++, pax: true });
    c.obs = c.obs.filter(o => !nearPort(o.wx)); c.nextPort += 2000; }
  while (c.scroll + 1100 > c.nextObs) {
    if (!nearPort(c.nextObs)) {
      const first = Math.floor(rnd(0, 3));
      c.obs.push({ wx: c.nextObs, lane: first, type: randType() });
      if (sc > 400 && Math.random() < Math.min(.7, sc / 2500)) c.obs.push({ wx: c.nextObs, lane: (first + 1 + Math.floor(rnd(0, 2))) % 3, type: randType() });
    }
    c.nextObs += 144 + cruise * .8 + rnd(0, 120) * Math.max(.45, 1 - sc / 2500);
  }
  c.obs = c.obs.filter(o => o.wx > c.scroll - 200); c.ports = c.ports.filter(p => p.x + p.w > c.scroll - 200);
  for (const o of c.obs) if (c.inv <= 0 && Math.abs(o.wx - c.scroll - BX) < 72 && Math.abs(LANES[o.lane] - c.y) < 40) {
    c.hearts--; c.inv = .9; c.kb = 550; c.obs = c.obs.filter(q => q !== o); burst(BX + 70, c.y, 16, '#fff');
    if (c.hearts <= 0) { c.dead = 0.01; burst(BX, c.y, 20, '#9be'); } break;
  }
}
function drawBoatParts(pax) {
  const sw = Math.sin(t * 4) * .5;
  const p1 = [-40, -62 + sw * 6], p2 = [-96 + sw * 40, 34];
  ctx.strokeStyle = BROWN; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(46, -10); ctx.lineTo(46, -104); ctx.stroke();
  poly([[48, -100], [48, -22], [90, -26]], '#f2e6c8', 3);
  poly([[52, -78], [66, -74], [64, -60], [52, -62]], '#c0504d', 4, 2); poly([[56, -50], [74, -46], [72, -34], [56, -36]], '#4a7bc8', 5, 2);
  poly([[-90, -32], [-80, -6], [-62, 14], [-30, 22], [30, 22], [62, 14], [82, -6], [94, -36], [68, -10], [-64, -10]], '#8a5a2b', 1);
  poly([[-64, -10], [68, -10], [62, 14], [30, 22], [-30, 22], [-62, 14]], '#a8713a', 7);
  poly([[-68, -6], [70, -6], [68, 2], [-66, 2]], '#d94a3a', 8, 2);
  ctx.strokeStyle = BROWN; ctx.lineWidth = 1.5; for (const k of [9, 16]) { ctx.beginPath(); ctx.moveTo(-58 + k - 9, k); ctx.lineTo(60 - k + 9, k); ctx.stroke(); }
  blob(88, -30, 3, 3, '#fff', 9);
  poly([[-34, -10], [-36, -28], [-18, -42], [16, -42], [34, -28], [32, -10]], '#d8b878', 2);
  ctx.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 13, -10); ctx.lineTo(i * 10, -41); ctx.stroke(); }
  if (pax) { blob(0, -22, 7, 7, '#e0b080', 5); poly([[-7, -15], [7, -15], [8, -8], [-8, -8]], '#d33', 6); }
  poly([[-70, -10], [-50, -10], [-53, -34], [-67, -34]], '#3a7ad9', 10);
  poly([[-67, -34], [-53, -34], [-55, -56], [-65, -56]], '#e8dcc0', 11);
  blob(-60, -64, 8, 8, '#c68a5a', 12); poly([[-69, -67], [-51, -67], [-54, -75], [-66, -75]], '#c0392b', 13);
  ctx.strokeStyle = BROWN; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
  ctx.strokeStyle = '#d8b878'; ctx.lineWidth = 3; ctx.stroke();
  const hx = p1[0] + (p2[0] - p1[0]) * .3, hy = p1[1] + (p2[1] - p1[1]) * .3;
  ctx.strokeStyle = '#c68a5a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-58, -52); ctx.lineTo(hx, hy); ctx.stroke();
}
function drawBoat(x, y, rot, pax) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  drawBoatParts(pax);
  ctx.restore();
}
function drawBrokenBoat(x, y, rot, d, pax) {
  const tilt = Math.min(d, 1) * .45;
  const split = d > .6 ? (d - .6) * 42 : 0;
  const sink = d > 1.0 ? (d - 1.0) * 52 : 0;
  [
    [-1, -120, 0, -tilt - split * .008],
    [1, 0, 120, tilt + split * .008]
  ].forEach(([dir, x0, x1, ang]) => {
    ctx.save();
    ctx.translate(x + dir * split, y + sink + Math.abs(dir) * split * .18);
    ctx.rotate(rot + ang);
    ctx.beginPath();
    ctx.rect(x0, -130, x1 - x0, 180);
    ctx.clip();
    drawBoatParts(pax);
    ctx.restore();
  });
  if (d < 1.5) {
    const alpha = Math.max(0, 1 - d / 1.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = BROWN;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 28 + sink * .5);
    ctx.lineTo(x - 6, y - 10 + sink * .5);
    ctx.lineTo(x + 5, y + 6 + sink * .5);
    ctx.lineTo(x - 3, y + 20 + sink * .5);
    ctx.stroke();
    ctx.restore();
  }
  const washY = y + 8 + Math.min(sink * .65, 45);
  const washH = Math.min(sink * .55, 36);
  if (washH > 1) {
    ctx.fillStyle = 'rgba(79,179,166,.82)';
    ctx.fillRect(x - 115, washY, 230, washH);
  }
}
function drawCareer() {
  const c = C, s = c.scroll;
  ctx.fillStyle = '#f6d98a'; ctx.fillRect(0, 0, W, 120);
  ctx.fillStyle = '#fff3c0'; ctx.beginPath(); ctx.arc(780, 70, 34, 0, 7); ctx.fill();
  ctx.fillStyle = '#7fc46a'; ctx.fillRect(0, 110, W, 90);
  for (let i = -1; i < 8; i++) palm(i * 170 - (s * .4) % 170, 195, i + Math.floor(s * .4 / 170));
  ctx.fillStyle = '#4fb3a6'; ctx.fillRect(0, 200, W, 290);
  for (let r = 0; r < 6; r++) wave(225 + r * 50, 4, 2 + r * .2, 'rgba(255,255,255,.35)', s * (.8 + r * .1));
  c.ports.forEach(p => { const x = p.x - s; if (x > W || x + p.w < 0) return;
    poly([[x, 205], [x + p.w, 205], [x + p.w, 245], [x, 245]], '#a8743a', 4);
      for (let i = 0; i < 5; i++) poly([[x + 8 + i * 55, 245], [x + 18 + i * 55, 245], [x + 18 + i * 55, 285], [x + 8 + i * 55, 285]], '#6b4423', i);
    if (p.pax) { blob(x + p.w / 2, 190, 9, 9, '#e0b080', 3); poly([[x + p.w / 2 - 8, 198], [x + p.w / 2 + 8, 198], [x + p.w / 2 + 6, 225], [x + p.w / 2 - 6, 225]], '#2a7', 4); }
    text('PORT', x + p.w / 2, 232, 16, '#fff'); });
  c.obs.forEach(o => { const x = o.wx - s, y = LANES[o.lane] + Math.sin(t * 3 + o.wx) * 3;
    if (o.type === 'rock') poly([[x - 35, y + 20], [x - 25, y - 15], [x + 5, y - 28], [x + 35, y - 5], [x + 38, y + 20]], '#8d8d85', o.wx);
    if (o.type === 'fishpile') for (let i = 0; i < 4; i++) drawFish({ col: ['#c9d3d8', '#9fb4bf'][i % 2] }, x - 25 + i * 17, y + (i % 2) * 8 - 4, .8, i % 2 ? -1 : 1);
    if (o.type === 'plastic') { poly([[x - 22, y + 15], [x - 28, y - 10], [x - 5, y - 22], [x + 25, y - 8], [x + 20, y + 15]], '#cfe6f2', o.wx); text('~', x, y + 6, 20, '#5a8'); } });
  const by = c.y + Math.sin(t * 4) * 3, rot = c.vy * .0012 + Math.sin(t * 3) * .04;
  if (c.dead) {
    drawBrokenBoat(BX, by, rot, c.dead, c.pax);
  } else if (c.inv <= 0 || Math.floor(t * 15) % 2) drawBoat(BX, by, rot, c.pax);
  c.fx.forEach(f => { ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, 4, 0, 7); ctx.fill(); });
  ctx.fillStyle = '#3f9a45'; ctx.fillRect(0, 495, W, 45);
  for (let i = -1; i < 40; i++) { const x = i * 30 - (s * 1.2) % 30; poly([[x, 500], [x + 6, 480 - (i % 3) * 8], [x + 12, 500]], '#2e7d32', i); }
  for (let i = 0; i < 3; i++) text('♥', 30 + i * 36, 40, 36, i < c.hearts ? '#e33' : '#555');
  text('Score: ' + (Math.floor(s / 10) + c.bonus), 180, 38, 22, '#fff', 'left'); text('Distance: ' + Math.floor(s / 10) + ' m', 180, 66, 18, '#fff', 'left'); text('Speed level ' + c.level, 180, 92, 18, '#ffe45e', 'left');
  text('Passenger: ' + (c.pax ? 'ON BOARD' : 'none'), W - 20, 38, 20, c.pax ? '#ffe45e' : '#fff', 'right');
  if (!c.dead && inPortZone()) text(C.spd > C.cruise * .4 ? (isTouch ? 'Port! Hold SLOW' : 'Port! Hold A to slow down') : (isTouch ? 'Port! Tap F' : 'Port! Press F'), W / 2, 160, 24, '#ffe45e');
  if (c.msgT > 0) text(c.msg, W / 2, 130, 24, '#fff');
  text(isTouch ? 'Tap here: how to play' : 'H = how to play', W - 20, 64, 16, '#fff', 'right');
  if (c.help) drawHelp('How to Play - Career', careerHelpLines());
}
const RX = 480, RY = 500, RW = 380, RH = 290;
const BAR = { x: 40, y: 428, w: 880, h: 56 }, TILE = 48;
let F;
function startFishing(showHelp = false) { F = { ph: 'aim', ax: W / 2, ay: 300, tx: 0, ty: 0, timer: 0, lost: 0, caught: [], show: false, help: showHelp, msg: '', m: null }; mode = lastMode = 'fishing'; paused = false; }
function clampAim(x, y) {
  let dx = (x - RX) / RW, dy = Math.min((y - RY) / RH, -.15), d = Math.hypot(dx, dy); if (d > 1) { dx /= d; dy /= d; } return [RX + dx * RW, RY + dy * RH];
}
function cast() { if (F.ph !== 'aim' || F.show) return; [F.tx, F.ty] = clampAim(F.ax, F.ay); F.ph = 'cast'; F.timer = .5; }
function fishKey(k) { if (F.help) { F.help = false; return; } if (k === ' ') cast(); if (k === 'c') F.show = !F.show; if (k === 'h') F.help = true; }
function startMini() { const f = pickFish(), cw = RARITY_ZONE[f.rarity]; F.m = { fish: f, fp: .5, tgt: .5, ft: .6, cw, cp: .5 - cw / 2, cv: 0, prog: .35, time: 35 }; F.ph = 'mini'; }
function endFish(ok) {
  if (ok) { const f = F.m.fish; collection[f.name] = (collection[f.name] || 0) + 1; F.caught.push(f); F.msg = 'Caught ' + f.name + '!  (' + f.rarity + ')'; F.ph = 'caught'; }
  else { F.lost++; F.msg = 'The fish got away! Lost: ' + F.lost + '/3'; F.ph = 'lostmsg'; }
  F.timer = 2;
}
function updFishing(dt) {
  if (F.help) return;
  const k = keys;
  if (F.ph === 'aim') { if (k.arrowleft) F.ax -= 300 * dt; if (k.arrowright) F.ax += 300 * dt; if (k.arrowup) F.ay -= 300 * dt; if (k.arrowdown) F.ay += 300 * dt; }
  if (F.ph === 'cast') { F.timer -= dt; if (F.timer <= 0) { F.ph = 'wait'; F.timer = rnd(2, 5.5); } }
  else if (F.ph === 'wait') { F.timer -= dt; if (F.timer <= 0) { F.ph = 'bite'; F.timer = 1.1; } }
  else if (F.ph === 'bite') { F.timer -= dt; if (F.timer <= 0) startMini(); }
  else if (F.ph === 'mini') {
    const m = F.m, sp = RARITY_SPEED[m.fish.rarity];
    m.ft -= dt; if (m.ft <= 0) { m.tgt = rnd(0, 1); m.ft = rnd(.35, 1); }
    m.fp += Math.sign(m.tgt - m.fp) * Math.min(Math.abs(m.tgt - m.fp), sp * dt);
    const hold = mouse.down || k[' ']; m.cv += ((hold ? ZONE_SPEED : -ZONE_SPEED) - m.cv) * Math.min(1, 9 * dt);
    m.cp += m.cv * dt; if (m.cp < 0) { m.cp = 0; m.cv = 0; } if (m.cp > 1 - m.cw) { m.cp = 1 - m.cw; m.cv = 0; }
    const fx = (TILE / 2 + m.fp * (BAR.w - TILE)) / BAR.w, over = fx >= m.cp && fx <= m.cp + m.cw;
    m.prog += (over ? .44 : -.21) * dt; m.time -= dt;
    if (m.prog >= 1) endFish(true); else if (m.prog <= 0 || m.time <= 0) endFish(false);
  } else if (F.ph === 'caught' || F.ph === 'lostmsg') { F.timer -= dt; if (F.timer <= 0) { F.ph = F.lost >= 3 ? 'done' : 'aim'; mouse.down = false; } }
}
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function drawCatchBar(m) {
  const zx = BAR.x + m.cp * BAR.w, zw = m.cw * BAR.w, fx = BAR.x + TILE / 2 + m.fp * (BAR.w - TILE), my = BAR.y + BAR.h / 2;
  text(isTouch ? 'Hold your finger to go right, let go to go left!' : 'Hold click / Space to go right, release to go left!', W / 2, BAR.y - 22, 18, '#fff');
  rr(BAR.x - 8, BAR.y - 8, BAR.w + 16, BAR.h + 16, 16); ctx.fillStyle = '#0c0c0b'; ctx.fill();
  rr(BAR.x, BAR.y, BAR.w, BAR.h, 9); ctx.fillStyle = '#2d2c2a'; ctx.fill();
  ctx.fillStyle = 'rgba(190,190,190,.42)'; ctx.fillRect(zx, BAR.y + 3, zw, BAR.h - 6);
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.strokeRect(zx, BAR.y + 3, zw, BAR.h - 6);
  const dir = m.cv < 0 ? -1 : 1, tx = dir < 0 ? zx + 12 : zx + zw - 12;
  ctx.fillStyle = '#e8e8e8'; ctx.beginPath(); ctx.moveTo(tx + dir * 5, my); ctx.lineTo(tx - dir * 5, my - 7); ctx.lineTo(tx - dir * 5, my + 7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(28,92,150,.92)'; ctx.fillRect(fx - TILE / 2, my - TILE / 2, TILE, TILE);
  ctx.strokeStyle = '#3aa0ff'; ctx.lineWidth = 2; ctx.strokeRect(fx - TILE / 2, my - TILE / 2, TILE, TILE);
  drawFish(m.fish, fx, my, .6, m.tgt < m.fp ? -1 : 1);
  const py = BAR.y + BAR.h + 16;
  rr(BAR.x - 8, py, BAR.w + 16, 18, 8); ctx.fillStyle = '#183d1c'; ctx.fill(); ctx.strokeStyle = '#0c0c0b'; ctx.lineWidth = 3; ctx.stroke();
  const gg = ctx.createLinearGradient(0, py, 0, py + 18); gg.addColorStop(0, '#9be85a'); gg.addColorStop(1, '#3f9a2a');
  ctx.save(); rr(BAR.x - 8, py, BAR.w + 16, 18, 8); ctx.clip(); ctx.fillStyle = gg; ctx.fillRect(BAR.x - 8, py, (BAR.w + 16) * Math.max(0, Math.min(1, m.prog)), 18); ctx.restore();
}
function drawFishing() {
  ctx.fillStyle = '#f6d98a'; ctx.fillRect(0, 0, W, 190);
  ctx.fillStyle = '#6fb86a'; ctx.fillRect(0, 150, W, 40); for (let i = 0; i < 14; i++) palm(i * 75 + 20, 160, i);
  poly([[600, 195], [670, 195], [680, 180], [590, 180]], '#8a5a2b', 9);
  const g = ctx.createLinearGradient(0, 190, 0, H); g.addColorStop(0, '#5fc2b0'); g.addColorStop(1, '#2b7f8a'); ctx.fillStyle = g; ctx.fillRect(0, 190, W, 350);
  for (let r = 0; r < 8; r++) wave(210 + r * 40, 2 + r * .6, 1.5, 'rgba(255,255,255,.3)', r * 50);
  ctx.save(); ctx.setLineDash([10, 8]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(255,255,255,.1)';
  ctx.beginPath(); ctx.ellipse(RX, RY, RW, RH, 0, Math.PI, 2 * Math.PI); ctx.fill(); ctx.stroke(); ctx.restore();
  poly([[300, 545], [380, 480], [580, 480], [660, 545]], '#8a5a2b', 3);
  const [px, py] = F.ph === 'aim' ? clampAim(F.ax, F.ay) : [F.tx, F.ty];
  const tip = [560 + (px - 560) * .3, 500 + (py - 500) * .3];
  ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(580, 520); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
  let bx = px, by = py; if (F.ph === 'cast') { const q = 1 - F.timer / .5; bx = tip[0] + (px - tip[0]) * q; by = tip[1] + (py - tip[1]) * q - Math.sin(q * 3.14) * 60; }
  if (F.ph === 'aim') { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 10, 0, 7); ctx.stroke(); }
  else if (F.ph !== 'caught' && F.ph !== 'lostmsg') {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(bx, by); ctx.stroke();
    const dip = F.ph === 'bite' ? Math.sin(t * 40) * 6 + 6 : Math.sin(t * 3) * 2; blob(bx, by + dip, 6, 6, '#e33', 2);
  }
  if (F.ph === 'bite') text('!', W / 2 + Math.sin(t * 50) * 4, 200, 130, '#ffe45e');
  if (F.ph === 'mini') drawCatchBar(F.m);
  if (F.ph === 'aim') text(F.caught.length ? 'Cast again! Stay inside the dashed range.' : (isTouch ? 'Tap the water to cast.' : 'Aim with mouse or arrows, click / Space to cast.') + ' Dashed line = max range.', W / 2, 90, 18);
  if (F.ph === 'wait') text('Waiting for a bite...', W / 2, 90, 22);
  if (F.ph === 'caught' || F.ph === 'lostmsg') { text(F.msg, W / 2, 200, 30, F.ph === 'caught' ? '#ffe45e' : '#f88'); if (F.ph === 'caught') drawFish(F.m.fish, W / 2, 280, 2.5); }
  text('Caught: ' + F.caught.length, 20, 38, 22, '#fff', 'left'); text('Lost: ' + F.lost + '/3', 20, 66, 22, '#f88', 'left');
  text(isTouch ? 'Tap here: collection' : 'C = collection', W - 20, 38, 16, '#fff', 'right'); text(isTouch ? 'Tap here: how to play' : 'H = how to play', W - 20, 64, 16, '#fff', 'right');
  if (F.show || F.ph === 'done') drawCollection(F.ph === 'done');
  if (F.help) drawHelp('How to Play - Fishing', helpLines());
}
function helpLines() {
  return isTouch ? [
    'Tap the water inside the dashed range to cast your line.',
    'Wait for the bobber to dip - a fish is biting!',
    'Keep the fish inside the grey box on the bar.',
    'Hold your finger or the HOLD button to move the box right, let go to go left.',
    'The green bar fills while the fish is in the box and drains when it is out.',
    'Fill the green bar to catch the fish. Empty bar or time out = it gets away.',
    'Lose 3 fish and the game ends.',
    'Rarer fish move faster and the grey box gets smaller.',
    'Tap the top-right corner for the fish collection (30 to find) or this help.'
  ] : [
    'Aim with the mouse or arrow keys inside the dashed range.',
    'Click or press Space to cast your line.',
    'Wait for the bobber to dip - a fish is biting!',
    'Keep the fish inside the grey box on the bar.',
    'Hold click / Space to move the box right, release to move it left.',
    'The green bar fills while the fish is in the box and drains when it is out.',
    'Fill the green bar to catch the fish. Empty bar or time out = it gets away.',
    'Lose 3 fish and the game ends. Rarer fish are faster and the box is smaller.',
    'C = fish collection (30 to find), H = this help, P = pause, R = restart.'
  ];
}
function careerHelpLines() {
  return isTouch ? [
    'Sail your nouka down the river and dodge rocks, fish piles and plastic.',
    'UP and DOWN buttons (left side) change lane.',
    'Hold FAST to speed up, hold SLOW to slow down (right side).',
    'Every hit costs 1 heart. Lose all 3 hearts and your nouka sinks.',
    'Ports appear along the top bank - move to the top lane to reach them.',
    'Hold SLOW inside the port, then tap F to pick up your passenger.',
    'Take them to the next port and tap F again to deliver: +200 points.',
    'The further you sail, the higher your score and the faster the river flows.',
    'Tap the top-right corner to see this help again.'
  ] : [
    'Sail your nouka down the river and dodge rocks, fish piles and plastic.',
    'W / Up Arrow = move up a lane, S / Down Arrow = move down a lane.',
    'Hold D / Right Arrow to go faster, hold A / Left Arrow to slow down.',
    'Every hit costs 1 heart. Lose all 3 hearts and your nouka sinks.',
    'Ports appear along the top bank - move to the top lane to reach them.',
    'Slow down inside the port, then press F to pick up your passenger.',
    'Take them to the next port and press F again to deliver: +200 points.',
    'The further you sail, the higher your score and the faster the river flows.',
    'H = this help, P = pause, R = restart.'
  ];
}
function ink(s, x, y, size = 18, col = '#3a2410', al = 'left', mw) {
  ctx.font = `bold ${size}px Papyrus,"Palatino Linotype","Book Antiqua",Georgia,serif`; ctx.textAlign = al; ctx.fillStyle = col; ctx.fillText(s, x, y, mw);
}
function tornPath(x, y, w, h) {
  const r = i => { const v = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return v - Math.floor(v); };
  const pts = []; let i = 0;
  const edge = (len, f) => { for (let d = 0; d <= len; d += 16) { const a = 3 + r(i) * 6 + (r(i + 99) > .9 ? 9 : 0); pts.push(f(d, a)); i++; } };
  edge(w, (d, a) => [x + d, y + a]); edge(h, (d, a) => [x + w - a, y + d]); edge(w, (d, a) => [x + w - d, y + h - a]); edge(h, (d, a) => [x + a, y + h - d]);
  ctx.beginPath(); pts.forEach(([px, py], k) => k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath();
}
function drawMapMarks(x, y, w, h) {
  const cx = x + w - 62, cy = y + h - 58, bx = x + 66, by = y + h - 60;
  ctx.save(); ctx.strokeStyle = 'rgba(70,35,10,.75)'; ctx.fillStyle = 'rgba(120,40,20,.75)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 24, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 34); ctx.lineTo(cx + 7, cy); ctx.lineTo(cx, cy + 34); ctx.lineTo(cx - 7, cy); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - 34, cy); ctx.lineTo(cx, cy - 7); ctx.lineTo(cx + 34, cy); ctx.lineTo(cx, cy + 7); ctx.closePath(); ctx.stroke();
  ctx.setLineDash([4, 7]); ctx.beginPath(); ctx.moveTo(x + 220, y + h - 30); ctx.quadraticCurveTo(x + 160, y + h - 80, bx + 12, by + 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(150,30,20,.9)'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(bx - 10, by - 10); ctx.lineTo(bx + 10, by + 10); ctx.moveTo(bx + 10, by - 10); ctx.lineTo(bx - 10, by + 10); ctx.stroke();
  ctx.restore();
}
function drawParchment(x, y, w, h) {
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6; tornPath(x, y, w, h); ctx.fillStyle = '#e2c88f'; ctx.fill(); ctx.restore();
  ctx.save(); tornPath(x, y, w, h); ctx.clip();
  const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 40, x + w / 2, y + h / 2, w * .62);
  g.addColorStop(0, '#f3e1b3'); g.addColorStop(.7, '#e2c68a'); g.addColorStop(1, '#c79c58'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  for (let i = 0; i < 9; i++) {
    const cx = x + (Math.sin(i * 7.3) * .5 + .5) * w, cy = y + (Math.cos(i * 5.1) * .5 + .5) * h, rad = 40 + (i % 4) * 22, sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    sg.addColorStop(0, 'rgba(120,70,20,.22)'); sg.addColorStop(1, 'rgba(120,70,20,0)'); ctx.fillStyle = sg; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  ctx.strokeStyle = 'rgba(100,60,20,.2)'; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(x + w / 3, y); ctx.lineTo(x + w / 3 + 6, y + h); ctx.moveTo(x, y + h * .52); ctx.lineTo(x + w, y + h * .52 - 5); ctx.stroke();
  ctx.lineJoin = 'round'; tornPath(x, y, w, h); ctx.strokeStyle = 'rgba(90,45,12,.4)'; ctx.lineWidth = 26; ctx.stroke(); ctx.strokeStyle = 'rgba(60,30,8,.45)'; ctx.lineWidth = 10; ctx.stroke();
  ctx.restore();
  tornPath(x, y, w, h); ctx.strokeStyle = 'rgba(50,25,8,.9)'; ctx.lineWidth = 2; ctx.stroke();
  drawMapMarks(x, y, w, h);
}
function drawHelp(title, lines) {
  ctx.fillStyle = 'rgba(20,12,5,.88)'; ctx.fillRect(0, 0, W, H);
  drawParchment(30, 22, W - 60, H - 44);
  ink(title, W / 2, 84, 34, '#6b1f10', 'center');
  lines.forEach((l, i) => ink('\u2022 ' + l, 90, 135 + i * 36, 18, '#3a2410', 'left', 760));
  ink(isTouch ? 'Tap anywhere to start' : 'Press any key or click to start', W / 2, 490, 20, '#6b1f10', 'center');
}
function wrapName(s, max) {
  const lines = []; let cur = '';
  for (const w of s.split(' ')) { if (cur && (cur + ' ' + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
  lines.push(cur); return lines;
}
function drawCollection(final) {
  ctx.fillStyle = 'rgba(30,20,10,.88)'; ctx.fillRect(40, 30, W - 80, H - 60);
  text(final ? 'Fishing over! You caught ' + F.caught.length + ' fish' : 'Fish Collection (' + Object.keys(collection).length + '/30)', W / 2, 75, 28, '#ffe45e');
  FISH.forEach((f, i) => { const x = 110 + (i % 10) * 82, y = 140 + Math.floor(i / 10) * 100, got = collection[f.name];
    if (got) { drawFish(f, x, y, .8); const lines = wrapName(f.name, 11); lines.forEach((ln, j) => text(ln, x, y + 28 + j * 13, 12)); text(f.rarity[0] + ' x' + got, x, y + 30 + lines.length * 13, 11, '#ccc'); } else text('?', x, y + 8, 30, '#666'); });
  if (final) text('Press Restart (R) to fish again', W / 2, 470, 22);
}
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  keys[k] = true; isTouch = false; if (e.repeat) return;
  if (k === 'p') togglePause(); if (k === 'r') restart();
  if (mode === 'menu') { if (k === '1') startCareer(true); if (k === '2') startFishing(true); }
  else if (paused) return; else if (mode === 'career') careerKey(k); else if (mode === 'fishing') fishKey(k);
});
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
addEventListener('blur', () => { for (const k in keys) keys[k] = false; for (const id in padTouch) delete padTouch[id]; for (const id in padDown) { padDown[id].classList.remove('on'); delete padDown[id]; } mouse.down = false; });
function mpos(e) { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left - cv.clientLeft) * W / cv.clientWidth; mouse.y = (e.clientY - r.top - cv.clientTop) * H / cv.clientHeight; }
cv.addEventListener('mousemove', e => { isTouch = false; mpos(e); if (mode === 'fishing' && F.ph === 'aim') { F.ax = mouse.x; F.ay = mouse.y; } });
cv.addEventListener('mousedown', e => { mpos(e); mouse.down = true;
  if (mode === 'menu') { if (hit(MB1, mouse)) startCareer(true); if (hit(MB2, mouse)) startFishing(true); }
  else if (mode === 'fishing' && !paused) { if (F.help) F.help = false; else if (F.ph === 'aim') { F.ax = mouse.x; F.ay = mouse.y; cast(); } }
  else if (mode === 'career' && !paused) { if (C.help) C.help = false; } });
addEventListener('mouseup', () => mouse.down = false);
let isTouch = matchMedia('(pointer: coarse)').matches;
const PAD = { up: { x: 75, y: 335, r: 50, hold: false, label: 'UP' }, down: { x: 75, y: 445, r: 50, hold: false, label: 'DOWN' },
  slow: { x: 735, y: 445, r: 50, hold: true, label: 'SLOW' }, fast: { x: 855, y: 445, r: 50, hold: true, label: 'FAST' }, f: { x: 855, y: 335, r: 50, hold: false, label: 'F' } };
const padTouch = {}, padLit = {};
const padAt = p => Object.keys(PAD).find(n => Math.hypot(p.x - PAD[n].x, p.y - PAD[n].y) < PAD[n].r + 5);
const syncPad = () => { const v = Object.values(padTouch); keys.a = v.includes('slow'); keys.d = v.includes('fast'); };
function tpos(tc) { const r = cv.getBoundingClientRect(); return { x: (tc.clientX - r.left - cv.clientLeft) * W / cv.clientWidth, y: (tc.clientY - r.top - cv.clientTop) * H / cv.clientHeight }; }
cv.addEventListener('touchstart', e => { e.preventDefault(); isTouch = true;
  for (const tc of e.changedTouches) { const p = tpos(tc); mouse.x = p.x; mouse.y = p.y;
    if (mode === 'over' || (mode === 'fishing' && F.ph === 'done')) { restart(); continue; }
    if (mode === 'menu') { if (hit(MB1, p)) startCareer(true); else if (hit(MB2, p)) startFishing(true); }
    else if (mode === 'career' && !paused) { if (C.help) { C.help = false; continue; }
      if (p.x > W - 170 && p.y < 76) { C.help = true; continue; }
      if (padMode === 'career') continue;
      const n = padAt(p); if (!n) continue; padLit[n] = t + .15;
      if (PAD[n].hold) { padTouch[tc.identifier] = n; syncPad(); } else careerKey(n === 'up' ? 'w' : n === 'down' ? 's' : 'f'); }
    else if (mode === 'fishing' && !paused) { if (F.help) { F.help = false; continue; }
      if (p.x > W - 170 && p.y > 46 && p.y < 76 && !F.show) { F.help = true; continue; }
      if (F.show || (p.x > W - 170 && p.y < 46)) { F.show = !F.show; continue; }
      mouse.down = true; if (F.ph === 'aim') { F.ax = p.x; F.ay = p.y; cast(); } } } }, { passive: false });
cv.addEventListener('touchmove', e => { e.preventDefault();
  for (const tc of e.changedTouches) { const p = tpos(tc);
    if (mode === 'career') { if (tc.identifier in padTouch) { const n = padAt(p); if (n && PAD[n].hold) padTouch[tc.identifier] = n; else delete padTouch[tc.identifier]; syncPad(); } }
    else if (mode === 'fishing' && F.ph === 'aim') { F.ax = p.x; F.ay = p.y; } } }, { passive: false });
const touchEnd = e => { for (const tc of e.changedTouches) delete padTouch[tc.identifier]; syncPad(); if (!e.touches.length) mouse.down = false; };
cv.addEventListener('touchend', touchEnd); cv.addEventListener('touchcancel', touchEnd);
function drawTouchUI() {
  const held = Object.values(padTouch);
  for (const n in PAD) {
    const b = PAD[n], on = held.includes(n) || t < (padLit[n] || 0) || (n === 'f' && inPortZone());
    ctx.globalAlpha = on ? .8 : .45; ctx.fillStyle = on ? '#ffe45e' : '#fff'; ctx.strokeStyle = BROWN; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
    if (n === 'up' || n === 'down') { const d = n === 'up' ? -1 : 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(b.x, b.y + d * 20); ctx.lineTo(b.x - 22, b.y - d * 14); ctx.lineTo(b.x + 22, b.y - d * 14); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else text(b.label, b.x, b.y + (n === 'f' ? 11 : 7), n === 'f' ? 34 : 20, '#fff');
  }
}
const portraitQ = matchMedia('(orientation: portrait)');
let padMode = '';
const padDown = {};
function syncPadMode() {
  const m = isTouch && portraitQ.matches ? (mode === 'career' || mode === 'over' ? 'career' : mode === 'fishing' ? 'fishing' : '') : '';
  if (m === padMode) return;
  padMode = m; document.body.dataset.pad = m; keys.a = keys.d = false; mouse.down = false;
  for (const id in padDown) { padDown[id].classList.remove('on'); delete padDown[id]; }
}
function padPress(name, down) {
  if (mode === 'over' || (mode === 'fishing' && F.ph === 'done')) { if (down) restart(); return; }
  if (mode === 'career') {
    if (name === 'slow' || name === 'fast') { if (down && C.help) { C.help = false; return; } keys[name === 'slow' ? 'a' : 'd'] = down && !paused; return; }
    if (down && !paused) careerKey(name === 'up' ? 'w' : name === 'down' ? 's' : 'f');
  } else if (mode === 'fishing' && name === 'hold') {
    if (down && F.help) { F.help = false; return; }
    mouse.down = down && !paused;
  }
}
const padEl = document.getElementById('pad');
if (padEl) {
  padEl.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-btn]'); if (!b) return;
    e.preventDefault(); padDown[e.pointerId] = b; b.classList.add('on');
    try { b.setPointerCapture(e.pointerId); } catch (err) { }
    padPress(b.dataset.btn, true);
  });
  const release = e => { const b = padDown[e.pointerId]; if (!b) return; delete padDown[e.pointerId]; b.classList.remove('on'); padPress(b.dataset.btn, false); };
  padEl.addEventListener('pointerup', release); padEl.addEventListener('pointercancel', release);
  padEl.addEventListener('contextmenu', e => e.preventDefault());
}
function togglePause() { if (mode === 'career' || mode === 'fishing') paused = !paused; }
function restart() { if (mode === 'menu') return; if (lastMode === 'career') startCareer(); else if (lastMode === 'fishing') startFishing(); }
const bind = (id, fn) => { document.getElementById(id).onclick = e => { fn(); e.currentTarget.blur(); }; };
bind('pauseBtn', togglePause); bind('restartBtn', restart); bind('menuBtn', () => { mode = 'menu'; paused = false; });
const MB1 = { x: 300, y: 280, w: 360, h: 60 }, MB2 = { x: 300, y: 360, w: 360, h: 60 };
function drawMenu() {
  ctx.fillStyle = '#f6d98a'; ctx.fillRect(0, 0, W, 250); ctx.fillStyle = '#4fb3a6'; ctx.fillRect(0, 250, W, 290);
  for (let r = 0; r < 6; r++) wave(270 + r * 45, 4, 2, 'rgba(255,255,255,.35)', r * 40);
  drawBoat(W / 2, 230 + Math.sin(t * 3) * 6, Math.sin(t * 2) * .05, false);
  text('BOUNCEBACK NOUKA', W / 2, 120, 64, '#ffe45e');
  button('Career Mode (1)', MB1.x, MB1.y, MB1.w, MB1.h); button('Fishing Mode (2)', MB2.x, MB2.y, MB2.w, MB2.h);
  text('Nouka is what people in Bengal call a boat', W / 2, 455, 20, '#fff');
  text('Local River Life', W / 2, 490, 18);
}
let last = 0;
function loop(ms) {
  fitCanvas(); syncPadMode();
  const dt = Math.min(.05, (ms - last) / 1000); last = ms; t += dt;
  if (!paused) { if (mode === 'career' || mode === 'over') updCareer(dt); else if (mode === 'fishing') updFishing(dt); }
  ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (mode === 'menu') drawMenu(); else if (mode === 'fishing') drawFishing(); else drawCareer();
  if (isTouch && padMode !== 'career' && mode === 'career' && C && !C.dead && !C.help && !paused) drawTouchUI();
  if (mode === 'over') { ctx.fillStyle = 'rgba(30,20,10,.8)'; ctx.fillRect(0, 0, W, H);
    text('Your nouka sank!', W / 2, 220, 52, '#f88'); text('Score ' + (Math.floor(C.scroll / 10) + C.bonus) + '   Distance ' + Math.floor(C.scroll / 10) + ' m', W / 2, 280, 26);
    text(isTouch ? 'Tap to restart' : 'Press Restart (R)', W / 2, 340, 22); }
  if (paused) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H); text('PAUSED', W / 2, H / 2, 60); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
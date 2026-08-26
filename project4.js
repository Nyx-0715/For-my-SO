/* =========================================================================
   I LOVE YOU SAYANG — reveal clone
   Layers: matrix rain (canvas) -> bokeh transition (canvas) ->
           LED countdown / word text (DOM) -> particle heart (canvas, bloom)
   ========================================================================= */

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

/* ============================== DPI / RESIZE HELPERS ==================== */
function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/* =========================================================================
   1. MATRIX / DIGITAL LOVE-RAIN BACKGROUND
   ========================================================================= */
const rainCanvas = document.getElementById('rainCanvas');
let rainCtx, rainW, rainH;
const GLYPHS = ['l', 'o', 'v', 'e', 'L', 'O', 'V', 'E', '\u2665', '\u2764', 'I'];
const FONT_SIZE = 16;
let columns = 0;
let drops = [];
let rainOpacity = 0; // fades in at start, dims a touch behind text, stays on always

function setupRain() {
  const fit = fitCanvas(rainCanvas);
  rainCtx = fit.ctx;
  rainW = fit.w;
  rainH = fit.h;
  columns = Math.ceil(rainW / FONT_SIZE);
  drops = new Array(columns).fill(0).map(() => Math.random() * -rainH / FONT_SIZE);
}
setupRain();
window.addEventListener('resize', setupRain);

function drawRain() {
  // translucent black wash creates the trailing streak look
  rainCtx.fillStyle = `rgba(5,6,10,${0.14})`;
  rainCtx.fillRect(0, 0, rainW, rainH);

  rainCtx.font = `${FONT_SIZE}px monospace`;
  rainCtx.textBaseline = 'top';

  for (let i = 0; i < columns; i++) {
    const glyph = GLYPHS[(Math.random() * GLYPHS.length) | 0];
    const isHeart = glyph === '\u2665' || glyph === '\u2764';
    const alpha = (isHeart ? 0.9 : 0.4 + Math.random() * 0.3) * rainOpacity;

    rainCtx.fillStyle = isHeart
      ? `rgba(255,79,159,${alpha})`
      : `rgba(255,140,190,${alpha})`;

    rainCtx.fillText(glyph, i * FONT_SIZE, drops[i] * FONT_SIZE);

    if (drops[i] * FONT_SIZE > rainH && Math.random() > 0.975) {
      drops[i] = 0;
    }
    drops[i] += 0.9;
  }
  requestAnimationFrame(drawRain);
}
drawRain();

/* =========================================================================
   2. BOKEH / DEFOCUS TRANSITION BLOBS
   ========================================================================= */
const bokehCanvas = document.getElementById('bokehCanvas');
let bokehCtx, bokehW, bokehH;
let bokehBlobs = [];

function setupBokeh() {
  const fit = fitCanvas(bokehCanvas);
  bokehCtx = fit.ctx;
  bokehW = fit.w;
  bokehH = fit.h;
}
setupBokeh();
window.addEventListener('resize', setupBokeh);

function spawnBokeh(count = 14) {
  bokehBlobs = new Array(count).fill(0).map(() => ({
    x: Math.random() * bokehW,
    y: Math.random() * bokehH,
    r: 18 + Math.random() * 46,
    vy: -0.15 - Math.random() * 0.35,
    vx: (Math.random() - 0.5) * 0.3,
    a: 0.08 + Math.random() * 0.18
  }));
}

let bokehRunning = false;
function drawBokeh() {
  if (!bokehRunning) return;
  bokehCtx.clearRect(0, 0, bokehW, bokehH);
  for (const b of bokehBlobs) {
    b.x += b.vx;
    b.y += b.vy;
    const g = bokehCtx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, `rgba(255,240,214,${b.a})`);
    g.addColorStop(1, 'rgba(255,240,214,0)');
    bokehCtx.fillStyle = g;
    bokehCtx.beginPath();
    bokehCtx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    bokehCtx.fill();
    if (b.y < -b.r) b.y = bokehH + b.r;
  }
  requestAnimationFrame(drawBokeh);
}

async function showBokeh(durationMs) {
  spawnBokeh();
  bokehRunning = true;
  bokehCanvas.classList.add('show');
  drawBokeh();
  await wait(durationMs);
  bokehCanvas.classList.remove('show');
  await wait(600);
  bokehRunning = false;
}

/* =========================================================================
   3. LED / DOT-MATRIX TEXT SEQUENCE (countdown + words)
   ========================================================================= */
const countdownEl = document.getElementById('countdown');
const wordStage = document.getElementById('wordStage');

async function showLedText(container, text, holdMs) {
  container.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'ledText';
  el.textContent = text;

  const spark = document.createElement('div');
  spark.className = 'spark';
  el.appendChild(spark);

  container.appendChild(el);
  void el.offsetWidth; // reflow to restart animation
  el.classList.add('pop');
  void spark.offsetWidth;
  spark.classList.add('show');

  await wait(holdMs);
  el.classList.remove('pop');
  el.classList.add('fadeOut');
  await wait(400);
}

async function runCountdown() {
  countdownEl.style.display = 'flex';
  const nums = ['3', '2', '1'];
  for (const n of nums) {
    await showLedText(countdownEl, n, 650);
  }
  countdownEl.innerHTML = '';
  countdownEl.style.display = 'none';
}

async function runWords() {
  wordStage.style.display = 'flex';
  const words = ['You', 'Are', 'My', 'Love'];
  for (const w of words) {
    await showLedText(wordStage, w, 700);
  }
  wordStage.innerHTML = '';
  wordStage.style.display = 'none';
}

/* =========================================================================
   4. PARTICLE HEART (thousands of glowing points, bloom via blurred layer)
   ========================================================================= */
const heartCanvas = document.getElementById('heartCanvas');
const glowCanvas = document.getElementById('heartGlowCanvas');
let hCtx, gCtx, hW, hH;

function setupHeartCanvases() {
  const f1 = fitCanvas(heartCanvas);
  hCtx = f1.ctx; hW = f1.w; hH = f1.h;
  const f2 = fitCanvas(glowCanvas);
  gCtx = f2.ctx;
}
setupHeartCanvases();
window.addEventListener('resize', setupHeartCanvases);

const PARTICLE_COUNT = 1800;
let particles = [];

// parametric heart curve -> returns {x, y} in a -18..18 unit box
function heartPoint(t) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  return { x, y };
}

function buildParticles() {
  particles = [];
  const cx = hW / 2;
  const cy = hH / 2;
  const scale = Math.min(hW, hH) * 0.021; // heart occupies ~ 75% of the shorter side

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const t = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.01;
    const base = heartPoint(t);

    // fluffy stroke: jitter radially around the curve so the heart looks
    // like it's made of many soft clustered dots, not a thin hard line
    const jitter = (Math.random() - 0.5) * 3.4 * (0.4 + Math.random());
    const normalAngle = t + Math.PI / 2;
    const tx = cx + (base.x + Math.cos(normalAngle) * jitter) * scale;
    const ty = cy + (base.y + Math.sin(normalAngle) * jitter) * scale;

    particles.push({
      // start scattered across the screen, will ease into target
      x: cx + (Math.random() - 0.5) * hW * 1.3,
      y: cy + (Math.random() - 0.5) * hH * 1.3,
      tx, ty,
      size: 1.1 + Math.random() * 2.4,
      floatPhase: Math.random() * Math.PI * 2,
      floatSpeed: 0.6 + Math.random() * 0.8,
      delay: (i / PARTICLE_COUNT) * 900 + Math.random() * 300,
      startTime: null,
      settled: false,
      hue: Math.random() < 0.15 ? 330 : 328 // mostly neon pink, few deeper magenta
    });
  }
}

let heartAnimStart = null;
let heartRunning = false;
const HEART_FORM_MS = 1600;

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function drawHeartFrame(now) {
  if (!heartRunning) return;
  if (heartAnimStart === null) heartAnimStart = now;
  const elapsed = now - heartAnimStart;

  hCtx.clearRect(0, 0, hW, hH);
  gCtx.clearRect(0, 0, hW, hH);
  hCtx.globalCompositeOperation = 'lighter';
  gCtx.globalCompositeOperation = 'lighter';

  const t = now * 0.001;

  for (const p of particles) {
    const localElapsed = elapsed - p.delay;
    let px, py, alpha;

    if (localElapsed <= 0) {
      // not yet started: keep at scattered start point, invisible
      px = p.x; py = p.y; alpha = 0;
    } else {
      const progress = Math.min(1, localElapsed / HEART_FORM_MS);
      const eased = easeOutCubic(progress);
      px = p.x + (p.tx - p.x) * eased;
      py = p.y + (p.ty - p.y) * eased;
      alpha = eased;

      if (progress >= 1) {
        p.settled = true;
        // gentle continuous floating once settled
        px = p.tx + Math.sin(t * p.floatSpeed + p.floatPhase) * 1.6;
        py = p.ty + Math.cos(t * p.floatSpeed * 0.8 + p.floatPhase) * 1.6;
      }
    }

    // pulsing glow brightness
    const pulse = 0.65 + 0.35 * Math.sin(t * 1.8 + p.floatPhase);
    const finalAlpha = alpha * pulse;
    if (finalAlpha <= 0.01) continue;

    const color = `hsla(${p.hue}, 100%, ${p.settled ? 68 : 78}%, ${finalAlpha})`;

    hCtx.beginPath();
    hCtx.fillStyle = color;
    hCtx.arc(px, py, p.size, 0, Math.PI * 2);
    hCtx.fill();

    // larger soft copy on the blurred glow canvas = bloom
    gCtx.beginPath();
    gCtx.fillStyle = color;
    gCtx.arc(px, py, p.size * 3.2, 0, Math.PI * 2);
    gCtx.fill();
  }

  requestAnimationFrame(drawHeartFrame);
}

async function showHeart() {
  buildParticles();
  heartAnimStart = null;
  heartRunning = true;
  heartCanvas.classList.add('show');
  glowCanvas.classList.add('show');
  requestAnimationFrame(drawHeartFrame);
}

function hideHeart() {
  heartRunning = false;
  heartCanvas.classList.remove('show');
  glowCanvas.classList.remove('show');
  hCtx && hCtx.clearRect(0, 0, hW, hH);
  gCtx && gCtx.clearRect(0, 0, hW, hH);
}

/* =========================================================================
   5. MASTER SEQUENCE
   ========================================================================= */
const centerCaption = document.getElementById('centerCaption');

async function playSequence() {
  // ---- reset everything ----
  hideHeart();
  centerCaption.classList.remove('show');
  countdownEl.innerHTML = '';
  wordStage.innerHTML = '';
  countdownEl.style.display = 'none';
  wordStage.style.display = 'none';
  rainOpacity = 0;

  // rain fades up first (matches the opening build-up in the reference)
  const rainRamp = setInterval(() => {
    rainOpacity = Math.min(1, rainOpacity + 0.05);
    if (rainOpacity >= 1) clearInterval(rainRamp);
  }, 40);
  await wait(1400);

  // ---- 3, 2, 1 ----
  await runCountdown();

  // ---- transition curtain ----
  await showBokeh(1300);

  // ---- You / Are / My / Love ----
  await runWords();

  // ---- transition curtain ----
  await showBokeh(1300);

  // dim the rain slightly so the heart pops, matching the reference mood
  const dim = setInterval(() => {
    rainOpacity = Math.max(0.55, rainOpacity - 0.03);
    if (rainOpacity <= 0.55) clearInterval(dim);
  }, 40);

  // ---- caption + heart ----
  centerCaption.classList.add('show');
  await wait(500);
  await showHeart();
}

playSequence();
document.body.addEventListener('click', playSequence);
document.body.addEventListener('touchstart', playSequence, { passive: true });
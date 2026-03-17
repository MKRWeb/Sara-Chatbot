/* ═══════════════════════════════════════════════════════════════════
   SARA — Full Engine
═══════════════════════════════════════════════════════════════════ */
'use strict';

/* ... (Keep all your existing Spring Physics, Cursor, and Three.js Setup code) ... */

/* ─────────────────────────────────────────────
   2D CANVAS PARTICLE FIELD
   Used for home and chat backgrounds
───────────────────────────────────────────── */
function makeParticleField(canvasId, cfg = {}) {
  const cv  = document.getElementById(canvasId);
  if (!cv) return;
  const ctx = cv.getContext('2d');
  
  // Dynamically pull the light green RGB from CSS variables
  const rootColor = getComputedStyle(document.documentElement).getPropertyValue('--green-light-rgb').trim() || '74,138,80';

  const c   = Object.assign({
    count: 48, speed: .24, size: 1.2, opacity: .28,
    color: rootColor, connected: true, dist: 115
  }, cfg);

  let W = 0, H = 0;
  const pts = [];

  function resize() {
    W = cv.width  = cv.offsetWidth  || window.innerWidth;
    H = cv.height = cv.offsetHeight || window.innerHeight;
  }
  resize();
  new ResizeObserver(resize).observe(cv);

  for (let i = 0; i < c.count; i++) {
    pts.push({
      x:  rand(0, W || 800),  y: rand(0, H || 600),
      vx: (Math.random() - .5) * c.speed,
      vy: (Math.random() - .5) * c.speed,
      r:  .4 + Math.random() * c.size,
      o:  .06 + Math.random() * c.opacity
    });
  }

  ;(function draw() {
    requestAnimationFrame(draw);
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; else if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; else if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c.color},${p.o})`;
      ctx.fill();
      if (c.connected) {
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < c.dist) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(${c.color},${(1 - d/c.dist)*.07})`;
            ctx.lineWidth = .5; ctx.stroke();
          }
        }
      }
    }
  })();
}

/* ─────────────────────────────────────────────
   SARA HOME
───────────────────────────────────────────── */
function showSaraHome() {
  const home = document.getElementById('sara-home');
  if (!home) return;

  home.classList.remove('phase-off', 'phase-in', 'phase-flex');
  home.style.display  = 'flex';
  home.style.opacity  = '0';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      home.style.transition = 'opacity 1s ease';
      home.style.opacity    = '1';
    });
  });

  // Init particle field (removed hardcoded color so it uses fallback)
  makeParticleField('home-canvas', {
    count: 42, speed: .18, opacity: .22,
    connected: true, dist: 125
  });
}

// ... sayHelloBtn logic remains ...

/* ─────────────────────────────────────────────
   CHAT
───────────────────────────────────────────── */
let isChatting = false, chipsOn = true, chatInit = false;

function openChat() {
  isChatting = true;
  const cw = document.getElementById('chat-wrap');
  if (!cw) return;

  cw.classList.remove('phase-off', 'phase-in', 'phase-flex');
  cw.style.display = 'flex';
  cw.style.opacity = '0';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      cw.style.transition = 'opacity .7s ease';
      cw.style.opacity    = '1';
    });
  });

  if (!chatInit) {
    // Init particle field (removed hardcoded color so it uses fallback)
    makeParticleField('chat-canvas', {
      count: 36, speed: .2, opacity: .18,
      connected: true, dist: 105
    });
    chatInit = true;
  }

  setWave(true);
  setTimeout(() => {
    setWave(false);
    typeBot("Hi there 🌿 I'm Sara. This is your quiet space — no rush, no judgment. What's been on your mind lately?");
  }, 1500);
}

/* ... (Keep the rest of your Chat, Status, Mood, Input, and Farewell logic exactly the same) ... */

/* ─────────────────────────────────────────────
   BOOT
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.w').forEach(w => {
    w.style.transform = 'translateY(108%)';
    w.style.opacity   = '0';
  });
  setTimeout(runIntroSequence, 220);
});
             

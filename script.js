/* ═══════════════════════════════════════════════════════════
   SARA — ULTRA MODERN SCRIPT
   • Intro: strict sequencer — one sentence at a time, ZERO overlap
   • Particle system: lightweight canvas, no Three.js needed
   • Chat: typewriter, mood detection, burst particles, voice wave
═══════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────
   CUSTOM CURSOR
───────────────────────────────────────── */
(function initCursor() {
  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;
  let mx = -100, my = -100, rx = -100, ry = -100;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  dot.style.cssText += 'position:fixed;z-index:9999;pointer-events:none;';
  (function moveCursor() {
    dot.style.left  = mx + 'px';
    dot.style.top   = my + 'px';
    rx += (mx - rx) * 0.1;
    ry += (my - ry) * 0.1;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(moveCursor);
  })();
})();

/* ─────────────────────────────────────────
   LIGHTWEIGHT PARTICLE SYSTEM
   Works on any canvas element
───────────────────────────────────────── */
function createParticleField(canvas, opts) {
  opts = Object.assign({
    count: 60, speed: 0.3, size: 1.2, opacity: 0.35,
    color: '90,158,111', connected: true, connectDist: 110
  }, opts);

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  const particles = [];

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  for (let i = 0; i < opts.count; i++) {
    particles.push({
      x:  Math.random() * W,
      y:  Math.random() * H,
      vx: (Math.random() - 0.5) * opts.speed,
      vy: (Math.random() - 0.5) * opts.speed,
      r:  0.4 + Math.random() * opts.size,
      o:  0.1 + Math.random() * opts.opacity
    });
  }

  let alive = true;
  (function draw() {
    if (!alive) return;
    requestAnimationFrame(draw);
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${opts.color},${p.o})`;
      ctx.fill();

      if (opts.connected) {
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < opts.connectDist) {
            const alpha = (1 - d / opts.connectDist) * 0.08;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(${opts.color},${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }
  })();

  return { stop: () => { alive = false; } };
}

/* ─────────────────────────────────────────
   PHASE 1 — CINEMATIC INTRO SEQUENCER
   ★ SINGLE element, strict state machine
     → ZERO overlap, ZERO 90s stacking
───────────────────────────────────────── */
(function initIntro() {

  /* ── Sentences ── */
  const SENTENCES = [
    'When the world gets<br><em>a little too loud.</em>',
    'And you just need<br>someone to listen.',
    'No judgment.<br><em>No pressure.</em>',
    'A quiet place,<br>made just for you.',
    'Meet <em>Sara.</em>',
  ];

  /* ── Timing per sentence (ms) ── */
  const HOLD    = 2200;   // time sentence is fully visible
  const IN_DUR  = 700;    // CSS transition in
  const OUT_DUR = 450;    // CSS transition out
  const GAP     = 120;    // silence between sentences
  const TOTAL_INTRO_MS = SENTENCES.length * (IN_DUR + HOLD + OUT_DUR + GAP) + 600;

  const screen   = document.getElementById('intro-screen');
  const textEl   = document.getElementById('sentence-text');
  const barFill  = document.getElementById('intro-bar-fill');
  const canvas   = document.getElementById('intro-canvas');

  if (!screen || !textEl) return;

  /* Start particle field */
  createParticleField(canvas, {
    count:50, speed:0.25, size:1, opacity:0.3,
    color:'90,158,111', connected:true, connectDist:100
  });

  /* ── State machine ── */
  let currentIndex = -1;
  let sequenceDone = false;

  function showSentence(index) {
    if (sequenceDone) return;
    currentIndex = index;

    /* Update text BEFORE any class — element is currently opacity:0 */
    textEl.innerHTML = SENTENCES[index];
    textEl.classList.remove('visible', 'exiting');

    /* Force reflow so transition fires */
    void textEl.offsetWidth;

    /* Fade IN */
    textEl.classList.add('visible');

    /* Update progress bar */
    const pct = ((index + 1) / SENTENCES.length) * 100;
    barFill.style.width = pct + '%';

    /* Schedule EXIT */
    setTimeout(() => {
      if (sequenceDone) return;
      /* Fade OUT */
      textEl.classList.remove('visible');
      textEl.classList.add('exiting');

      /* After exit finishes, either show next or end */
      setTimeout(() => {
        textEl.classList.remove('exiting');

        if (index + 1 < SENTENCES.length) {
          setTimeout(() => showSentence(index + 1), GAP);
        } else {
          /* All sentences done → transition to home */
          sequenceDone = true;
          setTimeout(transitionToHome, 400);
        }
      }, OUT_DUR);

    }, HOLD);
  }

  /* Kick off */
  setTimeout(() => showSentence(0), 600);

  /* ── Transition to Sara Home ── */
  function transitionToHome() {
    /* Fade out intro screen */
    screen.style.transition = 'opacity 0.9s ease';
    screen.style.opacity = '0';
    screen.style.pointerEvents = 'none';

    setTimeout(() => {
      screen.style.display = 'none';
      showSaraHome();
    }, 900);
  }

})();

/* ─────────────────────────────────────────
   PHASE 2 — SARA HOME
───────────────────────────────────────── */
function showSaraHome() {
  const home = document.getElementById('sara-home');
  if (!home) return;
  home.classList.remove('hidden');
  home.style.opacity = '0';

  /* Start home particles */
  const hCanvas = document.getElementById('home-canvas');
  if (hCanvas) {
    createParticleField(hCanvas, {
      count:40, speed:0.18, size:1.1, opacity:0.25,
      color:'90,158,111', connected:true, connectDist:120
    });
  }

  requestAnimationFrame(() => {
    home.style.transition = 'opacity 1s ease';
    home.style.opacity = '1';
  });
}

/* ─────────────────────────────────────────
   SARA HOME → CHAT BUTTON
───────────────────────────────────────── */
const sayHelloBtn = document.getElementById('say-hello-btn');
if (sayHelloBtn) {
  sayHelloBtn.addEventListener('click', () => {
    const home = document.getElementById('sara-home');
    if (home) {
      home.style.transition = 'opacity 0.6s ease';
      home.style.opacity    = '0';
      home.style.pointerEvents = 'none';
    }
    setTimeout(() => {
      if (home) home.classList.add('hidden');
      history.pushState({ page:'chat' }, 'Chat', '#chat');
      showChat();
    }, 600);
  });
}

/* ─────────────────────────────────────────
   PHASE 3 — CHAT
───────────────────────────────────────── */
let isChatting   = false;
let chatStarted  = false;
let chipsVisible = true;

function showChat() {
  isChatting = true;
  const ci = document.getElementById('chat-interface');
  if (!ci) return;

  ci.classList.remove('hidden');
  ci.style.opacity = '0';
  requestAnimationFrame(() => {
    ci.style.transition = 'opacity 0.7s ease';
    ci.style.opacity    = '1';
  });

  /* Start chat particles */
  const cCanvas = document.getElementById('chat-canvas');
  if (cCanvas && !chatStarted) {
    createParticleField(cCanvas, {
      count:35, speed:0.2, size:1, opacity:0.2,
      color:'90,158,111', connected:true, connectDist:100
    });
    chatStarted = true;
  }

  /* Sara intro message */
  setSaraThinking(true);
  setTimeout(() => {
    setSaraThinking(false);
    appendBotTyped("Hi there 🌿 I'm Sara. This is your quiet space — no rush, no judgment. What's been on your mind lately?");
  }, 1400);
}

/* ── Status helpers ── */
const statusLabel = document.getElementById('ch-status-label');
const thinkingWave = document.getElementById('thinking-wave');

function setSaraListening() {
  if (statusLabel) statusLabel.textContent = 'Listening';
  setSaraThinking(false);
}
function setSaraThinking(on) {
  if (!thinkingWave) return;
  if (on) {
    thinkingWave.classList.remove('hidden-wave');
    thinkingWave.classList.add('visible-wave');
    if (statusLabel) statusLabel.textContent = 'Thinking…';
    const m = document.getElementById('messages-area');
    if (m) setTimeout(() => { m.scrollTop = m.scrollHeight; }, 50);
  } else {
    thinkingWave.classList.add('hidden-wave');
    thinkingWave.classList.remove('visible-wave');
  }
}
function setSaraWriting() {
  if (statusLabel) statusLabel.textContent = 'Writing…';
}

/* ── Mood detection ── */
const MOODS = [
  { words:['anxi','panic','scare','fear','worr'],       icon:'🌧', label:'Tender',    hue:'210,140,100' },
  { words:['sad','cry','depress','lonely','alone','empty'], icon:'🌙', label:'Gentle',    hue:'160,170,210' },
  { words:['ang','mad','furi','frustrat','annoy'],      icon:'🔥', label:'Heated',    hue:'210,120,80'  },
  { words:['happ','joy','excit','grat','thank','amaz'], icon:'🌻', label:'Warm',      hue:'200,170,80'  },
  { words:['tired','exhaust','sleep','drain'],          icon:'🍃', label:'Resting',   hue:'100,160,120' },
  { words:['overthink','stress','overwhelm'],           icon:'🌀', label:'Swirling',  hue:'140,120,200' },
  { words:['love','miss','heart'],                      icon:'🌸', label:'Tender',    hue:'210,150,160' },
];

function detectMood(text) {
  const t = text.toLowerCase();
  for (const m of MOODS) {
    if (m.words.some(w => t.includes(w))) return m;
  }
  return { icon:'🌿', label:'Calm', hue:'90,158,111' };
}

function applyMood(mood) {
  const icon = document.getElementById('mood-icon');
  const word = document.getElementById('mood-word');
  if (icon) { icon.style.transform = 'scale(1.5)'; icon.textContent = mood.icon; setTimeout(() => icon.style.transform = '', 400); }
  if (word) word.textContent = mood.label;
}

/* ── Particle burst ── */
function spawnBurst(x, y) {
  const colors = ['#5a9e6f','#a8d4b0','#c8f0d0','#ffffff','#b8e8c0'];
  for (let i = 0; i < 12; i++) {
    const el = document.createElement('div');
    el.className = 'p-burst';
    const size  = 3 + Math.random() * 5;
    const angle = (i / 12) * Math.PI * 2;
    const dist  = 35 + Math.random() * 45;
    el.style.cssText = `
      left:${x}px; top:${y}px;
      width:${size}px; height:${size}px;
      background:${colors[i % colors.length]};
      --tx:${Math.cos(angle)*dist}px;
      --ty:${Math.sin(angle)*dist}px;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }
}

/* ── Timestamp ── */
function nowTime() {
  const d = new Date();
  return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
}

/* ── Append message (instant) ── */
function appendMessage(who, text) {
  const area = document.getElementById('messages-area');
  if (!area) return;

  const wrap = document.createElement('div');
  wrap.className = `msg ${who}`;

  const content = document.createElement('span');
  content.textContent = text;
  wrap.appendChild(content);

  const ts = document.createElement('span');
  ts.className = 'msg-ts';
  ts.textContent = nowTime();
  wrap.appendChild(ts);

  /* Reaction shelf */
  const reacts = document.createElement('div');
  reacts.className = 'msg-reactions';
  ['🌿','💚','🤍','✨'].forEach(e => {
    const b = document.createElement('button');
    b.className = 'react-btn'; b.textContent = e;
    b.onclick = () => { b.style.transform = 'scale(1.6)'; setTimeout(() => b.style.transform = '', 300); };
    reacts.appendChild(b);
  });
  wrap.appendChild(reacts);

  area.appendChild(wrap);
  smartScroll(area);
}

/* ── Typewriter append (bot only) ── */
function appendBotTyped(fullText) {
  const area = document.getElementById('messages-area');
  if (!area) return;

  setSaraWriting();

  const wrap = document.createElement('div');
  wrap.className = 'msg bot';

  const content = document.createElement('span');
  wrap.appendChild(content);

  const ts = document.createElement('span');
  ts.className = 'msg-ts';
  wrap.appendChild(ts);

  const reacts = document.createElement('div');
  reacts.className = 'msg-reactions';
  ['🌿','💚','🤍','✨'].forEach(e => {
    const b = document.createElement('button');
    b.className = 'react-btn'; b.textContent = e;
    b.onclick = () => { b.style.transform = 'scale(1.6)'; setTimeout(() => b.style.transform = '', 300); };
    reacts.appendChild(b);
  });
  wrap.appendChild(reacts);

  area.appendChild(wrap);
  smartScroll(area);

  /* Typewriter loop */
  let i = 0;
  const speed = Math.max(16, Math.min(32, 2200 / fullText.length));
  function type() {
    if (i < fullText.length) {
      content.textContent += fullText[i++];
      smartScroll(area);
      setTimeout(type, speed);
    } else {
      ts.textContent = nowTime();
      setSaraListening();
    }
  }
  type();
}

function smartScroll(area) {
  const nearBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 100;
  if (nearBottom) area.scrollTop = area.scrollHeight;
}

/* ── Send handler ── */
const chatInput = document.getElementById('chat-input');
const sendBtn   = document.getElementById('send-btn');

async function handleSend() {
  if (!chatInput) return;
  const text = chatInput.value.trim();
  if (!text) return;

  /* Detect mood */
  const mood = detectMood(text);
  applyMood(mood);

  /* User message */
  appendMessage('user', text);
  chatInput.value = '';
  chatInput.style.height = 'auto';

  /* Enable/disable send */
  sendBtn.disabled = true;

  /* Collapse mood chips after first real send */
  if (chipsVisible) {
    const chips = document.getElementById('mood-chips');
    if (chips) chips.classList.add('collapsed');
    chipsVisible = false;
  }

  /* Burst + button animation */
  const btnRect = sendBtn.getBoundingClientRect();
  spawnBurst(btnRect.left + btnRect.width/2, btnRect.top + btnRect.height/2);
  sendBtn.classList.add('fired');
  setTimeout(() => sendBtn.classList.remove('fired'), 450);

  /* Show Sara thinking */
  setSaraThinking(true);

  try {
    const sys = "You are Sara. You are a romantic, sweet, deeply empathetic, and completely non-judgmental listener. Keep your responses brief (2-3 sentences max), conversational, and comforting. Speak like a gentle human friend, not an AI. Never use bullet points or lists.";
    const url = `https://text.pollinations.ai/prompt/${encodeURIComponent(sys + ' The user says: "' + text + '"')}`;
    const res = await fetch(url);
    const ai  = await res.text();

    setSaraThinking(false);
    setTimeout(() => appendBotTyped(ai.trim()), 280);

  } catch {
    setSaraThinking(false);
    appendBotTyped("I'm still right here 🌿 The connection flickered but my presence didn't.");
  }
}

/* ── Send wiring ── */
if (sendBtn) sendBtn.addEventListener('click', handleSend);
if (chatInput) {
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });

  /* Auto-grow textarea */
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    sendBtn.disabled = chatInput.value.trim() === '';
  });
}

/* ── Mood chips ── */
document.querySelectorAll('.mood-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    if (!chatInput) return;
    chatInput.value = chip.dataset.msg;
    sendBtn.disabled = false;
    chatInput.dispatchEvent(new Event('input'));
    handleSend();
  });
});

/* ── Back button → farewell ── */
window.addEventListener('popstate', () => {
  if (isChatting) triggerFarewell();
});

function triggerFarewell() {
  isChatting = false;
  const ci = document.getElementById('chat-interface');
  const fw = document.getElementById('farewell-overlay');

  if (ci) { ci.style.transition = 'opacity 0.5s'; ci.style.opacity = '0'; }
  if (fw) fw.classList.add('show');

  setTimeout(() => {
    if (ci) ci.classList.add('hidden');
    if (fw) { fw.classList.remove('show'); }

    setTimeout(() => {
      /* Return to Sara home */
      const home = document.getElementById('sara-home');
      if (home) {
        home.classList.remove('hidden');
        home.style.opacity = '0';
        requestAnimationFrame(() => {
          home.style.transition = 'opacity 0.8s ease';
          home.style.opacity    = '1';
        });
      }
      setSaraListening();
    }, 1000);
  }, 3000);
}

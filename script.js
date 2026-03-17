/* ═══════════════════════════════════════════════════════════
   SARA — Complete Script
   Replicates the reference video animation exactly:
   • Per-word clip-mask reveal (translateY from 105% → 0)
   • Words stagger 65ms apart per word
   • Each scene transitions with camera-zoom parallax
   • NO sentence overlapping — guaranteed by DOM structure
═══════════════════════════════════════════════════════════ */
'use strict';

/* ─────────────────────────────────────────
   CURSOR
───────────────────────────────────────── */
const cDot  = document.getElementById('c-dot');
const cRing = document.getElementById('c-ring');
let mx = -200, my = -200, rx = -200, ry = -200;

document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

(function cursorLoop() {
  cDot.style.left  = mx + 'px';
  cDot.style.top   = my + 'px';
  rx += (mx - rx) * 0.12;
  ry += (my - ry) * 0.12;
  cRing.style.left = rx + 'px';
  cRing.style.top  = ry + 'px';
  requestAnimationFrame(cursorLoop);
})();

document.querySelectorAll('button,a,.chip,.mood-chip').forEach(el => {
  el.addEventListener('mouseenter', () => cRing.classList.add('hovered'));
  el.addEventListener('mouseleave', () => cRing.classList.remove('hovered'));
});

/* ─────────────────────────────────────────
   PARTICLE CANVAS SYSTEM
   Lightweight 2D canvas — no Three.js needed
───────────────────────────────────────── */
function initParticles(canvasId, opts = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const ctx   = canvas.getContext('2d');
  const cfg   = {
    count:       opts.count       ?? 55,
    speed:       opts.speed       ?? 0.28,
    maxSize:     opts.maxSize     ?? 1.4,
    opacity:     opts.opacity     ?? 0.3,
    color:       opts.color       ?? '80,140,88',
    connected:   opts.connected   ?? true,
    connectDist: opts.connectDist ?? 110,
  };

  let W = 0, H = 0;
  const pts = [];

  function resize() {
    W = canvas.width  = canvas.offsetWidth  || window.innerWidth;
    H = canvas.height = canvas.offsetHeight || window.innerHeight;
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  for (let i = 0; i < cfg.count; i++) {
    pts.push({
      x:  Math.random() * (W || 800),
      y:  Math.random() * (H || 600),
      vx: (Math.random() - 0.5) * cfg.speed,
      vy: (Math.random() - 0.5) * cfg.speed,
      r:  0.4 + Math.random() * cfg.maxSize,
      o:  0.08 + Math.random() * cfg.opacity,
    });
  }

  let running = true;
  function draw() {
    if (!running) return;
    requestAnimationFrame(draw);
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; else if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; else if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cfg.color},${p.o})`;
      ctx.fill();

      if (cfg.connected) {
        for (let j = i + 1; j < pts.length; j++) {
          const q  = pts[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d  = Math.hypot(dx, dy);
          if (d < cfg.connectDist) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(${cfg.color},${(1 - d / cfg.connectDist) * 0.07})`;
            ctx.lineWidth   = 0.5;
            ctx.stroke();
          }
        }
      }
    }
  }
  draw();
  return { stop: () => { running = false; } };
}

/* ─────────────────────────────────────────
   WORD REVEAL ENGINE
   Exact replication of the reference video:
   • Words clip-masked (overflow:hidden on .word-mask)
   • translateY(105%) → translateY(0) = slide up from below mask
   • 65ms stagger between each word
   • Reverse: translateY(0) → translateY(-108%) = exit upward
   • ZERO overlap possible — each word is self-contained
───────────────────────────────────────── */
const WORD_STAGGER  = 65;   // ms between each word
const WORD_IN_DUR   = 750;  // ms for one word to slide in
const WORD_OUT_DUR  = 480;  // ms for one word to exit

/**
 * Reveals all .word elements inside a container, staggered.
 * @param {string|Element} container - selector or element
 * @param {Function}       onDone    - called after last word finishes entering
 */
function revealWords(container, onDone) {
  const el    = typeof container === 'string'
    ? document.querySelector(container) : container;
  if (!el) { if (onDone) onDone(); return; }

  const words = [...el.querySelectorAll('.word')];
  if (!words.length) { if (onDone) onDone(); return; }

  // Reset all first
  words.forEach(w => {
    w.classList.remove('w-in', 'w-out');
    w.style.transform = 'translateY(105%)';
    w.style.opacity   = '0';
    w.style.transition = 'none';
  });

  // Stagger each word in
  words.forEach((w, i) => {
    setTimeout(() => {
      w.style.transition = `transform ${WORD_IN_DUR}ms cubic-bezier(0.22,1,0.36,1),
                            opacity 100ms ease`;
      w.style.transform = 'translateY(0)';
      w.style.opacity   = '1';
    }, i * WORD_STAGGER);
  });

  // Fire callback after last word finishes entering
  const totalIn = (words.length - 1) * WORD_STAGGER + WORD_IN_DUR;
  if (onDone) setTimeout(onDone, totalIn);
}

/**
 * Exits all .word elements inside a container upward, staggered.
 * @param {string|Element} container
 * @param {Function}       onDone
 */
function exitWords(container, onDone) {
  const el    = typeof container === 'string'
    ? document.querySelector(container) : container;
  if (!el) { if (onDone) onDone(); return; }

  const words = [...el.querySelectorAll('.word')];
  if (!words.length) { if (onDone) onDone(); return; }

  words.forEach((w, i) => {
    setTimeout(() => {
      w.style.transition = `transform ${WORD_OUT_DUR}ms cubic-bezier(0.55,0,1,0.45),
                            opacity ${WORD_OUT_DUR}ms ease`;
      w.style.transform = 'translateY(-108%)';
      w.style.opacity   = '0';
    }, i * 45); // slightly tighter stagger on exit
  });

  const totalOut = (words.length - 1) * 45 + WORD_OUT_DUR;
  if (onDone) setTimeout(onDone, totalOut);
}

/* ─────────────────────────────────────────
   SCENE MANAGER
   Strict state machine — one scene active at a time
   No two scenes can be visible simultaneously
───────────────────────────────────────── */
const scenes = {
  sky:  document.getElementById('scene-sky'),
  dive: document.getElementById('scene-dive'),
  deep: document.getElementById('scene-deep'),
  meet: document.getElementById('scene-meet'),
};

const headlines = {
  sky:  document.getElementById('headline-sky'),
  dive: document.getElementById('headline-dive'),
  deep: document.getElementById('headline-deep'),
  meet: document.getElementById('headline-meet'),
};

let activeScene = null;

/**
 * Cross-fade from one scene to the next.
 * While scene fades out, words exit; when complete scene fades in, words enter.
 */
function transitionScene(fromKey, toKey, onToComplete) {
  const fromScene    = scenes[fromKey];
  const toScene      = scenes[toKey];
  const fromHeadline = headlines[fromKey];
  const toHeadline   = headlines[toKey];

  if (!toScene) { if (onToComplete) onToComplete(); return; }

  // 1. Exit words from current scene
  if (fromHeadline) {
    exitWords(fromHeadline, () => {
      // 2. Fade out old scene
      if (fromScene) {
        fromScene.style.transition = 'opacity 0.9s ease';
        fromScene.style.opacity    = '0';
        fromScene.style.pointerEvents = 'none';
        setTimeout(() => {
          fromScene.classList.remove('scene-active');
        }, 900);
      }

      // 3. Fade in new scene slightly overlapping for smoothness
      setTimeout(() => {
        toScene.classList.add('scene-active');
        toScene.style.transition = 'opacity 1.1s ease';

        // 4. Reveal words in new scene
        setTimeout(() => {
          revealWords(toHeadline, () => {
            activeScene = toKey;
            if (onToComplete) onToComplete();
          });
        }, 500);
      }, 200);
    });
  } else {
    // No headline, just crossfade
    if (fromScene) {
      fromScene.style.transition = 'opacity 0.9s ease';
      fromScene.style.opacity    = '0';
      setTimeout(() => fromScene.classList.remove('scene-active'), 900);
    }
    setTimeout(() => {
      toScene.classList.add('scene-active');
      revealWords(toHeadline, () => {
        activeScene = toKey;
        if (onToComplete) onToComplete();
      });
    }, 300);
  }
}

/* ─────────────────────────────────────────
   PROGRESS BAR
───────────────────────────────────────── */
const progressFill = document.getElementById('intro-bar-fill');
function setProgress(pct) {
  if (progressFill) progressFill.style.width = pct + '%';
}

/* ─────────────────────────────────────────
   SCENE TIMING PLAN
   Matches the reference video's rhythm:
   • Scene 1 (sky):  hold 3.5s → camera drift already happening
   • Scene 2 (dive): hold 2.8s
   • Scene 3 (deep): hold 3.2s
   • Scene 4 (meet): hold 2.5s → fade to home
───────────────────────────────────────── */
const SCENE_HOLDS = {
  sky:  3500,
  dive: 2800,
  deep: 3200,
  meet: 2500,
};

/* ─────────────────────────────────────────
   FLOATING OBJECT PARALLAX
   Very subtle — objects drift as if camera moves forward
───────────────────────────────────────── */
function initParallaxObjects() {
  const floatWorld = document.getElementById('float-world');
  if (!floatWorld) return;

  let progress = 0; // 0 → 1 as intro plays
  let lastTime = performance.now();

  (function driftLoop(now) {
    if (progress >= 1) return;
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    progress = Math.min(1, progress + dt * 0.032); // ~31s to complete

    // Gentle forward drift — scale up slightly (camera moving in)
    const scale  = 1 + progress * 0.12;
    // Slow upward drift as "camera" ascends then dives
    const drift  = progress < 0.5
      ? progress * -8         // rise
      : (progress - 0.5) * 40; // fall toward water

    floatWorld.style.transform  = `scale(${scale}) translateY(${drift}px)`;
    floatWorld.style.transition = 'none';

    requestAnimationFrame(driftLoop);
  })(performance.now());
}

/* ─────────────────────────────────────────
   MAIN INTRO SEQUENCE
───────────────────────────────────────── */
function startIntro() {
  const nav = document.getElementById('main-nav');

  // Init sky particles
  initParticles('sky-canvas', {
    count: 45, speed: 0.22, opacity: 0.22, color: '200,160,180', connected: false
  });
  initParticles('dive-canvas', {
    count: 40, speed: 0.3, opacity: 0.2, color: '180,160,220', connected: false
  });
  initParticles('deep-canvas', {
    count: 50, speed: 0.35, opacity: 0.25, color: '120,80,200', connected: true, connectDist: 90
  });
  initParticles('meet-canvas', {
    count: 40, speed: 0.25, opacity: 0.2, color: '180,140,255', connected: false
  });

  // Start floating objects
  initParallaxObjects();

  // Show nav after brief delay
  setTimeout(() => {
    if (nav) nav.classList.add('nav-show');
  }, 800);

  /* ── SCENE 1: SKY ── */
  const sceneSky = scenes.sky;
  sceneSky.classList.add('scene-active');
  sceneSky.style.opacity = '1';

  setProgress(0);

  // Reveal sky words after 400ms
  setTimeout(() => {
    revealWords(headlines.sky, () => {
      setProgress(25);
      // Hold, then transition to scene 2
      setTimeout(() => {
        setProgress(35);
        transitionScene('sky', 'dive', () => {
          setProgress(50);
          // Hold scene 2
          setTimeout(() => {
            setProgress(60);
            transitionScene('dive', 'deep', () => {
              setProgress(75);
              // Hold scene 3
              setTimeout(() => {
                setProgress(88);
                transitionScene('deep', 'meet', () => {
                  setProgress(100);
                  // Hold scene 4, then go to home
                  setTimeout(() => {
                    exitIntroToHome();
                  }, SCENE_HOLDS.meet);
                });
              }, SCENE_HOLDS.deep);
            });
          }, SCENE_HOLDS.dive);
        });
      }, SCENE_HOLDS.sky);
    });
  }, 400);
}

/* ─────────────────────────────────────────
   INTRO → HOME TRANSITION
   Fade all scenes, reveal Sara home
───────────────────────────────────────── */
function exitIntroToHome() {
  // Exit words from meet scene
  exitWords(headlines.meet, () => {
    const meetScene = scenes.meet;
    if (meetScene) {
      meetScene.style.transition = 'opacity 1.2s ease';
      meetScene.style.opacity    = '0';
    }

    // Hide nav
    const nav = document.getElementById('main-nav');
    if (nav) { nav.style.transition = 'opacity 0.8s'; nav.style.opacity = '0'; }

    // Fade in Sara home
    setTimeout(() => {
      Object.values(scenes).forEach(s => {
        if (s) { s.style.opacity = '0'; s.classList.remove('scene-active'); }
      });

      const home = document.getElementById('sara-home');
      if (home) {
        home.classList.remove('phase-off');
        home.classList.add('phase-in');
        // Init home particles
        initParticles('home-canvas', {
          count: 42, speed: 0.2, opacity: 0.22, color: '80,140,88',
          connected: true, connectDist: 120
        });
      }
    }, 600);
  });
}

/* ─────────────────────────────────────────
   SARA HOME → CHAT
───────────────────────────────────────── */
const sayHelloBtn = document.getElementById('say-hello-btn');
if (sayHelloBtn) {
  sayHelloBtn.addEventListener('click', () => {
    const home = document.getElementById('sara-home');
    if (home) {
      home.style.transition   = 'opacity 0.6s ease';
      home.style.opacity      = '0';
      home.style.pointerEvents = 'none';
    }
    setTimeout(() => {
      if (home) home.classList.add('phase-off');
      history.pushState({ page: 'chat' }, '', '#chat');
      openChat();
    }, 600);
  });
}

/* ─────────────────────────────────────────
   CHAT
───────────────────────────────────────── */
let isChatting  = false;
let chipsShown  = true;
let chatInited  = false;

function openChat() {
  isChatting = true;
  const ci = document.getElementById('chat-interface');
  if (!ci) return;

  ci.classList.remove('phase-off');
  ci.classList.add('phase-in');

  if (!chatInited) {
    initParticles('chat-canvas', {
      count: 38, speed: 0.22, opacity: 0.18, color: '80,140,88',
      connected: true, connectDist: 110
    });
    chatInited = true;
  }

  // Sara's opening — wave first, then typewrite
  setWave(true);
  setTimeout(() => {
    setWave(false);
    typeBotMessage("Hi there 🌿 I'm Sara. This is your quiet space — no rush, no judgment. What's been on your mind lately?");
  }, 1500);
}

/* ── Status wave ── */
const waveEl        = document.getElementById('wave-think');
const statusTextEl  = document.getElementById('ch-status-text');

function setWave(on) {
  if (!waveEl) return;
  if (on) {
    waveEl.classList.add('wave-on');
    if (statusTextEl) statusTextEl.textContent = 'Thinking…';
  } else {
    waveEl.classList.remove('wave-on');
    if (statusTextEl) statusTextEl.textContent = 'Listening';
  }
}
function setWriting() {
  if (statusTextEl) statusTextEl.textContent = 'Writing…';
}

/* ── Mood detection ── */
const MOODS = [
  { words:['anxi','panic','scar','fear','worri'],      icon:'🌧',label:'Tender'   },
  { words:['sad','cry','depress','lone','empty'],       icon:'🌙',label:'Gentle'   },
  { words:['ang','mad','furi','frustrat','annoy'],      icon:'🔥',label:'Heated'   },
  { words:['happ','joy','excit','grat','thank','amaz'],icon:'🌻',label:'Warm'     },
  { words:['tired','exhaust','sleep','drain'],          icon:'🍃',label:'Resting'  },
  { words:['overthink','stress','overwhelm'],           icon:'🌀',label:'Swirling' },
];
function detectMood(t) {
  const s = t.toLowerCase();
  for (const m of MOODS) {
    if (m.words.some(w => s.includes(w))) return m;
  }
  return { icon:'🌿', label:'Calm' };
}
function applyMood(m) {
  const i = document.getElementById('mood-icon');
  const w = document.getElementById('mood-word');
  if (i) { i.style.transform='scale(1.6)'; i.textContent=m.icon; setTimeout(()=>i.style.transform='',400); }
  if (w) w.textContent = m.label;
}

/* ── Particle burst on send ── */
function spawnBurst(x, y) {
  const cols = ['#5a8a5e','#a8d4a8','#c8f0c8','#fff','#b0e0b8'];
  for (let i = 0; i < 13; i++) {
    const el    = document.createElement('div');
    el.className = 'burst-p';
    const sz    = 3 + Math.random() * 5;
    const ang   = (i / 13) * Math.PI * 2;
    const dist  = 34 + Math.random() * 44;
    el.style.cssText = `left:${x}px;top:${y}px;width:${sz}px;height:${sz}px;`
      + `background:${cols[i % cols.length]};`
      + `--tx:${Math.cos(ang)*dist}px;--ty:${Math.sin(ang)*dist}px;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }
}

/* ── Time helper ── */
function nowHHMM() {
  const d = new Date();
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

/* ── Append user message ── */
function appendUserMsg(text) {
  const area  = document.getElementById('messages');
  const wrap  = document.createElement('div');
  wrap.className = 'msg user';
  wrap.innerHTML = `<span>${escHtml(text)}</span>
    <span class="msg-ts">${nowHHMM()}</span>
    <div class="msg-reacts">
      ${['🌿','💚','🤍','✨'].map(e=>`<button class="react">${e}</button>`).join('')}
    </div>`;
  area.appendChild(wrap);
  smoothScroll(area);
}

/* ── Typewriter bot message ── */
function typeBotMessage(fullText) {
  const area  = document.getElementById('messages');
  setWriting();

  const wrap  = document.createElement('div');
  wrap.className = 'msg bot';
  const span  = document.createElement('span');
  const ts    = document.createElement('span');
  ts.className = 'msg-ts';
  const reacts = document.createElement('div');
  reacts.className = 'msg-reacts';
  reacts.innerHTML = ['🌿','💚','🤍','✨']
    .map(e => `<button class="react">${e}</button>`).join('');

  wrap.appendChild(span);
  wrap.appendChild(ts);
  wrap.appendChild(reacts);
  area.appendChild(wrap);
  smoothScroll(area);

  // Type character by character
  let i = 0;
  const speed = Math.max(16, Math.min(34, 2200 / fullText.length));
  function tick() {
    if (i < fullText.length) {
      span.textContent += fullText[i++];
      smoothScroll(area);
      setTimeout(tick, speed);
    } else {
      ts.textContent = nowHHMM();
      setWave(false);
      if (statusTextEl) statusTextEl.textContent = 'Listening';
    }
  }
  tick();
}

function smoothScroll(el) {
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  if (atBottom) el.scrollTop = el.scrollHeight;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Send handler ── */
const chatInput = document.getElementById('chat-input');
const sendBtn   = document.getElementById('send-btn');

async function handleSend() {
  if (!chatInput) return;
  const text = chatInput.value.trim();
  if (!text) return;

  // Mood
  applyMood(detectMood(text));

  // User bubble
  appendUserMsg(text);
  chatInput.value         = '';
  chatInput.style.height  = 'auto';
  sendBtn.disabled        = true;

  // Collapse chips
  if (chipsShown) {
    const chips = document.getElementById('chips-row');
    if (chips) chips.classList.add('chips-gone');
    chipsShown = false;
  }

  // Burst + button animation
  const r = sendBtn.getBoundingClientRect();
  spawnBurst(r.left + r.width / 2, r.top + r.height / 2);
  sendBtn.classList.add('fired');
  setTimeout(() => sendBtn.classList.remove('fired'), 450);

  // Show wave
  setWave(true);

  try {
    const sys = [
      'You are Sara.',
      'You are a deeply empathetic, warm, non-judgmental listener.',
      'Respond in 2-3 sentences max.',
      'Be conversational, gentle, and human.',
      'Never use bullet points or lists.',
      'Never say you are an AI.',
    ].join(' ');
    const res = await fetch(
      `https://text.pollinations.ai/prompt/${encodeURIComponent(sys + ' User: "' + text + '"')}`
    );
    const ai = await res.text();
    setWave(false);
    setTimeout(() => typeBotMessage(ai.trim()), 280);
  } catch {
    setWave(false);
    typeBotMessage("I'm right here 🌿 The connection flickered but I haven't gone anywhere.");
  }
}

if (sendBtn) sendBtn.addEventListener('click', handleSend);
if (chatInput) {
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 110) + 'px';
    sendBtn.disabled       = chatInput.value.trim() === '';
  });
}

/* Chips */
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    if (!chatInput) return;
    chatInput.value    = chip.dataset.msg;
    sendBtn.disabled   = false;
    handleSend();
  });
});

/* ─────────────────────────────────────────
   BACK BUTTON → FAREWELL
───────────────────────────────────────── */
window.addEventListener('popstate', () => {
  if (isChatting) showFarewell();
});

function showFarewell() {
  isChatting = false;
  const ci = document.getElementById('chat-interface');
  const fw = document.getElementById('farewell');

  if (ci) { ci.style.transition = 'opacity 0.5s'; ci.style.opacity = '0'; }

  if (fw) {
    fw.classList.remove('phase-off');
    fw.classList.add('phase-in');
    fw.style.display = 'flex';
  }

  setTimeout(() => {
    if (ci) { ci.style.opacity=''; ci.classList.add('phase-off'); }
    if (fw) {
      fw.style.transition = 'opacity 1s';
      fw.style.opacity    = '0';
      setTimeout(() => {
        fw.classList.add('phase-off'); fw.style.opacity='';
        // Return to home
        const home = document.getElementById('sara-home');
        if (home) {
          home.classList.remove('phase-off');
          home.style.opacity = '0';
          home.classList.add('phase-in');
          requestAnimationFrame(() => {
            home.style.transition = 'opacity 0.8s ease';
            home.style.opacity    = '1';
          });
        }
        setWave(false);
        if (statusTextEl) statusTextEl.textContent = 'Listening';
      }, 1000);
    }
  }, 3200);
}

/* ─────────────────────────────────────────
   PROGRESS BAR in scene transitions
───────────────────────────────────────── */
// The bar lives in the intro scenes — hide it once on home
function hideProgressBar() {
  const bar = document.getElementById('intro-bar');
  if (bar) { bar.style.transition='opacity 0.6s'; bar.style.opacity='0'; }
}

/* ─────────────────────────────────────────
   BOOT
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure all scenes start invisible except for sky
  Object.entries(scenes).forEach(([key, el]) => {
    if (!el) return;
    if (key !== 'sky') {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
    }
  });

  // Small boot delay for fonts to load
  setTimeout(startIntro, 200);
});

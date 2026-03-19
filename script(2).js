/* ═══════════════════════════════════════════════════════════
   SARA — 3D FLOWER GATE ENGINE
   Algorithm: Sequential gate open → words reveal → gate close → next gate
   Each gate pair swings open on Y-axis via CSS 3D transform.
   Words cascade in after gate is fully open.
   On sentence completion, gate closes, next gate appears.
═══════════════════════════════════════════════════════════ */
'use strict';

/* ─────────────────────────────────────────────
   SHOW / HIDE HELPERS
───────────────────────────────────────────── */
function showEl(el, display) {
  if (!el) return;
  el.style.display = display || 'flex';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { el.classList.add('visible'); });
  });
}
function hideEl(el, onDone) {
  if (!el) return;
  el.classList.remove('visible');
  setTimeout(() => { el.style.display = 'none'; if (onDone) onDone(); }, 950);
}

/* ─────────────────────────────────────────────
   CURSOR
───────────────────────────────────────────── */
;(function () {
  const dot = document.getElementById('c-dot');
  const ring = document.getElementById('c-ring');
  if (!dot || !ring) return;
  let mx = -200, my = -200, rx = -200, ry = -200;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px'; dot.style.top = my + 'px';
  });
  (function loop() {
    rx += (mx - rx) * 0.11; ry += (my - ry) * 0.11;
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    requestAnimationFrame(loop);
  })();
  document.addEventListener('mouseover', e => {
    if (e.target.closest('button,a,.chip')) ring.classList.add('big');
    else ring.classList.remove('big');
  });
})();

/* ─────────────────────────────────────────────
   MATH HELPERS
───────────────────────────────────────────── */
const lerp   = (a, b, t) => a + (b - a) * t;
const clamp  = (v, a, b) => Math.max(a, Math.min(b, v));
const rand   = (a, b) => a + Math.random() * (b - a);
const smooth = t => t * t * (3 - 2 * t);

/* ─────────────────────────────────────────────
   SPRING PHYSICS
───────────────────────────────────────────── */
class Spring {
  constructor(k = 0.04, d = 0.18) {
    this.val = 0; this.vel = 0; this.target = 0; this.k = k; this.d = d;
  }
  tick() {
    const f = (this.target - this.val) * this.k - this.vel * this.d;
    this.vel += f; this.val += this.vel; return this.val;
  }
}
class FloatPhysics {
  constructor(bx, by) {
    this.sx = new Spring(0.028 + rand(0, .01), 0.14 + rand(0, .06));
    this.sy = new Spring(0.022 + rand(0, .01), 0.12 + rand(0, .06));
    this.sr = new Spring(0.018, 0.10);
    this.phase = rand(0, Math.PI * 2);
    this.freq  = rand(0.0004, 0.0009);
    this.amp   = { x: rand(.3, .7), y: rand(.4, .9), r: rand(.015, .06) };
    this.bx = bx || 0; this.by = by || 0; this.t = 0;
  }
  update(dt) {
    this.t += dt;
    const t = this.t * 1000;
    const nx = Math.sin(t * this.freq + this.phase) * this.amp.x
             + Math.sin(t * this.freq * 1.618 + this.phase * 1.3) * this.amp.x * .4;
    const ny = Math.sin(t * this.freq * .8 + this.phase * 1.7) * this.amp.y
             + Math.cos(t * this.freq * 1.2 + this.phase * .9) * this.amp.y * .35;
    const nr = Math.sin(t * this.freq * .6 + this.phase * 2) * this.amp.r;
    this.sx.target = this.bx + nx;
    this.sy.target = this.by + ny;
    this.sr.target = nr;
    return { x: this.sx.tick(), y: this.sy.tick(), r: this.sr.tick() };
  }
}

/* ─────────────────────────────────────────────
   THREE.JS BACKGROUND RENDERER
───────────────────────────────────────────── */
const mainCanvas = document.getElementById('main-canvas');
const renderer = new THREE.WebGLRenderer({ canvas: mainCanvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 300);
camera.position.set(0, 0, 12);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* Night garden GLSL background — rose, violet, deep forest tones */
const bgMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:  { value: 0 },
    uScene: { value: 0 },
    uBlend: { value: 0 },
    uGate:  { value: 0 }, // 0-3 which gate we're on (blends petal glow)
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`,
  fragmentShader: `
    precision highp float;
    uniform float uTime, uScene, uBlend, uGate;
    varying vec2 vUv;

    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }
    float noise(vec2 p){
      vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                 mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);
    }
    float fbm(vec2 p){
      float v=0.,a=.5;
      for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.+.5;a*=.5;}
      return v;
    }

    /* Night garden — deep violet-rose sky with moonlight */
    vec3 garden(vec2 uv){
      vec3 deep  = vec3(0.015,0.008,0.020);
      vec3 mid   = vec3(0.040,0.018,0.055);
      vec3 glow  = vec3(0.080,0.030,0.085);
      float moon = exp(-length(uv-vec2(.75,.82))*7.)*0.5;
      vec3 col = mix(deep, mix(mid, glow, pow(uv.y,.5)), uv.y*.9);
      col += moon*vec3(0.25,0.18,0.30);
      /* Petals floating */
      float p1=step(.992,noise(uv*110.+vec2(uTime*.015,uTime*-.008)))*uv.y*.6;
      float p2=step(.994,noise(uv*85. +vec2(-uTime*.01,uTime*.012)))*0.4;
      col += p1*vec3(0.6,0.25,0.38);
      col += p2*vec3(0.55,0.22,0.50);
      float fog=fbm(uv*3.+vec2(uTime*.006,0.))*.08*(1.-uv.y);
      col += fog*vec3(0.08,0.04,0.12);
      return col;
    }

    /* Moonlit bloom — richer, warmer moon glow for gate 2 */
    vec3 bloom(vec2 uv){
      vec3 col = vec3(0.020,0.010,0.030);
      float gx=exp(-length(uv-vec2(.5,.8))*5.)*.6;
      col += gx*vec3(0.15,0.08,0.20);
      float veil=fbm(uv*4.-vec2(uTime*.008,0.))*.06;
      col += veil*vec3(0.1,0.06,0.14);
      float petals=step(.989,noise(uv*130.+vec2(uTime*.02,-uTime*.015)))*0.55;
      col += petals*vec3(0.55,0.20,0.35);
      col = mix(col,vec3(0.04,0.02,0.06),pow(1.-uv.y,.6)*.5);
      return col;
    }

    /* Golden grove — warm amber glow for gate 3 */
    vec3 golden(vec2 uv){
      vec3 col = vec3(0.018,0.012,0.005);
      float gx=exp(-length(uv-vec2(.4,.75))*6.)*.55;
      col += gx*vec3(0.25,0.15,0.04);
      float shimmer=sin(uv.x*24.+uTime*1.8)*sin(uTime*1.1)*.03;
      shimmer*=smoothstep(.4,.0,abs(uv.y-.35));
      col += shimmer*vec3(0.6,0.4,0.1);
      float p=step(.991,noise(uv*100.+vec2(uTime*.018,0.)))*.5;
      col += p*vec3(0.55,0.35,0.05);
      return col;
    }

    /* Sacred rose — peak petal bloom for final gate */
    vec3 sacred(vec2 uv){
      vec3 col = vec3(0.020,0.008,0.015);
      float core=exp(-length(uv-vec2(.5,.5))*3.8)*.65;
      col += core*vec3(0.30,0.10,0.20);
      float outer=exp(-length(uv-vec2(.5,.5))*1.2)*.18;
      col += outer*vec3(0.12,0.05,0.10);
      float sparks=step(.988,noise(uv*150.+vec2(uTime*.025,-uTime*.018)))*.8;
      col += sparks*vec3(0.70,0.30,0.45);
      float gold=step(.993,noise(uv*90.+vec2(uTime*.014,uTime*.010)))*.45;
      col += gold*vec3(0.60,0.40,0.08);
      return col;
    }

    void main(){
      int s=int(uScene);
      vec3 a,b;
      if(s==0){ a=garden(vUv); b=bloom(vUv); }
      else if(s==1){ a=bloom(vUv); b=golden(vUv); }
      else         { a=golden(vUv); b=sacred(vUv); }
      vec3 col = mix(a,b,uBlend);
      /* Subtle scanline texture */
      float scan=sin(vUv.y*800.)*0.012;
      col -= scan*0.3;
      gl_FragColor=vec4(col,1.);
    }
  `,
  depthTest: false, depthWrite: false,
});
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));

/* ── AMBIENT GARDEN LIGHTS ── */
const ambLight  = new THREE.AmbientLight(0xd8a0c0, 0.45);
const moonLight = new THREE.DirectionalLight(0xd0c0e8, 0.9);
moonLight.position.set(-3, 8, 6);
const roseLight = new THREE.PointLight(0xe88090, 0.6, 20);
roseLight.position.set(2, 3, 4);
scene.add(ambLight, moonLight, roseLight);

/* ── CAMERA KEYFRAME PATH (garden dive) ── */
const KFRAMES = [
  { t: 0.00, px: 0,    py: 0,    pz: 12,  lx: 0,   ly: 0,   lz: 0  },
  { t: 0.20, px: 0.3,  py: 0.4,  pz: 10,  lx: 0,   ly: 0.1, lz: 0  },
  { t: 0.42, px: -0.2, py: 0.2,  pz: 8.5, lx: 0,   ly: 0,   lz: -.4},
  { t: 0.65, px: 0.1,  py: -0.3, pz: 7,   lx: 0,   ly: -.2, lz: -.8},
  { t: 0.82, px: 0,    py: -0.8, pz: 5.5, lx: 0,   ly: -.4, lz:-1.2},
  { t: 1.00, px: 0,    py: -1.2, pz: 4,   lx: 0,   ly: -.6, lz:-1.5},
];

function camAt(t) {
  let i = 0;
  while (i < KFRAMES.length - 2 && KFRAMES[i + 1].t <= t) i++;
  const a = KFRAMES[i], b = KFRAMES[i + 1];
  const f = smooth(clamp((t - a.t) / (b.t - a.t), 0, 1));
  return {
    px: lerp(a.px, b.px, f), py: lerp(a.py, b.py, f), pz: lerp(a.pz, b.pz, f),
    lx: lerp(a.lx, b.lx, f), ly: lerp(a.ly, b.ly, f), lz: lerp(a.lz, b.lz, f),
  };
}

let clockT = 0, sceneProg = 0, bgScene = 0, bgBlend = 0;
const lookTgt = new THREE.Vector3();
let lastT = performance.now();

function renderBg(now) {
  requestAnimationFrame(renderBg);
  const dt = Math.min((now - lastT) / 1000, .05); lastT = now; clockT += dt;

  bgMat.uniforms.uTime.value  = clockT;
  bgMat.uniforms.uScene.value = bgScene;
  bgMat.uniforms.uBlend.value = bgBlend;
  bgMat.uniforms.uGate.value  = currentGate;

  const cp = camAt(clamp(sceneProg, 0, 1));
  camera.position.set(cp.px, cp.py, cp.pz);
  lookTgt.x += (cp.lx - lookTgt.x) * .06;
  lookTgt.y += (cp.ly - lookTgt.y) * .06;
  lookTgt.z += (cp.lz - lookTgt.z) * .06;
  camera.lookAt(lookTgt);

  /* Gentle rose light pulse */
  roseLight.intensity = 0.5 + Math.sin(clockT * 1.4) * 0.2;

  renderer.render(scene, camera);
}
renderBg(performance.now());

/* ─────────────────────────────────────────────
   ANIMATE VALUE HELPER
───────────────────────────────────────────── */
function animVal(from, to, dur, onUpdate, onDone) {
  const t0 = performance.now();
  (function tick(now) {
    const p = clamp((now - t0) / dur, 0, 1);
    onUpdate(lerp(from, to, smooth(p)));
    if (p < 1) requestAnimationFrame(tick);
    else if (onDone) onDone();
  })(performance.now());
}

/* ─────────────────────────────────────────────
   PROGRESS BAR
───────────────────────────────────────────── */
const progFill = document.getElementById('prog-fill');
function setProgress(p) { if (progFill) progFill.style.width = clamp(p, 0, 100) + '%'; }

/* ─────────────────────────────────────────────
   PIP TRACKER
───────────────────────────────────────────── */
function updatePips(active) {
  for (let i = 1; i <= 4; i++) {
    const pip = document.getElementById('pip-' + i);
    if (!pip) continue;
    pip.classList.remove('active', 'done');
    if (i < active)  pip.classList.add('done');
    if (i === active) pip.classList.add('active');
  }
}

/* ─────────────────────────────────────────────
   WORD CASCADE ENGINE
   Words inside .gate-text reveal word by word
   with staggered delays after gate fully opens.
───────────────────────────────────────────── */
const WORD_STAGGER = 90;
const WORD_DUR     = 700;
const EOUT         = 'cubic-bezier(0.22,1,0.36,1)';

function revealGateWords(textEl, done) {
  if (!textEl) { done && done(); return; }
  const words = [...textEl.querySelectorAll('.word-inner')];
  // Reset all
  words.forEach(w => {
    w.style.transition = 'none';
    w.style.transform  = 'translateY(110%)';
    w.style.opacity    = '0';
    w.classList.remove('revealed');
  });
  textEl.classList.add('visible');

  let lastDelay = 0;
  words.forEach((w, i) => {
    const delay = i * WORD_STAGGER;
    lastDelay = delay + WORD_DUR;
    setTimeout(() => {
      w.style.transition = `transform ${WORD_DUR}ms ${EOUT}, opacity 80ms ease`;
      w.style.transform  = 'translateY(0)';
      w.style.opacity    = '1';
      w.classList.add('revealed');
    }, delay);
  });

  if (done) setTimeout(done, lastDelay);
}

function hideGateWords(textEl, done) {
  if (!textEl) { done && done(); return; }
  const words = [...textEl.querySelectorAll('.word-inner')];
  words.forEach((w, i) => {
    setTimeout(() => {
      w.style.transition = `transform 420ms cubic-bezier(0.55,0,1,0.45), opacity 420ms ease`;
      w.style.transform  = 'translateY(-112%)';
      w.style.opacity    = '0';
    }, i * 45);
  });
  textEl.classList.remove('visible');
  if (done) setTimeout(done, words.length * 45 + 420);
}

/* ─────────────────────────────────────────────
   PETAL BURST — spawns SVG petals on gate open
───────────────────────────────────────────── */
function spawnPetals(stageEl) {
  if (!stageEl) return;
  const petalShapes = ['M0,-6 Q4,-3 0,6 Q-4,-3 0,-6', 'M0,-8 Q5,-4 4,4 Q0,8 -4,4 Q-5,-4 0,-8', 'M0,-5 Q3,-2 3,5 Q0,8 -3,5 Q-3,-2 0,-5'];
  const colors = ['#e8859a', '#f2a7b8', '#c84c68', '#d4a96a', '#f0c0d0', '#b896d8'];

  for (let i = 0; i < 18; i++) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('viewBox', '-10 -10 20 20');
    el.style.cssText = `position:absolute;width:${12 + rand(0, 14)}px;height:${12 + rand(0, 14)}px;
      left:${rand(20, 80)}%;top:${rand(20, 70)}%;pointer-events:none;z-index:40;
      --pdx:${(rand(0, 1) > .5 ? 1 : -1) * rand(60, 180)}px;
      --pdy:${rand(-100, -220)}px;
      --pdr:${rand(-180, 180)}deg;`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', petalShapes[Math.floor(rand(0, petalShapes.length))]);
    path.setAttribute('fill', colors[Math.floor(rand(0, colors.length))]);
    path.setAttribute('opacity', '0.85');
    el.appendChild(path);

    el.classList.add('gate-petal');
    el.style.animation = `none`;
    stageEl.appendChild(el);

    // Trigger animation after paint
    const delay = rand(0, 400);
    setTimeout(() => {
      el.style.animation = `petalDrift ${rand(2, 4)}s ease-out ${delay}ms forwards`;
      el.style.opacity = '1';
    }, 10);

    // Cleanup
    setTimeout(() => el.remove(), delay + 4200);
  }
}

/* ─────────────────────────────────────────────
   AMBIENT FLOWER SPAWNER (background garden)
───────────────────────────────────────────── */
let ambientFlowerTimer = null;
function startAmbientFlowers() {
  const introWrap = document.getElementById('intro-wrap');
  if (!introWrap) return;

  function spawnOne() {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.setAttribute('viewBox', '-12 -12 24 24');
    const size = rand(8, 22);
    const x = rand(0, 100);
    const dur = rand(14, 28);
    el.style.cssText = `width:${size}px;height:${size}px;left:${x}%;bottom:-5%;
      position:absolute;animation:ambientFloat ${dur}s linear forwards;animation-delay:${rand(0, 2)}s;`;
    el.classList.add('ambient-flower');

    const petals = Math.floor(rand(5, 9));
    const color1 = ['#c84c68', '#9b7fc4', '#c8940a', '#e8859a'][Math.floor(rand(0, 4))];
    const color2 = ['#f2a7b8', '#d4a9f0', '#e8b420', '#f0c0d0'][Math.floor(rand(0, 4))];
    for (let i = 0; i < petals; i++) {
      const angle = (i / petals) * 360;
      const petal = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      petal.setAttribute('cx', '0'); petal.setAttribute('cy', '-7');
      petal.setAttribute('rx', '3'); petal.setAttribute('ry', '5.5');
      petal.setAttribute('fill', i % 2 === 0 ? color1 : color2);
      petal.setAttribute('opacity', '0.85');
      petal.setAttribute('transform', `rotate(${angle})`);
      el.appendChild(petal);
    }
    const center = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    center.setAttribute('cx', '0'); center.setAttribute('cy', '0'); center.setAttribute('r', '3');
    center.setAttribute('fill', '#d4a96a');
    el.appendChild(center);

    introWrap.appendChild(el);
    setTimeout(() => el.remove(), (dur + 2) * 1000);
  }

  ambientFlowerTimer = setInterval(spawnOne, 1800);
  spawnOne();
}
function stopAmbientFlowers() {
  if (ambientFlowerTimer) { clearInterval(ambientFlowerTimer); ambientFlowerTimer = null; }
}

/* ─────────────────────────────────────────────
   GATE STATE MACHINE
   States: idle → appearing → opening → wordsIn → wordsHold
           → wordsOut → closing → closed → [next gate or done]
───────────────────────────────────────────── */
let currentGate = 0; // 0-indexed, 0 = gate1

const GATE_CONFIG = [
  {
    id: 'gate-1', stageId: 'gate-stage-1', textId: 'gate-text-1',
    holdMs: 3200, bgSceneTarget: 0, pip: 1,
    progressBefore: 0, progressAfter: 22,
  },
  {
    id: 'gate-2', stageId: 'gate-stage-2', textId: 'gate-text-2',
    holdMs: 3000, bgSceneTarget: 1, pip: 2,
    progressBefore: 30, progressAfter: 52,
  },
  {
    id: 'gate-3', stageId: 'gate-stage-3', textId: 'gate-text-3',
    holdMs: 2800, bgSceneTarget: 2, pip: 3,
    progressBefore: 60, progressAfter: 76,
  },
  {
    id: 'gate-4', stageId: 'gate-stage-4', textId: 'gate-text-4',
    holdMs: 3600, bgSceneTarget: 2, pip: 4,
    progressBefore: 82, progressAfter: 100,
  },
];

/* ── GATE SWINGS OPEN (3D Y-axis rotation) ── */
function openGate(gateEl, done) {
  if (!gateEl) { done && done(); return; }
  gateEl.classList.remove('closed', 'closing', 'open');
  gateEl.classList.add('gate-active', 'opening');
  // transition is 1.6s in CSS; wait 1700ms then call done
  setTimeout(() => {
    gateEl.classList.remove('opening');
    gateEl.classList.add('open');
    done && done();
  }, 1700);
}

/* ── GATE SWINGS CLOSED ── */
function closeGate(gateEl, done) {
  if (!gateEl) { done && done(); return; }
  gateEl.classList.remove('opening', 'open');
  gateEl.classList.add('closing');
  setTimeout(() => {
    gateEl.classList.remove('closing', 'gate-active');
    gateEl.classList.add('closed');
    done && done();
  }, 1300);
}

/* ── FADE IN GATE STAGE ── */
function showGateStage(stageEl, done) {
  if (!stageEl) { done && done(); return; }
  stageEl.style.display = 'flex';
  stageEl.style.opacity = '0';
  stageEl.style.transition = 'opacity 0.8s ease';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      stageEl.style.opacity = '1';
      if (done) setTimeout(done, 820);
    });
  });
}

/* ── FADE OUT GATE STAGE ── */
function hideGateStage(stageEl, done) {
  if (!stageEl) { done && done(); return; }
  stageEl.style.transition = 'opacity 0.6s ease';
  stageEl.style.opacity = '0';
  setTimeout(() => {
    stageEl.style.display = 'none';
    done && done();
  }, 650);
}

/* ─────────────────────────────────────────────
   MASTER GATE SEQUENCE ENGINE
   Processes gates sequentially, one at a time.
───────────────────────────────────────────── */
let gateSequenceDone = false;
let camTicker = null;

function runGateSequence(gateIndex, onAllDone) {
  if (gateIndex >= GATE_CONFIG.length) {
    onAllDone && onAllDone();
    return;
  }

  currentGate = gateIndex;
  const cfg = GATE_CONFIG[gateIndex];

  const gateEl  = document.getElementById(cfg.id);
  const stageEl = document.getElementById(cfg.stageId);
  const textEl  = document.getElementById(cfg.textId);

  // Update pips
  updatePips(cfg.pip);
  setProgress(cfg.progressBefore);

  // 1. Show pip path indicator (first gate)
  if (gateIndex === 0) {
    const path = document.getElementById('gate-path');
    if (path) { path.style.display = 'flex'; setTimeout(() => path.classList.add('show'), 200); }
  }

  // 2. Crossfade background if needed
  const bgFadeMs = gateIndex === 0 ? 0 : 1000;
  if (gateIndex > 0) {
    const prevScene = bgScene;
    bgScene = cfg.bgSceneTarget - 1;
    animVal(0, 1, bgFadeMs, v => bgBlend = v, () => {
      bgScene = cfg.bgSceneTarget;
      bgBlend = 0;
    });
  }

  // 3. Spawn petal ambient
  setTimeout(() => { spawnPetals(stageEl); }, 600);

  // 4. Show gate stage (fade in)
  showGateStage(stageEl, () => {

    // 5. Open gate doors (3D swing)
    openGate(gateEl, () => {

      // 6. Small pause after gate fully open
      setTimeout(() => {

        // 7. Reveal words
        revealGateWords(textEl, () => {

          // 8. Hold sentence on screen
          setProgress(cfg.progressAfter);
          setTimeout(() => {

            // 9. Hide words
            hideGateWords(textEl, () => {

              // 10. Close gate
              closeGate(gateEl, () => {

                // 11. Fade out stage
                hideGateStage(stageEl, () => {

                  // 12. Small inter-gate pause
                  setTimeout(() => {

                    // 13. Run next gate
                    runGateSequence(gateIndex + 1, onAllDone);

                  }, 300);
                });
              });
            });
          }, cfg.holdMs);
        });
      }, 250);
    });
  });
}

/* ─────────────────────────────────────────────
   CAMERA PROGRESS OVER TOTAL SEQUENCE
───────────────────────────────────────────── */
const TOTAL_SEQUENCE_MS = 26000; // approximate total intro duration

function startCameraProgress() {
  const t0 = performance.now();
  camTicker = setInterval(() => {
    sceneProg = clamp((performance.now() - t0) / TOTAL_SEQUENCE_MS, 0, 1);
    if (sceneProg >= 1) {
      clearInterval(camTicker);
      camTicker = null;
    }
  }, 16);
}

/* ─────────────────────────────────────────────
   INTRO BOOT
───────────────────────────────────────────── */
function startIntro() {
  const nav  = document.getElementById('main-nav');
  const wrap = document.getElementById('intro-wrap');

  // Nav fades in
  setTimeout(() => nav && nav.classList.add('show'), 800);

  // Start camera journey
  startCameraProgress();

  // Spawn ambient garden flowers
  startAmbientFlowers();

  // Progress bar init
  setProgress(0);

  // Reset all gate stages to hidden (except stage 1)
  ['gate-stage-2', 'gate-stage-3', 'gate-stage-4'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.style.opacity = '0'; }
  });

  // Reset gate 1 stage opacity
  const gs1 = document.getElementById('gate-stage-1');
  if (gs1) { gs1.style.display = 'flex'; gs1.style.opacity = '0'; }

  // Hide gate-path until first gate
  const gp = document.getElementById('gate-path');
  if (gp) { gp.classList.remove('show'); gp.style.display = 'none'; }

  // Run gate sequence → then show home
  runGateSequence(0, () => {
    stopAmbientFlowers();

    // Fade out gate path
    const path = document.getElementById('gate-path');
    if (path) { path.classList.remove('show'); setTimeout(() => path.style.display = 'none', 600); }

    // Mark intro done
    if (wrap) wrap.classList.add('done');
    if (nav) {
      nav.style.transition = 'opacity .8s';
      nav.style.opacity = '0';
      nav.style.pointerEvents = 'none';
    }

    // Show Sara home after intro fades
    setTimeout(showHome, 1400);
  });
}

/* ─────────────────────────────────────────────
   SARA HOME
───────────────────────────────────────────── */
function showHome() {
  const home = document.getElementById('sara-home');
  if (!home) return;
  home.style.display = 'flex';
  setTimeout(() => home.classList.add('visible'), 30);
  makeParticles('home-canvas', {
    count: 48, speed: .16, opacity: .2, color: '232,133,154', connected: true, dist: 130,
  });
}

document.getElementById('say-hello-btn')?.addEventListener('click', () => {
  const home = document.getElementById('sara-home');
  if (home) home.classList.remove('visible');
  setTimeout(() => {
    if (home) home.style.display = 'none';
    history.pushState({ page: 'chat' }, '', '#chat');
    openChat();
  }, 950);
});

/* ─────────────────────────────────────────────
   CHAT
───────────────────────────────────────────── */
let isChatting = false, chipsOn = true, chatInited = false;

function openChat() {
  isChatting = true;
  const cw = document.getElementById('chat-wrap');
  if (!cw) return;
  cw.style.display = 'flex';
  setTimeout(() => cw.classList.add('visible'), 30);
  if (!chatInited) {
    makeParticles('chat-canvas', { count: 36, speed: .2, opacity: .14, color: '232,133,154', connected: true, dist: 105 });
    chatInited = true;
  }
  setWave(true);
  setTimeout(() => {
    setWave(false);
    typeBot("Hi there 🌸 I'm Sara. This is your quiet space — no rush, no judgment. What's been on your mind lately?");
  }, 1500);
}

const statusTxt = document.getElementById('hdr-stxt');
const vwave     = document.getElementById('vwave');
function setWave(on) {
  if (vwave)     vwave.classList.toggle('on', on);
  if (statusTxt) statusTxt.textContent = on ? 'Thinking…' : 'Listening';
}
function setWriting() { if (statusTxt) statusTxt.textContent = 'Writing…'; }

const MOODS = [
  { w: ['anxi','panic','scar','fear','worri'],      ic: '🌧', lb: 'Tender' },
  { w: ['sad','cry','depress','lone','empty'],       ic: '🌙', lb: 'Gentle' },
  { w: ['ang','mad','furi','frustrat','annoy'],      ic: '🔥', lb: 'Heated' },
  { w: ['happ','joy','excit','grat','thank','amaz'], ic: '🌸', lb: 'Warm'   },
  { w: ['tired','exhaust','sleep','drain'],          ic: '🍃', lb: 'Resting'},
  { w: ['overthink','stress','overwhelm'],           ic: '🌀', lb: 'Swirling'},
];
function detectMood(t) {
  const s = t.toLowerCase();
  for (const m of MOODS) if (m.w.some(w => s.includes(w))) return m;
  return { ic: '🌸', lb: 'Calm' };
}
function applyMood(m) {
  const i = document.getElementById('mood-ico'), l = document.getElementById('mood-lbl');
  if (i) { i.style.transform = 'scale(1.7)'; i.textContent = m.ic; setTimeout(() => i.style.transform = '', 400); }
  if (l) l.textContent = m.lb;
}

function spawnBurst(x, y) {
  const cols = ['#e8859a', '#c84c68', '#f2a7b8', '#d4a96a', '#b896d8'];
  for (let i = 0; i < 13; i++) {
    const el = document.createElement('div'); el.className = 'burst';
    const sz = 3 + Math.random() * 5, ang = (i / 13) * Math.PI * 2, d = 32 + Math.random() * 44;
    el.style.cssText = `left:${x}px;top:${y}px;width:${sz}px;height:${sz}px;background:${cols[i%cols.length]};--tx:${Math.cos(ang)*d}px;--ty:${Math.sin(ang)*d}px;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }
}

function hhMM() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function appendUser(txt) {
  const area = document.getElementById('msgs');
  const d = document.createElement('div'); d.className = 'msg user';
  d.innerHTML = `<span>${esc(txt)}</span><span class="msg-ts">${hhMM()}</span>
    <div class="msg-reacts">${['🌸','💚','🤍','✨'].map(e => `<button class="react-e">${e}</button>`).join('')}</div>`;
  area.appendChild(d); scrollMsg(area);
}

function typeBot(txt) {
  const area = document.getElementById('msgs');
  setWriting();
  const d = document.createElement('div'); d.className = 'msg bot';
  const sp = document.createElement('span');
  const ts = document.createElement('span'); ts.className = 'msg-ts';
  const rc = document.createElement('div'); rc.className = 'msg-reacts';
  rc.innerHTML = ['🌸','💚','🤍','✨'].map(e => `<button class="react-e">${e}</button>`).join('');
  d.append(sp, ts, rc); area.appendChild(d); scrollMsg(area);
  let i = 0;
  const spd = Math.max(15, Math.min(34, 2200 / txt.length));
  (function tick() {
    if (i < txt.length) { sp.textContent += txt[i++]; scrollMsg(area); setTimeout(tick, spd); }
    else { ts.textContent = hhMM(); setWave(false); const sb = document.getElementById('send-btn'); if (sb) sb.disabled = false; }
  })();
}
function scrollMsg(el) { if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) el.scrollTop = el.scrollHeight; }

const chatIn  = document.getElementById('chat-in');
const sendBtn = document.getElementById('send-btn');

async function handleSend() {
  const txt = chatIn.value.trim(); if (!txt) return;
  applyMood(detectMood(txt));
  appendUser(txt);
  chatIn.value = ''; chatIn.style.height = 'auto';
  if (sendBtn) sendBtn.disabled = true;
  if (chipsOn) { document.getElementById('chips')?.classList.add('gone'); chipsOn = false; }
  const r = sendBtn?.getBoundingClientRect();
  if (r) spawnBurst(r.left + r.width / 2, r.top + r.height / 2);
  sendBtn?.classList.add('fired');
  setTimeout(() => sendBtn?.classList.remove('fired'), 460);
  setWave(true);
  try {
    const sys = 'You are Sara. A warm, empathetic, non-judgmental listener. Reply in 2-3 sentences max. Be human and gentle. Never use lists.';
    const res = await fetch(`https://text.pollinations.ai/prompt/${encodeURIComponent(sys + ' User: "' + txt + '"')}`);
    const ai = await res.text();
    setWave(false);
    setTimeout(() => typeBot(ai.trim()), 280);
  } catch {
    setWave(false);
    typeBot("I'm right here 🌸 The connection wavered but I didn't go anywhere.");
    if (sendBtn) sendBtn.disabled = false;
  }
}

sendBtn?.addEventListener('click', handleSend);
chatIn?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });
chatIn?.addEventListener('input', () => {
  chatIn.style.height = 'auto';
  chatIn.style.height = Math.min(chatIn.scrollHeight, 110) + 'px';
  if (sendBtn) sendBtn.disabled = chatIn.value.trim() === '';
});
document.querySelectorAll('.chip').forEach(c => {
  c.addEventListener('click', () => { if (!chatIn) return; chatIn.value = c.dataset.msg; if (sendBtn) sendBtn.disabled = false; handleSend(); });
});

window.addEventListener('popstate', () => { if (isChatting) doFarewell(); });

function doFarewell() {
  isChatting = false;
  const cw = document.getElementById('chat-wrap');
  const fw = document.getElementById('farewell');

  if (cw) cw.classList.remove('visible');
  setTimeout(() => {
    if (cw) cw.style.display = 'none';
    if (fw) { fw.style.display = 'flex'; setTimeout(() => fw.classList.add('visible'), 30); }

    setTimeout(() => {
      if (fw) fw.classList.remove('visible');
      setTimeout(() => {
        if (fw) fw.style.display = 'none';
        chipsOn = true; chatInited = false;
        const chips = document.getElementById('chips');
        if (chips) chips.classList.remove('gone');
        const msgs = document.getElementById('msgs');
        if (msgs) msgs.innerHTML = '<div class="day-sep"><span>Today</span></div>';
        if (sendBtn) sendBtn.disabled = true;
        setWave(false);
        showHome();
      }, 950);
    }, 3200);
  }, 950);
}

/* ─────────────────────────────────────────────
   2D PARTICLE FIELD
───────────────────────────────────────────── */
function makeParticles(id, cfg) {
  const cv = document.getElementById(id); if (!cv) return;
  const ctx = cv.getContext('2d');
  const c = Object.assign({ count: 48, speed: .24, size: 1.2, opacity: .28, color: '232,133,154', connected: true, dist: 115 }, cfg);
  let W = 0, H = 0;
  function resize() { W = cv.width = cv.offsetWidth || window.innerWidth; H = cv.height = cv.offsetHeight || window.innerHeight; }
  resize(); new ResizeObserver(resize).observe(cv);
  const pts = [];
  for (let i = 0; i < c.count; i++) pts.push({
    x: rand(0, W || 800), y: rand(0, H || 600),
    vx: (Math.random() - .5) * c.speed, vy: (Math.random() - .5) * c.speed,
    r: .4 + Math.random() * c.size, o: .06 + Math.random() * c.opacity,
  });
  (function draw() {
    requestAnimationFrame(draw);
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; else if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; else if (p.y > H) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c.color},${p.o})`; ctx.fill();
      if (c.connected) {
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j], d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < c.dist) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(${c.color},${(1 - d / c.dist) * .06})`; ctx.lineWidth = .5; ctx.stroke();
          }
        }
      }
    }
  })();
}

/* ─────────────────────────────────────────────
   BOOT
───────────────────────────────────────────── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(startIntro, 200));
} else {
  setTimeout(startIntro, 200);
}

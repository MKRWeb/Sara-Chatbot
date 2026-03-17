/* ═══════════════════════════════════════════════════════════════════
   SARA — Full Engine
   Technologies used:
     • Three.js r128     — WebGL scene rendering
     • GLSL shaders      — Sky gradient, water caustics, god rays
     • Canvas 2D         — Particle systems (home + chat bg)
     • Spring physics    — Natural floating object motion
     • CSS clip-mask     — Word-reveal (no overlap, guaranteed)
     • Web Animations API— Precise word timing
     • Fetch API         — Sara AI responses
═══════════════════════════════════════════════════════════════════ */
'use strict';

/* ─────────────────────────────────────────────
   CURSOR
───────────────────────────────────────────── */
;(function () {
  const dot  = document.getElementById('c-dot');
  const ring = document.getElementById('c-ring');
  let mx = -200, my = -200, rx = -200, ry = -200;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  (function loop() {
    rx += (mx - rx) * 0.11;
    ry += (my - ry) * 0.11;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
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
const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand  = (a, b) => a + Math.random() * (b - a);

/* ─────────────────────────────────────────────
   SPRING PHYSICS
   Each floating object has a spring that
   gives natural, organic, non-repeating motion
───────────────────────────────────────────── */
class Spring {
  constructor(stiffness = 0.04, damping = 0.18) {
    this.val = 0; this.vel = 0; this.target = 0;
    this.k   = stiffness;
    this.d   = damping;
  }
  tick() {
    const f = (this.target - this.val) * this.k - this.vel * this.d;
    this.vel += f;
    this.val += this.vel;
    return this.val;
  }
}

/* ─────────────────────────────────────────────
   FLOATING OBJECT PHYSICS
   Each object has X, Y, Z springs + rotation springs
   Noise-driven targets give natural non-repeating drift
───────────────────────────────────────────── */
class FloatPhysics {
  constructor(opts = {}) {
    this.sx = new Spring(0.028 + rand(0, 0.01), 0.14 + rand(0, 0.06));
    this.sy = new Spring(0.022 + rand(0, 0.01), 0.12 + rand(0, 0.06));
    this.sr = new Spring(0.018,                  0.10);
    this.phase = rand(0, Math.PI * 2);
    this.freq  = rand(0.0004, 0.0009);
    this.amp   = { x: rand(0.3, 0.7), y: rand(0.4, 0.9), r: rand(0.015, 0.06) };
    this.base  = { x: opts.x || 0, y: opts.y || 0 };
    this.t = 0;
  }
  update(dt) {
    this.t += dt;
    const t   = this.t;
    // Multi-frequency noise for non-repeating organic motion
    const nx  = Math.sin(t * this.freq * 1000 + this.phase)          * this.amp.x
              + Math.sin(t * this.freq * 1000 * 1.618 + this.phase * 1.3) * this.amp.x * 0.4;
    const ny  = Math.sin(t * this.freq * 1000 * 0.8 + this.phase * 1.7) * this.amp.y
              + Math.cos(t * this.freq * 1000 * 1.2 + this.phase * 0.9)  * this.amp.y * 0.35;
    const nr  = Math.sin(t * this.freq * 1000 * 0.6 + this.phase * 2)    * this.amp.r;
    this.sx.target = this.base.x + nx;
    this.sy.target = this.base.y + ny;
    this.sr.target = nr;
    return {
      x: this.sx.tick(),
      y: this.sy.tick(),
      r: this.sr.tick()
    };
  }
}

/* ─────────────────────────────────────────────
   THREE.JS WEBGL ENGINE
   Single renderer, scene switched via uniforms
───────────────────────────────────────────── */
const canvas   = document.getElementById('main-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 300);
camera.position.set(0, 0, 12);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ─────────────────────────────────────────────
   BACKGROUND SHADER PLANE
   Procedural sky + water + underwater gradient
   Pure GLSL — no textures needed
───────────────────────────────────────────── */
const bgMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:      { value: 0 },
    uScene:     { value: 0 },   // 0=sky 1=dive 2=deep 3=meet
    uTransition:{ value: 0 },   // 0→1 fade between scenes
    uRes:       { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform float uTime;
    uniform float uScene;
    uniform float uTransition;
    uniform vec2  uRes;
    varying vec2  vUv;

    /* Smooth noise */
    float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.545); }
    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p);
      f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                 mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
    }
    float fbm(vec2 p){
      float v=0.,a=.5;
      for(int i=0;i<5;i++,a*=.5) v+=a*noise(p);
      p=p*2.+.5; return v;
    }

    /* ── SCENE 0 — Pink Sky ── */
    vec3 sceneSky(vec2 uv){
      vec3 topCol  = vec3(.72,.62,.82);   /* lavender */
      vec3 midCol  = vec3(.90,.72,.78);   /* rose */
      vec3 botCol  = vec3(.95,.82,.72);   /* warm peach horizon */
      vec3 sky     = mix(botCol, mix(midCol,topCol,uv.y), pow(uv.y,.6));

      /* Soft cloud wisps */
      float clouds = fbm(uv*3.5 + vec2(uTime*.018,0.)) * .5
                   + fbm(uv*6.  + vec2(-uTime*.01,.02))* .25;
      clouds       = smoothstep(.42,.58,clouds) * .22;
      sky          = mix(sky, vec3(.98,.95,.97), clouds);

      /* Warm light bloom near horizon */
      float bloom  = exp(-pow((uv.y-.18)*5., 2.)) * .35;
      sky         += vec3(1.,.85,.6) * bloom;

      /* Subtle water shimmer at bottom */
      float wShim  = abs(sin(uv.x*40.+uTime*2.2)) * .03
                   * smoothstep(.22,.08,uv.y);
      sky         += wShim;

      return sky;
    }

    /* ── SCENE 1 — Dive / Surface ── */
    vec3 sceneDive(vec2 uv){
      vec3 topCol = vec3(.58,.52,.72);
      vec3 botCol = vec3(.32,.22,.48);
      vec3 col    = mix(botCol, topCol, uv.y);

      /* Water refraction lines */
      float ref   = sin(uv.x*28.+uTime*1.8) * sin(uv.y*12.+uTime*.9) * .04;
      col        += ref;

      /* Light caustics from above */
      float caus  = fbm(uv*8. + vec2(uTime*.12, uTime*.09));
      caus        = pow(caus,.8) * .12 * (1.-uv.y);
      col        += caus * vec3(.8,.7,1.);

      return col;
    }

    /* ── SCENE 2 — Deep Water ── */
    vec3 sceneDeep(vec2 uv){
      vec3 topCol = vec3(.10,.04,.22);
      vec3 midCol = vec3(.18,.07,.40);
      vec3 botCol = vec3(.08,.02,.16);
      vec3 col    = mix(botCol, mix(midCol,topCol,uv.y), pow(uv.y,.5));

      /* Volumetric light shafts — god rays */
      float rays  = 0.;
      for(int i=0;i<5;i++){
        float fi   = float(i);
        float cx   = .2+fi*.15 + sin(uTime*.04+fi*1.2)*.04;
        float dx   = uv.x - cx;
        float ang  = dx/(uv.y+.01+fi*.06);
        float ray  = exp(-ang*ang*80.) * (1.-uv.y);
        ray       *= smoothstep(.7,0.,uv.y) * (.5+.5*sin(uTime*.3+fi));
        rays      += ray;
      }
      col += rays * vec3(.55,.35,.9) * .4;

      /* Water caustics on surfaces */
      float caus  = fbm(uv*12.+vec2(uTime*.08,-uTime*.06));
      caus       *= fbm(uv*8. -vec2(uTime*.05, uTime*.07));
      caus        = pow(caus,1.5) * .18;
      col        += caus * vec3(.5,.3,.85);

      /* Bioluminescent shimmer */
      float bio   = noise(uv*20.+vec2(uTime*.4,0.));
      bio         = pow(bio,6.) * .35;
      col        += bio * vec3(.4,.2,.9);

      return col;
    }

    /* ── SCENE 3 — Meet Sara ── */
    vec3 sceneMeet(vec2 uv){
      vec3 col = mix(vec3(.04,.02,.10), vec3(.08,.04,.18), uv.y);
      float glow = exp(-length(uv-vec2(.5,.5))*2.5) * .4;
      col += glow * vec3(.4,.3,.8);
      /* Particle stars */
      float stars = noise(uv*180.+uTime*.05);
      stars = step(.94,stars) * .6;
      col += stars * vec3(.8,.8,1.);
      return col;
    }

    void main(){
      vec2 uv = vUv;
      int s   = int(uScene);
      vec3 col;

      if(s==0) col = sceneSky(uv);
      else if(s==1) col = mix(sceneSky(uv), sceneDive(uv), uTransition);
      else if(s==2) col = mix(sceneDive(uv),sceneDeep(uv),uTransition);
      else           col = mix(sceneDeep(uv),sceneMeet(uv),uTransition);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
  depthTest:  false,
  depthWrite: false,
});
const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
bgMesh.frustumCulled = false;
scene.add(bgMesh);

/* ─────────────────────────────────────────────
   FLOATING 3D OBJECTS
   Built from Three.js primitives with custom materials
   Reference video: stone column, stepping stones,
   conch, oyster+pearl, rock, bubbles
───────────────────────────────────────────── */
const objectGroup = new THREE.Group();
scene.add(objectGroup);

/* Stone material — roughcast look */
const stoneMat = new THREE.MeshStandardMaterial({
  color: 0xb0a898, roughness: 0.85, metalness: 0.05,
  envMapIntensity: 0.5
});

/* Lights */
const ambLight  = new THREE.AmbientLight(0xf0e0e8, 0.7);
const sunLight  = new THREE.DirectionalLight(0xffe8d8, 1.4);
sunLight.position.set(3, 8, 5);
const fillLight = new THREE.DirectionalLight(0xd0c0e8, 0.5);
fillLight.position.set(-5, 2, -3);
const deepLight = new THREE.PointLight(0x8040cc, 0, 14);
deepLight.position.set(0, 2, 3);
scene.add(ambLight, sunLight, fillLight, deepLight);

/* ── Stone Column ── */
const colGroup = new THREE.Group();
const colBody  = new THREE.Mesh(new THREE.CylinderGeometry(.32,.36,1.8,10), stoneMat);
const colCap   = new THREE.Mesh(new THREE.BoxGeometry(.78,.18,.78), stoneMat.clone());
colCap.position.y = .99;
colGroup.add(colBody, colCap);
colGroup.position.set(-3.4, .4, 1.8);
colGroup.rotation.z = .12;
objectGroup.add(colGroup);

/* ── Stepping Stones ── */
const stoneData = [
  { x: -1.4, y: -1.1, z: 2.8, rx: .08, rz: .05, w: 1.1, h: .12, d: .65 },
  { x:  0.1, y: -1.0, z: 2.2, rx: .04, rz: -.06,w: .9,  h: .10, d: .55 },
  { x:  1.4, y: -1.1, z: 1.6, rx: .06, rz: .08, w: .75, h: .11, d: .48 },
];
const stoneMeshes = stoneData.map(d => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(d.w, d.h, d.d), stoneMat);
  m.position.set(d.x, d.y, d.z);
  m.rotation.set(d.rx, rand(0, .2), d.rz);
  objectGroup.add(m);
  return m;
});

/* ── Conch Shell (Lathe geometry) ── */
const conchPts = [];
for (let i = 0; i < 22; i++) {
  const t  = i / 21;
  const r  = (.04 + t * .44) * Math.pow(Math.sin(t * Math.PI), .72);
  conchPts.push(new THREE.Vector2(r, t * 1.28 - .08));
}
const conchMat = new THREE.MeshStandardMaterial({
  color: 0xf5c8a0, roughness: .26, metalness: .22, side: THREE.DoubleSide
});
const conch = new THREE.Mesh(new THREE.LatheGeometry(conchPts, 14, 0, Math.PI * 1.88), conchMat);
conch.position.set(3.3, .7, 1.6);
conch.rotation.set(.28, -.42, .16);
objectGroup.add(conch);

/* ── Rock Fragment ── */
const rockGeo = new THREE.DodecahedronGeometry(.52, 0);
const rockVerts = rockGeo.attributes.position;
for (let i = 0; i < rockVerts.count; i++) {
  rockVerts.setXYZ(i,
    rockVerts.getX(i) * (1 + rand(-.18, .18)),
    rockVerts.getY(i) * (1 + rand(-.18, .18)),
    rockVerts.getZ(i) * (1 + rand(-.18, .18))
  );
}
rockGeo.computeVertexNormals();
const rock = new THREE.Mesh(rockGeo, stoneMat);
rock.position.set(-1.2, 1.8, .8);
rock.rotation.set(rand(0, 1), rand(0, 1), rand(0, 1));
objectGroup.add(rock);

/* ── Oyster Shell + Pearl ── */
const oysterGroup = new THREE.Group();
const shellPts = [];
for (let i = 0; i < 14; i++) {
  const t = i / 13;
  shellPts.push(new THREE.Vector2(t * .78, Math.sin(t * Math.PI) * .3));
}
const shellMat = new THREE.MeshStandardMaterial({
  color: 0xd0cac4, roughness: .38, metalness: .32, side: THREE.DoubleSide
});
const shellGeo  = new THREE.LatheGeometry(shellPts, 18);
const shellBot  = new THREE.Mesh(shellGeo, shellMat);
const shellTop  = new THREE.Mesh(shellGeo, shellMat);
shellTop.rotation.x = -.7;
const pearl = new THREE.Mesh(
  new THREE.SphereGeometry(.19, 20, 20),
  new THREE.MeshStandardMaterial({
    color: 0xfaf6ef, roughness: .06, metalness: .74,
    emissive: 0xfff4d8, emissiveIntensity: .45
  })
);
pearl.position.y = .14;
oysterGroup.add(shellBot, shellTop, pearl);
oysterGroup.position.set(.6, 1.2, 3.2);
oysterGroup.rotation.y = .35;
objectGroup.add(oysterGroup);

/* ── Bubbles (glass spheres) ── */
const bubbleMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, roughness: .04, metalness: 0,
  transmission: .96, thickness: .5,
  reflectivity: .4, clearcoat: 1
});
const bubbleData = [
  { x: 2.8, y: 1.0, z: 1.4, r: .28 },
  { x: -.8, y: 2.2, z: 1.0, r: .18 },
];
const bubbleMeshes = bubbleData.map(d => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(d.r, 22, 22), bubbleMat);
  m.position.set(d.x, d.y, d.z);
  objectGroup.add(m);
  return m;
});

/* ── Physics instances for each object ── */
const physics = {
  col:    new FloatPhysics({ x: -3.4, y: .4 }),
  s0:     new FloatPhysics({ x: -1.4, y: -1.1 }),
  s1:     new FloatPhysics({ x:  0.1, y: -1.0 }),
  s2:     new FloatPhysics({ x:  1.4, y: -1.1 }),
  conch:  new FloatPhysics({ x:  3.3, y: .7 }),
  rock:   new FloatPhysics({ x: -1.2, y: 1.8 }),
  oyster: new FloatPhysics({ x:  .6,  y: 1.2 }),
  bub0:   new FloatPhysics({ x:  2.8, y: 1.0 }),
  bub1:   new FloatPhysics({ x: -.8,  y: 2.2 }),
};

/* ── Underwater particle system (Three.js Points) ── */
const UW_COUNT = 180;
const uwGeo    = new THREE.BufferGeometry();
const uwPos    = new Float32Array(UW_COUNT * 3);
const uwSpd    = new Float32Array(UW_COUNT);
const uwSize   = new Float32Array(UW_COUNT);
for (let i = 0; i < UW_COUNT; i++) {
  uwPos[i*3]   = rand(-10, 10);
  uwPos[i*3+1] = rand(-6, 6);
  uwPos[i*3+2] = rand(-5, 5);
  uwSpd[i]     = rand(.004, .016);
  uwSize[i]    = rand(.04, .14);
}
uwGeo.setAttribute('position', new THREE.BufferAttribute(uwPos, 3));
const uwMat = new THREE.PointsMaterial({
  size: .08, color: 0xaaaaff, transparent: true, opacity: 0,
  depthWrite: false, blending: THREE.AdditiveBlending
});
const uwParticles = new THREE.Points(uwGeo, uwMat);
scene.add(uwParticles);

/* ─────────────────────────────────────────────
   CAMERA ANIMATION PATH
   Keyframed positions driven by sceneProgress
───────────────────────────────────────────── */
const CAM_PATH = [
  // [sceneT, px,  py,   pz,   lookX, lookY, lookZ]
  [0.00,   0,   0,    12,    0,     0,     0  ],
  [0.15,   0,   .3,   10.5,  0,     .1,    0  ],
  [0.28,   .5,  .1,   9,     0,     0,     -.5],
  [0.50,  -.3, -.4,   7,     0,    -.2,   -1  ],
  [0.68,   0,  -.8,   5.5,   0,    -.5,   -1.5],
  [0.85,   0,  -1.2,  4,     0,    -.8,   -2  ],
  [1.00,   0,  -1.5,  3,     0,    -1.0,  -2  ],
];

function getCamAt(t) {
  let i = 0;
  while (i < CAM_PATH.length - 2 && CAM_PATH[i+1][0] <= t) i++;
  const a = CAM_PATH[i], b = CAM_PATH[i+1];
  const f = smoothstep(clamp((t - a[0]) / (b[0] - a[0]), 0, 1));
  return {
    px: lerp(a[1], b[1], f), py: lerp(a[2], b[2], f), pz: lerp(a[3], b[3], f),
    lx: lerp(a[4], b[4], f), ly: lerp(a[5], b[5], f), lz: lerp(a[6], b[6], f),
  };
}
function smoothstep(t) { return t * t * (3 - 2 * t); }

/* ─────────────────────────────────────────────
   WORD-REVEAL ENGINE
   Based on the reference video's exact animation:
   — Words clip-masked, slide UP from translateY(105%)
   — Web Animations API for precise timing
   — Sequential per word (stagger 65ms)
   — Exit: slide UP and OUT (-108%)
───────────────────────────────────────────── */
const W_STAGGER  = 65;   // ms between words
const W_IN_DUR   = 760;  // ms per word entry
const W_OUT_DUR  = 460;  // ms per word exit
const W_EASING   = 'cubic-bezier(0.22,1,0.36,1)';
const W_EASE_OUT = 'cubic-bezier(0.55,0,1,0.45)';

function getWords(hlId) {
  return [...document.querySelectorAll(`#${hlId} .w`)];
}

function revealWords(hlId, onDone) {
  const words = getWords(hlId);
  if (!words.length) { if (onDone) onDone(); return; }

  // Reset all
  words.forEach(w => {
    w.style.transition = 'none';
    w.style.transform  = 'translateY(108%)';
    w.style.opacity    = '0';
  });

  // Stagger each word upward
  let lastEnd = 0;
  words.forEach((w, i) => {
    const delay = i * W_STAGGER;
    lastEnd = delay + W_IN_DUR;
    setTimeout(() => {
      w.style.transition = `transform ${W_IN_DUR}ms ${W_EASING},
                            opacity 80ms ease`;
      w.style.transform  = 'translateY(0)';
      w.style.opacity    = '1';
    }, delay);
  });

  if (onDone) setTimeout(onDone, lastEnd);
}

function exitWords(hlId, onDone) {
  const words = getWords(hlId);
  if (!words.length) { if (onDone) onDone(); return; }

  let lastEnd = 0;
  words.forEach((w, i) => {
    const delay = i * 42;
    lastEnd = delay + W_OUT_DUR;
    setTimeout(() => {
      w.style.transition = `transform ${W_OUT_DUR}ms ${W_EASE_OUT},
                            opacity ${W_OUT_DUR}ms ease`;
      w.style.transform  = 'translateY(-110%)';
      w.style.opacity    = '0';
    }, delay);
  });

  if (onDone) setTimeout(onDone, lastEnd);
}

/* ─────────────────────────────────────────────
   PROGRESS BAR
───────────────────────────────────────────── */
const progFill = document.getElementById('prog-fill');
function setProgress(p) {
  if (progFill) progFill.style.width = clamp(p, 0, 100) + '%';
}

/* ─────────────────────────────────────────────
   SCENE TIMING
───────────────────────────────────────────── */
const HOLD = { s0: 3400, s1: 2800, s2: 3200, s3: 2400 };
// Total scene duration used for camera progress
const TOTAL_DUR = 22000; // ms

/* ─────────────────────────────────────────────
   MAIN RENDER LOOP VARIABLES
───────────────────────────────────────────── */
let clockTime      = 0;     // seconds since render started
let sceneProgress  = 0;     // 0→1 over TOTAL_DUR
let bgSceneIdx     = 0;     // which scene background
let bgTransition   = 0;     // 0→1 cross-fade progress
const camLookTarget= new THREE.Vector3();
let lastFrameTime  = performance.now();

/* ─────────────────────────────────────────────
   RENDER LOOP
───────────────────────────────────────────── */
function renderLoop(now) {
  requestAnimationFrame(renderLoop);
  const dt  = Math.min((now - lastFrameTime) / 1000, .05);
  lastFrameTime = now;
  clockTime += dt;

  /* Update background uniforms */
  bgMat.uniforms.uTime.value       = clockTime;
  bgMat.uniforms.uScene.value      = bgSceneIdx;
  bgMat.uniforms.uTransition.value = bgTransition;

  /* Camera path */
  const cp = getCamAt(clamp(sceneProgress, 0, 1));
  camera.position.set(cp.px, cp.py, cp.pz);
  camLookTarget.x += (cp.lx - camLookTarget.x) * .07;
  camLookTarget.y += (cp.ly - camLookTarget.y) * .07;
  camLookTarget.z += (cp.lz - camLookTarget.z) * .07;
  camera.lookAt(camLookTarget);

  /* Floating object physics */
  const pCol    = physics.col.update(dt);
  const pS0     = physics.s0.update(dt);
  const pS1     = physics.s1.update(dt);
  const pS2     = physics.s2.update(dt);
  const pConch  = physics.conch.update(dt);
  const pRock   = physics.rock.update(dt);
  const pOyster = physics.oyster.update(dt);
  const pB0     = physics.bub0.update(dt);
  const pB1     = physics.bub1.update(dt);

  colGroup.position.y    = .4 + pCol.y;    colGroup.rotation.z = .12 + pCol.r;
  stoneMeshes[0].position.y = -1.1 + pS0.y;
  stoneMeshes[1].position.y = -1.0 + pS1.y;
  stoneMeshes[2].position.y = -1.1 + pS2.y;
  conch.position.y         = .7 + pConch.y;   conch.rotation.y += .004;
  rock.position.y          = 1.8 + pRock.y;   rock.rotation.y  += .003;
  oysterGroup.position.y   = 1.2 + pOyster.y; oysterGroup.rotation.y += .0035;
  pearl.material.emissiveIntensity = .38 + Math.sin(clockTime * 2.2) * .18;
  bubbleMeshes[0].position.y = 1.0 + pB0.y;
  bubbleMeshes[1].position.y = 2.2 + pB1.y;

  /* Fade hero objects on scene progress */
  const heroAlpha = clamp(1 - sceneProgress * 5, 0, 1);
  objectGroup.traverse(child => {
    if (child.material) {
      child.material.transparent = true;
      child.material.opacity = heroAlpha;
    }
  });

  /* Underwater particles */
  const uwAlpha = clamp((sceneProgress - .35) * 4, 0, .75);
  uwMat.opacity = uwAlpha;
  if (uwAlpha > .01) {
    const pos = uwGeo.attributes.position;
    for (let i = 0; i < UW_COUNT; i++) {
      pos.setY(i, pos.getY(i) + uwSpd[i]);
      if (pos.getY(i) > 7) pos.setY(i, -6);
    }
    pos.needsUpdate = true;
  }

  /* Deep water point light */
  deepLight.intensity = clamp((sceneProgress - .4) * 4, 0, 3);

  /* Adjust lighting for depth */
  ambLight.intensity  = lerp(.7, .15, clamp(sceneProgress * 3, 0, 1));
  sunLight.intensity  = lerp(1.4, .05, clamp(sceneProgress * 5, 0, 1));

  renderer.render(scene, camera);
}
renderLoop(performance.now());

/* ─────────────────────────────────────────────
   INTRO SEQUENCE CONTROLLER
   Strict state machine — NO overlapping
───────────────────────────────────────────── */
function runIntroSequence() {
  const nav = document.getElementById('main-nav');
  const introWrap = document.getElementById('intro-wrap');

  // Show nav
  setTimeout(() => nav && nav.classList.add('show'), 700);

  /* Track total elapsed for camera progress */
  const startTime = performance.now();
  const progressTracker = setInterval(() => {
    const elapsed   = performance.now() - startTime;
    sceneProgress   = clamp(elapsed / TOTAL_DUR, 0, 1);
    setProgress(sceneProgress * 100);
    if (sceneProgress >= 1) clearInterval(progressTracker);
  }, 16);

  /* ── SCENE 0: Sky ── */
  setProgress(0);
  revealWords('hl-1', () => {
    setProgress(22);
    // Hold
    setTimeout(() => {
      // Exit scene 0 words, transition bg to scene 1
      exitWords('hl-1', () => {
        bgSceneIdx  = 1;
        bgTransition = 0;
        // Animate transition 0→1
        animateValue(0, 1, 900, v => bgTransition = v, () => {
          bgSceneIdx = 2; bgTransition = 0;
          setProgress(45);

          /* ── SCENE 1: Dive ── */
          revealWords('hl-2', () => {
            setProgress(52);
            setTimeout(() => {
              exitWords('hl-2', () => {
                animateValue(0, 1, 900, v => bgTransition = v, () => {
                  bgSceneIdx = 3; bgTransition = 0;
                  setProgress(68);

                  /* ── SCENE 2: Deep ── */
                  revealWords('hl-3', () => {
                    setProgress(76);
                    setTimeout(() => {
                      exitWords('hl-3', () => {
                        animateValue(0, 1, 900, v => bgTransition = v, () => {
                          bgSceneIdx = 4; bgTransition = 1;
                          setProgress(88);

                          /* ── SCENE 3: Meet Sara ── */
                          revealWords('hl-4', () => {
                            setProgress(100);
                            // Hold then go to home
                            setTimeout(() => {
                              exitWords('hl-4', () => {
                                // Fade out entire intro
                                if (introWrap) {
                                  introWrap.style.transition = 'opacity 1.1s ease';
                                  introWrap.style.opacity    = '0';
                                }
                                if (nav) {
                                  nav.style.transition = 'opacity .8s ease';
                                  nav.style.opacity    = '0';
                                }
                                clearInterval(progressTracker);
                                setTimeout(showSaraHome, 700);
                              });
                            }, HOLD.s3);
                          });
                        });
                      });
                    }, HOLD.s2);
                  });
                });
              });
            }, HOLD.s1);
          });
        });
      });
    }, HOLD.s0);
  });
}

/* ─────────────────────────────────────────────
   ANIMATE VALUE HELPER
   Linear interpolation over time (no CSS needed)
───────────────────────────────────────────── */
function animateValue(from, to, duration, onUpdate, onDone) {
  const start = performance.now();
  function tick(now) {
    const t = clamp((now - start) / duration, 0, 1);
    onUpdate(lerp(from, to, smoothstep(t)));
    if (t < 1) requestAnimationFrame(tick);
    else if (onDone) onDone();
  }
  requestAnimationFrame(tick);
}

/* ─────────────────────────────────────────────
   2D CANVAS PARTICLE FIELD
   Used for home and chat backgrounds
───────────────────────────────────────────── */
function makeParticleField(canvasId, cfg = {}) {
  const cv  = document.getElementById(canvasId);
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const c   = Object.assign({
    count: 48, speed: .24, size: 1.2, opacity: .28,
    color: '80,140,82', connected: true, dist: 115
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
  home.classList.remove('phase-off');
  home.classList.add('phase-in');
  makeParticleField('home-canvas', { count: 42, speed: .18, opacity: .22, color: '80,140,82', connected: true, dist: 125 });
}

const sayHelloBtn = document.getElementById('say-hello-btn');
if (sayHelloBtn) {
  sayHelloBtn.addEventListener('click', () => {
    const home = document.getElementById('sara-home');
    if (home) { home.style.transition = 'opacity .6s ease'; home.style.opacity = '0'; home.style.pointerEvents = 'none'; }
    setTimeout(() => {
      if (home) home.classList.add('phase-off');
      history.pushState({ page: 'chat' }, '', '#chat');
      openChat();
    }, 600);
  });
}

/* ─────────────────────────────────────────────
   CHAT
───────────────────────────────────────────── */
let isChatting = false, chipsOn = true, chatInit = false;

function openChat() {
  isChatting = true;
  const cw = document.getElementById('chat-wrap');
  if (!cw) return;
  cw.classList.remove('phase-off');
  cw.classList.add('phase-in');
  if (!chatInit) {
    makeParticleField('chat-canvas', { count: 36, speed: .2, opacity: .18, color: '80,140,82', connected: true, dist: 105 });
    chatInit = true;
  }
  setWave(true);
  setTimeout(() => {
    setWave(false);
    typeBot("Hi there 🌿 I'm Sara. This is your quiet space — no rush, no judgment. What's been on your mind lately?");
  }, 1500);
}

/* Status */
const statusTxt = document.getElementById('hdr-stxt');
const vwave     = document.getElementById('vwave');
function setWave(on) {
  vwave && vwave.classList.toggle('on', on);
  if (statusTxt) statusTxt.textContent = on ? 'Thinking…' : 'Listening';
}
function setWriting() { if (statusTxt) statusTxt.textContent = 'Writing…'; }

/* Mood */
const MOODS = [
  { w:['anxi','panic','scar','fear','worri'],        ic:'🌧', lb:'Tender'   },
  { w:['sad','cry','depress','lone','empty'],         ic:'🌙', lb:'Gentle'   },
  { w:['ang','mad','furi','frustrat','annoy'],        ic:'🔥', lb:'Heated'   },
  { w:['happ','joy','excit','grat','thank','amaz'],   ic:'🌻', lb:'Warm'     },
  { w:['tired','exhaust','sleep','drain'],            ic:'🍃', lb:'Resting'  },
  { w:['overthink','stress','overwhelm'],             ic:'🌀', lb:'Swirling' },
];
function detectMood(t) {
  const s = t.toLowerCase();
  for (const m of MOODS) if (m.w.some(w => s.includes(w))) return m;
  return { ic:'🌿', lb:'Calm' };
}
function applyMood(m) {
  const i = document.getElementById('mood-ico');
  const l = document.getElementById('mood-lbl');
  if (i) { i.style.transform='scale(1.7)'; i.textContent=m.ic; setTimeout(()=>i.style.transform='',400); }
  if (l) l.textContent = m.lb;
}

/* Burst */
function spawnBurst(x, y) {
  const cols = ['#4a8a50','#a0d4a4','#c8f0ca','#fff','#b0e0b5'];
  for (let i = 0; i < 13; i++) {
    const el  = document.createElement('div');
    el.className = 'burst';
    const sz  = 3 + Math.random() * 5;
    const ang = (i / 13) * Math.PI * 2;
    const d   = 32 + Math.random() * 44;
    el.style.cssText = `left:${x}px;top:${y}px;width:${sz}px;height:${sz}px;`
      + `background:${cols[i%cols.length]};`
      + `--tx:${Math.cos(ang)*d}px;--ty:${Math.sin(ang)*d}px;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }
}

/* Helpers */
function hhMM() {
  const d = new Date();
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function appendUserMsg(txt) {
  const area = document.getElementById('msgs');
  const d    = document.createElement('div');
  d.className = 'msg user';
  d.innerHTML = `<span>${esc(txt)}</span><span class="msg-ts">${hhMM()}</span>`
    + `<div class="msg-reacts">${['🌿','💚','🤍','✨'].map(e=>`<button class="react-e">${e}</button>`).join('')}</div>`;
  area.appendChild(d);
  smartScroll(area);
}

function typeBot(txt) {
  const area = document.getElementById('msgs');
  setWriting();
  const d    = document.createElement('div');
  d.className = 'msg bot';
  const sp   = document.createElement('span');
  const ts   = document.createElement('span');
  ts.className = 'msg-ts';
  const rcts = document.createElement('div');
  rcts.className = 'msg-reacts';
  rcts.innerHTML = ['🌿','💚','🤍','✨'].map(e=>`<button class="react-e">${e}</button>`).join('');
  d.append(sp, ts, rcts);
  area.appendChild(d);
  smartScroll(area);

  let i = 0;
  const speed = Math.max(15, Math.min(34, 2200 / txt.length));
  (function tick() {
    if (i < txt.length) { sp.textContent += txt[i++]; smartScroll(area); setTimeout(tick, speed); }
    else { ts.textContent = hhMM(); setWave(false); }
  })();
}

function smartScroll(el) {
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) el.scrollTop = el.scrollHeight;
}

/* Send */
const chatIn  = document.getElementById('chat-in');
const sendBtn = document.getElementById('send-btn');

async function handleSend() {
  const txt = chatIn.value.trim();
  if (!txt) return;
  applyMood(detectMood(txt));
  appendUserMsg(txt);
  chatIn.value = ''; chatIn.style.height = 'auto';
  sendBtn.disabled = true;
  if (chipsOn) { document.getElementById('chips')?.classList.add('gone'); chipsOn = false; }
  const r = sendBtn.getBoundingClientRect();
  spawnBurst(r.left + r.width/2, r.top + r.height/2);
  sendBtn.classList.add('fired');
  setTimeout(() => sendBtn.classList.remove('fired'), 460);
  setWave(true);
  try {
    const sys = 'You are Sara. A warm, empathetic, non-judgmental listener. Reply in 2-3 sentences max. Be human and gentle. Never use lists.';
    const res = await fetch(`https://text.pollinations.ai/prompt/${encodeURIComponent(sys + ' User: "' + txt + '"')}`);
    const ai  = await res.text();
    setWave(false);
    setTimeout(() => typeBot(ai.trim()), 280);
  } catch {
    setWave(false);
    typeBot("I'm right here 🌿 The connection wavered but I didn't go anywhere.");
  }
}
sendBtn?.addEventListener('click', handleSend);
chatIn?.addEventListener('keydown', e => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();} });
chatIn?.addEventListener('input', () => {
  chatIn.style.height='auto';
  chatIn.style.height=Math.min(chatIn.scrollHeight,110)+'px';
  sendBtn.disabled = chatIn.value.trim()==='';
});
document.querySelectorAll('.chip').forEach(c => {
  c.addEventListener('click', () => { if(!chatIn)return; chatIn.value=c.dataset.msg; sendBtn.disabled=false; handleSend(); });
});

/* Back → farewell */
window.addEventListener('popstate', () => { if (isChatting) doFarewell(); });
function doFarewell() {
  isChatting = false;
  const cw = document.getElementById('chat-wrap');
  const fw = document.getElementById('farewell');
  if (cw) { cw.style.transition='opacity .5s'; cw.style.opacity='0'; }
  if (fw) { fw.classList.remove('phase-off'); fw.classList.add('phase-flex'); }
  setTimeout(() => {
    if (cw) cw.classList.add('phase-off');
    if (fw) { fw.style.transition='opacity 1s'; fw.style.opacity='0'; }
    setTimeout(() => {
      if (fw) { fw.classList.add('phase-off'); fw.style.opacity=''; }
      const h = document.getElementById('sara-home');
      if (h) {
        h.classList.remove('phase-off'); h.style.opacity='0';
        h.classList.add('phase-in');
        requestAnimationFrame(() => { h.style.transition='opacity .8s'; h.style.opacity='1'; });
      }
      setWave(false);
    }, 1000);
  }, 3200);
}

/* ─────────────────────────────────────────────
   BOOT
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Start all words hidden
  document.querySelectorAll('.w').forEach(w => {
    w.style.transform = 'translateY(108%)';
    w.style.opacity   = '0';
  });
  setTimeout(runIntroSequence, 220);
});

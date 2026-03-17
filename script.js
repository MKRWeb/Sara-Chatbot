/* ═══════════════════════════════════════════════════════════
   SARA — Complete Engine
   Visibility rule: ONLY style.display + .visible class used.
   NO phase-off / phase-in / phase-flex classes anywhere.
═══════════════════════════════════════════════════════════ */
'use strict';

/* ────────────────────────────────────────
   SHOW / HIDE HELPERS  (THE ONLY WAY we
   show or hide elements in this entire file)
──────────────────────────────────────────
   showEl(el)  → display:flex, then opacity:1 via .visible
   hideEl(el)  → opacity:0, then display:none after transition
──────────────────────────────────────────────────────────── */
function showEl(el, display) {
  if (!el) return;
  el.style.display = display || 'flex';
  // double-rAF ensures display renders before opacity transition fires
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.add('visible');
    });
  });
}
function hideEl(el, onDone) {
  if (!el) return;
  el.classList.remove('visible');
  // wait for opacity transition (longest is .9s)
  setTimeout(() => {
    el.style.display = 'none';
    if (onDone) onDone();
  }, 950);
}

/* ─────────────────────────────────────────────
   CURSOR
───────────────────────────────────────────── */
;(function () {
  const dot  = document.getElementById('c-dot');
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
const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand  = (a, b) => a + Math.random() * (b - a);
const smooth = t => t * t * (3 - 2 * t);

/* ─────────────────────────────────────────────
   SPRING PHYSICS  (natural floating motion)
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
    this.sx = new Spring(0.028 + rand(0,.01), 0.14 + rand(0,.06));
    this.sy = new Spring(0.022 + rand(0,.01), 0.12 + rand(0,.06));
    this.sr = new Spring(0.018, 0.10);
    this.phase = rand(0, Math.PI * 2);
    this.freq  = rand(0.0004, 0.0009);
    this.amp   = { x: rand(.3,.7), y: rand(.4,.9), r: rand(.015,.06) };
    this.bx = bx || 0; this.by = by || 0; this.t = 0;
  }
  update(dt) {
    this.t += dt;
    const t = this.t * 1000;
    const nx = Math.sin(t*this.freq + this.phase)*this.amp.x
             + Math.sin(t*this.freq*1.618 + this.phase*1.3)*this.amp.x*.4;
    const ny = Math.sin(t*this.freq*.8 + this.phase*1.7)*this.amp.y
             + Math.cos(t*this.freq*1.2 + this.phase*.9)*this.amp.y*.35;
    const nr = Math.sin(t*this.freq*.6 + this.phase*2)*this.amp.r;
    this.sx.target = this.bx + nx;
    this.sy.target = this.by + ny;
    this.sr.target = nr;
    return { x: this.sx.tick(), y: this.sy.tick(), r: this.sr.tick() };
  }
}

/* ─────────────────────────────────────────────
   THREE.JS  WebGL ENGINE
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

/* ── BACKGROUND GLSL SHADER ── */
const bgMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:  { value: 0 },
    uScene: { value: 0 },   // 0=sky 1=dive 2=deep 3=meet
    uBlend: { value: 0 },   // cross-fade 0→1
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }
  `,
  fragmentShader: `
    precision highp float;
    uniform float uTime, uScene, uBlend;
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

    vec3 sky(vec2 uv){
      vec3 col=mix(vec3(.95,.82,.72),mix(vec3(.90,.72,.78),vec3(.72,.62,.82),uv.y),pow(uv.y,.6));
      float clouds=smoothstep(.42,.58,fbm(uv*3.5+vec2(uTime*.018,0.))*.5+fbm(uv*6.-vec2(uTime*.01,0.))*.25)*.22;
      col=mix(col,vec3(.98,.95,.97),clouds);
      col+=vec3(1.,.85,.6)*exp(-pow((uv.y-.18)*5.,2.))*.35;
      col+=abs(sin(uv.x*40.+uTime*2.2))*.03*smoothstep(.22,.08,uv.y);
      return col;
    }
    vec3 dive(vec2 uv){
      vec3 col=mix(vec3(.32,.22,.48),vec3(.58,.52,.72),uv.y);
      col+=sin(uv.x*28.+uTime*1.8)*sin(uv.y*12.+uTime*.9)*.04;
      col+=pow(fbm(uv*8.+vec2(uTime*.12,uTime*.09)),.8)*.12*(1.-uv.y)*vec3(.8,.7,1.);
      return col;
    }
    vec3 deep(vec2 uv){
      vec3 col=mix(vec3(.08,.02,.16),mix(vec3(.18,.07,.40),vec3(.10,.04,.22),uv.y),pow(uv.y,.5));
      float rays=0.;
      for(int i=0;i<5;i++){
        float fi=float(i);
        float cx=.2+fi*.15+sin(uTime*.04+fi*1.2)*.04;
        float ray=exp(-pow((uv.x-cx)/(uv.y+.01+fi*.06),2.)*80.)*(1.-uv.y);
        ray*=smoothstep(.7,0.,uv.y)*(.5+.5*sin(uTime*.3+fi));
        rays+=ray;
      }
      col+=rays*vec3(.55,.35,.9)*.4;
      float caus=pow(fbm(uv*12.+vec2(uTime*.08,-uTime*.06))*fbm(uv*8.-vec2(uTime*.05,uTime*.07)),1.5)*.18;
      col+=caus*vec3(.5,.3,.85);
      col+=step(.94,noise(uv*180.+uTime*.05))*.6*vec3(.8,.8,1.);
      return col;
    }
    vec3 meet(vec2 uv){
      vec3 col=mix(vec3(.04,.02,.10),vec3(.08,.04,.18),uv.y);
      col+=exp(-length(uv-vec2(.5,.5))*2.5)*.4*vec3(.4,.3,.8);
      col+=step(.94,noise(uv*180.+uTime*.05))*.6*vec3(.8,.8,1.);
      return col;
    }

    void main(){
      int s=int(uScene);
      vec3 a,b;
      if(s==0){ a=sky(vUv);  b=dive(vUv); }
      else if(s==1){ a=dive(vUv); b=deep(vUv); }
      else         { a=deep(vUv); b=meet(vUv); }
      gl_FragColor=vec4(mix(a,b,uBlend),1.);
    }
  `,
  depthTest: false, depthWrite: false,
});
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2), bgMat));

/* ── LIGHTS ── */
const ambLight  = new THREE.AmbientLight(0xf0e0e8, 0.7);
const sunLight  = new THREE.DirectionalLight(0xffe8d8, 1.4);
sunLight.position.set(3, 8, 5);
const fillLight = new THREE.DirectionalLight(0xd0c0e8, 0.5);
fillLight.position.set(-5, 2, -3);
const deepLight = new THREE.PointLight(0x8040cc, 0, 14);
deepLight.position.set(0, 2, 3);
scene.add(ambLight, sunLight, fillLight, deepLight);

/* ── STONE MATERIAL ── */
const stoneMat = () => new THREE.MeshStandardMaterial({ color:0xb0a898, roughness:.85, metalness:.05 });

/* ── COLUMN ── */
const colGrp = new THREE.Group();
colGrp.add(new THREE.Mesh(new THREE.CylinderGeometry(.32,.36,1.8,10), stoneMat()));
const colCap = new THREE.Mesh(new THREE.BoxGeometry(.78,.18,.78), stoneMat());
colCap.position.y = .99; colGrp.add(colCap);
colGrp.position.set(-3.4, .4, 1.8); colGrp.rotation.z = .12;
scene.add(colGrp);

/* ── STEPPING STONES ── */
const stoneData = [
  [-1.4,-1.1,2.8, 1.1,.12,.65], [0.1,-1.0,2.2, .9,.10,.55], [1.4,-1.1,1.6, .75,.11,.48]
];
const stones = stoneData.map(d => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(d[3],d[4],d[5]), stoneMat());
  m.position.set(d[0],d[1],d[2]); m.rotation.y = rand(0,.2);
  scene.add(m); return m;
});

/* ── CONCH ── */
const cpts = [];
for(let i=0;i<22;i++){const t=i/21; cpts.push(new THREE.Vector2((.04+t*.44)*Math.pow(Math.sin(t*Math.PI),.72),t*1.28-.08));}
const conch = new THREE.Mesh(
  new THREE.LatheGeometry(cpts,14,0,Math.PI*1.88),
  new THREE.MeshStandardMaterial({color:0xf5c8a0,roughness:.26,metalness:.22,side:THREE.DoubleSide})
);
conch.position.set(3.3,.7,1.6); conch.rotation.set(.28,-.42,.16); scene.add(conch);

/* ── ROCK ── */
const rockGeo = new THREE.DodecahedronGeometry(.52,0);
const rv = rockGeo.attributes.position;
for(let i=0;i<rv.count;i++) rv.setXYZ(i,rv.getX(i)*(1+rand(-.18,.18)),rv.getY(i)*(1+rand(-.18,.18)),rv.getZ(i)*(1+rand(-.18,.18)));
rockGeo.computeVertexNormals();
const rock = new THREE.Mesh(rockGeo, stoneMat());
rock.position.set(-1.2,1.8,.8); rock.rotation.set(rand(0,1),rand(0,1),rand(0,1)); scene.add(rock);

/* ── OYSTER + PEARL ── */
const oGrp = new THREE.Group();
const spts = []; for(let i=0;i<14;i++){const t=i/13;spts.push(new THREE.Vector2(t*.78,Math.sin(t*Math.PI)*.3));}
const sMat = new THREE.MeshStandardMaterial({color:0xd0cac4,roughness:.38,metalness:.32,side:THREE.DoubleSide});
const sGeo = new THREE.LatheGeometry(spts,18);
oGrp.add(new THREE.Mesh(sGeo,sMat));
const sTop = new THREE.Mesh(sGeo,sMat); sTop.rotation.x=-.7; oGrp.add(sTop);
const pearl = new THREE.Mesh(
  new THREE.SphereGeometry(.19,20,20),
  new THREE.MeshStandardMaterial({color:0xfaf6ef,roughness:.06,metalness:.74,emissive:0xfff4d8,emissiveIntensity:.45})
);
pearl.position.y=.14; oGrp.add(pearl);
oGrp.position.set(.6,1.2,3.2); oGrp.rotation.y=.35; scene.add(oGrp);

/* ── BUBBLES ── */
const bubMat = new THREE.MeshStandardMaterial({color:0xd8eef8,roughness:.02,metalness:.0,transparent:true,opacity:.38});
const bubs = [
  new THREE.Mesh(new THREE.SphereGeometry(.28,22,22),bubMat),
  new THREE.Mesh(new THREE.SphereGeometry(.18,22,22),bubMat),
];
bubs[0].position.set(2.8,1.0,1.4); bubs[1].position.set(-.8,2.2,1.0);
bubs.forEach(b => scene.add(b));

/* ── UNDERWATER PARTICLES ── */
const UW_N=180, uwGeo=new THREE.BufferGeometry();
const uwPos=new Float32Array(UW_N*3), uwSpd=new Float32Array(UW_N);
for(let i=0;i<UW_N;i++){
  uwPos[i*3]=rand(-10,10);uwPos[i*3+1]=rand(-6,6);uwPos[i*3+2]=rand(-5,5);
  uwSpd[i]=rand(.004,.016);
}
uwGeo.setAttribute('position',new THREE.BufferAttribute(uwPos,3));
const uwMat=new THREE.PointsMaterial({size:.08,color:0xaaaaff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
scene.add(new THREE.Points(uwGeo,uwMat));

/* ── PHYSICS ── */
const phy = {
  col:new FloatPhysics(-3.4,.4), s0:new FloatPhysics(-1.4,-1.1),
  s1:new FloatPhysics(.1,-1.0),  s2:new FloatPhysics(1.4,-1.1),
  con:new FloatPhysics(3.3,.7),  rock:new FloatPhysics(-1.2,1.8),
  oys:new FloatPhysics(.6,1.2),  b0:new FloatPhysics(2.8,1.0),
  b1:new FloatPhysics(-.8,2.2),
};

/* ── CAMERA PATH ── */
const CAM=[
  [0,.0,  .0, 12,  0,   .0,   0],
  [0,.15, .3, 10.5,0,   .1,   0],
  [0,.28, .1,  9,  0,   .0,  -.5],
  [0,.50,-.4,  7,  0,  -.2,  -1],
  [0,.68,-.8,  5.5,0,  -.5, -1.5],
  [0,.85,-1.2, 4,  0,  -.8,  -2],
  [0,1.0,-1.5, 3,  0, -1.0,  -2],
];
// [px,t,py,pz,...] — actually stored as [px,t,py,pz,lx,ly,lz]
// Re-format:
const KFRAMES=[
  {t:0.00, px:0,py:0,  pz:12, lx:0,ly:0,  lz:0 },
  {t:0.15, px:0,py:.3, pz:10.5,lx:0,ly:.1,lz:0 },
  {t:0.28, px:.5,py:.1,pz:9,  lx:0,ly:0, lz:-.5},
  {t:0.50, px:-.3,py:-.4,pz:7,lx:0,ly:-.2,lz:-1},
  {t:0.68, px:0,py:-.8,pz:5.5,lx:0,ly:-.5,lz:-1.5},
  {t:0.85, px:0,py:-1.2,pz:4, lx:0,ly:-.8,lz:-2},
  {t:1.00, px:0,py:-1.5,pz:3, lx:0,ly:-1.0,lz:-2},
];
function camAt(t){
  let i=0;
  while(i<KFRAMES.length-2 && KFRAMES[i+1].t<=t) i++;
  const a=KFRAMES[i],b=KFRAMES[i+1];
  const f=smooth(clamp((t-a.t)/(b.t-a.t),0,1));
  return{
    px:lerp(a.px,b.px,f),py:lerp(a.py,b.py,f),pz:lerp(a.pz,b.pz,f),
    lx:lerp(a.lx,b.lx,f),ly:lerp(a.ly,b.ly,f),lz:lerp(a.lz,b.lz,f),
  };
}

/* ── RENDER VARS ── */
let clockT=0, sceneProg=0, bgScene=0, bgBlend=0;
const lookTgt=new THREE.Vector3();
let lastT=performance.now();

function renderLoop(now){
  requestAnimationFrame(renderLoop);
  const dt=Math.min((now-lastT)/1000,.05); lastT=now; clockT+=dt;

  bgMat.uniforms.uTime.value=clockT;
  bgMat.uniforms.uScene.value=bgScene;
  bgMat.uniforms.uBlend.value=bgBlend;

  const cp=camAt(clamp(sceneProg,0,1));
  camera.position.set(cp.px,cp.py,cp.pz);
  lookTgt.x+=(cp.lx-lookTgt.x)*.07;
  lookTgt.y+=(cp.ly-lookTgt.y)*.07;
  lookTgt.z+=(cp.lz-lookTgt.z)*.07;
  camera.lookAt(lookTgt);

  const pc=phy.col.update(dt), ps0=phy.s0.update(dt), ps1=phy.s1.update(dt),
        ps2=phy.s2.update(dt), pco=phy.con.update(dt), prk=phy.rock.update(dt),
        poy=phy.oys.update(dt), pb0=phy.b0.update(dt),  pb1=phy.b1.update(dt);

  colGrp.position.y=.4+pc.y; colGrp.rotation.z=.12+pc.r;
  stones[0].position.y=-1.1+ps0.y;
  stones[1].position.y=-1.0+ps1.y;
  stones[2].position.y=-1.1+ps2.y;
  conch.position.y=.7+pco.y; conch.rotation.y+=.004;
  rock.position.y=1.8+prk.y; rock.rotation.y+=.003;
  oGrp.position.y=1.2+poy.y; oGrp.rotation.y+=.0035;
  pearl.material.emissiveIntensity=.38+Math.sin(clockT*2.2)*.18;
  bubs[0].position.y=1.0+pb0.y;
  bubs[1].position.y=2.2+pb1.y;

  const heroAlpha=clamp(1-sceneProg*5,0,1);
  [colGrp,stones[0],stones[1],stones[2],conch,rock,oGrp,bubs[0],bubs[1]].forEach(obj=>{
    obj.traverse(c=>{ if(c.isMesh&&c.material){c.material.transparent=true;c.material.opacity=heroAlpha;} });
  });

  uwMat.opacity=clamp((sceneProg-.35)*4,0,.75);
  if(uwMat.opacity>.01){
    const p=uwGeo.attributes.position;
    for(let i=0;i<UW_N;i++){p.setY(i,p.getY(i)+uwSpd[i]);if(p.getY(i)>7)p.setY(i,-6);}
    p.needsUpdate=true;
  }

  deepLight.intensity=clamp((sceneProg-.4)*4,0,3);
  ambLight.intensity=lerp(.7,.15,clamp(sceneProg*3,0,1));
  sunLight.intensity=lerp(1.4,.05,clamp(sceneProg*5,0,1));

  renderer.render(scene,camera);
}
renderLoop(performance.now());

/* ─────────────────────────────────────────────
   WORD-REVEAL ENGINE
   Each .wm has overflow:hidden (clip boundary).
   .w starts at translateY(110%) — below clip.
   JS sets transition + translateY(0) → slides in.
   Zero overlap is guaranteed by the clip structure.
───────────────────────────────────────────── */
const W_STAGGER = 65;
const W_IN      = 760;
const W_OUT     = 460;
const EIN       = 'cubic-bezier(0.22,1,0.36,1)';
const EOUT      = 'cubic-bezier(0.55,0,1,0.45)';

function getWords(id){ return [...document.querySelectorAll('#'+id+' .w')]; }

function revealWords(id, done){
  const ws=getWords(id);
  if(!ws.length){ done&&done(); return; }
  ws.forEach(w=>{ w.style.transition='none'; w.style.transform='translateY(110%)'; w.style.opacity='0'; });
  let last=0;
  ws.forEach((w,i)=>{
    const delay=i*W_STAGGER; last=delay+W_IN;
    setTimeout(()=>{
      w.style.transition=`transform ${W_IN}ms ${EIN}, opacity 80ms ease`;
      w.style.transform='translateY(0)'; w.style.opacity='1';
    },delay);
  });
  if(done) setTimeout(done,last);
}

function exitWords(id, done){
  const ws=getWords(id);
  if(!ws.length){ done&&done(); return; }
  let last=0;
  ws.forEach((w,i)=>{
    const delay=i*42; last=delay+W_OUT;
    setTimeout(()=>{
      w.style.transition=`transform ${W_OUT}ms ${EOUT}, opacity ${W_OUT}ms ease`;
      w.style.transform='translateY(-112%)'; w.style.opacity='0';
    },delay);
  });
  if(done) setTimeout(done,last);
}

/* ─────────────────────────────────────────────
   ANIMATE VALUE  (for bg cross-fades)
───────────────────────────────────────────── */
function animVal(from,to,dur,onUpdate,onDone){
  const t0=performance.now();
  (function tick(now){
    const p=clamp((now-t0)/dur,0,1);
    onUpdate(lerp(from,to,smooth(p)));
    if(p<1) requestAnimationFrame(tick);
    else if(onDone) onDone();
  })(performance.now());
}

/* ─────────────────────────────────────────────
   PROGRESS BAR
───────────────────────────────────────────── */
const progFill=document.getElementById('prog-fill');
function setProgress(p){ if(progFill) progFill.style.width=clamp(p,0,100)+'%'; }

/* ─────────────────────────────────────────────
   INTRO SEQUENCE CONTROLLER
   Strict linear chain — callbacks only fire
   after previous step 100% complete.
───────────────────────────────────────────── */
const HOLD = { s0:3400, s1:2800, s2:3200, s3:2400 };
const TOTAL_MS = 22000;

function startIntro(){
  const nav=document.getElementById('main-nav');
  const wrap=document.getElementById('intro-wrap');
  setTimeout(()=>nav&&nav.classList.add('show'), 700);

  // Track camera progress over total duration
  const t0=performance.now();
  const ticker=setInterval(()=>{
    sceneProg=clamp((performance.now()-t0)/TOTAL_MS,0,1);
    if(sceneProg>=1) clearInterval(ticker);
  },16);

  setProgress(0);

  // All words start hidden
  document.querySelectorAll('.w').forEach(w=>{
    w.style.transform='translateY(110%)'; w.style.opacity='0';
  });

  /* SCENE 0 → 1 → 2 → 3 → HOME */
  revealWords('hl-1',()=>{
    setProgress(22);
    setTimeout(()=>{
      exitWords('hl-1',()=>{
        bgScene=0; bgBlend=0;
        animVal(0,1,900,v=>bgBlend=v,()=>{
          bgScene=1; bgBlend=0;
          setProgress(45);
          revealWords('hl-2',()=>{
            setProgress(52);
            setTimeout(()=>{
              exitWords('hl-2',()=>{
                animVal(0,1,900,v=>bgBlend=v,()=>{
                  bgScene=2; bgBlend=0;
                  setProgress(68);
                  revealWords('hl-3',()=>{
                    setProgress(76);
                    setTimeout(()=>{
                      exitWords('hl-3',()=>{
                        animVal(0,1,900,v=>bgBlend=v,()=>{
                          bgScene=2; bgBlend=1;
                          setProgress(88);
                          revealWords('hl-4',()=>{
                            setProgress(100);
                            setTimeout(()=>{
                              exitWords('hl-4',()=>{
                                clearInterval(ticker);
                                // Hide intro: add .done class (CSS handles opacity+pointer-events)
                                if(wrap) wrap.classList.add('done');
                                if(nav){ nav.style.transition='opacity .8s'; nav.style.opacity='0'; nav.style.pointerEvents='none'; }
                                // Show Sara home after intro fades
                                setTimeout(showHome, 1200);
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
   SARA HOME
───────────────────────────────────────────── */
function showHome(){
  const home=document.getElementById('sara-home');
  if(!home) return;
  home.style.display='flex';
  // tiny delay so display:flex paints before opacity transition
  setTimeout(()=>home.classList.add('visible'), 30);
  makeParticles('home-canvas',{count:42,speed:.18,opacity:.22,color:'80,140,82',connected:true,dist:125});
}

document.getElementById('say-hello-btn')?.addEventListener('click',()=>{
  const home=document.getElementById('sara-home');
  if(home) home.classList.remove('visible');          // triggers opacity→0 transition
  setTimeout(()=>{
    if(home) home.style.display='none';
    history.pushState({page:'chat'},'','#chat');
    openChat();
  }, 950);
});

/* ─────────────────────────────────────────────
   CHAT
───────────────────────────────────────────── */
let isChatting=false, chipsOn=true, chatInited=false;

function openChat(){
  isChatting=true;
  const cw=document.getElementById('chat-wrap');
  if(!cw) return;
  cw.style.display='flex';
  setTimeout(()=>cw.classList.add('visible'), 30);
  if(!chatInited){
    makeParticles('chat-canvas',{count:36,speed:.2,opacity:.18,color:'80,140,82',connected:true,dist:105});
    chatInited=true;
  }
  setWave(true);
  setTimeout(()=>{ setWave(false); typeBot("Hi there 🌿 I'm Sara. This is your quiet space — no rush, no judgment. What's been on your mind lately?"); }, 1500);
}

/* Status */
const statusTxt=document.getElementById('hdr-stxt');
const vwave=document.getElementById('vwave');
function setWave(on){
  if(vwave) vwave.classList.toggle('on',on);
  if(statusTxt) statusTxt.textContent=on?'Thinking…':'Listening';
}
function setWriting(){ if(statusTxt) statusTxt.textContent='Writing…'; }

/* Mood detection */
const MOODS=[
  {w:['anxi','panic','scar','fear','worri'],     ic:'🌧',lb:'Tender'},
  {w:['sad','cry','depress','lone','empty'],      ic:'🌙',lb:'Gentle'},
  {w:['ang','mad','furi','frustrat','annoy'],     ic:'🔥',lb:'Heated'},
  {w:['happ','joy','excit','grat','thank','amaz'],ic:'🌻',lb:'Warm'},
  {w:['tired','exhaust','sleep','drain'],         ic:'🍃',lb:'Resting'},
  {w:['overthink','stress','overwhelm'],          ic:'🌀',lb:'Swirling'},
];
function detectMood(t){ const s=t.toLowerCase(); for(const m of MOODS) if(m.w.some(w=>s.includes(w))) return m; return{ic:'🌿',lb:'Calm'}; }
function applyMood(m){
  const i=document.getElementById('mood-ico'),l=document.getElementById('mood-lbl');
  if(i){i.style.transform='scale(1.7)';i.textContent=m.ic;setTimeout(()=>i.style.transform='',400);}
  if(l) l.textContent=m.lb;
}

/* Burst */
function spawnBurst(x,y){
  const cols=['#4a8a50','#a0d4a4','#c8f0ca','#fff','#b0e0b5'];
  for(let i=0;i<13;i++){
    const el=document.createElement('div'); el.className='burst';
    const sz=3+Math.random()*5, ang=(i/13)*Math.PI*2, d=32+Math.random()*44;
    el.style.cssText=`left:${x}px;top:${y}px;width:${sz}px;height:${sz}px;background:${cols[i%cols.length]};--tx:${Math.cos(ang)*d}px;--ty:${Math.sin(ang)*d}px;`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),700);
  }
}

/* Helpers */
function hhMM(){ const d=new Date(); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function appendUser(txt){
  const area=document.getElementById('msgs');
  const d=document.createElement('div'); d.className='msg user';
  d.innerHTML=`<span>${esc(txt)}</span><span class="msg-ts">${hhMM()}</span><div class="msg-reacts">${['🌿','💚','🤍','✨'].map(e=>`<button class="react-e">${e}</button>`).join('')}</div>`;
  area.appendChild(d); scroll(area);
}

function typeBot(txt){
  const area=document.getElementById('msgs');
  setWriting();
  const d=document.createElement('div'); d.className='msg bot';
  const sp=document.createElement('span');
  const ts=document.createElement('span'); ts.className='msg-ts';
  const rc=document.createElement('div'); rc.className='msg-reacts';
  rc.innerHTML=['🌿','💚','🤍','✨'].map(e=>`<button class="react-e">${e}</button>`).join('');
  d.append(sp,ts,rc); area.appendChild(d); scroll(area);
  let i=0; const spd=Math.max(15,Math.min(34,2200/txt.length));
  (function tick(){
    if(i<txt.length){ sp.textContent+=txt[i++]; scroll(area); setTimeout(tick,spd); }
    else{ ts.textContent=hhMM(); setWave(false); if(sendBtn) sendBtn.disabled=false; }
  })();
}
function scroll(el){ if(el.scrollHeight-el.scrollTop-el.clientHeight<100) el.scrollTop=el.scrollHeight; }

/* Send */
const chatIn=document.getElementById('chat-in');
const sendBtn=document.getElementById('send-btn');

async function handleSend(){
  const txt=chatIn.value.trim(); if(!txt) return;
  applyMood(detectMood(txt));
  appendUser(txt);
  chatIn.value=''; chatIn.style.height='auto';
  if(sendBtn) sendBtn.disabled=true;
  if(chipsOn){ document.getElementById('chips')?.classList.add('gone'); chipsOn=false; }
  const r=sendBtn?.getBoundingClientRect();
  if(r) spawnBurst(r.left+r.width/2,r.top+r.height/2);
  sendBtn?.classList.add('fired');
  setTimeout(()=>sendBtn?.classList.remove('fired'),460);
  setWave(true);
  try{
    const sys='You are Sara. A warm, empathetic, non-judgmental listener. Reply in 2-3 sentences max. Be human and gentle. Never use lists.';
    const res=await fetch(`https://text.pollinations.ai/prompt/${encodeURIComponent(sys+' User: "'+txt+'"')}`);
    const ai=await res.text();
    setWave(false);
    setTimeout(()=>typeBot(ai.trim()),280);
  }catch{
    setWave(false);
    typeBot("I'm right here 🌿 The connection wavered but I didn't go anywhere.");
    if(sendBtn) sendBtn.disabled=false;
  }
}

sendBtn?.addEventListener('click',handleSend);
chatIn?.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();} });
chatIn?.addEventListener('input',()=>{
  chatIn.style.height='auto';
  chatIn.style.height=Math.min(chatIn.scrollHeight,110)+'px';
  if(sendBtn) sendBtn.disabled=chatIn.value.trim()==='';
});
document.querySelectorAll('.chip').forEach(c=>{
  c.addEventListener('click',()=>{ if(!chatIn)return; chatIn.value=c.dataset.msg; if(sendBtn)sendBtn.disabled=false; handleSend(); });
});

/* Back → farewell */
window.addEventListener('popstate',()=>{ if(isChatting) doFarewell(); });

function doFarewell(){
  isChatting=false;
  const cw=document.getElementById('chat-wrap');
  const fw=document.getElementById('farewell');

  // Fade out chat
  if(cw) cw.classList.remove('visible');
  setTimeout(()=>{
    if(cw) cw.style.display='none';

    // Show farewell
    if(fw){ fw.style.display='flex'; setTimeout(()=>fw.classList.add('visible'),30); }

    // After 3s dismiss farewell, show home
    setTimeout(()=>{
      if(fw) fw.classList.remove('visible');
      setTimeout(()=>{
        if(fw) fw.style.display='none';

        // Reset chat state
        chipsOn=true; chatInited=false;
        const chips=document.getElementById('chips');
        if(chips) chips.classList.remove('gone');
        const msgs=document.getElementById('msgs');
        if(msgs) msgs.innerHTML='<div class="day-sep"><span>Today</span></div>';
        if(sendBtn) sendBtn.disabled=true;
        setWave(false);

        // Show home
        showHome();
      }, 950);
    }, 3200);
  }, 950);
}

/* ─────────────────────────────────────────────
   2D PARTICLE FIELD  (home + chat backgrounds)
───────────────────────────────────────────── */
function makeParticles(id, cfg){
  const cv=document.getElementById(id); if(!cv) return;
  const ctx=cv.getContext('2d');
  const c=Object.assign({count:48,speed:.24,size:1.2,opacity:.28,color:'80,140,82',connected:true,dist:115},cfg);
  let W=0,H=0;
  function resize(){ W=cv.width=cv.offsetWidth||window.innerWidth; H=cv.height=cv.offsetHeight||window.innerHeight; }
  resize(); new ResizeObserver(resize).observe(cv);
  const pts=[];
  for(let i=0;i<c.count;i++) pts.push({x:rand(0,W||800),y:rand(0,H||600),vx:(Math.random()-.5)*c.speed,vy:(Math.random()-.5)*c.speed,r:.4+Math.random()*c.size,o:.06+Math.random()*c.opacity});
  ;(function draw(){
    requestAnimationFrame(draw);
    ctx.clearRect(0,0,W,H);
    for(let i=0;i<pts.length;i++){
      const p=pts[i];
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=W; else if(p.x>W)p.x=0;
      if(p.y<0)p.y=H; else if(p.y>H)p.y=0;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(${c.color},${p.o})`; ctx.fill();
      if(c.connected){
        for(let j=i+1;j<pts.length;j++){
          const q=pts[j],d=Math.hypot(p.x-q.x,p.y-q.y);
          if(d<c.dist){
            ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
            ctx.strokeStyle=`rgba(${c.color},${(1-d/c.dist)*.07})`; ctx.lineWidth=.5; ctx.stroke();
          }
        }
      }
    }
  })();
}

/* ─────────────────────────────────────────────
   BOOT
───────────────────────────────────────────── */
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>setTimeout(startIntro,200));
}else{
  setTimeout(startIntro,200);
}

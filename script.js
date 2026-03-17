
document.addEventListener('DOMContentLoaded', () => {

/* ────────────────────────────────────────
   CURSOR
──────────────────────────────────────── */
const cur = document.getElementById('cur');
const cur2 = document.getElementById('cur2');
let mx=window.innerWidth/2, my=window.innerHeight/2, rx=mx, ry=my;
document.addEventListener('mousemove', e => { mx=e.clientX; my=e.clientY; cur.style.cssText+=`left:${mx}px;top:${my}px;`; });
(function moveCur(){
  rx += (mx-rx)*0.1; ry += (my-ry)*0.1;
  cur2.style.left=rx+'px'; cur2.style.top=ry+'px';
  requestAnimationFrame(moveCur);
})();
document.querySelectorAll('button,a,.reaction-chip,.hello-btn').forEach(el=>{
  el.addEventListener('mouseenter',()=>{ cur2.style.width='52px'; cur2.style.height='52px'; cur2.style.borderColor='rgba(122,158,126,0.6)'; });
  el.addEventListener('mouseleave',()=>{ cur2.style.width='32px'; cur2.style.height='32px'; cur2.style.borderColor='rgba(255,255,255,0.4)'; });
});

/* ────────────────────────────────────────
   TIME OF DAY
──────────────────────────────────────── */
const timeLabel = document.getElementById('time-label');
const hr = new Date().getHours();
const timeMsg = hr<6?'Deep Night · The forest sleeps':hr<10?'Early Morning · Dew on the leaves':hr<13?'Morning · Birds are singing':hr<17?'Afternoon · A gentle breeze':hr<20?'Evening · Golden hour':hr<23?'Night · Stars emerge':'Midnight · All is still';
timeLabel.textContent = timeMsg;
setTimeout(()=>timeLabel.classList.add('show'), 1500);
setTimeout(()=>document.getElementById('sound-hint').classList.add('show'), 3000);

/* ────────────────────────────────────────
   PHASE 1 — NATURE THREE.JS CINEMATIC
──────────────────────────────────────── */
const canvas = document.getElementById('nature-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false });
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.05, 500);
camera.position.set(0,1.8,14);

window.addEventListener('resize',()=>{
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
});

/* helpers */
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const map01=(v,a,b)=>clamp((v-a)/(b-a),0,1);
const smooth=t=>t*t*(3-2*t);

/* ── NATURE BACKGROUND SHADER ── */
const bgGeo = new THREE.PlaneGeometry(100,60);
const bgMat = new THREE.ShaderMaterial({
  uniforms:{ uT:{value:0}, uPhase:{value:0} },
  vertexShader:`varying vec2 vU; void main(){ vU=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`
    uniform float uT, uPhase;
    varying vec2 vU;
    vec3 sky1 = vec3(0.55,0.74,0.89);   // dawn blue
    vec3 sky2 = vec3(0.95,0.80,0.62);   // warm golden
    vec3 sky3 = vec3(0.32,0.52,0.65);   // twilight
    vec3 sky4 = vec3(0.08,0.12,0.20);   // night
    vec3 hor1 = vec3(0.78,0.62,0.48);   // horizon warm
    vec3 hor2 = vec3(0.52,0.72,0.50);   // green horizon
    vec3 sky, hor;
    void main(){
      float cycle = mod(uT*0.025, 1.0);
      if(cycle<0.33){ float f=cycle/0.33; sky=mix(sky1,sky2,f); hor=mix(hor1,hor1,f); }
      else if(cycle<0.66){ float f=(cycle-0.33)/0.33; sky=mix(sky2,sky3,f); hor=mix(hor1,hor2,f); }
      else{ float f=(cycle-0.66)/0.34; sky=mix(sky3,sky4,f); hor=hor2*mix(1.0,0.3,f); }
      vec3 col = mix(hor, sky, pow(vU.y,0.7));
      // sun
      float sunX = 0.5 + sin(uT*0.015)*0.25;
      float sunY = 0.6 + cos(uT*0.008)*0.15;
      float sun = 1.0-smoothstep(0.04,0.12,distance(vU,vec2(sunX,sunY)));
      col += sun*vec3(1.0,0.98,0.88)*0.9;
      float glow = 1.0-smoothstep(0.08,0.5,distance(vU,vec2(sunX,sunY)));
      col += glow*vec3(0.9,0.7,0.4)*0.25;
      // clouds
      float c1=sin(vU.x*4.+uT*0.05)*sin(vU.y*3.+uT*0.03)*0.5+0.5;
      float c2=sin(vU.x*7.+uT*0.04+1.)*sin(vU.y*5.+uT*0.06)*0.5+0.5;
      float clouds=pow(c1*c2,4.)*0.18*(1.-uPhase*2.);
      col = mix(col, vec3(1.,0.99,0.97), clouds);
      gl_FragColor=vec4(col,1.);
    }
  `
});
const bgMesh = new THREE.Mesh(bgGeo, bgMat);
bgMesh.position.z = -30;
scene.add(bgMesh);

/* ── GROUND ── */
const groundGeo = new THREE.PlaneGeometry(80,40,40,40);
const gV = groundGeo.attributes.position;
for(let i=0;i<gV.count;i++) gV.setZ(i, gV.getZ(i)+Math.sin(gV.getX(i)*0.5)*0.3+Math.random()*0.3);
groundGeo.computeVertexNormals();
const groundMat = new THREE.MeshStandardMaterial({ color:0x3d5a3e, roughness:1.0, metalness:0 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI/2; ground.position.y = -2;
scene.add(ground);

/* ── GRASS BLADES ── */
const grassGroup = new THREE.Group();
for(let i=0;i<300;i++){
  const h=0.4+Math.random()*0.7;
  const pts=[new THREE.Vector3(0,0,0),new THREE.Vector3(Math.random()*0.1-0.05,h*0.5,0),new THREE.Vector3(Math.random()*0.15-0.075,h,0)];
  const curve=new THREE.CatmullRomCurve3(pts);
  const gg=new THREE.TubeGeometry(curve,4,0.018,4,false);
  const gm=new THREE.MeshStandardMaterial({ color:new THREE.Color().setHSL(0.33+Math.random()*0.04,0.6+Math.random()*0.2,0.22+Math.random()*0.12), roughness:1 });
  const gb=new THREE.Mesh(gg,gm);
  gb.position.set((Math.random()-0.5)*22, -2, (Math.random()-0.5)*10-1);
  gb.userData.sOff = Math.random()*Math.PI*2;
  grassGroup.add(gb);
}
scene.add(grassGroup);

/* ── TREES ── */
function makeTree(x,y,z,s,dark){
  const g=new THREE.Group();
  const tMat=new THREE.MeshStandardMaterial({ color: dark?0x1e2e1e:0x3a5c3c, roughness:0.9, metalness:0 });
  const bMat=new THREE.MeshStandardMaterial({ color: dark?0x2a4a2c:0x4a7a4c, roughness:0.8 });
  // trunk
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.08*s,0.12*s,s*1.4,7),tMat);
  trunk.position.y=s*0.7; g.add(trunk);
  // canopy layers
  [[0,s*1.2,1.2*s,0.9*s],[ 0,s*1.7,1.0*s,0.75*s],[0,s*2.1,0.75*s,0.6*s]].forEach(([cx,cy,rx,ry])=>{
    const c=new THREE.Mesh(new THREE.ConeGeometry(rx*0.6,ry*1.2,8),bMat);
    c.position.y=cy; g.add(c);
  });
  g.position.set(x,y,z); g.scale.setScalar(s);
  return g;
}
const treePositions=[
  [-9,0,-6,1.4,false],[-6,0,-8,1.1,true],[-12,0,-10,1.6,false],
  [8,0,-6,1.3,false],[11,0,-9,1.5,true],[14,0,-7,1.2,false],
  [-4,0,-12,1.0,true],[4,0,-12,0.9,false],[-16,0,-5,1.8,true],
  [16,0,-5,1.7,false],[-8,0,3,0.8,false],[9,0,2,0.9,false]
];
treePositions.forEach(t=>scene.add(makeTree(...t)));

/* ── FIREFLIES / POLLEN PARTICLES ── */
const ffCount=120;
const ffGeo=new THREE.BufferGeometry();
const ffPos=new Float32Array(ffCount*3), ffCol=new Float32Array(ffCount*3), ffSpd=new Float32Array(ffCount), ffOff=new Float32Array(ffCount);
for(let i=0;i<ffCount;i++){
  ffPos[i*3]=(Math.random()-0.5)*24;
  ffPos[i*3+1]=-1+Math.random()*5;
  ffPos[i*3+2]=(Math.random()-0.5)*12-2;
  // colors: warm whites, pale yellows, soft greens
  const c=[[1,.98,.88],[.85,1,.7],[1,.9,.6],[.7,1,.8]][Math.floor(Math.random()*4)];
  ffCol[i*3]=c[0]; ffCol[i*3+1]=c[1]; ffCol[i*3+2]=c[2];
  ffSpd[i]=0.003+Math.random()*0.008;
  ffOff[i]=Math.random()*Math.PI*2;
}
ffGeo.setAttribute('position',new THREE.BufferAttribute(ffPos,3));
ffGeo.setAttribute('color',new THREE.BufferAttribute(ffCol,3));
const ffMat=new THREE.PointsMaterial({ size:0.08, vertexColors:true, transparent:true, opacity:0.85, depthWrite:false, blending:THREE.AdditiveBlending });
const fireflies=new THREE.Points(ffGeo,ffMat);
scene.add(fireflies);

/* ── WATER STREAM (shimmer plane) ── */
const waterGeo=new THREE.PlaneGeometry(3,18,20,60);
const waterMat=new THREE.ShaderMaterial({
  uniforms:{uT:{value:0}},
  vertexShader:`
    uniform float uT;
    varying vec2 vUv;
    void main(){
      vUv=uv;
      vec3 p=position;
      p.z+=sin(p.y*3.+uT*2.)*0.04+sin(p.x*5.+uT*1.5)*0.03;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
    }
  `,
  fragmentShader:`
    uniform float uT; varying vec2 vUv;
    void main(){
      vec3 water=vec3(0.55,0.75,0.65);
      float spec=sin(vUv.y*12.+uT*3.)*sin(vUv.x*8.+uT*2.);
      float hi=smoothstep(0.6,1.,spec)*0.4;
      gl_FragColor=vec4(water+hi*vec3(0.9,1.,0.95), 0.65);
    }
  `,
  transparent:true, side:THREE.DoubleSide
});
const waterStream=new THREE.Mesh(waterGeo,waterMat);
waterStream.rotation.x=-Math.PI/2; waterStream.rotation.z=0.3;
waterStream.position.set(-4,-1.9,-2);
scene.add(waterStream);

/* ── FLOWER PARTICLES ── */
const flCount=60;
const flGeo=new THREE.BufferGeometry();
const flPos=new Float32Array(flCount*3), flOff=new Float32Array(flCount);
for(let i=0;i<flCount;i++){
  flPos[i*3]=(Math.random()-0.5)*20;
  flPos[i*3+1]=-2+Math.random()*0.3;
  flPos[i*3+2]=(Math.random()-0.5)*10;
  flOff[i]=Math.random()*Math.PI*2;
}
flGeo.setAttribute('position',new THREE.BufferAttribute(flPos,3));
const flMat=new THREE.PointsMaterial({ size:0.12,color:0xffcce8, transparent:true,opacity:0.7,depthWrite:false });
scene.add(new THREE.Points(flGeo,flMat));

/* ── FOG ── */
scene.fog=new THREE.FogExp2(0x8fb090,0.025);

/* ── LIGHTS ── */
const ambLight=new THREE.AmbientLight(0xe8f0e4,0.5); scene.add(ambLight);
const sunLight=new THREE.DirectionalLight(0xfff4d8,1.8);
sunLight.position.set(5,12,6); sunLight.castShadow=true; scene.add(sunLight);
const fillLight=new THREE.DirectionalLight(0xc8e8d0,0.4);
fillLight.position.set(-8,4,-4); scene.add(fillLight);
const underLight=new THREE.HemisphereLight(0xc8e4c8,0x4a6a4a,0.4); scene.add(underLight);

/* ── CAMERA PATH ── */
const KF=[
  [0,   0,1.8,14, 0,0,0],
  [0.15,0,1.5,11, 0,.5,0],
  [0.30,1,1.2, 8, 0,.2,0],
  [0.50,-.5,1.0,6, 0,0,-1],
  [0.70,-1,.8, 4, -1,0,-2],
  [0.85,0, .6, 3, 0,-.3,-2],
  [1.0, 0, .5, 2, 0,-.5,-2],
];
function camAt(t){
  let i=0;
  while(i<KF.length-2 && KF[i+1][0]<=t) i++;
  const a=KF[i],b=KF[i+1];
  const f=smooth(clamp((t-a[0])/(b[0]-a[0]),0,1));
  return{px:lerp(a[1],b[1],f),py:lerp(a[2],b[2],f),pz:lerp(a[3],b[3],f),lx:lerp(a[4],b[4],f),ly:lerp(a[5],b[5],f),lz:lerp(a[6],b[6],f)};
}

/* ── SLIDES ── */
// [appear_s, hold_start_s, hold_end_s, out_s]
const STIMES=[[.5,1.5,4,.5],[5.5,6.5,9.5,.8],[11,12,14.5,.8],[16,17,20,.5]];
const slides=['cs0','cs1','cs2','cs3'].map(id=>document.getElementById(id));
const TOTAL=23;

let elapsed=0, cinematicDone=false;
const clock=new THREE.Clock();
const lookT=new THREE.Vector3();

function cinFrame(){
  if(cinematicDone) return;
  requestAnimationFrame(cinFrame);
  const dt=clock.getDelta(); elapsed+=dt;

  const camProg=clamp((elapsed-0.5)/(TOTAL-3),0,1);
  const cp=camAt(camProg);
  camera.position.set(cp.px,cp.py,cp.pz);
  lookT.x+=(cp.lx-lookT.x)*.06; lookT.y+=(cp.ly-lookT.y)*.06; lookT.z+=(cp.lz-lookT.z)*.06;
  camera.lookAt(lookT);

  /* Dynamic sky */
  bgMat.uniforms.uT.value=elapsed;
  bgMat.uniforms.uPhase.value=camProg;

  /* Fog — clears as we walk in */
  scene.fog.density=lerp(0.025,0.015,camProg);

  /* Grass sway */
  grassGroup.children.forEach(g=>{
    g.rotation.z=Math.sin(elapsed*1.2+g.userData.sOff)*0.08;
    g.rotation.x=Math.sin(elapsed*0.8+g.userData.sOff+1)*0.04;
  });

  /* Fireflies drift */
  const fp=ffGeo.attributes.position;
  for(let i=0;i<ffCount;i++){
    fp.setY(i,fp.getY(i)+Math.sin(elapsed*ffSpd[i]*10+ffOff[i])*0.008);
    fp.setX(i,fp.getX(i)+Math.cos(elapsed*ffSpd[i]*8+ffOff[i]*1.3)*0.004);
  }
  fp.needsUpdate=true;
  ffMat.opacity=0.6+Math.sin(elapsed*.8)*0.15;

  /* Water */
  waterMat.uniforms.uT.value=elapsed;

  /* Sun light shift */
  const cycle=((elapsed*0.025)%1);
  sunLight.intensity=lerp(0.5,2.0,Math.sin(cycle*Math.PI));
  sunLight.color.setRGB(lerp(1,.98,.7), lerp(.8,.92,.85), lerp(.5,.8,.7));
  ambLight.intensity=lerp(0.3,0.6,Math.sin(cycle*Math.PI));

  /* Slides */
  slides.forEach((sl,idx)=>{
    const[tA,tH0,tH1,tFd]=STIMES[idx];
    const dur=tFd||0.6;
    if(elapsed<tA||(elapsed>tH1+dur&&idx<slides.length-1)){
      sl.classList.remove('show','gone');
    } else if(elapsed>=tA&&elapsed<tH0){
      sl.classList.add('show'); sl.classList.remove('gone');
      sl.style.opacity=map01(elapsed,tA,tH0);
    } else if(elapsed>=tH0&&elapsed<=tH1){
      sl.classList.add('show'); sl.classList.remove('gone'); sl.style.opacity=1;
    } else if(idx<slides.length-1){
      const p=map01(elapsed,tH1,tH1+dur);
      sl.style.opacity=1-p;
      if(p>0.5) sl.classList.add('gone');
    } else {
      sl.style.opacity=1;
    }
  });

  renderer.render(scene,camera);

  if(elapsed>=TOTAL && !cinematicDone){
    cinematicDone=true;
    doWipe();
  }
}
cinFrame();

/* ── TRANSITION ── */
const fogWipe=document.getElementById('fog-wipe');
const saraHome=document.getElementById('sara-home');
const cinUI=document.getElementById('cinematic-ui');
const timeEl=document.getElementById('time-label');
const soundEl=document.getElementById('sound-hint');

function doWipe(){
  fogWipe.classList.add('in');
  setTimeout(()=>{
    saraHome.style.display='flex';
    canvas.style.display='none';
    cinUI.style.display='none';
    timeEl.style.display='none';
    soundEl.style.display='none';
    fogWipe.classList.remove('in'); fogWipe.classList.add('out');
    initHomeCanvas();
  },1400);
}

/* ── SARA HOME PARTICLES (fireflies + floating petals) ── */
function initHomeCanvas(){
  const hCanvas=document.getElementById('home-canvas');
  const hRenderer=new THREE.WebGLRenderer({canvas:hCanvas,alpha:true,antialias:true});
  hRenderer.setPixelRatio(Math.min(devicePixelRatio,2));
  hRenderer.setSize(window.innerWidth,window.innerHeight);
  const hScene=new THREE.Scene();
  const hCamera=new THREE.PerspectiveCamera(60,window.innerWidth/window.innerHeight,0.1,500);
  hCamera.position.z=8;

  /* Fireflies */
  const fc=80, fgeo=new THREE.BufferGeometry();
  const fpos=new Float32Array(fc*3), fcol=new Float32Array(fc*3), fspd=new Float32Array(fc), foff=new Float32Array(fc);
  for(let i=0;i<fc;i++){
    fpos[i*3]=(Math.random()-0.5)*18;
    fpos[i*3+1]=(Math.random()-0.5)*10;
    fpos[i*3+2]=(Math.random()-0.5)*6;
    const cc=[[1,.98,.8],[.8,1,.7],[1,.9,.6]][Math.floor(Math.random()*3)];
    fcol[i*3]=cc[0]; fcol[i*3+1]=cc[1]; fcol[i*3+2]=cc[2];
    fspd[i]=0.005+Math.random()*0.01; foff[i]=Math.random()*Math.PI*2;
  }
  fgeo.setAttribute('position',new THREE.BufferAttribute(fpos,3));
  fgeo.setAttribute('color',new THREE.BufferAttribute(fcol,3));
  const fmat=new THREE.PointsMaterial({size:0.12,vertexColors:true,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending});
  hScene.add(new THREE.Points(fgeo,fmat));

  /* Petals */
  const pc=40,pgeo=new THREE.BufferGeometry();
  const ppos=new Float32Array(pc*3),pspd=new Float32Array(pc),poff=new Float32Array(pc),pdrift=new Float32Array(pc);
  for(let i=0;i<pc;i++){
    ppos[i*3]=(Math.random()-0.5)*18;
    ppos[i*3+1]=6+Math.random()*4;
    ppos[i*3+2]=(Math.random()-0.5)*6;
    pspd[i]=0.008+Math.random()*0.012;
    poff[i]=Math.random()*Math.PI*2;
    pdrift[i]=(Math.random()-0.5)*0.008;
  }
  pgeo.setAttribute('position',new THREE.BufferAttribute(ppos,3));
  const pmat=new THREE.PointsMaterial({size:0.15,color:0xffcce0,transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending});
  hScene.add(new THREE.Points(pgeo,pmat));

  const hClock=new THREE.Clock();
  function hFrame(){
    requestAnimationFrame(hFrame);
    const ht=hClock.getElapsedTime();
    // firefly drift
    const fp2=fgeo.attributes.position;
    for(let i=0;i<fc;i++){
      fp2.setY(i,fp2.getY(i)+Math.sin(ht*fspd[i]*8+foff[i])*0.01);
      fp2.setX(i,fp2.getX(i)+Math.cos(ht*fspd[i]*6+foff[i])*0.006);
    }
    fp2.needsUpdate=true;
    fmat.opacity=0.6+Math.sin(ht*.7)*0.2;
    // petals fall
    const pp2=pgeo.attributes.position;
    for(let i=0;i<pc;i++){
      pp2.setY(i,pp2.getY(i)-pspd[i]);
      pp2.setX(i,pp2.getX(i)+pdrift[i]+Math.sin(ht+poff[i])*0.006);
      if(pp2.getY(i)<-7){ pp2.setY(i,7); pp2.setX(i,(Math.random()-0.5)*18); }
    }
    pp2.needsUpdate=true;
    hRenderer.render(hScene,hCamera);
  }
  hFrame();

  window.addEventListener('resize',()=>{
    hCamera.aspect=window.innerWidth/window.innerHeight;
    hCamera.updateProjectionMatrix();
    hRenderer.setSize(window.innerWidth,window.innerHeight);
  });
}

/* ── CHAT NATURE CANVAS — petals + fireflies ── */
function initChatCanvas(){
  const cc = document.getElementById('chat-nature-canvas');
  const cr = new THREE.WebGLRenderer({canvas:cc, alpha:true, antialias:false});
  cr.setPixelRatio(1);
  cr.setSize(window.innerWidth, window.innerHeight);

  const cs  = new THREE.Scene();
  const cca = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, .1, 100);
  cca.position.z = 9;

  // Fireflies
  const ffc=70, ffg=new THREE.BufferGeometry();
  const ffp=new Float32Array(ffc*3), ffc2=new Float32Array(ffc*3), ffs=new Float32Array(ffc), ffo=new Float32Array(ffc);
  for(let i=0;i<ffc;i++){
    ffp[i*3]=(Math.random()-0.5)*22; ffp[i*3+1]=(Math.random()-0.5)*13; ffp[i*3+2]=(Math.random()-0.5)*8;
    const c=[[1,.98,.8],[.8,1,.7],[.9,.98,.7],[1,.9,.6]][i%4];
    ffc2[i*3]=c[0]; ffc2[i*3+1]=c[1]; ffc2[i*3+2]=c[2];
    ffs[i]=0.004+Math.random()*.009; ffo[i]=Math.random()*Math.PI*2;
  }
  ffg.setAttribute('position', new THREE.BufferAttribute(ffp,3));
  ffg.setAttribute('color',    new THREE.BufferAttribute(ffc2,3));
  const ffm = new THREE.PointsMaterial({size:.1,vertexColors:true,transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending});
  cs.add(new THREE.Points(ffg,ffm));

  // Petals falling
  const pc=55, pg=new THREE.BufferGeometry();
  const pp=new Float32Array(pc*3), ps=new Float32Array(pc), po=new Float32Array(pc), pd=new Float32Array(pc);
  for(let i=0;i<pc;i++){
    pp[i*3]=(Math.random()-0.5)*22; pp[i*3+1]=8+Math.random()*6; pp[i*3+2]=(Math.random()-0.5)*10;
    ps[i]=0.007+Math.random()*.013; po[i]=Math.random()*Math.PI*2; pd[i]=(Math.random()-0.5)*.007;
  }
  pg.setAttribute('position', new THREE.BufferAttribute(pp,3));
  const pm = new THREE.PointsMaterial({size:.13,color:0xffcce0,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending});
  cs.add(new THREE.Points(pg,pm));

  // Green spores
  const sc=40, sg=new THREE.BufferGeometry();
  const sp2=new Float32Array(sc*3), ss=new Float32Array(sc), so=new Float32Array(sc);
  for(let i=0;i<sc;i++){
    sp2[i*3]=(Math.random()-0.5)*20; sp2[i*3+1]=(Math.random()-0.5)*12; sp2[i*3+2]=(Math.random()-0.5)*6;
    ss[i]=0.003+Math.random()*.007; so[i]=Math.random()*Math.PI*2;
  }
  sg.setAttribute('position', new THREE.BufferAttribute(sp2,3));
  const sm = new THREE.PointsMaterial({size:.07,color:0x9dc89a,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending});
  cs.add(new THREE.Points(sg,sm));

  const ck = new THREE.Clock();
  function cFrame(){
    requestAnimationFrame(cFrame);
    const ct = ck.getElapsedTime();

    // Firefly drift
    const fp2 = ffg.attributes.position;
    for(let i=0;i<ffc;i++){
      fp2.setY(i, fp2.getY(i) + Math.sin(ct*ffs[i]*9+ffo[i])*.009);
      fp2.setX(i, fp2.getX(i) + Math.cos(ct*ffs[i]*7+ffo[i])*.006);
    }
    fp2.needsUpdate=true;
    ffm.opacity = 0.55 + Math.sin(ct*.6)*0.2;

    // Petals fall + drift
    const pp2 = pg.attributes.position;
    for(let i=0;i<pc;i++){
      pp2.setY(i, pp2.getY(i) - ps[i]);
      pp2.setX(i, pp2.getX(i) + pd[i] + Math.sin(ct*.8+po[i])*.007);
      if(pp2.getY(i)<-8){ pp2.setY(i,8); pp2.setX(i,(Math.random()-0.5)*22); }
    }
    pp2.needsUpdate=true;

    // Spore drift
    const sp3 = sg.attributes.position;
    for(let i=0;i<sc;i++){
      sp3.setY(i, sp3.getY(i) + Math.sin(ct*ss[i]*8+so[i])*.007);
      sp3.setX(i, sp3.getX(i) + Math.cos(ct*ss[i]*6+so[i])*.005);
    }
    sp3.needsUpdate=true;

    cr.render(cs, cca);
  }
  cFrame();

  window.addEventListener('resize',()=>{
    cca.aspect=window.innerWidth/window.innerHeight;
    cca.updateProjectionMatrix();
    cr.setSize(window.innerWidth,window.innerHeight);
  });
}

/* ════════════════════════════════════════
   CHATBOT — FULLY ALIVE
════════════════════════════════════════ */
const sayHelloBtn    = document.getElementById('say-hello-btn');
const chatInterface  = document.getElementById('chat-interface');
const chatMessages   = document.getElementById('chat-messages');
const chatInput      = document.getElementById('chat-input');
const sendBtn        = document.getElementById('send-btn');
const farewellOverlay= document.getElementById('farewell-overlay');
const saraThinking   = document.getElementById('sara-thinking');
const saraLiveStatus = document.getElementById('sara-live-status');
const saraStatusLabel= document.getElementById('sara-status-label');
const saraMoodBadge  = document.getElementById('sara-mood-badge');
const moodIcon       = document.getElementById('mood-icon');
const moodLabel      = document.getElementById('mood-label');
const scrollDownBtn  = document.getElementById('scroll-down-btn');
const chatWindow     = document.getElementById('chat-window');
let isChatting = false;
let chatCanvasInit = false;

/* ── Mood detection ── */
const moodMap = [
  { words:['anxious','anxiety','panic','scared','fear','worry','worried'],  icon:'🌧', label:'Anxious',   cls:'mood-night' },
  { words:['sad','cry','crying','depressed','lonely','alone','empty'],       icon:'🌙', label:'Tender',    cls:'mood-night' },
  { words:['angry','mad','furious','frustrated','annoyed'],                  icon:'🔥', label:'Heated',    cls:'mood-warm'  },
  { words:['happy','joy','excited','grateful','thankful','good','amazing'],  icon:'🌻', label:'Warm',      cls:'mood-warm'  },
  { words:['tired','exhausted','sleepy','drained'],                          icon:'🍃', label:'Resting',   cls:'mood-calm'  },
  { words:['overthink','overthinking','stressed','stress'],                  icon:'🌀', label:'Swirling',  cls:'mood-night' },
  { words:['love','miss','heart','feel'],                                    icon:'🌸', label:'Tender',    cls:'mood-warm'  },
];

function detectMood(text) {
  const lower = text.toLowerCase();
  for (const m of moodMap) {
    if (m.words.some(w => lower.includes(w))) return m;
  }
  return { icon:'🌿', label:'Calm', cls:'mood-calm' };
}

function shiftMood(mood) {
  chatWindow.classList.remove('mood-warm','mood-calm','mood-night');
  chatWindow.classList.add(mood.cls);
  moodIcon.style.transform = 'scale(1.4)';
  setTimeout(()=>{ moodIcon.style.transform='scale(1)'; }, 400);
  moodIcon.textContent  = mood.icon;
  moodLabel.textContent = mood.label;
}

/* ── Particle burst on send ── */
function spawnBurst() {
  const rect = sendBtn.getBoundingClientRect();
  const cx = rect.left + rect.width/2;
  const cy = rect.top  + rect.height/2;
  const colors = ['#7bc47f','#a8d4a0','#c8f0c8','#fff','#b8e8b0'];
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('div');
    p.className = 'particle-burst';
    const size = 4 + Math.random()*5;
    const angle = (i/14)*Math.PI*2;
    const dist  = 40 + Math.random()*50;
    p.style.cssText = `
      left:${cx}px;top:${cy}px;
      width:${size}px;height:${size}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      --dx:${Math.cos(angle)*dist}px;
      --dy:${Math.sin(angle)*dist}px;
    `;
    document.body.appendChild(p);
    setTimeout(()=>p.remove(), 750);
  }
}

/* ── Sara status helpers ── */
function setSaraListening() {
  saraLiveStatus.className = 'sara-live-status listening';
  saraLiveStatus.innerHTML = '<span class="sl-dot"></span>';
  saraStatusLabel.textContent = 'Listening with love';
}
function setSaraTyping() {
  saraLiveStatus.className = 'sara-live-status typing-status';
  saraLiveStatus.innerHTML = '<span class="sl-bar"></span><span class="sl-bar"></span><span class="sl-bar"></span><span class="sl-bar"></span>';
  saraStatusLabel.textContent = 'Sara is writing…';
}
function setSaraThinking() {
  saraLiveStatus.className = 'sara-live-status listening';
  saraLiveStatus.innerHTML = '<span class="sl-dot"></span>';
  saraStatusLabel.textContent = 'Feeling your words…';
}

/* ── Scroll-down button ── */
chatMessages.addEventListener('scroll', () => {
  const atBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 80;
  scrollDownBtn.classList.toggle('visible', !atBottom);
});
scrollDownBtn.addEventListener('click', () => {
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior:'smooth' });
});

/* ── Append message with full life ── */
function getTime(){
  const d=new Date();
  return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');
}

function appendMessage(sender, text) {
  const wrap = document.createElement('div');
  wrap.classList.add('message', sender);
  wrap.style.position = 'relative';

  // Text
  const textEl = document.createElement('span');
  textEl.textContent = text;
  wrap.appendChild(textEl);

  // Timestamp
  const timeEl = document.createElement('span');
  timeEl.className = 'msg-time';
  timeEl.textContent = getTime();
  wrap.appendChild(timeEl);

  // Hover reactions
  const reactEl = document.createElement('div');
  reactEl.className = 'msg-react';
  reactEl.innerHTML = ['🌿','💚','🤍','✨','🕊'].map(e=>`<span>${e}</span>`).join('');
  wrap.appendChild(reactEl);

  chatMessages.appendChild(wrap);

  // Scroll smartly — only auto-scroll if user is near bottom
  const atBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 120;
  if (atBottom) setTimeout(()=>{ chatMessages.scrollTo({top:chatMessages.scrollHeight,behavior:'smooth'}); }, 50);
}

/* ── Typewriter effect for bot messages ── */
function appendBotTyped(text) {
  const wrap = document.createElement('div');
  wrap.classList.add('message','bot');
  wrap.style.position = 'relative';

  const textEl = document.createElement('span');
  wrap.appendChild(textEl);

  const timeEl = document.createElement('span');
  timeEl.className = 'msg-time';
  wrap.appendChild(timeEl);

  const reactEl = document.createElement('div');
  reactEl.className = 'msg-react';
  reactEl.innerHTML = ['🌿','💚','🤍','✨','🕊'].map(e=>`<span>${e}</span>`).join('');
  wrap.appendChild(reactEl);

  chatMessages.appendChild(wrap);

  // Type out character by character
  let i = 0;
  const speed = Math.max(18, Math.min(36, 2400 / text.length));
  function typeNext() {
    if (i < text.length) {
      textEl.textContent += text[i++];
      const atBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 120;
      if (atBottom) chatMessages.scrollTop = chatMessages.scrollHeight;
      setTimeout(typeNext, speed);
    } else {
      timeEl.textContent = getTime();
      setSaraListening();
    }
  }
  typeNext();
}

/* ── Main send handler ── */
async function handleSend() {
  const text = chatInput.value.trim();
  if (!text) return;

  // Detect mood
  const mood = detectMood(text);
  shiftMood(mood);

  appendMessage('user', text);
  chatInput.value = '';
  chatInput.style.height = 'auto';

  // Hide chips after first send
  const qr = document.getElementById('quick-reactions');
  if (qr) { qr.style.opacity='0'; setTimeout(()=>qr.style.display='none',400); }

  // Fire send animation + particles
  sendBtn.classList.add('fired');
  setTimeout(()=>sendBtn.classList.remove('fired'),450);
  spawnBurst();

  // Show Sara thinking wave
  setSaraThinking();
  saraThinking.classList.add('active');
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const sys = "You are Sara. You are a romantic, sweet, deeply empathetic, and completely non-judgmental listener. Keep your responses brief, conversational, and comforting. Do not act like a robot. Speak like a gentle human friend, not an AI.";
    const res  = await fetch(`https://text.pollinations.ai/prompt/${encodeURIComponent(sys + ' The user says: "' + text + '"')}`);
    const ai   = await res.text();

    saraThinking.classList.remove('active');
    setSaraTyping();
    // Small pause before typewriter starts — feels natural
    setTimeout(() => appendBotTyped(ai.trim()), 320);

  } catch {
    saraThinking.classList.remove('active');
    setSaraListening();
    appendBotTyped("I'm here, I promise 🌿 The connection wavered for a moment, but my heart didn't.");
  }
}

/* ── Entry ── */
sayHelloBtn.addEventListener('click', () => {
  isChatting = true;
  history.pushState({page:'chat'},'Chat with Sara','#chat');
  saraHome.style.display = 'none';
  chatInterface.classList.remove('hidden');
  if (!chatCanvasInit) { initChatCanvas(); chatCanvasInit = true; }

  // Sara intro — staggered
  setTimeout(()=>{
    setSaraTyping();
    saraThinking.classList.add('active');
  }, 400);
  setTimeout(()=>{
    saraThinking.classList.remove('active');
    appendBotTyped("Hi there 🌿 I'm Sara. The forest is quiet and I'm right here with you. What's been on your heart lately?");
  }, 1800);
});

window.addEventListener('popstate', () => { if (isChatting) handleExitChat(); });

function handleExitChat() {
  isChatting = false;
  chatInterface.classList.add('hidden');
  farewellOverlay.classList.add('show');
  setTimeout(()=>{
    farewellOverlay.classList.remove('show');
    setTimeout(()=>{ saraHome.style.display='flex'; setSaraListening(); }, 1200);
  }, 3000);
}

sendBtn.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', e => { if (e.key==='Enter') handleSend(); });

/* Input auto-grow */
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

/* Quick reaction chips */
document.querySelectorAll('.reaction-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    chatInput.value = chip.dataset.msg;
    chatInput.dispatchEvent(new Event('input'));
    handleSend();
  });
});

}); // end DOMContentLoaded

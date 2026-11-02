// Abertura cinematográfica do hero, guiada pela rolagem.
// Ato I: a fachada do Coliseu à noite, portões de bronze fechados, luz vazando pela fresta.
// Ato II: a câmera avança, os portões se abrem e a luz invade a praça.
// Ato III: a câmera atravessa o portão e sobe até revelar a arena e seus 3.000 lugares.
// A rolagem é lida de window.__heroP (0..1), que js/main.js atualiza.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const canvas = document.querySelector('[data-arena]');
const counter = document.querySelector('[data-seat-count]');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const SEATS = 3000;
const clamp01 = v => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch (err) {
  document.documentElement.classList.add('no-webgl');
}
if (renderer) init();

function init() {
  const isSmall = () => innerWidth < 700;
  renderer.setPixelRatio(Math.min(devicePixelRatio, isSmall() ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x120d1c, 0.006);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 900);

  // --- Texturas procedurais ---------------------------------------------------
  function stoneTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#b5a493';
    g.fillRect(0, 0, 512, 512);
    // Travertino: veios horizontais e poros
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(${90 + Math.random() * 40},${70 + Math.random() * 30},${55 + Math.random() * 25},${0.06 + Math.random() * 0.08})`;
      g.fillRect(0, Math.random() * 512, 512, 1 + Math.random() * 5);
    }
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(40,30,25,${Math.random() * 0.35})`;
      g.beginPath();
      g.ellipse(Math.random() * 512, Math.random() * 512, Math.random() * 2.4, Math.random() * 1.2, 0, 0, Math.PI * 2);
      g.fill();
    }
    // Juntas dos blocos
    g.strokeStyle = 'rgba(50,38,30,.45)';
    g.lineWidth = 2;
    for (let y = 0; y <= 512; y += 64) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke();
      for (let x = (y / 64) % 2 ? 0 : 64; x < 512; x += 128) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  function bronzeTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 768;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 256, 768);
    grad.addColorStop(0, '#8a5a2e'); grad.addColorStop(0.5, '#5e3a1c'); grad.addColorStop(1, '#7a4c25');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 768);
    // Pátina
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '40,25,12' : '150,110,60'},${Math.random() * 0.12})`;
      g.fillRect(Math.random() * 256, Math.random() * 768, 2 + Math.random() * 6, 1 + Math.random() * 3);
    }
    // Almofadas (painéis rebaixados) e tachas
    for (let r = 0; r < 5; r++) {
      const y = 30 + r * 146, h = 120;
      g.strokeStyle = 'rgba(25,14,6,.85)'; g.lineWidth = 6; g.strokeRect(26, y, 204, h);
      g.strokeStyle = 'rgba(210,160,95,.45)'; g.lineWidth = 2; g.strokeRect(32, y + 6, 192, h - 12);
      for (let sx = 0; sx < 4; sx++) for (let sy = 0; sy < 2; sy++) {
        const cx = 60 + sx * 46, cy = y + 34 + sy * 52;
        const sg = g.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 10);
        sg.addColorStop(0, '#f0c27a'); sg.addColorStop(1, 'rgba(60,35,15,.9)');
        g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, 9, 0, Math.PI * 2); g.fill();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function glowSprite() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,220,170,1)');
    r.addColorStop(0.25, 'rgba(255,170,90,.45)');
    r.addColorStop(1, 'rgba(255,140,60,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }

  const stoneMap = stoneTexture();
  stoneMap.repeat.set(0.28, 0.28);
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneMap, bumpMap: stoneMap, bumpScale: 0.6, roughness: 0.92, metalness: 0, color: 0xd8c8b6 });
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x3a2e40, roughness: 0.95 });

  // --- Céu, estrelas e chão ---------------------------------------------------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(600, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uInside: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `varying vec3 vP; uniform float uInside;
        void main(){
          float h = normalize(vP).y;
          vec3 horizon = vec3(.17,.06,.15);
          vec3 zenith = vec3(.025,.02,.06);
          vec3 c = mix(horizon, zenith, smoothstep(-.02,.55,h));
          c += vec3(.35,.14,.06) * pow(1.-abs(h),24.) * .45;
          gl_FragColor = vec4(c * (1. - uInside * .35), 1.);
        }`,
    })
  );
  scene.add(sky);

  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(1600 * 3);
  for (let i = 0; i < 1600; i++) {
    const u = Math.random() * Math.PI * 2, v = Math.random() * 0.45 + 0.08;
    starPos.set([Math.cos(u) * Math.cos(v) * 500, Math.sin(v) * 500, Math.sin(u) * Math.cos(v) * 500], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffeedd, size: 1.3, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 })));

  const groundMap = stoneTexture();
  groundMap.repeat.set(40, 40);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(400, 64),
    new THREE.MeshStandardMaterial({ map: groundMap, color: 0x4a3f48, roughness: 0.85, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // --- Luzes ----------------------------------------------------------------
  scene.add(new THREE.HemisphereLight(0x4b3a78, 0x0b0812, 0.55));
  const moon = new THREE.DirectionalLight(0x9aa6ff, 0.45);
  moon.position.set(-60, 80, 40);
  scene.add(moon);

  const arena = new THREE.Group();
  scene.add(arena);

  // --- Cávea (arquibancadas) ---------------------------------------------------
  const ROWS = 26, A0 = 15, B0 = 10.5, ROW_STEP = 0.92, RISE = 0.5;
  const STAGE_GAP = 0.62;   // vão em frente ao palco (t = 0)
  const GATE_GAP = 0.085;   // corredor do portão (t = π)
  const arcs = [[STAGE_GAP, Math.PI - GATE_GAP], [Math.PI + GATE_GAP, Math.PI * 2 - STAGE_GAP]];
  const onEllipse = (t, a, b) => [Math.sin(t) * a, -Math.cos(t) * b];

  const candidates = [];
  for (let r = 0; r < ROWS; r++) {
    const a = A0 + r * ROW_STEP, b = B0 + r * ROW_STEP;
    arcs.forEach(([t0, t1]) => {
      const len = (t1 - t0) * (a + b) / 2;
      const n = Math.floor(len / 0.8);
      for (let i = 0; i < n; i++) {
        const t = t0 + ((i + 0.5) / n) * (t1 - t0);
        const [x, z] = onEllipse(t, a, b);
        candidates.push({ x, y: RISE * (r + 1) + 0.16, z, r, t });
      }
    });
  }
  const seats = [];
  const step = candidates.length / SEATS;
  for (let i = 0; i < SEATS; i++) seats.push(candidates[Math.floor(i * step)]);

  for (let r = 0; r < ROWS; r++) {
    const a = A0 + r * ROW_STEP, b = B0 + r * ROW_STEP;
    arcs.forEach(([t0, t1]) => {
      const shape = new THREE.Shape();
      const pts = 48;
      for (let i = 0; i <= pts; i++) {
        const t = t0 + (i / pts) * (t1 - t0);
        const p = onEllipse(t, a + ROW_STEP / 2, b + ROW_STEP / 2);
        i ? shape.lineTo(...p) : shape.moveTo(...p);
      }
      for (let i = pts; i >= 0; i--) {
        const t = t0 + (i / pts) * (t1 - t0);
        shape.lineTo(...onEllipse(t, a - ROW_STEP / 2, b - ROW_STEP / 2));
      }
      const geo = new THREE.ExtrudeGeometry(shape, { depth: RISE * (r + 1), bevelEnabled: false, curveSegments: 1 });
      geo.rotateX(Math.PI / 2);
      geo.translate(0, RISE * (r + 1), 0);
      arena.add(new THREE.Mesh(geo, darkStone));
    });
  }

  const seatMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.32, 0.44), new THREE.MeshBasicMaterial(), SEATS);
  const dummy = new THREE.Object3D();
  const litAt = new Float32Array(SEATS);
  const tint = [];
  const OFF = new THREE.Color(0x2b2135);
  const AMBER = new THREE.Color(0xffb45e).multiplyScalar(1.45);
  const BRONZE = new THREE.Color(0xc28a4e).multiplyScalar(1.15);
  const WHITE = new THREE.Color(0xfff0dc).multiplyScalar(1.7);
  seats.forEach((s, i) => {
    dummy.position.set(s.x, s.y, s.z);
    dummy.lookAt(0, s.y, 0);
    dummy.updateMatrix();
    seatMesh.setMatrixAt(i, dummy.matrix);
    seatMesh.setColorAt(i, OFF);
    const fromStage = Math.min(s.t, Math.PI * 2 - s.t) / Math.PI;
    litAt[i] = fromStage * 0.72 + (s.r / ROWS) * 0.22 + Math.random() * 0.05;
    const m = Math.random();
    tint.push(m < 0.1 ? WHITE : AMBER.clone().lerp(BRONZE, m * 0.8));
  });
  seatMesh.instanceColor.needsUpdate = true;
  arena.add(seatMesh);

  // --- Fachada: três ordens de arcos e o ático, como o Coliseu ----------------------
  const WALL_A = A0 + ROWS * ROW_STEP + 1.6, WALL_B = B0 + ROWS * ROW_STEP + 1.6;
  const BAYS = 64, LEVEL_H = 5.2, ATTIC_H = 3.8, DEPTH = 1.4, BW = 3.6;
  const ARCH_R = 1.2, SPRING = 3.0;
  const outward = t => new THREE.Vector2(Math.sin(t) / WALL_A, -Math.cos(t) / WALL_B).normalize();
  const bayLen = t => Math.hypot(Math.cos(t) * WALL_A, Math.sin(t) * WALL_B) * (Math.PI * 2 / BAYS);
  const tangentAngle = t => Math.atan2(-Math.sin(t) * WALL_B, Math.cos(t) * WALL_A);

  function bayGeometry(height, hole) {
    const s = new THREE.Shape();
    s.moveTo(-BW / 2, 0); s.lineTo(BW / 2, 0); s.lineTo(BW / 2, height); s.lineTo(-BW / 2, height); s.lineTo(-BW / 2, 0);
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: DEPTH, bevelEnabled: false, curveSegments: 12 });
    g.translate(0, 0, -DEPTH / 2);
    return g;
  }
  const archHole = () => {
    const h = new THREE.Path();
    h.moveTo(-ARCH_R, 0); h.lineTo(ARCH_R, 0); h.lineTo(ARCH_R, SPRING);
    h.absarc(0, SPRING, ARCH_R, 0, Math.PI, false);
    h.lineTo(-ARCH_R, 0);
    return h;
  };
  const windowHole = () => {
    const h = new THREE.Path();
    h.moveTo(-0.38, 1.4); h.lineTo(0.38, 1.4); h.lineTo(0.38, 2.5); h.lineTo(-0.38, 2.5); h.lineTo(-0.38, 1.4);
    return h;
  };

  const arcade = new THREE.InstancedMesh(bayGeometry(LEVEL_H, archHole()), stoneMat, BAYS * 3);
  const attic = new THREE.InstancedMesh(bayGeometry(ATTIC_H, windowHole()), stoneMat, BAYS);
  const columns = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.26, 0.3, LEVEL_H - 0.9, 10), stoneMat, BAYS * 3);
  const pilasters = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, ATTIC_H - 0.4, 0.3), stoneMat, BAYS);

  let k = 0;
  for (let i = 0; i < BAYS; i++) {
    const t = (i / BAYS) * Math.PI * 2;
    const [x, z] = onEllipse(t, WALL_A, WALL_B);
    const rotY = tangentAngle(t);
    const sx = bayLen(t) / BW;
    const tp = ((i + 0.5) / BAYS) * Math.PI * 2;
    const [px, pz] = onEllipse(tp, WALL_A, WALL_B);
    const n = outward(tp);
    for (let lv = 0; lv < 3; lv++) {
      dummy.position.set(x, lv * LEVEL_H, z);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(sx, 1, 1);
      dummy.updateMatrix();
      arcade.setMatrixAt(k, dummy.matrix);

      // Meia-coluna entre um arco e o próximo
      dummy.position.set(px + n.x * (DEPTH / 2), lv * LEVEL_H + (LEVEL_H - 0.9) / 2 + 0.25, pz + n.y * (DEPTH / 2));
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      columns.setMatrixAt(k, dummy.matrix);
      k++;
    }
    dummy.position.set(x, 3 * LEVEL_H, z);
    dummy.rotation.set(0, rotY, 0);
    dummy.scale.set(sx, 1, 1);
    dummy.updateMatrix();
    attic.setMatrixAt(i, dummy.matrix);

    dummy.position.set(px + n.x * (DEPTH / 2 + 0.1), 3 * LEVEL_H + ATTIC_H / 2, pz + n.y * (DEPTH / 2 + 0.1));
    dummy.rotation.set(0, tangentAngle(tp), 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    pilasters.setMatrixAt(i, dummy.matrix);
  }
  arena.add(arcade, attic, columns, pilasters);

  // Cornijas entre as ordens
  [[0.25, 0.55], [LEVEL_H, 0.36], [LEVEL_H * 2, 0.36], [LEVEL_H * 3, 0.42], [LEVEL_H * 3 + ATTIC_H, 0.6]].forEach(([y, r]) => {
    const pts = [];
    for (let i = 0; i < 200; i++) {
      const t = (i / 200) * Math.PI * 2;
      const n = outward(t);
      const [x, z] = onEllipse(t, WALL_A, WALL_B);
      pts.push(new THREE.Vector3(x + n.x * (DEPTH / 2 + 0.15), y, z + n.y * (DEPTH / 2 + 0.15)));
    }
    arena.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 200, r, 6, true), stoneMat));
  });

  // Luz interna: o brilho quente que aparece pelos arcos à noite
  const glowRing = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, LEVEL_H * 3, 160, 1, true, GATE_GAP * 1.4, Math.PI * 2 - GATE_GAP * 2.8),
    new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { uGlow: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `varying vec2 vUv; uniform float uGlow;
        void main(){
          vec3 warm = vec3(1.25,.6,.22);
          vec3 cool = vec3(.55,.16,.42);
          vec3 c = mix(warm, cool, smoothstep(0.,1.,vUv.y));
          float bands = .75 + .25 * step(.5, fract(vUv.y * 3.));
          gl_FragColor = vec4(c * bands * uGlow, 1.);
        }`,
    })
  );
  glowRing.scale.set(WALL_A - 1.25, 1, WALL_B - 1.25);
  glowRing.position.y = LEVEL_H * 1.5;
  arena.add(glowRing);

  // Inscrição no ático, sobre o portão principal
  const plaqueCanvas = document.createElement('canvas');
  plaqueCanvas.width = 2048; plaqueCanvas.height = 220;
  const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
  plaqueTex.colorSpace = THREE.SRGBColorSpace;
  function drawPlaque() {
    const g = plaqueCanvas.getContext('2d');
    g.clearRect(0, 0, 2048, 220);
    g.font = '400 118px Marcellus, Georgia, serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.letterSpacing = '22px';
    g.fillStyle = '#ffd59a';
    g.fillText('COLISEU · CONVENÇÕES', 1024, 118);
    plaqueTex.needsUpdate = true;
  }
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(17, 1.83),
    new THREE.MeshBasicMaterial({ map: plaqueTex, transparent: true, color: new THREE.Color(1.6, 1.25, 0.9), depthWrite: false })
  );
  plaque.position.set(0, 3 * LEVEL_H + ATTIC_H * 0.52, WALL_B + DEPTH / 2 + 0.95);
  arena.add(plaque);

  // --- O portão principal (t = π, voltado para a câmera) ------------------------
  const GATE_Z = WALL_B;
  const RW = ARCH_R * (bayLen(Math.PI) / BW);   // meia largura do vão
  const bronze = bronzeTexture();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const doorMat = new THREE.MeshStandardMaterial({
    map: bronze, bumpMap: bronze, bumpScale: 3, metalness: 0.82, roughness: 0.36,
    envMap, envMapIntensity: 0.55, color: 0xd9a86c,
  });
  bronze.repeat.set(1 / RW, 1 / (SPRING + ARCH_R));

  function leafShape(sign) {
    // sign = +1: folha esquerda (dobradiça em x = 0, cresce para +x); -1: folha direita
    const s = new THREE.Shape();
    const w = RW - 0.03;
    s.moveTo(0, 0);
    s.lineTo(sign * w, 0);
    s.lineTo(sign * w, SPRING + ARCH_R - 0.04);
    const steps = 16;
    for (let i = 1; i <= steps; i++) {
      const a = Math.PI / 2 + (i / steps) * (Math.PI / 2);
      s.lineTo(sign * (RW + Math.cos(a) * RW), SPRING + Math.sin(a) * (ARCH_R - 0.04));
    }
    s.lineTo(0, 0);
    return s;
  }
  const leafGeo = sign => {
    const g = new THREE.ExtrudeGeometry(leafShape(sign), { depth: 0.22, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1, curveSegments: 4 });
    g.translate(0, 0, -0.11);
    return g;
  };
  const leftPivot = new THREE.Group();
  leftPivot.position.set(-RW, 0, GATE_Z);
  leftPivot.add(new THREE.Mesh(leafGeo(1), doorMat));
  const rightPivot = new THREE.Group();
  rightPivot.position.set(RW, 0, GATE_Z);
  rightPivot.add(new THREE.Mesh(leafGeo(-1), doorMat));
  arena.add(leftPivot, rightPivot);
  window.__gate = { leftPivot, rightPivot };

  // A luz atrás do portão: vaza pela fresta e explode quando ele abre
  const doorLight = new THREE.Mesh(
    new THREE.PlaneGeometry(RW * 2.4, SPRING + ARCH_R + 0.6),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.8, 0.8), transparent: true })
  );
  doorLight.position.set(0, (SPRING + ARCH_R) / 2, GATE_Z - 1.6);
  arena.add(doorLight);
  const spill = new THREE.PointLight(0xffb066, 0, 60, 2);
  spill.position.set(0, 2.4, GATE_Z + 0.6);
  arena.add(spill);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 }));
  halo.position.set(0, 2.2, GATE_Z + 0.4);
  halo.scale.set(6, 6, 1);
  arena.add(halo);

  // Facho de luz no chão da praça
  const beamCanvas = document.createElement('canvas');
  beamCanvas.width = 64; beamCanvas.height = 256;
  {
    const g = beamCanvas.getContext('2d');
    const lg = g.createLinearGradient(0, 0, 0, 256);
    lg.addColorStop(0, 'rgba(255,190,120,1)'); lg.addColorStop(1, 'rgba(255,150,70,0)');
    g.fillStyle = lg; g.fillRect(0, 0, 64, 256);
    const sg = g.createLinearGradient(0, 0, 64, 0);
    sg.addColorStop(0, 'rgba(0,0,0,1)'); sg.addColorStop(0.5, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = sg; g.fillRect(0, 0, 64, 256);
  }
  const floorBeam = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(beamCanvas), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  floorBeam.rotation.x = -Math.PI / 2;
  floorBeam.position.set(0, 0.03, GATE_Z + 10);
  floorBeam.scale.set(7, 20, 1);
  arena.add(floorBeam);

  // Refletores na praça, iluminando a fachada de baixo para cima
  [-22, -9, 9, 22].forEach(x => {
    const s = new THREE.SpotLight(0xffc48a, 900, 0, 0.55, 0.8, 2);
    s.position.set(x, 0.5, GATE_Z + 14);
    s.target.position.set(x * 0.8, 12, GATE_Z - 2);
    arena.add(s, s.target);
  });

  // --- Arena: piso, palco, telão, luzes cênicas ---------------------------------
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 80), new THREE.MeshStandardMaterial({ color: 0x1b1322, roughness: 0.45, metalness: 0.3 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.02;
  floor.scale.set(A0 - 0.3, B0 - 0.3, 1);
  arena.add(floor);

  const stage = new THREE.Mesh(new THREE.BoxGeometry(12, 1.1, 5), new THREE.MeshStandardMaterial({ color: 0x241a2c, roughness: 0.5 }));
  stage.position.set(0, 0.55, -B0 + 3.2);
  arena.add(stage);

  const ledCanvas = document.createElement('canvas');
  ledCanvas.width = 1024; ledCanvas.height = 384;
  const led = ledCanvas.getContext('2d');
  const ledTex = new THREE.CanvasTexture(ledCanvas);
  ledTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(13, 4.9), new THREE.MeshBasicMaterial({ map: ledTex, color: new THREE.Color(1.7, 1.7, 1.7) }));
  screen.position.set(0, 4.2, -B0 + 1.1);
  arena.add(screen);
  function drawLed(time) {
    const w = 1024, h = 384;
    const g = led.createLinearGradient(0, 0, w, h);
    const p = (Math.sin(time * 0.4) + 1) / 2;
    g.addColorStop(0, '#2a0f2a'); g.addColorStop(p * 0.6 + 0.2, '#6e2860'); g.addColorStop(1, '#ff9e45');
    led.fillStyle = g; led.fillRect(0, 0, w, h);
    led.fillStyle = '#fff2df';
    led.font = '900 190px "Big Shoulders Display", Arial Narrow, sans-serif';
    led.textAlign = 'center'; led.textBaseline = 'middle';
    led.fillText('COLISEU', w / 2, h / 2 + 8);
    led.fillStyle = 'rgba(0,0,0,.35)';
    for (let x = 0; x < w; x += 6) led.fillRect(x, 0, 2, h);
    for (let y = 0; y < h; y += 6) led.fillRect(0, y, w, 2);
    ledTex.needsUpdate = true;
  }

  const stageLight = new THREE.PointLight(0xffb45e, 260, 90, 1.6);
  stageLight.position.set(0, 9, -10);
  arena.add(stageLight);

  const beams = [];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? 0xc45bff : 0xffb45e, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4.5, 34, 24, 1, true), mat);
    cone.geometry.translate(0, -17, 0);
    const pivot = new THREE.Group();
    pivot.position.set(-7.5 + i * 3, 22, -B0 + 2.2);
    pivot.add(cone);
    arena.add(pivot);
    beams.push({ pivot, phase: i * 1.3 });
  }

  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) dustPos.set([(Math.random() - 0.5) * 70, Math.random() * 24, (Math.random() - 0.5) * 80], i * 3);
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffd9a8, size: 0.08, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  // --- Pós-processamento: bloom, vinheta e granulação de filme --------------------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.85, 0.55, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
      float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec4 c = texture2D(tDiffuse, vUv);
        vec2 d = vUv - .5;
        float v = smoothstep(.9, .2, length(d * vec2(1., 1.2)));
        c.rgb *= mix(.5, 1., v);
        c.rgb += (rnd(vUv * 900. + uTime) - .5) * .05;
        gl_FragColor = c;
      }`,
  });
  composer.addPass(film);

  // --- Roteiro da câmera ------------------------------------------------------------
  // [progresso da rolagem, posição, alvo]. Uma curva Catmull-Rom liga os quadros.
  const Z = GATE_Z;
  const KEYS = [
    [0.00, [0, 6, Z + 78], [0, 15.5, Z - 10]],
    [0.22, [0, 4.2, Z + 30], [0, 6, Z]],
    [0.42, [0, 2.4, Z + 8.5], [0, 2.6, Z - 4]],
    [0.56, [0, 2.0, Z + 2.2], [0, 2.3, Z - 10]],
    [0.66, [0, 2.1, Z - 6], [0, 2.6, -8]],
    [0.82, [0, 12, 14], [0, 3, -9]],
    [1.00, [0, 44, 52], [0, -1, -6]],
  ];
  const posCurve = new THREE.CatmullRomCurve3(KEYS.map(k => new THREE.Vector3(...k[1])), false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(KEYS.map(k => new THREE.Vector3(...k[2])), false, 'centripetal');
  const toCurveT = p => {
    for (let i = 0; i < KEYS.length - 1; i++) {
      if (p <= KEYS[i + 1][0]) return (i + (p - KEYS[i][0]) / (KEYS[i + 1][0] - KEYS[i][0])) / (KEYS.length - 1);
    }
    return 1;
  };

  // --- Depois da revelação, arrastar gira a arena -------------------------------------
  let orbit = 0, orbitTarget = 0, velocity = 0, dragging = false, lastX = 0;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  canvas.addEventListener('pointerdown', e => {
    if ((window.__heroP ?? 0) < 0.97) return;
    dragging = true; lastX = e.clientX; velocity = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  addEventListener('pointermove', e => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    orbitTarget -= dx * 0.004; velocity = -dx * 0.004;
  });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 58 : 40;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  // --- Loop ------------------------------------------------------------------------
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  const clock = new THREE.Clock();
  const tmpColor = new THREE.Color();
  const pos = new THREE.Vector3(), look = new THREE.Vector3();
  let p = reduceMotion ? 1 : (window.__heroP ?? 0);
  let lastLit = -1, ledTimer = 0, lastSeatP = -1;

  function updateSeats(sp) {
    if (Math.abs(sp - lastSeatP) < 0.002) return;
    lastSeatP = sp;
    let lit = 0;
    for (let i = 0; i < SEATS; i++) {
      const local = clamp01((sp - litAt[i]) / 0.08);
      if (local > 0) lit++;
      tmpColor.copy(OFF).lerp(tint[i], local);
      seatMesh.setColorAt(i, tmpColor);
    }
    if (sp >= 1) lit = SEATS;
    seatMesh.instanceColor.needsUpdate = true;
    if (counter && lit !== lastLit) counter.textContent = lit.toLocaleString('pt-BR');
    lastLit = lit;
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    const target = reduceMotion ? 1 : clamp01(window.__heroP ?? 0);
    p += (target - p) * Math.min(1, dt * 5);
    pointer.sx += (pointer.x - pointer.sx) * 0.05;
    pointer.sy += (pointer.y - pointer.sy) * 0.05;

    // Câmera no trilho, com a respiração de uma steadicam e um pouco de paralaxe do mouse
    const ct = toCurveT(p);
    posCurve.getPoint(ct, pos);
    lookCurve.getPoint(ct, look);
    const corridor = smooth(0.46, 0.54, p) * (1 - smooth(0.64, 0.74, p));
    const sway = reduceMotion ? 0 : 1 - corridor;
    pos.x += (Math.sin(t * 0.35) * 0.35 + pointer.sx * 1.4) * sway;
    pos.y += (Math.cos(t * 0.27) * 0.2 - pointer.sy * 0.6) * sway;

    // Depois da revelação, a câmera gira em torno do centro da arena
    const arrived = smooth(0.94, 1, p);
    if (!dragging) {
      velocity *= 0.94;
      orbitTarget += velocity;
      if (!reduceMotion && arrived > 0.5) orbitTarget += dt * 0.03;
    }
    orbitTarget *= 1 - (1 - arrived) * 0.1; // volta ao eixo quando o visitante rola para cima
    orbit += (orbitTarget - orbit) * 0.08;
    if (orbit) {
      const c = Math.cos(orbit), s = Math.sin(orbit);
      pos.set(pos.x * c + pos.z * s, pos.y, -pos.x * s + pos.z * c);
      look.set(look.x * c + look.z * s, look.y, -look.x * s + look.z * c);
    }
    camera.position.copy(pos);
    camera.lookAt(look);

    // A arena revelada desliza para o lado, abrindo espaço para o título
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const shift = smooth(0.82, 1, p);
    if (w / h > 1.1) camera.setViewOffset(w, h, -w * 0.16 * shift, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.1 * shift, w, h);

    // Portões: abrem entre 30% e 54% da rolagem
    const open = smooth(0.3, 0.54, p);
    leftPivot.rotation.y = open * 1.72;
    rightPivot.rotation.y = -open * 1.72;
    const crack = 0.25 + 0.15 * Math.sin(t * 2.3) * (1 - open);
    spill.intensity = 6 + crack * 10 + open * 150;
    // A placa de luz e o halo somem antes de a câmera atravessar o vão
    const through = smooth(0.44, 0.53, p);
    doorLight.material.opacity = 1 - through;
    doorLight.visible = through < 1;
    halo.material.opacity = (0.35 + open * 0.35) * (1 - through);
    halo.scale.setScalar(4 + open * 4);
    floorBeam.material.opacity = open * 0.85;
    floorBeam.scale.x = 2 + open * 6;

    // O clarão ao atravessar o portão
    const flash = smooth(0.5, 0.58, p) * (1 - smooth(0.6, 0.7, p));
    renderer.toneMappingExposure = 1 + flash * 0.6 + smooth(0.66, 1, p) * 0.15;
    bloom.strength = 0.85 + flash * 0.5;

    // Dentro da arena, o brilho dos arcos baixa para não competir com a plateia
    const inside = smooth(0.62, 0.8, p);
    glowRing.material.uniforms.uGlow.value = 1 - inside * 0.72;
    sky.material.uniforms.uInside.value = inside;
    scene.fog.density = 0.006 + inside * 0.003;
    film.uniforms.uTime.value = t % 100;

    updateSeats(clamp01((p - 0.64) / 0.3) * 1.02);

    if (!reduceMotion) {
      beams.forEach(b => {
        b.pivot.rotation.z = Math.sin(t * 0.6 + b.phase) * 0.45;
        b.pivot.rotation.x = Math.cos(t * 0.45 + b.phase) * 0.3 + 0.35;
      });
      dust.rotation.y = t * 0.01;
      stageLight.intensity = 240 + Math.sin(t * 2.1) * 30;
    }
    ledTimer += dt;
    if (ledTimer > 0.06) { drawLed(t); ledTimer = 0; }

    composer.render();
  }

  const fontsReady = document.fonts
    ? Promise.all([document.fonts.load('400 150px Marcellus'), document.fonts.load('900 190px "Big Shoulders Display"')]).catch(() => {})
    : Promise.resolve();
  fontsReady.then(() => { drawPlaque(); drawLed(0); });
  drawPlaque();
  requestAnimationFrame(frame);
}

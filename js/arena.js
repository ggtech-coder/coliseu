// Arena 3D do hero: um anfiteatro elíptico com exatamente 3.000 lugares que acendem
// em ondas a partir do palco. Arraste para girar; a rolagem aproxima a câmera.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.querySelector('[data-arena]');
const counter = document.querySelector('[data-seat-count]');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const SEATS = 3000;
const COLORS = {
  night: 0x150f1e,
  stone: 0x9a857c,
  seatOff: new THREE.Color(0x2b2135),
  amber: new THREE.Color(0xffb45e),
  bronze: new THREE.Color(0xc28a4e),
  stoneLit: new THREE.Color(0xf4e6cf),
};

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
} catch (err) {
  canvas.style.display = 'none';
}

if (renderer) init();

function init() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(COLORS.night, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(COLORS.night, 0.0085);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);

  // Luzes: céu púrpura, luz quente vinda do palco
  scene.add(new THREE.HemisphereLight(0x6e2860, 0x0a0710, 0.9));
  const stageLight = new THREE.PointLight(0xffb45e, 260, 90, 1.6);
  stageLight.position.set(0, 9, -10);
  scene.add(stageLight);
  const rim = new THREE.DirectionalLight(0xc45bff, 0.6);
  rim.position.set(-30, 40, 30);
  scene.add(rim);

  const arena = new THREE.Group();
  scene.add(arena);

  // --- Geometria da cávea --------------------------------------------------
  const ROWS = 26;
  const A0 = 15, B0 = 10.5;           // semi-eixos da primeira fileira
  const ROW_STEP = 0.92, RISE = 0.5;   // profundidade e altura de cada degrau
  const GAP = 0.62;                    // ângulo livre em frente ao palco (rad)

  // Gera todas as posições candidatas, depois amostra exatamente 3.000
  const candidates = [];
  for (let r = 0; r < ROWS; r++) {
    const a = A0 + r * ROW_STEP, b = B0 + r * ROW_STEP;
    const perim = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
    const usable = perim * (1 - (2 * GAP) / (Math.PI * 2));
    const n = Math.floor(usable / 0.82);
    for (let i = 0; i < n; i++) {
      const t = GAP + (i / (n - 1)) * (Math.PI * 2 - 2 * GAP);
      // t = 0 aponta para o palco (z negativo)
      const x = Math.sin(t) * a;
      const z = -Math.cos(t) * b;
      candidates.push({ x, y: RISE * (r + 1) + 0.16, z, r, t });
    }
  }
  const step = candidates.length / SEATS;
  const seats = [];
  for (let i = 0; i < SEATS; i++) seats.push(candidates[Math.floor(i * step)]);

  // Degraus de pedra sob as cadeiras
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x3a2e40, roughness: 0.95, metalness: 0 });
  for (let r = 0; r < ROWS; r += 1) {
    const a = A0 + r * ROW_STEP + 0.2, b = B0 + r * ROW_STEP + 0.2;
    const shape = new THREE.Shape();
    const pts = 96;
    for (let i = 0; i <= pts; i++) {
      const t = GAP - 0.05 + (i / pts) * (Math.PI * 2 - 2 * GAP + 0.1);
      const p = [Math.sin(t) * (a + ROW_STEP / 2), -Math.cos(t) * (b + ROW_STEP / 2)];
      i === 0 ? shape.moveTo(...p) : shape.lineTo(...p);
    }
    for (let i = pts; i >= 0; i--) {
      const t = GAP - 0.05 + (i / pts) * (Math.PI * 2 - 2 * GAP + 0.1);
      shape.lineTo(Math.sin(t) * (a - ROW_STEP / 2), -Math.cos(t) * (b - ROW_STEP / 2));
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: RISE * (r + 1), bevelEnabled: false, curveSegments: 1 });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, RISE * (r + 1) - 0.0, 0);
    const mesh = new THREE.Mesh(geo, stepMat);
    arena.add(mesh);
  }

  // Cadeiras: um único InstancedMesh com cor por instância
  const seatGeo = new THREE.BoxGeometry(0.5, 0.32, 0.44);
  const seatMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const seatMesh = new THREE.InstancedMesh(seatGeo, seatMat, SEATS);
  const dummy = new THREE.Object3D();
  const litAt = new Float32Array(SEATS);   // quando cada lugar acende (0..1 da onda)
  const tint = [];
  seats.forEach((s, i) => {
    dummy.position.set(s.x, s.y, s.z);
    dummy.lookAt(0, s.y, 0);
    dummy.updateMatrix();
    seatMesh.setMatrixAt(i, dummy.matrix);
    seatMesh.setColorAt(i, COLORS.seatOff);
    // A onda parte do palco (t pequeno) e sobe pelas fileiras
    const fromStage = Math.min(s.t, Math.PI * 2 - s.t) / Math.PI;
    litAt[i] = fromStage * 0.7 + (s.r / ROWS) * 0.3 + Math.random() * 0.05;
    const mix = Math.random();
    tint.push(mix < 0.12 ? COLORS.stoneLit : COLORS.amber.clone().lerp(COLORS.bronze, mix * 0.7));
  });
  seatMesh.instanceColor.needsUpdate = true;
  arena.add(seatMesh);

  // --- Fachada de arcos (três níveis, como o Coliseu) --------------------------
  const WALL_A = A0 + ROWS * ROW_STEP + 1.6, WALL_B = B0 + ROWS * ROW_STEP + 1.6;
  const BAYS = 64, LEVELS = 3, LEVEL_H = 5.2;
  const wallMat = new THREE.MeshStandardMaterial({ color: COLORS.stone, roughness: 0.85, metalness: 0.05 });
  const pillarGeo = new THREE.BoxGeometry(0.9, LEVEL_H, 1.1);
  const archGeo = new THREE.TorusGeometry(1.25, 0.28, 6, 14, Math.PI);
  const pillars = new THREE.InstancedMesh(pillarGeo, wallMat, BAYS * LEVELS);
  const arches = new THREE.InstancedMesh(archGeo, wallMat, BAYS * LEVELS);
  let k = 0;
  for (let lv = 0; lv < LEVELS; lv++) {
    for (let i = 0; i < BAYS; i++) {
      const t = (i / BAYS) * Math.PI * 2;
      const x = Math.sin(t) * WALL_A, z = -Math.cos(t) * WALL_B;
      const tangent = Math.atan2(Math.cos(t) * WALL_A, Math.sin(t) * WALL_B);
      dummy.position.set(x, LEVEL_H / 2 + lv * LEVEL_H, z);
      dummy.rotation.set(0, -tangent + Math.PI / 2, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      pillars.setMatrixAt(k, dummy.matrix);

      const t2 = ((i + 0.5) / BAYS) * Math.PI * 2;
      const x2 = Math.sin(t2) * WALL_A, z2 = -Math.cos(t2) * WALL_B;
      const tan2 = Math.atan2(Math.cos(t2) * WALL_A, Math.sin(t2) * WALL_B);
      dummy.position.set(x2, lv * LEVEL_H + LEVEL_H - 1.6, z2);
      dummy.rotation.set(0, -tan2, 0);
      dummy.updateMatrix();
      arches.setMatrixAt(k, dummy.matrix);
      k++;
    }
  }
  arena.add(pillars, arches);

  // Cornijas: anéis horizontais entre os níveis
  for (let lv = 0; lv <= LEVELS; lv++) {
    const curve = new THREE.EllipseCurve(0, 0, WALL_A, WALL_B, 0, Math.PI * 2, false, 0);
    const pts = curve.getPoints(160).map(p => new THREE.Vector3(p.x, lv * LEVEL_H, p.y));
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, lv === LEVELS ? 0.55 : 0.38, 5, true);
    arena.add(new THREE.Mesh(tube, wallMat));
  }

  // Piso da arena
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1, 80),
    new THREE.MeshStandardMaterial({ color: 0x1b1322, roughness: 0.6, metalness: 0.2 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.scale.set(A0 - 0.3, B0 - 0.3, 1);
  arena.add(floor);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(160, 48),
    new THREE.MeshStandardMaterial({ color: 0x0e0a14, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);

  // --- Palco e telão -----------------------------------------------------------
  const stage = new THREE.Mesh(
    new THREE.BoxGeometry(12, 1.1, 5),
    new THREE.MeshStandardMaterial({ color: 0x241a2c, roughness: 0.5 })
  );
  stage.position.set(0, 0.55, -B0 + 3.2);
  arena.add(stage);

  const ledCanvas = document.createElement('canvas');
  ledCanvas.width = 1024; ledCanvas.height = 384;
  const led = ledCanvas.getContext('2d');
  const ledTex = new THREE.CanvasTexture(ledCanvas);
  ledTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 4.9),
    new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false })
  );
  screen.position.set(0, 4.2, -B0 + 1.1);
  arena.add(screen);

  function drawLed(time) {
    const w = ledCanvas.width, h = ledCanvas.height;
    const g = led.createLinearGradient(0, 0, w, h);
    const p = (Math.sin(time * 0.4) + 1) / 2;
    g.addColorStop(0, '#2a0f2a');
    g.addColorStop(p * 0.6 + 0.2, '#6e2860');
    g.addColorStop(1, '#ff9e45');
    led.fillStyle = g;
    led.fillRect(0, 0, w, h);
    led.fillStyle = '#fff2df';
    led.font = '900 190px "Big Shoulders Display", Arial Narrow, sans-serif';
    led.textAlign = 'center';
    led.textBaseline = 'middle';
    led.fillText('COLISEU', w / 2, h / 2 + 8);
    // Grade de pixels do LED
    led.fillStyle = 'rgba(0,0,0,.35)';
    for (let x = 0; x < w; x += 6) led.fillRect(x, 0, 2, h);
    for (let y = 0; y < h; y += 6) led.fillRect(0, y, w, 2);
    ledTex.needsUpdate = true;
  }

  // Feixes de luz cênica (cones aditivos)
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffb45e, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  const beams = [];
  for (let i = 0; i < 6; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4.5, 26, 24, 1, true), beamMat.clone());
    cone.geometry.translate(0, -13, 0);
    const pivot = new THREE.Group();
    pivot.position.set(-7.5 + i * 3, 16, -B0 + 2.2);
    pivot.add(cone);
    if (i % 2) cone.material.color.set(0xc45bff);
    arena.add(pivot);
    beams.push({ pivot, phase: i * 1.3 });
  }

  // Poeira no ar
  const dustCount = 700;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 60;
    dustPos[i * 3 + 1] = Math.random() * 24;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xffd9a8, size: 0.09, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(dust);

  // --- Câmera e interação ------------------------------------------------------
  const orbit = { angle: 0.55, target: 0.55, height: 0, radius: 0 };
  let dragging = false, lastX = 0, velocity = 0, scrollP = 0;
  const pointer = { x: 0, y: 0 };

  canvas.addEventListener('pointerdown', e => {
    dragging = true; lastX = e.clientX; velocity = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    orbit.target -= dx * 0.005;
    velocity = -dx * 0.005;
  });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  addEventListener('scroll', () => {
    const h = canvas.clientHeight || innerHeight;
    scrollP = Math.min(1, Math.max(0, scrollY / h));
  }, { passive: true });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Em telas estreitas, recua a câmera para a arena caber
    camera.fov = w < 700 ? 50 : 36;
    scene.fog.density = w < 700 ? 0.005 : 0.0085;
    // No desktop, desloca a arena para a direita, deixando o título respirar
    if (w > 820) camera.setViewOffset(w, h, -w * 0.17, h * 0.02, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.1, w, h); // no celular, a arena sobe para a metade de cima
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  // --- Acendimento dos lugares ---------------------------------------------------
  let lightStart = null;
  const LIGHT_DURATION = reduceMotion ? 0 : 3.4;
  const startLighting = () => { if (lightStart === null) lightStart = performance.now(); };
  if (window.__coliseuReady) startLighting();
  addEventListener('coliseu:ready', startLighting);

  const tmpColor = new THREE.Color();
  let lastLit = -1;
  function updateSeats(now) {
    if (lightStart === null) return;
    const p = LIGHT_DURATION ? Math.min(1, (now - lightStart) / 1000 / LIGHT_DURATION) : 1;
    if (p === 1 && lastLit === SEATS) return;
    let lit = 0;
    for (let i = 0; i < SEATS; i++) {
      const local = Math.min(1, Math.max(0, (p - litAt[i]) / 0.08));
      if (local > 0) lit++;
      tmpColor.copy(COLORS.seatOff).lerp(tint[i], local);
      seatMesh.setColorAt(i, tmpColor);
    }
    if (p === 1) lit = SEATS;
    seatMesh.instanceColor.needsUpdate = true;
    if (lit !== lastLit && counter) counter.textContent = lit.toLocaleString('pt-BR');
    lastLit = lit;
  }

  // --- Loop ------------------------------------------------------------------
  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(canvas);

  const clock = new THREE.Clock();
  let ledTimer = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (!dragging) {
      velocity *= 0.94;
      orbit.target += velocity;
      if (!reduceMotion) orbit.target += dt * 0.045;
    }
    orbit.angle += (orbit.target - orbit.angle) * 0.08;

    // A rolagem desce a câmera em direção à arena
    const narrow = camera.aspect < 0.9;
    const radius = (narrow ? 112 : 100) - scrollP * 26;
    const height = (narrow ? 88 : 44) - scrollP * 16 + pointer.y * -2;
    camera.position.set(
      Math.sin(orbit.angle) * radius + pointer.x * 2,
      height,
      Math.cos(orbit.angle) * radius
    );
    camera.lookAt(0, narrow ? -6 : 2, 0);

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

    updateSeats(now);
    renderer.render(scene, camera);
  }
  // Garante que a fonte do telão esteja carregada antes do primeiro desenho
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => drawLed(0));
  requestAnimationFrame(frame);
}

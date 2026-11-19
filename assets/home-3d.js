import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const loader = new GLTFLoader();
const cache = {};
const FILES = {
  udjat: "/assets/3d/amulet_01_udjat.glb",
  scarab: "/assets/3d/amulet_07_scarab.glb",
  ankh: "/assets/3d/amulet_02_ankh.glb",
};
const NOTES = {
  udjat: "Everyone wore it, from children to pharaohs, against illness and the evil eye. It was painted on the bows of boats so that the boat could “see” its way.",
  scarab: "Almost every Egyptian wore a scarab, for renewal and good luck. Like the god Khepri rolling out the sun, it was believed to help one begin again.",
  ankh: "The sign of the breath the gods give. It was worn in necklaces and carved on mirror handles and water jars, so that life would not run dry.",
};

function getModel(name) {
  if (!cache[name]) {
    cache[name] = loader.loadAsync(FILES[name]).then((g) => {
      const root = g.scene;
      root.traverse((o) => {
        if (o.isMesh) {
          const m = o.material;
          m.metalness = 0.25;
          m.roughness = 0.32;
          m.envMapIntensity = 1.15;
          if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
        }
      });
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      root.position.sub(center);
      const holder = new THREE.Group();
      holder.add(root);
      holder.scale.setScalar(2 / Math.max(size.x, size.y, size.z));
      return holder;
    });
  }
  return cache[name].then((h) => h.clone(true));
}

function makeRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  return r;
}

function lights(scene, renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffd9a0, 2.6);
  key.position.set(-3, 4, 4);
  const rim = new THREE.DirectionalLight(0x9fb4ff, 1.8);
  rim.position.set(4, 1.5, -3);
  const fill = new THREE.AmbientLight(0x3a2a17, 0.6);
  scene.add(key, rim, fill);
}

function webglOk() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
}

/* ---------- hero ---------- */
function hero() {
  const canvas = document.getElementById("hero3d");
  if (!canvas) return;
  const renderer = makeRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 7);
  lights(scene, renderer);

  const pivot = new THREE.Group();
  scene.add(pivot);

  // golden dust
  const N = innerWidth < 700 ? 260 : 520;
  const pos = new Float32Array(N * 3), spd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 12;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
    spd[i] = 0.05 + Math.random() * 0.15;
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dot = document.createElement("canvas"); dot.width = dot.height = 32;
  const dc = dot.getContext("2d"); const gr = dc.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, "rgba(255,236,190,1)"); gr.addColorStop(0.4, "rgba(243,213,138,.5)"); gr.addColorStop(1, "rgba(243,213,138,0)");
  dc.fillStyle = gr; dc.fillRect(0, 0, 32, 32);
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.06, map: new THREE.CanvasTexture(dot), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
  scene.add(dust);

  let model = null, mobile = false;
  function layout() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    mobile = w < 760;
    pivot.position.set(mobile ? 0.15 : 2.2, mobile ? 1.38 : 0.35, 0);
    pivot.scale.setScalar(mobile ? 0.44 : 0.8);
  }
  layout();
  addEventListener("resize", layout);

  getModel("udjat").then((m) => {
    model = m; model.rotation.set(0.12, -0.5, 0.04); pivot.add(model);
    canvas.classList.add("ready");
  }).catch(() => {});

  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => { target.x = (e.clientX / innerWidth - 0.5); target.y = (e.clientY / innerHeight - 0.5); }, { passive: true });
  addEventListener("deviceorientation", (e) => {
    if (e.gamma == null) return;
    target.x = Math.max(-0.5, Math.min(0.5, e.gamma / 60));
    target.y = Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 80));
  }, { passive: true });

  let visible = true;
  new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; }).observe(canvas);

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = clock.getElapsedTime(), dt = Math.min(clock.getDelta(), 0.05);
    const sp = Math.min(scrollY / innerHeight, 1.2);
    cur.x += (target.x - cur.x) * 0.05; cur.y += (target.y - cur.y) * 0.05;
    if (model) {
      model.rotation.y = -0.5 + (reduce ? 0 : Math.sin(t * 0.35) * 0.45) + cur.x * 0.7 + sp * 2.2;
      model.rotation.x = 0.12 + cur.y * 0.4 + (reduce ? 0 : Math.sin(t * 0.5) * 0.05);
      model.position.y = reduce ? 0 : Math.sin(t * 0.8) * 0.07;
    }
    pivot.position.z = -sp * 3.2;
    if (!reduce) {
      const p = dg.attributes.position.array;
      for (let i = 0; i < N; i++) {
        p[i * 3 + 1] += spd[i] * 0.01;
        p[i * 3] += Math.sin(t * 0.3 + i) * 0.0015;
        if (p[i * 3 + 1] > 4) p[i * 3 + 1] = -4;
      }
      dg.attributes.position.needsUpdate = true;
    }
    dust.rotation.y = cur.x * 0.15;
    renderer.render(scene, camera);
  }
  tick();
}

/* ---------- amulet casket ---------- */
function casket() {
  const canvas = document.getElementById("amulet3d");
  if (!canvas) return;
  let started = false;
  const io = new IntersectionObserver((es) => {
    if (es[0].isIntersecting && !started) { started = true; io.disconnect(); start(); }
  }, { rootMargin: "300px" });
  io.observe(canvas);

  function start() {
    const renderer = makeRenderer(canvas);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0, 5.6);
    lights(scene, renderer);
    const pivot = new THREE.Group(); scene.add(pivot);
    let model = null, name = "udjat", token = 0;

    function size() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    size(); addEventListener("resize", size);

    function show(n) {
      const my = ++token; name = n;
      getModel(n).then((m) => {
        if (my !== token) return;
        if (model) pivot.remove(model);
        model = m; model.userData.base = m.scale.x; model.scale.setScalar(m.scale.x * 0.001); pivot.add(model); grow = 0;
      });
    }
    let grow = 1;
    show("udjat");

    // drag to turn, with inertia
    let rotY = -0.4, rotX = 0.1, vel = 0.004, drag = false, lx = 0, ly = 0;
    canvas.addEventListener("pointerdown", (e) => { drag = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      rotY += dx * 0.01; rotX = Math.max(-0.6, Math.min(0.6, rotX + dy * 0.006)); vel = dx * 0.0012;
    });
    const end = () => { drag = false; };
    canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);

    document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach((x) => x.setAttribute("aria-selected", x === b ? "true" : "false"));
      const n = b.getAttribute("data-model");
      const note = document.getElementById("amuletNote");
      note.style.opacity = 0;
      setTimeout(() => { note.textContent = NOTES[n]; note.style.opacity = 1; }, 250);
      show(n);
    }));

    let visible = true;
    new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; }).observe(canvas);
    const clock = new THREE.Clock();
    (function tick() {
      requestAnimationFrame(tick);
      if (!visible) return;
      const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
      if (!drag) { rotY += reduce ? 0 : vel; vel += (0.004 - vel) * 0.03; }
      if (model) {
        if (grow < 1) { grow = Math.min(1, grow + dt * 1.8); const e = 1 - Math.pow(1 - grow, 3); model.scale.setScalar(Math.max(e, 0.001) * model.userData.base); }
        model.rotation.y = rotY; model.rotation.x = rotX;
        model.position.y = reduce ? 0 : Math.sin(t * 0.9) * 0.05;
      }
      renderer.render(scene, camera);
    })();
  }
}

if (webglOk()) {
  const go = () => { hero(); casket(); };
  if (document.readyState === "complete") go(); else addEventListener("load", go);
}

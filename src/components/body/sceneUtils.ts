import * as THREE from 'three';
import { getTier, makeSceneRenderer } from '@/lib/renderTier';

/** תווית עברית כספרייט קנבס — משותפת לכל סצנות מסע המזון. */
export function makeLabel(text: string, color = '#ffeef0', width = 1.7) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const draw = (t: string, c: string) => {
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = 'rgba(24,10,14,0.78)';
    ctx.beginPath();
    ctx.roundRect(8, 24, 496, 80, 26);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.26)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = 'bold 50px system-ui, "Segoe UI", sans-serif';
    ctx.fillStyle = c;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';
    ctx.fillText(t, 256, 66, 470);
  };

  draw(text, color);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  );
  sprite.scale.set(width, width * 0.247, 1);
  sprite.renderOrder = 12;

  return {
    sprite,
    redraw: (t: string, c = color) => {
      draw(t, c);
      tex.needsUpdate = true;
    },
  };
}

/** יוצר renderer עם אותה הגדרת PBR/טון־מאפינג בכל התחנות. */
export function makeRenderer(mount: HTMLElement) {
  return makeSceneRenderer(mount, { exposure: 1.05 });
}

/** תאורה אורגנית חמה — רקמות, לא ניאון. */
export function addTissueLights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xffc9c0, 0x1a0d12, 0.75));
  const budget = getTier();
  const key = new THREE.DirectionalLight(0xfff1e6, 1.15);
  key.position.set(3, 7, 6);
  key.castShadow = budget.shadows;
  key.shadow.mapSize.set(budget.shadowMapSize, budget.shadowMapSize);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff9a8a, 0.5);
  rim.position.set(-6, 3, -4);
  scene.add(rim);
  const fill = new THREE.PointLight(0xffd2b0, 12, 18);
  fill.position.set(0, 3, 5);
  scene.add(fill);
  return key;
}

interface OrbitOpts {
  orbit?: number;
  elev?: number;
  dist?: number;
  min?: number;
  max?: number;
}

/** בקרת מסלול פשוטה בגרירה + זום בגלגלת. */
export function attachOrbit(el: HTMLElement, opts: OrbitOpts = {}) {
  const s = {
    orbit: opts.orbit ?? 0.7,
    elev: opts.elev ?? 0.28,
    dist: opts.dist ?? 9,
  };
  const min = opts.min ?? 4;
  const max = opts.max ?? 18;
  let dragging = false;
  let lx = 0;
  let ly = 0;

  const onDown = (e: PointerEvent) => {
    dragging = true;
    lx = e.clientX;
    ly = e.clientY;
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    s.orbit -= (e.clientX - lx) * 0.005;
    s.elev = THREE.MathUtils.clamp(s.elev - (e.clientY - ly) * 0.004, 0.03, 0.9);
    lx = e.clientX;
    ly = e.clientY;
  };
  const onUp = () => {
    dragging = false;
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    s.dist = THREE.MathUtils.clamp(s.dist * Math.exp(dy * 0.0012), min, max);
  };

  // נגישות: הסצנה מקבלת פוקוס ונשלטת גם בחצי המקלדת, לא רק בעכבר.
  const onKey = (e: KeyboardEvent) => {
    const step = 0.12;
    if (e.key === 'ArrowLeft') s.orbit += step;
    else if (e.key === 'ArrowRight') s.orbit -= step;
    else if (e.key === 'ArrowUp') s.elev = THREE.MathUtils.clamp(s.elev + 0.06, 0.03, 0.9);
    else if (e.key === 'ArrowDown') s.elev = THREE.MathUtils.clamp(s.elev - 0.06, 0.03, 0.9);
    else if (e.key === '+' || e.key === '=') s.dist = THREE.MathUtils.clamp(s.dist * 0.9, min, max);
    else if (e.key === '-' || e.key === '_') s.dist = THREE.MathUtils.clamp(s.dist * 1.1, min, max);
    else return;
    e.preventDefault();
  };

  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  el.setAttribute('role', 'application');
  el.setAttribute('aria-label', 'סצנת ניסוי תלת־ממדית — חצים לסיבוב, פלוס ומינוס לזום');
  el.style.outlineOffset = '2px';

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('keydown', onKey);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  return {
    state: s,
    dispose() {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('keydown', onKey);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    },
  };
}

/** ניקוי גיאומטריות, חומרים וספרייטים בסצנה. */
export function disposeScene(scene: THREE.Scene) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if ((m as any).isMesh) {
      m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[];
      Array.isArray(mat) ? mat.forEach((x) => x.dispose()) : mat.dispose();
    }
    const sp = o as THREE.Sprite;
    if ((sp as any).isSprite) {
      sp.material.map?.dispose();
      sp.material.dispose();
    }
  });
}

/** חומר רקמה סטנדרטי (דופן איבר). */
export function tissueMaterial(color = 0xc4676b, opts: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.55,
    metalness: 0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.35,
    sheen: 0.6,
    sheenColor: new THREE.Color(0xff9d9d),
    ...opts,
  });
}

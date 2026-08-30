import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Props = {
  /** 1..6 — רמת קנה המידה הנוכחית */
  level: number;
  /** לחיצה על נקודת הזום / גלגל עכבר פנימה */
  onZoomIn: () => void;
  onZoomOut: () => void;
};

const makeLabel = (text: string, color = '#e8f0ff', w = 1.6) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(10,16,26,0.78)';
  ctx.beginPath();
  ctx.roundRect(8, 26, 496, 76, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.26)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = 'bold 46px system-ui, "Segoe UI", sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.fillText(text, 256, 66, 470);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(w, w * 0.25, 1);
  sprite.renderOrder = 12;
  return sprite;
};

/**
 * תעלומה ה' — "ספר הזום": שש רמות קנה מידה מסודרות בעומק הסצנה.
 * המצלמה צוללת מרמה לרמה, וכל רמה מציגה איור תלת־ממדי נקי עם חלקים מסומנים.
 */
const ZoomBookScene: React.FC<Props> = ({ level, onZoomIn, onZoomOut }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const state = useRef({ level });
  state.current = { level };
  const cbs = useRef({ onZoomIn, onZoomOut });
  cbs.current = { onZoomIn, onZoomOut };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b12);
    const camera = new THREE.PerspectiveCamera(48, mount.clientWidth / mount.clientHeight, 0.05, 400);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x9dbcff, 0x14121c, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(4, 6, 8);
    scene.add(key);

    // faint starfield for the "infinite zoom" feel
    const starGeo = new THREE.BufferGeometry();
    const starCount = 700;
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 2] = -Math.random() * 260;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(
      new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x9fb6ff, size: 0.18, transparent: true, opacity: 0.55 }))
    );

    const LEVEL_GAP = 40;
    const levels: { group: THREE.Group; z: number; hotspot: THREE.Mesh | null }[] = [];

    const mkLevel = (index: number, build: (g: THREE.Group) => THREE.Mesh | null) => {
      const g = new THREE.Group();
      const z = -index * LEVEL_GAP;
      g.position.z = z;
      const hotspot = build(g);
      scene.add(g);
      levels.push({ group: g, z, hotspot });
    };

    const glow = (color: number) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const solid = (color: number, rough = 0.55) =>
      new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.1 });

    const addHotspot = (g: THREE.Group, x: number, y: number, text: string) => {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), glow(0x7dd3fc));
      dot.position.set(x, y, 0.6);
      dot.userData.hotspot = true;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.42, 0.5, 32),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
      );
      ring.position.copy(dot.position);
      const lbl = makeLabel(text, '#bae6fd', 2.0);
      lbl.position.set(x, y - 0.85, 0.6);
      g.add(dot, ring, lbl);
      return dot;
    };

    // ---------- level 1: the island from space ----------
    mkLevel(0, (g) => {
      const planet = new THREE.Mesh(new THREE.SphereGeometry(2.4, 48, 36), solid(0x2f6fb0, 0.7));
      const island = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 18), solid(0x4e8b53, 0.8));
      island.position.set(1.1, 0.7, 1.9);
      island.scale.set(1, 0.55, 0.7);
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.85, 28, 20), glow(0xffd166));
      sun.position.set(-5.2, 2.2, 2);
      const sunLight = new THREE.PointLight(0xffe6a8, 22, 30);
      sunLight.position.copy(sun.position);
      const rayMat = new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.35 });
      for (let i = -1; i <= 1; i++) {
        const ray = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.05, 0.05), rayMat);
        ray.position.set(-2.6, 2.2 + i * 1.1, 1.6);
        g.add(ray);
      }
      g.add(planet, island, sun, sunLight, makeLabel('☀️ שמש — מפיקת אור', '#fde68a', 2.2).translateY(3.6));
      const nightLbl = makeLabel('צד הלילה — האור לא מתעקל', '#c7d2fe', 2.4);
      nightLbl.position.set(2.6, -2.4, 0.6);
      g.add(nightLbl);
      return addHotspot(g, 1.4, 1.6, 'זום למדשאה');
    });

    // ---------- level 2: the meadow, straight rays + shadow ----------
    mkLevel(1, (g) => {
      const ground = new THREE.Mesh(new THREE.CircleGeometry(6, 48), solid(0x4a7a4f, 0.9));
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1.6;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.6, 16), solid(0x6b4a2f, 0.9));
      trunk.position.set(0.4, -0.8, 0);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.7, 18), solid(0x2f6b3d, 0.85));
      crown.position.set(0.4, 0.6, 0);
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 2.6),
        new THREE.MeshBasicMaterial({ color: 0x101a14, transparent: true, opacity: 0.6 })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(2.0, -1.58, 0);
      const rayMat = new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.5 });
      for (let i = 0; i < 4; i++) {
        const ray = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.05, 0.05), rayMat);
        ray.position.set(-2.2, 0.2 + i * 0.55, 0);
        ray.rotation.z = -0.18;
        g.add(ray);
      }
      const l1 = makeLabel('קרניים ישרות מהשמש', '#fde68a', 2.3);
      l1.position.set(-2.4, 2.4, 0.4);
      const l2 = makeLabel('עץ אטום → צל בצורתו', '#fecaca', 2.3);
      l2.position.set(2.4, -0.2, 0.6);
      g.add(ground, trunk, crown, shadow, l1, l2);
      return addHotspot(g, 0.4, 1.9, 'זום לגביש האור');
    });

    // ---------- level 3: light hitting a single crystal ----------
    mkLevel(2, (g) => {
      const table = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 3), solid(0x3a4350, 0.6));
      table.position.y = -1.6;
      const crystalMat = new THREE.MeshPhysicalMaterial({
        color: 0x9fd8ff,
        roughness: 0.05,
        transmission: 0.9,
        transparent: true,
        opacity: 0.6,
        thickness: 0.6,
      });
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 0), crystalMat);
      crystal.position.y = 0;
      const inMat = new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.6 });
      const inRay = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.07, 0.07), inMat);
      inRay.position.set(-2.4, 0.5, 0);
      inRay.rotation.z = -0.18;
      const outRay = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.07, 0.07), inMat);
      outRay.position.set(2.2, -0.5, 0);
      outRay.rotation.z = -0.18;
      const refl = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.07, 0.07),
        new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.7 })
      );
      refl.position.set(-1.2, 1.7, 0);
      refl.rotation.z = 0.7;
      const l1 = makeLabel('אור נכנס (שקוף)', '#fde68a', 2.0);
      l1.position.set(-2.6, 1.2, 0.6);
      const l2 = makeLabel('אור מוחזר → כך רואים', '#bae6fd', 2.2);
      l2.position.set(-0.4, 2.7, 0.6);
      const l3 = makeLabel('אור נבלע → חום', '#fca5a5', 2.0);
      l3.position.set(2.2, -1.1, 0.6);
      g.add(table, crystal, inRay, outRay, refl, l1, l2, l3);
      return addHotspot(g, 1.5, 1.4, 'זום לפני השטח');
    });

    // ---------- level 4: smooth vs rough surface ----------
    mkLevel(3, (g) => {
      const smooth = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.2, 2),
        new THREE.MeshStandardMaterial({ color: 0xdfe9f5, roughness: 0.03, metalness: 1 })
      );
      smooth.position.set(-2, -0.6, 0);
      const rough = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 2), solid(0xb0a48f, 1));
      rough.position.set(2, -0.6, 0);
      const rayMat = new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.6 });
      // ordered reflection (left)
      for (let i = 0; i < 3; i++) {
        const inR = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 0.06), rayMat);
        inR.position.set(-3.1 + i * 0.35, 0.6, 0);
        inR.rotation.z = -0.7;
        const outR = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 0.06), rayMat);
        outR.position.set(-1.0 + i * 0.35, 0.6, 0);
        outR.rotation.z = 0.7;
        g.add(inR, outR);
      }
      // scattered reflection (right)
      for (let i = 0; i < 5; i++) {
        const outR = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.06), rayMat);
        outR.position.set(2 + Math.cos(0.5 + i * 0.45) * 0.9, -0.4 + Math.sin(0.5 + i * 0.45) * 0.9, 0);
        outR.rotation.z = 0.5 + i * 0.45;
        g.add(outR);
      }
      const l1 = makeLabel('משטח חלק → כמו מראה', '#bae6fd', 2.4);
      l1.position.set(-2, 2.1, 0.6);
      const l2 = makeLabel('משטח מחוספס → אור מפוזר', '#fde68a', 2.4);
      l2.position.set(2.1, 2.1, 0.6);
      g.add(smooth, rough, l1, l2);
      return addHotspot(g, 0, -1.7, 'זום לתוך הקרן');
    });

    // ---------- level 5: inside a single ray ----------
    mkLevel(4, (g) => {
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(1.0, 1.0, 9, 30, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
      );
      tube.rotation.z = Math.PI / 2;
      const packets: THREE.Mesh[] = [];
      for (let i = 0; i < 16; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), glow(0xffe08a));
        p.position.set(-4.2 + i * 0.55, Math.sin(i) * 0.35, Math.cos(i * 1.3) * 0.35);
        p.userData.packet = true;
        packets.push(p);
        g.add(p);
      }
      g.userData.packets = packets;
      const l1 = makeLabel('חבילות אנרגיה נעות ישר', '#fde68a', 2.6);
      l1.position.set(0, 2.0, 0.6);
      const l2 = makeLabel('מהירות עצומה — בלי אוויר או חוט', '#c7d2fe', 2.8);
      l2.position.set(0, -2.1, 0.6);
      g.add(tube, l1, l2);
      return addHotspot(g, 3.6, 1.2, 'זום אל העין');
    });

    // ---------- level 6: the eye ----------
    mkLevel(5, (g) => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(2, 40, 30),
        new THREE.MeshStandardMaterial({ color: 0xf3f6fb, roughness: 0.35 })
      );
      const iris = new THREE.Mesh(new THREE.CircleGeometry(0.85, 34), solid(0x2f7fb8, 0.5));
      iris.position.set(0, 0, 1.85);
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.36, 30), new THREE.MeshBasicMaterial({ color: 0x0a0d13 }));
      pupil.position.set(0, 0, 1.9);
      const retina = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 30, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xef9a9a, roughness: 0.7, side: THREE.DoubleSide })
      );
      retina.rotation.x = -Math.PI / 2;
      retina.position.z = -0.4;
      const rayMat = new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.65 });
      for (let i = -1; i <= 1; i++) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 4.2), rayMat);
        r.position.set(i * 0.22, i * 0.18, 3.9);
        g.add(r);
      }
      const l1 = makeLabel('אישון — הפתח לאור', '#bae6fd', 2.2);
      l1.position.set(0, 2.6, 1.6);
      const l2 = makeLabel('רשתית → אות אל המוח', '#fbcfe8', 2.4);
      l2.position.set(0, -2.7, 1.2);
      g.add(eye, iris, pupil, retina, l1, l2);
      return addHotspot(g, 2.6, 1.6, 'סיימתם את הספר');
    });

    // ---------- interaction ----------
    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const el = renderer.domElement;
    let downX = 0,
      downY = 0,
      dragging = false,
      lx = 0,
      ly = 0,
      yaw = 0,
      pitch = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lx = downX = e.clientX;
      ly = downY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      yaw = THREE.MathUtils.clamp(yaw - (e.clientX - lx) * 0.002, -0.6, 0.6);
      pitch = THREE.MathUtils.clamp(pitch + (e.clientY - ly) * 0.0015, -0.35, 0.35);
      lx = e.clientX;
      ly = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    const onClick = (e: PointerEvent) => {
      if (Math.abs(e.clientX - downX) > 4 || Math.abs(e.clientY - downY) > 4) return;
      const r = el.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(pointer, camera);
      const active = levels[state.current.level - 1];
      if (!active?.hotspot) return;
      if (ray.intersectObject(active.hotspot, true).length) cbs.current.onZoomIn();
    };
    let wheelAcc = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelAcc += e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      if (wheelAcc < -260) {
        wheelAcc = 0;
        cbs.current.onZoomIn();
      } else if (wheelAcc > 260) {
        wheelAcc = 0;
        cbs.current.onZoomOut();
      }
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onClick);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    const clock = new THREE.Clock();
    let raf = 0;
    let camZ = 15;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const idx = THREE.MathUtils.clamp(state.current.level - 1, 0, levels.length - 1);
      const targetZ = levels[idx].z + 15;
      camZ = THREE.MathUtils.lerp(camZ, targetZ, 1 - Math.exp(-3.2 * dt));
      // מרכז מוזז שמאלה כדי שהאיור יישאר ימינה מפאנלי המשימה
      camera.position.set(-2.6 + Math.sin(yaw) * 3, 0.6 + pitch * 3, camZ);
      camera.lookAt(-2.6, 0, levels[idx].z);

      levels.forEach((l, i) => {
        const dist = Math.abs(i - (state.current.level - 1));
        const visible = dist < 1.6;
        l.group.visible = visible;
        const targetOpacity = i === idx ? 1 : 0.15;
        l.group.traverse((o) => {
          const sp = o as THREE.Sprite;
          if ((sp as unknown as { isSprite?: boolean }).isSprite) {
            sp.material.opacity = THREE.MathUtils.lerp(sp.material.opacity, targetOpacity, dt * 6);
          }
        });
        if (l.hotspot) {
          const s = 1 + Math.sin(t * 3) * 0.18;
          l.hotspot.scale.setScalar(i === idx ? s : 0.6);
        }
        const packets = l.group.userData.packets as THREE.Mesh[] | undefined;
        if (packets) {
          packets.forEach((p) => {
            p.position.x += dt * 3.4;
            if (p.position.x > 4.3) p.position.x = -4.3;
          });
        }
        if (i === 0) l.group.rotation.y += dt * 0.06;
      });

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount.clientWidth) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onClick);
      el.removeEventListener('wheel', onWheel);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          const mat = m.material as THREE.Material | THREE.Material[];
          Array.isArray(mat) ? mat.forEach((x) => x.dispose()) : mat.dispose();
        }
        const sp = o as THREE.Sprite;
        if ((sp as unknown as { isSprite?: boolean }).isSprite) {
          sp.material.map?.dispose();
          sp.material.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
};

export default ZoomBookScene;

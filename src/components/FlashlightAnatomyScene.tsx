import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Props = {
  /** 0..1 — כמה המערכת מפורקת (מחוון הפירוק) */
  explode: number;
  /** id החלק שנבחר (דש מורם) */
  selected: string | null;
  onSelect: (id: string) => void;
  /** 0..100 מצב הסוללה */
  battery: number;
  lightOn: boolean;
};

const makeLabel = (text: string, color = '#e8f0ff') => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const draw = (t: string, c: string) => {
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = 'rgba(10,16,26,0.78)';
    ctx.beginPath();
    ctx.roundRect(8, 24, 496, 80, 26);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = 'bold 48px system-ui, "Segoe UI", sans-serif';
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
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0 })
  );
  sprite.scale.set(1.55, 0.39, 1);
  sprite.renderOrder = 14;
  return {
    sprite,
    redraw: (t: string, c = color) => {
      draw(t, c);
      tex.needsUpdate = true;
    },
  };
};

/**
 * תעלומה ד' — פנס אמיתי שנפרק לחלקיו.
 * מחוון "פירוק" מרחיק את החלקים זה מזה, לחיצה על חלק בוחרת אותו (הרמת דש),
 * ומצב הסוללה שולט על עוצמת הקרן — עד לכיבוי מלא.
 */
const FlashlightAnatomyScene: React.FC<Props> = ({ explode, selected, onSelect, battery, lightOn }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const state = useRef({ explode, selected, battery, lightOn });
  state.current = { explode, selected, battery, lightOn };
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e16);
    scene.fog = new THREE.Fog(0x0a0e16, 12, 30);
    const camera = new THREE.PerspectiveCamera(44, mount.clientWidth / mount.clientHeight, 0.05, 120);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x93b4ff, 0x14121a, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(3, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x86b0ff, 0.5);
    rim.position.set(-6, 3, -5);
    scene.add(rim);

    // bench
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(13, 0.22, 5.5),
      new THREE.MeshStandardMaterial({ color: 0x39424f, roughness: 0.6, metalness: 0.18 })
    );
    bench.position.y = 1.35;
    bench.receiveShadow = true;
    scene.add(bench);

    const metal = (c: number, r = 0.3, m = 0.85) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

    // ---- parts, laid out along +x. explodeDir spreads them apart.
    type P = { id: string; group: THREE.Group; base: number; dir: number; label: ReturnType<typeof makeLabel> };
    const parts: P[] = [];
    const Y = 2.5;

    const addPart = (id: string, name: string, base: number, dir: number, build: (g: THREE.Group) => void) => {
      const g = new THREE.Group();
      build(g);
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.userData.partId = id;
        }
      });
      g.position.set(base, Y, 0);
      scene.add(g);
      const label = makeLabel(name);
      scene.add(label.sprite);
      parts.push({ id, group: g, base, dir, label });
      return g;
    };

    // body (opaque shell)
    const bodyMat = metal(0x2c3441, 0.35, 0.75);
    addPart('body', 'מעטפת אטומה', -1.1, -1, (g) => {
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.55, 2.6, 32, 1, true), bodyMat);
      shell.rotation.z = Math.PI / 2;
      const grip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.57, 0.57, 0.9, 32, 1, true),
        metal(0x1d242e, 0.85, 0.3)
      );
      grip.rotation.z = Math.PI / 2;
      grip.position.x = -0.6;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.53, 0.12, 28), metal(0x232b36, 0.4, 0.8));
      cap.rotation.z = Math.PI / 2;
      cap.position.x = -1.34;
      g.add(shell, grip, cap);
    });

    // battery
    const batteryShell = metal(0xd9a13b, 0.45, 0.6);
    const batteryFill = new THREE.MeshStandardMaterial({ color: 0x3ecf6a, emissive: 0x1c7a3c, emissiveIntensity: 0.6 });
    let batteryBar: THREE.Mesh;
    addPart('battery', 'סוללה', -1.0, 0.35, (g) => {
      const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.5, 24), batteryShell);
      cell.rotation.z = Math.PI / 2;
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 16), metal(0xb9c2cc, 0.3, 0.9));
      tip.rotation.z = Math.PI / 2;
      tip.position.x = 0.8;
      batteryBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.1), batteryFill);
      batteryBar.position.set(0, 0.32, 0.26);
      g.add(cell, tip, batteryBar);
    });

    // switch
    const switchMat = new THREE.MeshStandardMaterial({ color: 0xef6c4d, roughness: 0.4, metalness: 0.2 });
    addPart('switch', 'מפסק', -0.2, 0.9, (g) => {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.34), metal(0x39424f, 0.5, 0.5));
      const knob = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.26), switchMat);
      knob.position.y = 0.14;
      plate.position.y = 0.55;
      knob.position.y = 0.68;
      g.add(plate, knob);
    });

    // bulb (real producer)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xdfefff,
      roughness: 0.06,
      metalness: 0,
      transparent: true,
      opacity: 0.35,
      transmission: 0.9,
      thickness: 0.2,
    });
    const filamentMat = new THREE.MeshStandardMaterial({
      color: 0xfff0c0,
      emissive: 0xffc451,
      emissiveIntensity: 3,
    });
    addPart('bulb', 'נורה — חוט להט', 0.5, 0.2, (g) => {
      const glass = new THREE.Mesh(new THREE.SphereGeometry(0.3, 26, 20), glassMat);
      const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.28, 18), metal(0x9aa6b2, 0.35, 0.9));
      socket.rotation.z = Math.PI / 2;
      socket.position.x = -0.32;
      const filament = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 8, 24), filamentMat);
      filament.rotation.y = Math.PI / 2;
      g.add(glass, socket, filament);
    });

    const bulbLight = new THREE.PointLight(0xffe6b0, 0, 7, 2);
    bulbLight.position.set(0.5, Y, 0);
    scene.add(bulbLight);

    // reflector
    const reflectorMat = new THREE.MeshStandardMaterial({
      color: 0xf2f6ff,
      roughness: 0.06,
      metalness: 1,
      side: THREE.DoubleSide,
    });
    addPart('reflector', 'מחזיר אור', 0.55, -0.55, (g) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.85, 34, 1, true), reflectorMat);
      cone.rotation.z = -Math.PI / 2;
      cone.position.x = 0.28;
      g.add(cone);
    });

    // lens
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0xd8ecff,
      roughness: 0.03,
      metalness: 0,
      transparent: true,
      opacity: 0.5,
      transmission: 0.95,
      thickness: 0.35,
      clearcoat: 1,
    });
    addPart('lens', 'עדשה שקופה', 1.35, 1.15, (g) => {
      const glass = new THREE.Mesh(new THREE.SphereGeometry(0.6, 30, 18, 0, Math.PI * 2, 0, Math.PI / 2.6), lensMat);
      glass.rotation.z = -Math.PI / 2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.05, 10, 30), metal(0x8d97a5, 0.35, 0.9));
      ring.rotation.y = Math.PI / 2;
      g.add(glass, ring);
    });

    // ---- beam out of the front
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfff0c8,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.7, 6, 28, 1, true), beamMat);
    beam.rotation.z = -Math.PI / 2;
    beam.position.set(4.6, Y, 0);
    scene.add(beam);

    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 3.6),
      new THREE.MeshStandardMaterial({ color: 0xe9edf5, roughness: 0.95 })
    );
    wall.position.set(8.1, 2.9, 0);
    wall.rotation.y = -Math.PI / 2;
    wall.receiveShadow = true;
    scene.add(wall);
    const spotMat = new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0 });
    const spotPatch = new THREE.Mesh(new THREE.CircleGeometry(1.25, 40), spotMat);
    spotPatch.position.set(8.06, Y, 0);
    spotPatch.rotation.y = -Math.PI / 2;
    scene.add(spotPatch);

    const statusLabel = makeLabel('הפנס דולק');
    statusLabel.sprite.scale.set(2.2, 0.55, 1);
    statusLabel.sprite.position.set(3.4, 4.5, 0);
    statusLabel.sprite.material.opacity = 1;
    scene.add(statusLabel.sprite);

    // ---- picking
    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0,
      downY = 0;
    const el = renderer.domElement;

    const onClick = (e: PointerEvent) => {
      if (Math.abs(e.clientX - downX) > 4 || Math.abs(e.clientY - downY) > 4) return;
      const r = el.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(pointer, camera);
      const hits = ray.intersectObjects(
        parts.flatMap((p) => p.group.children),
        true
      );
      const id = hits.find((h) => (h.object as THREE.Mesh).userData.partId)?.object.userData.partId as
        | string
        | undefined;
      if (id) selectRef.current(id);
    };

    // orbit
    let orbit = 0.55,
      elev = 0.28,
      dist = 11;
    let dragging = false,
      lx = 0,
      ly = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
      downX = e.clientX;
      downY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      orbit -= (e.clientX - lx) * 0.005;
      elev = THREE.MathUtils.clamp(elev - (e.clientY - ly) * 0.004, 0.02, 0.85);
      lx = e.clientX;
      ly = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      dist = THREE.MathUtils.clamp(dist * Math.exp(ev.deltaY * 0.0012), 6, 20);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onClick);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    const clock = new THREE.Clock();
    let raf = 0;
    let lastStatus = '';

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const s = state.current;

      camera.position.set(
        1.6 + Math.sin(orbit) * Math.cos(elev) * dist,
        2.6 + Math.sin(elev) * dist * 0.55,
        Math.cos(orbit) * Math.cos(elev) * dist
      );
      camera.lookAt(1.6, 2.6, 0);

      const charge = THREE.MathUtils.clamp(s.battery / 100, 0, 1);
      const dead = charge < 0.15;
      const power = s.lightOn && !dead ? Math.pow(Math.max(0, (charge - 0.12) / 0.88), 1.3) : 0;

      // explode layout + selection highlight
      parts.forEach((p) => {
        const isSel = s.selected === p.id;
        const targetX = p.base + p.dir * s.explode * 2.1;
        const targetY = Y + (isSel ? 0.45 : 0) + s.explode * Math.abs(p.dir) * 0.25;
        p.group.position.x = THREE.MathUtils.lerp(p.group.position.x, targetX, dt * 6);
        p.group.position.y = THREE.MathUtils.lerp(p.group.position.y, targetY, dt * 6);
        const targetScale = isSel ? 1.12 : 1;
        p.group.scale.setScalar(THREE.MathUtils.lerp(p.group.scale.x, targetScale, dt * 6));
        p.label.sprite.position.set(p.group.position.x, p.group.position.y + 1.0, 0);
        const want = isSel ? 1 : s.explode > 0.15 ? 0.85 : 0;
        p.label.sprite.material.opacity = THREE.MathUtils.lerp(p.label.sprite.material.opacity, want, dt * 8);
      });

      // bulb / beam react to the battery
      filamentMat.emissiveIntensity = THREE.MathUtils.lerp(filamentMat.emissiveIntensity, 3.2 * power, dt * 8);
      bulbLight.intensity = THREE.MathUtils.lerp(bulbLight.intensity, 14 * power, dt * 8);
      const hidden = s.explode * 0.9; // once exploded the beam falls apart
      beamMat.opacity = THREE.MathUtils.lerp(beamMat.opacity, 0.2 * power * (1 - hidden), dt * 8);
      spotMat.opacity = THREE.MathUtils.lerp(spotMat.opacity, 0.85 * power * (1 - hidden), dt * 8);
      spotPatch.scale.setScalar(THREE.MathUtils.lerp(spotPatch.scale.x, 0.55 + power * 0.6, dt * 6));

      // battery gauge
      if (batteryBar) {
        batteryBar.scale.x = Math.max(0.02, charge);
        batteryBar.position.x = -0.6 + (1.2 * Math.max(0.02, charge)) / 2;
        (batteryBar.material as THREE.MeshStandardMaterial).color.set(
          charge > 0.5 ? 0x3ecf6a : charge > 0.15 ? 0xf2c14e : 0xe4573d
        );
      }

      // flicker when almost empty
      if (!dead && charge < 0.35 && power > 0) {
        const f = 0.7 + 0.3 * Math.sin(t * 22 + Math.sin(t * 7) * 3);
        beamMat.opacity *= f;
        filamentMat.emissiveIntensity *= f;
      }

      const status = !s.lightOn
        ? 'המפסק כבוי — המעגל פתוח'
        : dead
          ? 'הסוללה נגמרה — אין הפקת אור'
          : charge < 0.35
            ? 'הקרן מהבהבת וחלשה'
            : 'הפנס דולק — קרן ישרה על הקיר';
      if (status !== lastStatus) {
        lastStatus = status;
        statusLabel.redraw(status, dead || !s.lightOn ? '#fecaca' : charge < 0.35 ? '#fde68a' : '#bbf7d0');
      }

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

export default FlashlightAnatomyScene;

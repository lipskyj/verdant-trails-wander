import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type Props = {
  /** straight tube = light reaches the eye */
  bent: boolean;
  /** horizontal alignment of the tube against the box opening, -1..1 */
  offset: number;
  onSeen?: (seen: boolean) => void;
};

/**
 * Room 2 experiment: a dark box with a candle inside, observed through a tube.
 * Straight + aligned tube -> the flame is visible. Bent or misaligned -> darkness.
 */
const DarkBoxScene: React.FC<Props> = ({ bent, offset, onSeen }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const bentRef = useRef(bent);
  const offsetRef = useRef(offset);
  const seenCbRef = useRef(onSeen);
  bentRef.current = bent;
  offsetRef.current = offset;
  seenCbRef.current = onSeen;

  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070b);
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.05, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xaac4ff, 0.25));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(3, 6, 4);
    key.castShadow = true;
    scene.add(key);

    // table
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.16, 4),
      new THREE.MeshStandardMaterial({ color: 0x5f4630, roughness: 0.6 })
    );
    table.position.y = 1.4;
    table.receiveShadow = true;
    scene.add(table);

    // dark box (open front face towards camera-left, hole in the right wall)
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x24303d, roughness: 0.8, side: THREE.DoubleSide });
    const box = new THREE.Group();
    const w = 2.2,
      h = 1.6,
      d = 1.8;
    const panel = (sx: number, sy: number, sz: number, x: number, y: number, z: number, ry = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), boxMat);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      m.castShadow = true;
      m.receiveShadow = true;
      box.add(m);
    };
    panel(w, h, 0.06, 0, h / 2, -d / 2); // back
    panel(0.06, h, d, -w / 2, h / 2, 0); // left wall
    panel(w, 0.06, d, 0, h, 0); // top
    panel(w, 0.06, d, 0, 0, 0); // bottom
    // right wall with a hole: build from 4 slabs around the opening
    const holeR = 0.22;
    const rw = 0.06;
    panel(rw, h / 2 - holeR, d, w / 2, (h / 2 - holeR) / 2, 0);
    panel(rw, h / 2 - holeR, d, w / 2, h - (h / 2 - holeR) / 2, 0);
    panel(rw, holeR * 2, d / 2 - holeR, w / 2, h / 2, -(d / 2 + holeR) / 2);
    panel(rw, holeR * 2, d / 2 - holeR, w / 2, h / 2, (d / 2 + holeR) / 2);
    box.position.set(-1.1, 1.48, 0);
    scene.add(box);

    // candle inside the box
    const candle = new THREE.Group();
    const wax = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.15, 0.5, 24),
      new THREE.MeshStandardMaterial({ color: 0xf3e5c7, roughness: 0.7 })
    );
    wax.position.y = 0.25;
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xfff2c2, emissive: 0xffb347, emissiveIntensity: 8 });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 16), flameMat);
    flame.position.y = 0.62;
    const flameLight = new THREE.PointLight(0xffb347, 6, 3.2, 2);
    flameLight.position.y = 0.65;
    candle.add(wax, flame, flameLight);
    candle.position.set(-1.1, 1.48, 0);
    scene.add(candle);

    // tube: two segments so it can be straight or bent
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0x9aa6b2, roughness: 0.35, metalness: 0.6 });
    const tube = new THREE.Group();
    const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.1, 24, 1, true), tubeMat);
    seg1.rotation.z = Math.PI / 2;
    seg1.position.x = 0.55;
    const jointPivot = new THREE.Group();
    jointPivot.position.x = 1.1;
    const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.1, 24, 1, true), tubeMat);
    seg2.rotation.z = Math.PI / 2;
    seg2.position.x = 0.55;
    jointPivot.add(seg2);
    tube.add(seg1, jointPivot);
    tube.position.set(0.05, 2.28, 0);
    scene.add(tube);

    // observer eye at the far end of the tube
    const eye = new THREE.Group();
    const eyeball = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xf7fbff, roughness: 0.25 })
    );
    const iris = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4 })
    );
    iris.position.x = 0.14;
    iris.scale.set(0.5, 1, 1);
    eye.add(eyeball, iris);
    eye.rotation.y = Math.PI;
    scene.add(eye);

    // glow shown at the eye when light gets through
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0 })
    );
    scene.add(halo);

    // visible light ray from flame through the tube to the eye
    const rayMat = new THREE.MeshBasicMaterial({ color: 0xffe6a8, transparent: true, opacity: 0 });
    const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 12), rayMat);
    ray.rotation.z = Math.PI / 2;
    scene.add(ray);

    // orbit
    let orbit = 0.55,
      elev = 0.3,
      dist = 8;
    let dragging = false,
      lx = 0,
      ly = 0;
    const el = renderer.domElement;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      orbit -= (e.clientX - lx) * 0.005;
      elev = THREE.MathUtils.clamp(elev - (e.clientY - ly) * 0.004, 0.05, 0.9);
      lx = e.clientX;
      ly = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      dist = THREE.MathUtils.clamp(dist * Math.exp(e.deltaY * 0.0012), 4, 15);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    const clock = new THREE.Clock();
    let raf = 0;
    let lastSeen: boolean | null = null;
    let bendAngle = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      camera.position.set(Math.sin(orbit) * Math.cos(elev) * dist, 2 + Math.sin(elev) * dist * 0.6, Math.cos(orbit) * Math.cos(elev) * dist);
      camera.lookAt(0, 2.15, 0);

      // candle flicker
      flameMat.emissiveIntensity = 7 + Math.sin(t * 9) * 2;
      flameLight.intensity = 5.5 + Math.sin(t * 11) * 1.5;
      flame.scale.y = 1 + Math.sin(t * 13) * 0.08;

      // tube position follows the alignment slider (z-offset against the hole)
      const off = offsetRef.current;
      tube.position.z = THREE.MathUtils.lerp(tube.position.z, off * 0.9, dt * 8);
      tube.position.y = THREE.MathUtils.lerp(tube.position.y, 2.28, dt * 8);
      bendAngle = THREE.MathUtils.lerp(bendAngle, bentRef.current ? -0.85 : 0, dt * 6);
      jointPivot.rotation.y = bendAngle;

      // eye sits at the end of segment 2
      const endLocal = new THREE.Vector3(1.1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), bendAngle);
      const eyePos = new THREE.Vector3(tube.position.x + 1.1 + endLocal.x, tube.position.y, tube.position.z + endLocal.z);
      eye.position.copy(eyePos);
      eye.lookAt(tube.position.x, tube.position.y, tube.position.z);

      // does the light get through? straight tube AND aligned with the hole
      const aligned = Math.abs(off) < 0.22;
      const straight = Math.abs(bendAngle) < 0.12;
      const isSeen = aligned && straight;

      halo.position.copy(eyePos);
      (halo.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(
        (halo.material as THREE.MeshBasicMaterial).opacity,
        isSeen ? 0.35 + Math.sin(t * 8) * 0.05 : 0,
        dt * 6
      );
      rayMat.opacity = THREE.MathUtils.lerp(rayMat.opacity, isSeen ? 0.85 : 0, dt * 6);
      if (rayMat.opacity > 0.02) {
        const a = new THREE.Vector3(candle.position.x, candle.position.y + 0.65, candle.position.z);
        const b = eyePos.clone();
        ray.position.copy(a).lerp(b, 0.5);
        const dir = new THREE.Vector3().subVectors(b, a);
        ray.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        ray.scale.set(1, dir.length(), 1);
      }

      if (isSeen !== lastSeen) {
        lastSeen = isSeen;
        setSeen(isSeen);
        seenCbRef.current?.(isSeen);
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
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
      el.removeEventListener('wheel', onWheel);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          const mat = m.material as THREE.Material | THREE.Material[];
          Array.isArray(mat) ? mat.forEach((x) => x.dispose()) : mat.dispose();
        }
      });
      if (el.parentNode === mount) mount.removeChild(el);
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={mountRef} className="relative w-full h-full bg-background cursor-grab">
      <div className="absolute top-3 right-3 game-panel px-3 py-2 text-xs min-w-[190px]">
        <div className="font-bold text-primary mb-1">מה רואה העין?</div>
        <div className={seen ? 'text-accent font-bold' : 'text-muted-foreground font-bold'}>
          {seen ? '✔ רואים את להבת הנר' : '✖ חשוך — לא רואים את הנר'}
        </div>
      </div>
      <div className="absolute bottom-3 left-3 game-panel px-3 py-1 text-xs text-muted-foreground">
        גרירה - סיבוב • גלגלת - זום
      </div>
    </div>
  );
};

export default DarkBoxScene;

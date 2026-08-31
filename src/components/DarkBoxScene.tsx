import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { makeSceneRenderer, getTier, prefersReducedMotion } from '@/lib/renderTier';

type Props = {
  /** bent tube = light cannot reach the eye */
  bent: boolean;
  /** horizontal alignment of the tube against the box opening, -1..1 */
  offset: number;
  onSeen?: (seen: boolean) => void;
};

/** Hebrew name-tag sprite drawn on a canvas texture */
const makeLabel = (text: string, color = '#e8f0ff', accent = 'rgba(12,18,28,0.72)') => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(8, 24, 496, 80, 26);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = 'bold 52px system-ui, "Segoe UI", sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.fillText(text, 256, 66, 470);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(1.55, 0.39, 1);
  sprite.renderOrder = 10;
  return sprite;
};

/**
 * Room 2 experiment: a dark box with a candle inside, observed through a tube.
 * Straight + aligned tube -> the flame is visible. Bent or misaligned -> the ray
 * visibly stops at the bend / hits the box wall.
 */
const DarkBoxScene: React.FC<Props> = ({ bent, offset, onSeen }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const bentRef = useRef(bent);
  const offsetRef = useRef(offset);
  const seenCbRef = useRef(onSeen);
  bentRef.current = bent;
  offsetRef.current = offset;
  seenCbRef.current = onSeen;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f18);
    scene.fog = new THREE.Fog(0x0a0f18, 12, 26);
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.05, 100);

    const renderer = makeSceneRenderer(mount, { exposure: 1.05 });
    const budget = getTier();

    // --- lighting: dim lab so the candle reads, but everything stays legible
    scene.add(new THREE.HemisphereLight(0x8fb2ff, 0x1a1206, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(4, 7, 5);
    key.castShadow = budget.shadows;
    key.shadow.mapSize.set(budget.shadowMapSize, budget.shadowMapSize);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8ab4ff, 0.5);
    rim.position.set(-5, 3, -4);
    scene.add(rim);

    // --- table with a subtle procedural wood texture
    const woodCanvas = document.createElement('canvas');
    woodCanvas.width = woodCanvas.height = 256;
    const wc = woodCanvas.getContext('2d')!;
    wc.fillStyle = '#5b4029';
    wc.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 220; i++) {
      wc.strokeStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
      wc.lineWidth = Math.random() * 2.2;
      wc.beginPath();
      wc.moveTo(0, Math.random() * 256);
      wc.bezierCurveTo(80, Math.random() * 256, 170, Math.random() * 256, 256, Math.random() * 256);
      wc.stroke();
    }
    const woodTex = new THREE.CanvasTexture(woodCanvas);
    woodTex.colorSpace = THREE.SRGBColorSpace;
    woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
    woodTex.repeat.set(3, 1.4);

    const table = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.2, 5),
      new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.62, metalness: 0.05 })
    );
    table.position.y = 1.4;
    table.receiveShadow = true;
    scene.add(table);

    // --- dark box (front wall omitted = cutaway so kids see the candle inside)
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x1e2836, roughness: 0.85, metalness: 0.05 });
    const boxInner = new THREE.MeshStandardMaterial({ color: 0x0c1119, roughness: 0.95, side: THREE.BackSide });
    const box = new THREE.Group();
    const w = 2.4,
      h = 1.75,
      d = 2.0;
    const panel = (sx: number, sy: number, sz: number, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), boxMat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      box.add(m);
      return m;
    };
    // inner dark shell
    const shell = new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, h - 0.12, d - 0.12), boxInner);
    shell.position.y = h / 2;
    box.add(shell);

    panel(w, h, 0.08, 0, h / 2, -d / 2); // back
    panel(0.08, h, d, -w / 2, h / 2, 0); // left
    panel(w, 0.08, d, 0, h, 0); // top
    panel(w, 0.08, d, 0, 0.02, 0); // bottom
    // right wall built around a circular opening
    const holeR = 0.24;
    const rw = 0.08;
    panel(rw, h / 2 - holeR, d, w / 2, (h / 2 - holeR) / 2, 0);
    panel(rw, h / 2 - holeR, d, w / 2, h - (h / 2 - holeR) / 2, 0);
    panel(rw, holeR * 2, d / 2 - holeR, w / 2, h / 2, -(d / 2 + holeR) / 2);
    panel(rw, holeR * 2, d / 2 - holeR, w / 2, h / 2, (d / 2 + holeR) / 2);
    // bright ring around the hole so the target is obvious
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(holeR + 0.03, 0.025, 12, 40),
      new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffb347, emissiveIntensity: 1.2 })
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.set(w / 2 + 0.05, h / 2, 0);
    box.add(ring);

    box.position.set(-1.35, 1.5, 0);
    scene.add(box);

    const boxLabel = makeLabel('תיבה אפלה');
    boxLabel.position.set(-1.35, 1.5 + h + 0.45, 0);
    scene.add(boxLabel);

    const holeLabel = makeLabel('חור התיבה', '#ffe6a8');
    holeLabel.scale.set(1.2, 0.3, 1);
    holeLabel.position.set(box.position.x + w / 2 + 0.1, box.position.y + h / 2 - 0.55, 0);
    scene.add(holeLabel);

    // --- candle inside the box
    const candle = new THREE.Group();
    const wax = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.15, 0.55, 24),
      new THREE.MeshStandardMaterial({ color: 0xf3e5c7, roughness: 0.65 })
    );
    wax.position.y = 0.28;
    wax.castShadow = true;
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xfff2c2, emissive: 0xffb347, emissiveIntensity: 8 });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.24, 16), flameMat);
    flame.position.y = 0.68;
    const flameLight = new THREE.PointLight(0xffb347, 7, 3.6, 2);
    flameLight.position.y = 0.7;
    candle.add(wax, flame, flameLight);
    candle.position.set(-1.75, 1.5, 0);
    scene.add(candle);

    const candleLabel = makeLabel('נר (מקור אור)', '#ffe6a8');
    candleLabel.position.set(-1.75, 2.55, 0);
    scene.add(candleLabel);

    // --- tube: two segments so it can be straight or bent
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0xb9c4d0, roughness: 0.3, metalness: 0.75 });
    const tube = new THREE.Group();
    const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 1.15, 28, 1, true), tubeMat);
    seg1.rotation.z = Math.PI / 2;
    seg1.position.x = 0.575;
    seg1.castShadow = true;
    const joint = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0x6b7a8c, roughness: 0.35, metalness: 0.8 })
    );
    joint.position.x = 1.15;
    const jointPivot = new THREE.Group();
    jointPivot.position.x = 1.15;
    const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 1.15, 28, 1, true), tubeMat);
    seg2.rotation.z = Math.PI / 2;
    seg2.position.x = 0.575;
    seg2.castShadow = true;
    jointPivot.add(seg2);
    tube.add(seg1, joint, jointPivot);
    tube.position.set(-0.05, 2.38, 0);
    scene.add(tube);

    const tubeLabel = makeLabel('צינור');
    tubeLabel.position.set(0.55, 2.9, 0);
    scene.add(tubeLabel);

    // --- observer eye at the far end of the tube
    const eye = new THREE.Group();
    const eyeball = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xf7fbff, roughness: 0.2 })
    );
    const iris = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.35 })
    );
    iris.position.x = 0.155;
    iris.scale.set(0.5, 1, 1);
    eye.add(eyeball, iris);
    scene.add(eye);

    const eyeLabel = makeLabel('העין שלכם');
    scene.add(eyeLabel);

    // glow at the eye when the light gets through
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0 })
    );
    scene.add(halo);

    // visible light ray: from the flame, stops where it is blocked
    const rayMat = new THREE.MeshBasicMaterial({ color: 0xffe6a8, transparent: true, opacity: 0.9 });
    const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 12), rayMat);
    scene.add(ray);
    // "blocked here" marker
    const blockMat = new THREE.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0 });
    const blockDot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), blockMat);
    scene.add(blockDot);
    const statusLabelOk = makeLabel('✔ האור מגיע לעין', '#bbf7d0');
    const statusLabelNo = makeLabel('✖ האור נחסם כאן', '#fecaca');
    statusLabelOk.visible = false;
    statusLabelNo.visible = false;
    scene.add(statusLabelOk, statusLabelNo);

    // --- orbit controls
    let orbit = 0.6,
      elev = 0.32,
      dist = 8.4;
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
      elev = THREE.MathUtils.clamp(elev - (e.clientY - ly) * 0.004, 0.05, 0.85);
      lx = e.clientX;
      ly = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      dist = THREE.MathUtils.clamp(dist * Math.exp(e.deltaY * 0.0012), 4.5, 15);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    const clock = new THREE.Clock();
    let raf = 0;
    let lastSeen: boolean | null = null;
    let bendAngle = 0;

    const flameWorld = new THREE.Vector3();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      camera.position.set(
        Math.sin(orbit) * Math.cos(elev) * dist,
        2.1 + Math.sin(elev) * dist * 0.6,
        Math.cos(orbit) * Math.cos(elev) * dist
      );
      camera.lookAt(0, 2.2, 0);

      // candle flicker
      flameMat.emissiveIntensity = 7 + Math.sin(t * 9) * 2;
      flameLight.intensity = 6 + Math.sin(t * 11) * 1.6;
      flame.scale.y = 1 + Math.sin(t * 13) * 0.08;

      // tube slides along z against the hole
      const off = offsetRef.current;
      tube.position.z = THREE.MathUtils.lerp(tube.position.z, off * 0.95, dt * 8);
      bendAngle = THREE.MathUtils.lerp(bendAngle, bentRef.current ? -0.9 : 0, dt * 6);
      jointPivot.rotation.y = bendAngle;

      const jointPos = new THREE.Vector3(tube.position.x + 1.15, tube.position.y, tube.position.z);
      const endLocal = new THREE.Vector3(1.15, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), bendAngle);
      const eyePos = jointPos.clone().add(endLocal);

      eye.position.copy(eyePos);
      eye.lookAt(jointPos);
      eyeLabel.position.copy(eyePos).add(new THREE.Vector3(0, 0.52, 0));
      tubeLabel.position.set(tube.position.x + 0.6, tube.position.y + 0.5, tube.position.z);

      const aligned = Math.abs(off) < 0.22;
      const straight = Math.abs(bendAngle) < 0.12;
      const isSeen = aligned && straight;

      // ray: flame -> (eye | blocking point)
      candle.getWorldPosition(flameWorld);
      const a = new THREE.Vector3(flameWorld.x, flameWorld.y + 0.7, flameWorld.z);
      let b: THREE.Vector3;
      if (isSeen) b = eyePos.clone();
      else if (!straight) b = jointPos.clone(); // stopped at the bend
      else b = new THREE.Vector3(box.position.x + w / 2, tube.position.y, tube.position.z * 0.55); // hits the wall

      ray.position.copy(a).lerp(b, 0.5);
      const dir = new THREE.Vector3().subVectors(b, a);
      ray.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      ray.scale.set(1, Math.max(dir.length(), 0.01), 1);
      rayMat.color.set(isSeen ? 0xffe6a8 : 0xffc27a);
      rayMat.opacity = 0.55 + Math.sin(t * 6) * 0.08;

      halo.position.copy(eyePos);
      const hm = halo.material as THREE.MeshBasicMaterial;
      hm.opacity = THREE.MathUtils.lerp(hm.opacity, isSeen ? 0.36 + Math.sin(t * 8) * 0.05 : 0, dt * 6);

      blockDot.position.copy(b);
      blockMat.opacity = THREE.MathUtils.lerp(blockMat.opacity, isSeen ? 0 : 0.85, dt * 6);

      statusLabelOk.visible = isSeen;
      statusLabelOk.position.copy(eyePos).add(new THREE.Vector3(0, 1.0, 0));
      statusLabelNo.visible = !isSeen;
      statusLabelNo.position.copy(b).add(new THREE.Vector3(0, 0.55, 0));

      if (isSeen !== lastSeen) {
        lastSeen = isSeen;
        seenCbRef.current?.(isSeen);
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
      el.removeEventListener('wheel', onWheel);
      woodTex.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          const mat = m.material as THREE.Material | THREE.Material[];
          Array.isArray(mat) ? mat.forEach((x) => x.dispose()) : mat.dispose();
        }
        const s = o as THREE.Sprite;
        if ((s as any).isSprite) {
          s.material.map?.dispose();
          s.material.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
};

export default DarkBoxScene;

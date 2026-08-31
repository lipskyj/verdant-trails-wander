import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { disposeScene } from '@/lib/sceneDispose';
import { transmittedPct } from '@/sim/light';
import { makeSceneRenderer, getTier, prefersReducedMotion } from '@/lib/renderTier';

type Props = {
  /** 0..1 how much light passes through the sample */
  transmission: number;
  /** sample display name (Hebrew) */
  sampleName: string;
  /** base color of the sample slab */
  color: number;
  lightOn: boolean;
};

const makeLabel = (text: string, color = '#e8f0ff') => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(10,16,26,0.75)';
  ctx.beginPath();
  ctx.roundRect(8, 24, 496, 80, 26);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = 'bold 50px system-ui, "Segoe UI", sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.fillText(text, 256, 66, 470);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(1.7, 0.42, 1);
  sprite.renderOrder = 12;
  return { sprite, redraw: (t: string, c = color) => {
      ctx.clearRect(0, 0, 512, 128);
      ctx.fillStyle = 'rgba(10,16,26,0.75)';
      ctx.beginPath();
      ctx.roundRect(8, 24, 496, 80, 26);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.font = 'bold 50px system-ui, "Segoe UI", sans-serif';
      ctx.fillStyle = c;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = 'rtl';
      ctx.fillText(t, 256, 66, 470);
      tex.needsUpdate = true;
    } };
};

/**
 * Room 3 experiment: a lamp shines through a material sample onto a white screen.
 * How much light lands on the screen shows whether the material is transparent,
 * translucent or opaque.
 */
const TransparencyScene: React.FC<Props> = ({ transmission, sampleName, color, lightOn }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const state = useRef({ transmission, sampleName, color, lightOn });
  state.current = { transmission, sampleName, color, lightOn };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f17);
    scene.fog = new THREE.Fog(0x0b0f17, 13, 28);
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.05, 100);

    const renderer = makeSceneRenderer(mount, { exposure: 1.05 });
    const budget = getTier();

    scene.add(new THREE.HemisphereLight(0x8fb2ff, 0x121018, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(2, 7, 6);
    key.castShadow = budget.shadows;
    key.shadow.mapSize.set(budget.shadowMapSize, budget.shadowMapSize);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8ab4ff, 0.45);
    rim.position.set(-6, 3, -4);
    scene.add(rim);

    // bench
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.2, 5),
      new THREE.MeshStandardMaterial({ color: 0x3d4655, roughness: 0.55, metalness: 0.15 })
    );
    bench.position.y = 1.4;
    bench.receiveShadow = true;
    scene.add(bench);

    // --- lamp (left), aims +x
    const lamp = new THREE.Group();
    const lampBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.46, 0.9, 28),
      new THREE.MeshStandardMaterial({ color: 0x2b3442, roughness: 0.35, metalness: 0.8 })
    );
    lampBody.rotation.z = -Math.PI / 2;
    const lensMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff0c0, emissiveIntensity: 4 });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.33, 28), lensMat);
    lens.rotation.y = Math.PI / 2;
    lens.position.x = 0.46;
    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.75, 16),
      new THREE.MeshStandardMaterial({ color: 0x2b3442, roughness: 0.4, metalness: 0.7 })
    );
    stand.position.y = -0.6;
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.55, 0.1, 24),
      new THREE.MeshStandardMaterial({ color: 0x232b37, roughness: 0.5, metalness: 0.6 })
    );
    base.position.y = -0.98;
    lamp.add(lampBody, lens, stand, base);
    lamp.position.set(-3.3, 2.55, 0);
    scene.add(lamp);

    const spot = new THREE.SpotLight(0xfff3d6, 55, 12, 0.34, 0.45, 1.4);
    spot.position.set(-2.8, 2.55, 0);
    spot.castShadow = budget.shadows;
    spot.shadow.mapSize.set(budget.shadowMapSize, budget.shadowMapSize);
    scene.add(spot);
    const spotTarget = new THREE.Object3D();
    spotTarget.position.set(3.2, 2.55, 0);
    scene.add(spotTarget);
    spot.target = spotTarget;

    const lampLabel = makeLabel('מקור אור (מנורה)', '#ffe6a8');
    lampLabel.sprite.position.set(-3.3, 3.55, 0);
    scene.add(lampLabel.sprite);

    // beam before the sample (always visible when lamp is on)
    const beamMatA = new THREE.MeshBasicMaterial({ color: 0xffeec2, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
    // light travels in +X here, and radiusTop lands downstream after the rotation —
    // so the narrow end belongs at the lamp. Beams spread, they do not focus.
    const beamA = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 2.6, 24, 1, true), beamMatA);
    beamA.rotation.z = -Math.PI / 2;
    beamA.position.set(-1.6, 2.55, 0);
    scene.add(beamA);

    // beam after the sample (opacity scales with transmission)
    const beamMatB = new THREE.MeshBasicMaterial({ color: 0xffeec2, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const beamB = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.55, 2.9, 24, 1, true), beamMatB);
    beamB.rotation.z = -Math.PI / 2;
    beamB.position.set(1.6, 2.55, 0);
    scene.add(beamB);

    // --- sample slab in a holder
    const sampleMat = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.3,
      metalness: 0.05,
      transparent: true,
      opacity: 1,
      transmission: 0,
      thickness: 0.3,
      clearcoat: 0.4,
    });
    const sample = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 1.5), sampleMat);
    sample.position.set(0, 2.55, 0);
    sample.castShadow = true;
    scene.add(sample);
    const holder = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.05, 10, 4),
      new THREE.MeshStandardMaterial({ color: 0x8d97a5, roughness: 0.35, metalness: 0.8 })
    );
    holder.rotation.y = Math.PI / 2;
    holder.rotation.x = Math.PI / 4;
    holder.position.set(0, 2.55, 0);
    scene.add(holder);
    const holderStand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 1.05, 14),
      new THREE.MeshStandardMaterial({ color: 0x6b7583, roughness: 0.4, metalness: 0.7 })
    );
    holderStand.position.set(0, 1.98, 0);
    scene.add(holderStand);

    const sampleLabel = makeLabel(sampleName);
    sampleLabel.sprite.position.set(0, 3.75, 0);
    scene.add(sampleLabel.sprite);

    // --- screen (right) with a light patch
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 2.6),
      new THREE.MeshStandardMaterial({ color: 0xf1f3f8, roughness: 0.9, side: THREE.DoubleSide })
    );
    screen.rotation.y = -0.5; // angled so the lit face points at the camera
    screen.position.set(3.1, 2.75, 0);
    screen.receiveShadow = true;
    scene.add(screen);
    const screenBack = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x2b3442, roughness: 0.6, side: THREE.DoubleSide })
    );
    screenBack.rotation.y = -0.5;
    screenBack.position.set(3.16, 2.75, -0.13);
    scene.add(screenBack);

    const patchMat = new THREE.MeshBasicMaterial({ color: 0xfff3cd, transparent: true, opacity: 0 });
    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.85, 40), patchMat);
    patch.rotation.y = -0.5;
    patch.position.set(3.08, 2.55, 0.04);
    scene.add(patch);

    const screenLabel = makeLabel('מסך הבדיקה');
    screenLabel.sprite.position.set(3.1, 4.3, 0);
    scene.add(screenLabel.sprite);

    // measurement readout above the screen
    const meter = makeLabel('0% מהאור עבר');
    meter.sprite.scale.set(2.1, 0.52, 1);
    meter.sprite.position.set(1.6, 1.2, 2.0);
    scene.add(meter.sprite);

    // orbit
    let orbit = 0.75,
      elev = 0.3,
      dist = 9.5;
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
      dist = THREE.MathUtils.clamp(dist * Math.exp(e.deltaY * 0.0012), 5, 16);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    const clock = new THREE.Clock();
    let raf = 0;
    let shownPct = -1;
    let lastName = '';

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const s = state.current;

      camera.position.set(
        Math.sin(orbit) * Math.cos(elev) * dist,
        2.4 + Math.sin(elev) * dist * 0.55,
        Math.cos(orbit) * Math.cos(elev) * dist
      );
      camera.lookAt(0, 2.6, 0);

      const on = s.lightOn ? 1 : 0;
      spot.intensity = THREE.MathUtils.lerp(spot.intensity, 55 * on, dt * 8);
      lensMat.emissiveIntensity = THREE.MathUtils.lerp(lensMat.emissiveIntensity, 4 * on, dt * 8);
      beamMatA.opacity = THREE.MathUtils.lerp(beamMatA.opacity, 0.17 * on, dt * 8);

      const trans = s.transmission;
      beamMatB.opacity = THREE.MathUtils.lerp(beamMatB.opacity, 0.2 * trans * on, dt * 8);
      // brightness is LINEAR in transmission (it used to be squared, systematically
      // under-showing partial transmitters), and the spot size is fixed: more light
      // through a sample makes the patch brighter, not bigger.
      patchMat.opacity = THREE.MathUtils.lerp(patchMat.opacity, 0.9 * trans * on, dt * 8);
      patch.scale.setScalar(1);

      // sample look tracks its transmission
      sampleMat.color.set(s.color);
      sampleMat.transmission = THREE.MathUtils.lerp(sampleMat.transmission, trans * 0.95, dt * 6);
      sampleMat.opacity = THREE.MathUtils.lerp(sampleMat.opacity, 1 - trans * 0.35, dt * 6);
      sampleMat.roughness = 0.05 + (1 - trans) * 0.6;

      if (s.sampleName !== lastName) {
        lastName = s.sampleName;
        sampleLabel.redraw(s.sampleName);
      }

      const pct = transmittedPct(trans, s.lightOn);
      if (pct !== shownPct) {
        shownPct = pct;
        const c = pct > 70 ? '#bbf7d0' : pct > 15 ? '#fde68a' : '#fecaca';
        meter.redraw(`${pct}% מהאור עבר אל המסך`, c);
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
      disposeScene(scene, renderer, []);
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
};

export default TransparencyScene;

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { addTissueLights, attachOrbit, disposeScene, makeLabel, makeRenderer, tissueMaterial } from './sceneUtils';

interface Props {
  /** הטיית הוושט במעלות: 0 = אנכי כלפי מטה, 180 = הפוך לגמרי */
  tilt: number;
  muscleOn: boolean;
  /** 0..1 מקום הביס בוושט */
  progress: number;
}

/** תחנה ב' — ושט בחתך: טבעות שריר שדוחפות את הביס, בכל זווית. */
const EsophagusScene: React.FC<Props> = ({ tilt, muscleOn, progress }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const state = useRef({ tilt, muscleOn, progress });
  state.current = { tilt, muscleOn, progress };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x140a0f);
    scene.fog = new THREE.Fog(0x140a0f, 16, 34);
    const camera = new THREE.PerspectiveCamera(44, mount.clientWidth / mount.clientHeight, 0.05, 100);
    const renderer = makeRenderer(mount);
    addTissueLights(scene);

    // ---- ציר הוושט: קבוצה שמסתובבת סביב הפה שבראשה
    const pivot = new THREE.Group();
    pivot.position.set(0, 4.4, 0);
    scene.add(pivot);

    const LEN = 6.4;
    const R = 0.72;

    // דופן חצי־שקופה כדי לראות את הביס בתוך הצינור
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(R, R, LEN, 36, 1, true),
      tissueMaterial(0xc9737a, {
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.34,
        roughness: 0.4,
        transmission: 0.35,
        thickness: 0.4,
      })
    );
    wall.position.y = -LEN / 2;
    pivot.add(wall);

    // טבעות שריר
    const ringMat = tissueMaterial(0xb2545f, { roughness: 0.5 });
    const activeRingMat = tissueMaterial(0xff8f6b, {
      roughness: 0.35,
      emissive: new THREE.Color(0x8a2a1a),
      emissiveIntensity: 0.6,
    });
    const RINGS = 12;
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < RINGS; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.06, 0.11, 10, 28), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.4 - (i / (RINGS - 1)) * (LEN - 0.8);
      pivot.add(ring);
      rings.push(ring);
    }

    // הביס
    const bolus = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 24, 18),
      new THREE.MeshPhysicalMaterial({ color: 0xd9a95f, roughness: 0.6, clearcoat: 0.5 })
    );
    bolus.castShadow = true;
    pivot.add(bolus);

    // פה בראש הצינור וקיבה בסופו
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(1.05, 24, 18), tissueMaterial(0xa8474f));
    mouth.scale.set(1.15, 0.75, 1);
    mouth.position.set(0, 4.7, 0);
    scene.add(mouth);

    const stomachSac = new THREE.Mesh(new THREE.SphereGeometry(1.35, 28, 20), tissueMaterial(0xbb5b62));
    stomachSac.scale.set(1.05, 0.85, 0.9);
    scene.add(stomachSac);

    // ---- תוויות
    const mouthLabel = makeLabel('פה — נקודת בליעה', '#ffd9b3', 2.0);
    mouthLabel.sprite.position.set(0, 5.9, 0);
    scene.add(mouthLabel.sprite);

    const stomachLabel = makeLabel('קיבה', '#ffd9b3', 1.2);
    scene.add(stomachLabel.sprite);

    const statusLabel = makeLabel('שריר כבוי — הביס לא זז', '#fecaca', 2.8);
    statusLabel.sprite.position.set(0, 0.2, 3.0);
    scene.add(statusLabel.sprite);

    const angleLabel = makeLabel('זווית: 0°', '#ffe3b0', 1.6);
    scene.add(angleLabel.sprite);

    // חץ כבידה — קבוע כלפי מטה, כדי להשוות לכיוון הדחיפה
    const gravity = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(-3.4, 4.2, 0),
      1.6,
      0x7dd3fc,
      0.35,
      0.22
    );
    scene.add(gravity);
    const gravityLabel = makeLabel('כוח הכבידה', '#7dd3fc', 1.7);
    gravityLabel.sprite.position.set(-3.4, 4.7, 0);
    scene.add(gravityLabel.sprite);

    const orbit = attachOrbit(renderer.domElement, { orbit: 0.35, elev: 0.22, dist: 12, min: 6, max: 20 });
    const clock = new THREE.Clock();
    let raf = 0;
    let lastStatus = '';
    let lastAngle = -999;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();
      const s = state.current;

      const o = orbit.state;
      camera.position.set(
        Math.sin(o.orbit) * Math.cos(o.elev) * o.dist - 2.2,
        1.6 + Math.sin(o.elev) * o.dist * 0.55,
        Math.cos(o.orbit) * Math.cos(o.elev) * o.dist
      );
      camera.lookAt(-1.6, 1.8, 0);

      // הטיית הצינור
      const target = THREE.MathUtils.degToRad(s.tilt);
      pivot.rotation.z = THREE.MathUtils.lerp(pivot.rotation.z, target, dt * 4);

      // מקום הביס לאורך הצינור
      const p = THREE.MathUtils.clamp(s.progress, 0, 1);
      const y = -0.5 - p * (LEN - 1.0);
      bolus.position.set(0, y, 0);

      // גל פריסטלטי: הטבעת שמאחורי הביס מתכווצת
      rings.forEach((ring, i) => {
        const ringP = i / (RINGS - 1);
        const behind = ringP < p ? 1 - (p - ringP) * 4 : 0;
        const wave = s.muscleOn ? Math.max(0, behind) * (0.6 + 0.4 * Math.sin(t * 6 - i)) : 0;
        ring.material = wave > 0.25 ? activeRingMat : ringMat;
        const squeeze = 1 - wave * 0.42;
        ring.scale.set(squeeze, squeeze, 1);
      });

      // מקום הקיבה בקצה הצינור
      const end = new THREE.Vector3(0, -LEN - 0.5, 0).applyEuler(pivot.rotation).add(pivot.position);
      stomachSac.position.copy(end);
      stomachLabel.sprite.position.set(end.x, end.y - 1.5, end.z);

      const bolusWorld = bolus.getWorldPosition(new THREE.Vector3());
      angleLabel.sprite.position.set(bolusWorld.x + 1.9, bolusWorld.y, bolusWorld.z);

      const deg = Math.round(s.tilt);
      if (deg !== lastAngle) {
        lastAngle = deg;
        angleLabel.redraw(`זווית הוושט: ${deg}°`);
      }

      const status = !s.muscleOn
        ? 'שריר כבוי — הביס לא זז'
        : Math.abs(s.tilt) > 100
          ? 'שריר פעיל — הביס נדחף גם כלפי מעלה'
          : 'שריר פעיל — גלי כיווץ דוחפים את הביס';
      if (status !== lastStatus) {
        lastStatus = status;
        statusLabel.redraw(status, s.muscleOn ? '#bbf7d0' : '#fecaca');
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
      orbit.dispose();
      disposeScene(scene);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
};

export default EsophagusScene;

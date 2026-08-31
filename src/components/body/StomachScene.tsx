import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { addTissueLights, attachOrbit, disposeScene, makeLabel, makeRenderer, tissueMaterial } from './sceneUtils';

interface Props {
  /** 0..1 עוצמת ערבול השרירים */
  churn: number;
  /** 0..1 חומציות מיץ הקיבה */
  acid: number;
  /** 0..1 כמה מהמזון התפרק */
  breakdown: number;
  running: boolean;
  foodName: string;
  /** שכבת הריר המגנה */
  mucus: boolean;
  /** שניות שעברו בשעון העצר */
  seconds: number;
}

/** תחנה ג' — קיבה בחתך: שק שרירי, מיץ חומצי, ערבול ושעון עצר. */
const StomachScene: React.FC<Props> = ({ churn, acid, breakdown, running, foodName, mucus, seconds }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const state = useRef({ churn, acid, breakdown, running, foodName, mucus, seconds });
  state.current = { churn, acid, breakdown, running, foodName, mucus, seconds };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x150a0d);
    scene.fog = new THREE.Fog(0x150a0d, 14, 32);
    const camera = new THREE.PerspectiveCamera(44, mount.clientWidth / mount.clientHeight, 0.05, 100);
    const renderer = makeRenderer(mount);
    addTissueLights(scene);

    const stomach = new THREE.Group();
    stomach.position.set(0, 2.4, 0);
    scene.add(stomach);

    // ---- דופן הקיבה בחתך (חצי שק פתוח אל המצלמה)
    const wallMat = tissueMaterial(0xbe5d64, {
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
      transmission: 0.25,
      thickness: 0.5,
      roughness: 0.45,
    });
    const sac = new THREE.Mesh(new THREE.SphereGeometry(2.3, 40, 30), wallMat);
    sac.scale.set(1.05, 1.3, 0.85);
    stomach.add(sac);

    // קפלי דופן פנימיים
    const foldMat = tissueMaterial(0xa4474f, { roughness: 0.6 });
    for (let i = 0; i < 7; i++) {
      const fold = new THREE.Mesh(new THREE.TorusGeometry(1.75 - Math.abs(i - 3) * 0.16, 0.09, 8, 30), foldMat);
      fold.rotation.x = Math.PI / 2;
      fold.position.y = -1.8 + i * 0.6;
      stomach.add(fold);
    }

    // שכבת ריר מגנה
    const mucusMat = new THREE.MeshPhysicalMaterial({
      color: 0xffe9c9,
      transparent: true,
      opacity: 0.0,
      roughness: 0.1,
      transmission: 0.85,
      thickness: 0.6,
      side: THREE.BackSide,
    });
    const mucusLayer = new THREE.Mesh(new THREE.SphereGeometry(2.18, 32, 24), mucusMat);
    mucusLayer.scale.set(1.04, 1.28, 0.84);
    stomach.add(mucusLayer);

    // ---- ושט נכנס ופתח יציאה למעי
    const inTube = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.2, 24, 1, true), tissueMaterial(0xc9737a, { side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
    inTube.position.set(-0.6, 4.0, 0);
    scene.add(inTube);
    const outTube = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.8, 24, 1, true), tissueMaterial(0xc9737a, { side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
    outTube.position.set(1.1, 0.35, 0);
    outTube.rotation.z = -0.7;
    scene.add(outTube);

    // ---- מיץ קיבה
    const juiceMat = new THREE.MeshPhysicalMaterial({
      color: 0xd8e26a,
      transparent: true,
      opacity: 0.4,
      roughness: 0.15,
      transmission: 0.7,
      thickness: 1.2,
    });
    const juice = new THREE.Mesh(new THREE.SphereGeometry(1.95, 32, 24), juiceMat);
    juice.scale.set(1.02, 0.85, 0.8);
    juice.position.y = -0.55;
    stomach.add(juice);

    // ---- חתיכות מזון
    const foodMat = new THREE.MeshPhysicalMaterial({ color: 0xd9a95f, roughness: 0.65, clearcoat: 0.35 });
    const chunks: { mesh: THREE.Mesh; seed: number; radius: number }[] = [];
    for (let i = 0; i < 22; i++) {
      const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), foodMat);
      const seed = (i / 22) * Math.PI * 2;
      const radius = 0.5 + (i % 4) * 0.28;
      mesh.castShadow = true;
      stomach.add(mesh);
      chunks.push({ mesh, seed, radius });
    }

    // בועות פירוק
    const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xf2ffb0, transparent: true, opacity: 0.5 });
    const bubbles: THREE.Mesh[] = [];
    for (let i = 0; i < 18; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.07 + (i % 3) * 0.03, 8, 6), bubbleMat);
      b.position.set(Math.cos(i) * 1.2, -1.6 + (i % 6) * 0.4, Math.sin(i) * 0.7);
      stomach.add(b);
      bubbles.push(b);
    }

    // ---- תוויות
    const organLabel = makeLabel('קיבה — שק שרירי', '#ffd9b3', 2.2);
    organLabel.sprite.position.set(0, 5.6, 0);
    scene.add(organLabel.sprite);

    const foodLabel = makeLabel(foodName, '#ffe3b0', 1.9);
    foodLabel.sprite.position.set(2.9, 3.0, 1.4);
    scene.add(foodLabel.sprite);

    const acidLabel = makeLabel('חומציות: 0%', '#e6f28f', 2.2);
    acidLabel.sprite.position.set(-3.0, 1.6, 1.4);
    scene.add(acidLabel.sprite);

    const meter = makeLabel('פירוק: 0% • 0.0 שנ׳', '#ffd7a8', 2.7);
    meter.sprite.position.set(0, 0.05, 2.8);
    scene.add(meter.sprite);

    const mucusLabel = makeLabel('שכבת ריר מגנה', '#ffe9c9', 2.0);
    mucusLabel.sprite.position.set(2.9, 1.0, 1.0);
    scene.add(mucusLabel.sprite);

    const orbit = attachOrbit(renderer.domElement, { orbit: 0.4, elev: 0.25, dist: 10, min: 5, max: 18 });
    const clock = new THREE.Clock();
    let raf = 0;
    let shown = '';
    let lastFood = foodName;
    let lastAcid = -1;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();
      const s = state.current;

      const o = orbit.state;
      camera.position.set(
        Math.sin(o.orbit) * Math.cos(o.elev) * o.dist - 1.8,
        2.2 + Math.sin(o.elev) * o.dist * 0.55,
        Math.cos(o.orbit) * Math.cos(o.elev) * o.dist
      );
      camera.lookAt(-1.4, 2.3, 0);

      const churnAmp = s.running ? s.churn : s.churn * 0.15;
      const b = THREE.MathUtils.clamp(s.breakdown, 0, 1);

      // כיווץ הקיבה
      const pulse = 1 + Math.sin(t * (2 + s.churn * 5)) * 0.05 * (0.3 + churnAmp);
      sac.scale.set(1.05 * pulse, 1.3 / pulse, 0.85 * pulse);

      // ערבול המזון
      chunks.forEach((c, i) => {
        const speed = 0.4 + churnAmp * 2.6;
        const a = c.seed + t * speed;
        c.mesh.position.set(
          Math.cos(a) * c.radius * (1 + churnAmp * 0.4),
          -0.9 + Math.sin(a * 1.7 + i) * (0.5 + churnAmp * 0.7),
          Math.sin(a) * c.radius * 0.7
        );
        c.mesh.rotation.set(a, a * 1.4, a * 0.6);
        const size = Math.max(0.12, 1 - b * 0.9);
        c.mesh.scale.setScalar(size);
      });

      // בועות פירוק כימי
      bubbleMat.opacity = 0.15 + s.acid * 0.55 * (s.running ? 1 : 0.3);
      bubbles.forEach((bb, i) => {
        bb.position.y += dt * (0.3 + s.acid * 1.4);
        if (bb.position.y > 1.2) bb.position.y = -1.8;
        bb.scale.setScalar(0.6 + s.acid * 0.8 + Math.sin(t * 3 + i) * 0.1);
      });

      // חומציות = צבע וצפיפות המיץ
      juiceMat.color.lerpColors(new THREE.Color(0xe8e6b8), new THREE.Color(0xc7e02f), s.acid);
      juiceMat.opacity = 0.28 + s.acid * 0.32;
      juice.scale.set(1.02, 0.85 + s.acid * 0.08, 0.8);

      mucusMat.opacity = THREE.MathUtils.lerp(mucusMat.opacity, s.mucus ? 0.5 : 0.0, dt * 4);
      mucusLabel.sprite.material.opacity = THREE.MathUtils.lerp(mucusLabel.sprite.material.opacity, s.mucus ? 1 : 0.25, dt * 4);
      wallMat.color.lerpColors(
        new THREE.Color(0xbe5d64),
        new THREE.Color(0xd8464a),
        s.mucus ? 0 : s.acid * (s.running ? 1 : 0.4)
      );

      if (s.foodName !== lastFood) {
        lastFood = s.foodName;
        foodLabel.redraw(s.foodName);
      }
      const acidPct = Math.round(s.acid * 100);
      if (acidPct !== lastAcid) {
        lastAcid = acidPct;
        acidLabel.redraw(`חומציות מיץ הקיבה: ${acidPct}%`);
      }
      const txt = `פירוק: ${Math.round(b * 100)}% • ${s.seconds.toFixed(1)} שנ׳`;
      if (txt !== shown) {
        shown = txt;
        meter.redraw(txt, b > 0.85 ? '#bbf7d0' : b > 0.4 ? '#fde68a' : '#fecaca');
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

export default StomachScene;

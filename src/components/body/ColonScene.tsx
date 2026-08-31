import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { addTissueLights, attachOrbit, disposeScene, makeLabel, makeRenderer, tissueMaterial } from './sceneUtils';

interface Props {
  /** 0..1 כמה מים נספגים בדופן המעי הגס */
  water: number;
  running: boolean;
}

/** תחנה ה' — מעי גס: ספיגת מים ומצב הפסולת. */
const ColonScene: React.FC<Props> = ({ water, running }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const state = useRef({ water, running });
  state.current = { water, running };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x140b0d);
    scene.fog = new THREE.Fog(0x140b0d, 16, 36);
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.05, 100);
    const renderer = makeRenderer(mount);
    addTissueLights(scene);

    // ---- מסלול המעי הגס: עולה, חוצה, יורד
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.6, -1.8, 0),
      new THREE.Vector3(-2.6, 1.6, 0),
      new THREE.Vector3(-1.2, 2.6, 0),
      new THREE.Vector3(1.2, 2.6, 0),
      new THREE.Vector3(2.5, 1.6, 0),
      new THREE.Vector3(2.5, -1.4, 0),
      new THREE.Vector3(1.4, -2.5, 0),
    ]);
    const colon = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 120, 0.72, 22, false),
      tissueMaterial(0xc06a6e, {
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
        transmission: 0.3,
        thickness: 0.5,
      })
    );
    colon.position.y = 2.2;
    scene.add(colon);

    // כיווצי דופן (האוסטרות של המעי הגס)
    const bandMat = tissueMaterial(0xa8525a, { roughness: 0.55 });
    for (let i = 0; i <= 22; i++) {
      const p = curve.getPointAt(i / 22);
      const tan = curve.getTangentAt(i / 22);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.07, 8, 24), bandMat);
      band.position.copy(p).add(new THREE.Vector3(0, 2.2, 0));
      band.lookAt(p.clone().add(tan).add(new THREE.Vector3(0, 2.2, 0)));
      scene.add(band);
    }

    // ---- הפסולת שנעה בתוך המעי
    const wasteMat = new THREE.MeshPhysicalMaterial({ color: 0x8a6236, roughness: 0.6, clearcoat: 0.4 });
    const waste = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.5, 8, 16), wasteMat);
    waste.castShadow = true;
    scene.add(waste);

    // ---- מים שנספגים דרך הדופן
    const dropMat = new THREE.MeshPhysicalMaterial({
      color: 0x8fd3ff,
      transparent: true,
      opacity: 0.85,
      roughness: 0.05,
      transmission: 0.9,
      thickness: 0.3,
    });
    type D = { mesh: THREE.Mesh; t: number; life: number };
    const droplets: D[] = [];
    for (let i = 0; i < 26; i++) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), dropMat);
      droplets.push({ mesh, t: Math.random(), life: Math.random() });
      scene.add(mesh);
    }

    // ---- תוויות
    const organLabel = makeLabel('מעי גס — ספיגת מים ומלחים', '#ffd9b3', 3.0);
    organLabel.sprite.position.set(0, 6.1, 0);
    scene.add(organLabel.sprite);

    const waterLabel = makeLabel('ספיגת מים: 0%', '#8fd3ff', 2.3);
    waterLabel.sprite.position.set(-3.6, 4.2, 1.0);
    scene.add(waterLabel.sprite);

    const stateLabel = makeLabel('מצב הפסולת: נוזלית', '#fde68a', 2.9);
    stateLabel.sprite.position.set(0, -0.5, 2.4);
    scene.add(stateLabel.sprite);

    const orbit = attachOrbit(renderer.domElement, { orbit: 0.25, elev: 0.22, dist: 12, min: 6, max: 20 });
    const clock = new THREE.Clock();
    let raf = 0;
    let travel = 0;
    let shownWater = -1;
    let shownState = '';

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();
      const s = state.current;

      const o = orbit.state;
      camera.position.set(
        Math.sin(o.orbit) * Math.cos(o.elev) * o.dist - 2.0,
        2.0 + Math.sin(o.elev) * o.dist * 0.5,
        Math.cos(o.orbit) * Math.cos(o.elev) * o.dist
      );
      camera.lookAt(-1.5, 2.1, 0);

      // תנועת הפסולת — יבשה יותר = נעה לאט יותר
      const speed = s.running ? THREE.MathUtils.lerp(0.16, 0.03, s.water) : 0;
      travel = (travel + dt * speed) % 1;
      const p = curve.getPointAt(travel).add(new THREE.Vector3(0, 2.2, 0));
      const tan = curve.getTangentAt(travel);
      waste.position.copy(p);
      waste.lookAt(p.clone().add(tan));
      waste.rotateX(Math.PI / 2);

      // צורה וצבע לפי ספיגת המים
      const dryness = s.water;
      waste.scale.set(1 + (1 - dryness) * 0.35, 1 - dryness * 0.2, 1 + (1 - dryness) * 0.35);
      wasteMat.color.lerpColors(new THREE.Color(0xb08a5a), new THREE.Color(0x5f4423), dryness);
      wasteMat.roughness = 0.35 + dryness * 0.55;
      wasteMat.clearcoat = 0.7 - dryness * 0.65;

      // טיפות מים יוצאות מהדופן אל הגוף
      droplets.forEach((d, i) => {
        d.life += dt * (0.2 + s.water * 1.2);
        if (d.life > 1) {
          d.life = 0;
          d.t = Math.random();
        }
        const base = curve.getPointAt(d.t).add(new THREE.Vector3(0, 2.2, 0));
        const outward = new THREE.Vector3(Math.cos(i) * 1, Math.sin(i) * 0.6, 0.5).normalize();
        d.mesh.position.copy(base).addScaledVector(outward, 0.5 + d.life * 1.6);
        d.mesh.scale.setScalar((0.4 + s.water) * (1 - d.life) + 0.05);
        (d.mesh.material as THREE.MeshPhysicalMaterial).opacity = 0.85 * s.water * (1 - d.life);
        d.mesh.position.y += Math.sin(t * 2 + i) * 0.01;
      });

      const pct = Math.round(s.water * 100);
      if (pct !== shownWater) {
        shownWater = pct;
        waterLabel.redraw(`ספיגת מים: ${pct}%`);
      }
      const st =
        s.water < 0.3
          ? 'מצב הפסולת: נוזלית מדי — מעט מדי מים נספגו'
          : s.water > 0.8
            ? 'מצב הפסולת: קשה מדי — יותר מדי מים נספגו'
            : 'מצב הפסולת: תקין — כמות מים מאוזנת';
      if (st !== shownState) {
        shownState = st;
        stateLabel.redraw(st, s.water >= 0.3 && s.water <= 0.8 ? '#bbf7d0' : '#fecaca');
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

export default ColonScene;

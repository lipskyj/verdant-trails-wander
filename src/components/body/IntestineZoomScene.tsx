import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { addTissueLights, attachOrbit, disposeScene, makeLabel, makeRenderer, tissueMaterial } from './sceneUtils';

interface Props {
  /** 0..3 רמת ההתקרבות: מעי שלם ← דופן ← סיסים ← תא בודד */
  level: number;
  /** האם משווים את הצינור המקומט (עם סיסים) או החלק */
  villi: boolean;
  /** 0..1 קצב הספיגה שנמדד */
  absorption: number;
}

const LEVEL_NAMES = ['מעי דק שלם', 'דופן המעי', 'סיסים', 'תא בודד'];

/** תחנה ד' — התקרבות אינסופית אל דופן המעי הדק והשוואת ספיגה. */
const IntestineZoomScene: React.FC<Props> = ({ level, villi, absorption }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const state = useRef({ level, villi, absorption });
  state.current = { level, villi, absorption };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x120a10);
    scene.fog = new THREE.Fog(0x120a10, 18, 45);
    const camera = new THREE.PerspectiveCamera(46, mount.clientWidth / mount.clientHeight, 0.02, 200);
    const renderer = makeRenderer(mount);
    addTissueLights(scene);

    // ---- שני צינורות להשוואה: חלק (שמאל) ומכוסה סיסים (ימין)
    const makeTube = (x: number, withVilli: boolean) => {
      const g = new THREE.Group();
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.1, 6, 36, 1, true),
        tissueMaterial(withVilli ? 0xd07b7f : 0xb96a70, {
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45,
          transmission: 0.3,
          thickness: 0.4,
        })
      );
      tube.rotation.z = Math.PI / 2;
      g.add(tube);

      if (withVilli) {
        const villusMat = tissueMaterial(0xe08b90, { roughness: 0.45 });
        for (let i = 0; i < 140; i++) {
          const v = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.3, 4, 8), villusMat);
          const ang = (i / 140) * Math.PI * 2 * 7;
          const along = -2.8 + (i / 140) * 5.6;
          v.position.set(along, Math.cos(ang) * 0.95, Math.sin(ang) * 0.95);
          v.lookAt(along, 0, 0);
          g.add(v);
        }
      }
      g.position.set(0, 0, x);
      return g;
    };

    const smooth = makeTube(-2.6, false);
    const villous = makeTube(2.6, true);
    scene.add(smooth, villous);

    // ---- חלקיקי מזון שנספגים אל "הדם"
    const nutrientMat = new THREE.MeshPhysicalMaterial({
      color: 0xffd07a,
      emissive: 0xff9a3c,
      emissiveIntensity: 0.4,
      roughness: 0.3,
    });
    type P = { mesh: THREE.Mesh; z: number; t: number; speed: number };
    const parts: P[] = [];
    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), nutrientMat);
      parts.push({ mesh, z: i % 2 === 0 ? -2.6 : 2.6, t: Math.random(), speed: 0.2 + Math.random() * 0.3 });
      scene.add(mesh);
    }

    // ---- כלי דם מתחת לדופן
    const vessel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 6.4, 20),
      tissueMaterial(0x8f2f4a, { roughness: 0.4 })
    );
    vessel.rotation.z = Math.PI / 2;
    vessel.position.set(0, -1.7, 2.6);
    scene.add(vessel);
    const vesselB = vessel.clone();
    vesselB.position.z = -2.6;
    scene.add(vesselB);

    // ---- תוויות
    const smoothLabel = makeLabel('צינור חלק — בלי סיסים', '#ffd9b3', 2.6);
    smoothLabel.sprite.position.set(0, 1.9, -2.6);
    scene.add(smoothLabel.sprite);
    const villousLabel = makeLabel('צינור עם סיסים', '#bbf7d0', 2.2);
    villousLabel.sprite.position.set(0, 1.9, 2.6);
    scene.add(villousLabel.sprite);
    const bloodLabel = makeLabel('כלי דם', '#fca5a5', 1.4);
    bloodLabel.sprite.position.set(2.6, -2.4, 2.6);
    scene.add(bloodLabel.sprite);

    const levelLabel = makeLabel(LEVEL_NAMES[0], '#ffe3b0', 2.2);
    scene.add(levelLabel.sprite);
    const meter = makeLabel('ספיגה: 0 יחידות/שנ׳', '#ffd7a8', 2.9);
    scene.add(meter.sprite);

    const orbit = attachOrbit(renderer.domElement, { orbit: 1.1, elev: 0.3, dist: 12, min: 2, max: 22 });
    const clock = new THREE.Clock();
    let raf = 0;
    let shownLevel = -1;
    let shownAbs = -1;
    const camTarget = new THREE.Vector3(0, 0, 0);

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const s = state.current;

      // ההתקרבות: כל רמה מקרבת את המצלמה ומצמצמת את המרחק
      const lv = THREE.MathUtils.clamp(s.level, 0, 3);
      const targetDist = [13, 8, 4.2, 1.9][Math.round(lv)];
      orbit.state.dist = THREE.MathUtils.lerp(orbit.state.dist, targetDist, dt * 2.2);
      camTarget.lerp(new THREE.Vector3(0, lv >= 2 ? 0.9 : 0, s.villi ? 2.6 : -2.6), dt * 2.2);

      const o = orbit.state;
      camera.position.set(
        camTarget.x + Math.sin(o.orbit) * Math.cos(o.elev) * o.dist - 1.4,
        camTarget.y + Math.sin(o.elev) * o.dist * 0.5,
        camTarget.z + Math.cos(o.orbit) * Math.cos(o.elev) * o.dist
      );
      camera.lookAt(camTarget);

      // חלקיקים נעים לאורך הצינור ונספגים אל כלי הדם
      parts.forEach((p, i) => {
        const rate = p.z > 0 ? 0.35 + s.absorption * 0.9 : 0.2;
        p.t += dt * p.speed * (1 + rate);
        if (p.t > 1) p.t -= 1;
        const along = -2.9 + p.t * 5.8;
        const absorbed = p.z > 0 ? Math.min(1, p.t * (0.4 + s.absorption)) : Math.min(1, p.t * 0.25);
        const ang = i * 1.7;
        const radius = THREE.MathUtils.lerp(0.85, 0.05, absorbed);
        p.mesh.position.set(
          along,
          THREE.MathUtils.lerp(Math.cos(ang) * radius, -1.7, absorbed * 0.85),
          p.z + Math.sin(ang) * radius
        );
        p.mesh.scale.setScalar(1 - absorbed * 0.5);
      });

      levelLabel.sprite.position.set(camTarget.x, camTarget.y + 2.8, camTarget.z);
      meter.sprite.position.set(camTarget.x, camTarget.y - 3.1, camTarget.z + 1.2);

      const rounded = Math.round(lv);
      if (rounded !== shownLevel) {
        shownLevel = rounded;
        levelLabel.redraw(`רמה ${rounded + 1} מתוך 4 — ${LEVEL_NAMES[rounded]}`);
      }
      const units = Math.round((s.villi ? 20 + s.absorption * 80 : 8 + s.absorption * 12));
      if (units !== shownAbs) {
        shownAbs = units;
        meter.redraw(
          `ספיגה ב${s.villi ? 'צינור עם סיסים' : 'צינור החלק'}: ${units} יחידות/שנ׳`,
          s.villi ? '#bbf7d0' : '#fde68a'
        );
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

export default IntestineZoomScene;

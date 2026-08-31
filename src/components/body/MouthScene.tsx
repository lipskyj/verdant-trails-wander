import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { addTissueLights, attachOrbit, disposeScene, makeLabel, makeRenderer, tissueMaterial } from './sceneUtils';

export type ToothType = 'incisor' | 'canine' | 'molar';

interface Props {
  /** סוג השן שנבחר */
  tooth: ToothType | null;
  saliva: boolean;
  /** 0..1 מדד הפירוק שנמדד בכלי המגדלת */
  breakdown: number;
  /** עולה בכל לעיסה — משמש להנפשת סגירת הלסת */
  chewTick: number;
}

const TOOTH_LABEL: Record<ToothType, string> = {
  incisor: 'חותכות — חותכות את הביס',
  canine: 'ניבים — קורעים את הביס',
  molar: 'טוחנות — מרסקות לחלקיקים',
};

/** תחנה א' — חלל פה בחתך: לסת עם שלושה סוגי שיניים, בלוטות רוק וביס שמתפרק. */
const MouthScene: React.FC<Props> = ({ tooth, saliva, breakdown, chewTick }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const state = useRef({ tooth, saliva, breakdown, chewTick });
  state.current = { tooth, saliva, breakdown, chewTick };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x160a0e);
    scene.fog = new THREE.Fog(0x160a0e, 14, 30);
    const camera = new THREE.PerspectiveCamera(44, mount.clientWidth / mount.clientHeight, 0.05, 100);
    const renderer = makeRenderer(mount);
    addTissueLights(scene);

    // ---- חלל פה בחתך: קשת עליונה + תחתונה
    const cavity = new THREE.Mesh(
      new THREE.SphereGeometry(4.2, 40, 32, 0, Math.PI * 2, 0, Math.PI * 0.62),
      tissueMaterial(0x8f3b46, { side: THREE.BackSide, roughness: 0.7 })
    );
    cavity.position.y = 2.4;
    cavity.rotation.x = Math.PI;
    scene.add(cavity);

    const jawMat = tissueMaterial(0xb75f66);
    const lowerJaw = new THREE.Group();
    const upperJaw = new THREE.Group();
    const gumGeo = new THREE.TorusGeometry(2.1, 0.34, 14, 40, Math.PI * 1.25);
    const lowerGum = new THREE.Mesh(gumGeo, jawMat);
    lowerGum.rotation.x = -Math.PI / 2;
    lowerGum.rotation.z = -Math.PI * 0.62;
    lowerJaw.add(lowerGum);
    const upperGum = new THREE.Mesh(gumGeo, jawMat);
    upperGum.rotation.x = -Math.PI / 2;
    upperGum.rotation.z = -Math.PI * 0.62;
    upperJaw.add(upperGum);

    const enamel = new THREE.MeshPhysicalMaterial({
      color: 0xfdf6ec,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    });
    const highlight = new THREE.MeshPhysicalMaterial({
      color: 0xfff3c4,
      emissive: 0xffcf6a,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      clearcoat: 1,
    });

    type Tooth = { mesh: THREE.Mesh; kind: ToothType };
    const teeth: Tooth[] = [];

    const addTooth = (group: THREE.Group, kind: ToothType, angle: number, up: boolean) => {
      const geo =
        kind === 'incisor'
          ? new THREE.BoxGeometry(0.34, 0.62, 0.16)
          : kind === 'canine'
            ? new THREE.ConeGeometry(0.19, 0.78, 12)
            : new THREE.BoxGeometry(0.44, 0.5, 0.44);
      const mesh = new THREE.Mesh(geo, enamel);
      const r = 2.1;
      mesh.position.set(Math.cos(angle) * r, up ? -0.42 : 0.42, Math.sin(angle) * r);
      mesh.rotation.y = -angle;
      if (up) mesh.rotation.z = Math.PI;
      mesh.castShadow = true;
      group.add(mesh);
      teeth.push({ mesh, kind });
    };

    // קדמי = חותכות, אחריהן ניבים, ובצדדים טוחנות
    const layout: { kind: ToothType; angle: number }[] = [
      { kind: 'incisor', angle: -0.3 },
      { kind: 'incisor', angle: -0.1 },
      { kind: 'incisor', angle: 0.1 },
      { kind: 'incisor', angle: 0.3 },
      { kind: 'canine', angle: -0.62 },
      { kind: 'canine', angle: 0.62 },
      { kind: 'molar', angle: -1.0 },
      { kind: 'molar', angle: -1.35 },
      { kind: 'molar', angle: 1.0 },
      { kind: 'molar', angle: 1.35 },
    ];
    layout.forEach((t) => {
      addTooth(lowerJaw, t.kind, t.angle, false);
      addTooth(upperJaw, t.kind, t.angle, true);
    });

    lowerJaw.position.y = 1.5;
    upperJaw.position.y = 3.1;
    scene.add(lowerJaw, upperJaw);

    // ---- לשון
    const tongue = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 28, 20),
      tissueMaterial(0xd2707c, { roughness: 0.45 })
    );
    tongue.scale.set(1, 0.34, 1.55);
    tongue.position.set(0, 1.62, 0.5);
    scene.add(tongue);

    // ---- הביס: אשכול חלקיקים שמתפצל ומתכווץ
    const bolus = new THREE.Group();
    const crumbMat = new THREE.MeshPhysicalMaterial({ color: 0xd9a95f, roughness: 0.75, clearcoat: 0.25 });
    const crumbs: { mesh: THREE.Mesh; dir: THREE.Vector3; base: number }[] = [];
    for (let i = 0; i < 26; i++) {
      const base = 0.16 + (i % 5) * 0.03;
      const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(base, 0), crumbMat);
      const dir = new THREE.Vector3(
        Math.cos((i / 26) * Math.PI * 2) * (0.5 + (i % 4) * 0.22),
        (i % 3) * 0.14,
        Math.sin((i / 26) * Math.PI * 2) * (0.5 + (i % 3) * 0.24)
      );
      mesh.castShadow = true;
      bolus.add(mesh);
      crumbs.push({ mesh, dir, base });
    }
    bolus.position.set(0, 2.05, 0.35);
    scene.add(bolus);

    // גוש שלם שנעלם בהדרגה עם הפירוק
    const whole = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 24, 18),
      new THREE.MeshPhysicalMaterial({ color: 0xe0b26c, roughness: 0.7, clearcoat: 0.3 })
    );
    whole.position.copy(bolus.position);
    whole.castShadow = true;
    scene.add(whole);

    // ---- רוק: טיפות מבלוטות הרוק
    const salivaMat = new THREE.MeshPhysicalMaterial({
      color: 0xbfe6ff,
      transparent: true,
      opacity: 0,
      roughness: 0.05,
      transmission: 0.9,
      thickness: 0.3,
    });
    const drops: THREE.Mesh[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), salivaMat);
      d.position.set(-1.9 + (i % 2) * 3.8, 3.0 - (i % 7) * 0.2, -0.6 + ((i * 0.3) % 1.4));
      scene.add(d);
      drops.push(d);
    }
    const glandMat = tissueMaterial(0xe0949c, { roughness: 0.4 });
    [-2.1, 2.1].forEach((x) => {
      const gland = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), glandMat);
      gland.position.set(x, 3.15, -0.7);
      gland.scale.set(1, 0.7, 1.1);
      scene.add(gland);
    });

    // ---- תוויות
    const glandLabel = makeLabel('בלוטות רוק', '#bfe6ff', 1.5);
    glandLabel.sprite.position.set(2.1, 3.9, -0.7);
    scene.add(glandLabel.sprite);

    const toothLabel = makeLabel('בחרו סוג שיניים', '#fdf6ec', 2.4);
    toothLabel.sprite.position.set(0, 4.7, 1.4);
    scene.add(toothLabel.sprite);

    const meter = makeLabel('מדד פירוק: 0%', '#ffd7a8', 2.3);
    meter.sprite.position.set(0, 0.55, 2.6);
    scene.add(meter.sprite);

    const bolusLabel = makeLabel('הביס', '#ffe3b0', 1.1);
    scene.add(bolusLabel.sprite);

    const orbit = attachOrbit(renderer.domElement, { orbit: 0.55, elev: 0.34, dist: 10, min: 5, max: 16 });
    const clock = new THREE.Clock();
    let raf = 0;
    let chewAnim = 0;
    let lastTick = chewTick;
    let shownPct = -1;
    let lastTooth: ToothType | null | undefined;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();
      const s = state.current;

      const o = orbit.state;
      camera.position.set(
        Math.sin(o.orbit) * Math.cos(o.elev) * o.dist - 1.6,
        2.3 + Math.sin(o.elev) * o.dist * 0.6,
        Math.cos(o.orbit) * Math.cos(o.elev) * o.dist
      );
      camera.lookAt(-1.2, 2.3, 0);

      // הנפשת לעיסה
      if (s.chewTick !== lastTick) {
        lastTick = s.chewTick;
        chewAnim = 1;
      }
      chewAnim = Math.max(0, chewAnim - dt * 2.2);
      const bite = Math.sin(chewAnim * Math.PI) * 0.85;
      upperJaw.position.y = 3.1 - bite;
      lowerJaw.position.y = 1.5 + bite * 0.25;

      // הדגשת סוג השן הנבחר
      if (s.tooth !== lastTooth) {
        lastTooth = s.tooth;
        teeth.forEach((x) => (x.mesh.material = x.kind === s.tooth ? highlight : enamel));
        toothLabel.redraw(s.tooth ? TOOTH_LABEL[s.tooth] : 'בחרו סוג שיניים');
      }

      // פירוק הביס: הגוש נעלם, החלקיקים מתפזרים ומתכווצים
      const b = THREE.MathUtils.clamp(s.breakdown, 0, 1);
      whole.scale.setScalar(THREE.MathUtils.lerp(whole.scale.x, Math.max(0.001, 1 - b * 1.15), dt * 5));
      (whole.material as THREE.MeshPhysicalMaterial).opacity = 1;
      whole.visible = whole.scale.x > 0.08;
      crumbs.forEach((c, i) => {
        const spread = 0.35 + b * 1.35;
        c.mesh.position.lerp(c.dir.clone().multiplyScalar(spread), dt * 4);
        c.mesh.position.y += Math.sin(t * 2 + i) * 0.004;
        const size = THREE.MathUtils.lerp(0.05, 1, Math.min(1, b * 1.6)) * (1 - b * 0.5);
        c.mesh.scale.setScalar(Math.max(0.05, size));
        c.mesh.rotation.y += dt * (0.4 + (i % 3) * 0.2);
      });
      bolus.rotation.y += dt * 0.25;
      bolusLabel.sprite.position.set(bolus.position.x + 1.5, bolus.position.y + 0.9, bolus.position.z);

      // רוק
      const wet = s.saliva ? 1 : 0;
      salivaMat.opacity = THREE.MathUtils.lerp(salivaMat.opacity, 0.85 * wet, dt * 5);
      drops.forEach((d, i) => {
        if (!s.saliva) return;
        d.position.y -= dt * (0.9 + (i % 3) * 0.25);
        if (d.position.y < 1.7) d.position.y = 3.1;
      });
      (tongue.material as THREE.MeshPhysicalMaterial).clearcoat = 0.3 + wet * 0.7;
      crumbMat.clearcoat = 0.2 + wet * 0.7;
      crumbMat.roughness = 0.75 - wet * 0.4;

      const pct = Math.round(b * 100);
      if (pct !== shownPct) {
        shownPct = pct;
        const c = pct > 70 ? '#bbf7d0' : pct > 35 ? '#fde68a' : '#fecaca';
        meter.redraw(`מדד פירוק: ${pct}%${s.saliva ? ' • רוק פעיל' : ' • ללא רוק'}`, c);
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

export default MouthScene;

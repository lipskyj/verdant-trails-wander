import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { makeSceneRenderer, getTier, prefersReducedMotion } from '@/lib/renderTier';
import { disposeScene } from '@/lib/sceneDispose';
import {
  SOURCE_CANDELA,
  ROOM_LUX_ON,
  ROOM_LUX_OFF,
  luxAt,
  inCone,
  measure,
  classifyFromReading,
  formatLux,
} from '@/sim/light';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type LabObject = {
  id: number;
  name: string;
  type: 'producer' | 'reflector';
};

type Props = {
  objects: readonly LabObject[];
  onInspect?: (id: number) => void;
};

/** Procedural wood texture for the lab bench */
function makeWoodTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#6b4a2f';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    const y = Math.random() * 512;
    ctx.strokeStyle = `rgba(${30 + Math.random() * 60},${18 + Math.random() * 30},${8 + Math.random() * 20},${
      0.05 + Math.random() * 0.25
    })`;
    ctx.lineWidth = 0.5 + Math.random() * 2.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < 512; x += 32) ctx.lineTo(x, y + Math.sin((x + i) * 0.03) * 4);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 1);
  return t;
}

/** Procedural concrete texture for the floor */
function makeConcreteTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#2b2f36';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 12000; i++) {
    const v = 20 + Math.random() * 60;
    ctx.fillStyle = `rgba(${v},${v + 3},${v + 8},0.5)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14, 14);
  return t;
}

const LightLabScene: React.FC<Props> = ({ objects, onInspect }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [roomLight, setRoomLight] = useState(true);
  // the torch starts OFF: mystery A asks "what still glows when everything is off?"
  const [beamOn, setBeamOn] = useState(false);
  const [readout, setReadout] = useState<{
    name: string;
    lux: number;
    verdict: 'producer' | 'reflector' | 'unknown';
  } | null>(null);

  const roomLightRef = useRef(true);
  const beamRef = useRef(false);
  const inspectRef = useRef(onInspect);
  roomLightRef.current = roomLight;
  beamRef.current = beamOn;
  inspectRef.current = onInspect;

  // keyboard shortcuts: L = room light, F = flashlight
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'l' || k === 'ק') setRoomLight((v) => !v);
      if (k === 'f' || k === 'כ') setBeamOn((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);


  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070b);

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.05, 100);

    const renderer = makeSceneRenderer(mount, { exposure: 1.05 });
    const budget = getTier();

    // Image-based lighting for realistic reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    // RoomEnvironment(renderer) — without the argument r160 bakes the PMREM from a
    // 5-intensity light instead of 900, i.e. 180× too dim (and would silently jump on upgrade).
    const roomEnvScene = new RoomEnvironment(renderer);
    const envRT = pmrem.fromScene(roomEnvScene, 0.04);
    roomEnvScene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    scene.environment = envRT.texture;

    // --- ROOM ---
    const floorTex = makeConcreteTexture();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 12),
      new THREE.MeshStandardMaterial({ color: 0x1a1f27, roughness: 0.95 })
    );
    backWall.position.set(0, 6, -6.5);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // --- BENCH ---
    const woodTex = makeWoodTexture();
    const benchTop = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.18, 3.2),
      new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: 0.45, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.35 })
    );
    benchTop.position.y = 1.5;
    benchTop.castShadow = true;
    benchTop.receiveShadow = true;
    scene.add(benchTop);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.35, metalness: 0.9 });
    [
      [-3.7, -1.4],
      [3.7, -1.4],
      [-3.7, 1.4],
      [3.7, 1.4],
    ].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 16), legMat);
      leg.position.set(x, 0.75, z);
      leg.castShadow = true;
      scene.add(leg);
    });

    // --- AMBIENT / ROOM LIGHTING ---
    const ambient = new THREE.AmbientLight(0xbcd2f0, 0.35);
    scene.add(ambient);
    // (A RectAreaLight used to sit here. RectAreaLightUniformsLib was never
    // initialised, so it emitted nothing while forcing the LTC BRDF path into
    // every material — removed.)
    const ceilingSpot = new THREE.SpotLight(0xfff1d6, 60, 20, 0.9, 0.6, 1.4);
    ceilingSpot.position.set(0, 7, 1.5);
    ceilingSpot.target.position.set(0, 1.5, 0);
    ceilingSpot.castShadow = budget.shadows;
    ceilingSpot.shadow.mapSize.set(budget.shadowMapSize, budget.shadowMapSize);
    ceilingSpot.shadow.bias = -0.0004;
    // the ceiling light and everything it shadows are static: render its map once
    ceilingSpot.shadow.autoUpdate = false;
    ceilingSpot.shadow.needsUpdate = true;
    scene.add(ceilingSpot, ceilingSpot.target);

    // --- FLASHLIGHT (the experiment tool) ---
    const flash = new THREE.SpotLight(0xfff6e0, 240, 22, 0.28, 0.45, 1.6);
    flash.castShadow = budget.shadows;
    flash.shadow.mapSize.set(budget.shadowMapSize, budget.shadowMapSize);
    flash.shadow.bias = -0.0005;
    const flashTarget = new THREE.Object3D();
    scene.add(flash, flashTarget);
    flash.target = flashTarget;

    // Physical flashlight body held in view.
    // The torch model is modelled pointing along -Z, so it lives inside a pivot
    // that is rotated 180° — that way pivot.lookAt(aim) makes the LENS face the
    // aim point (previously the tail pointed at the objects).
    const torchPivot = new THREE.Group();
    const torch = new THREE.Group();
    torch.rotation.y = Math.PI;
    const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x22262c, roughness: 0.3, metalness: 0.95, clearcoat: 0.8 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.85, 32), bodyMat);
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    torch.add(body);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.13, 0.28, 32), bodyMat);
    head.rotation.x = Math.PI / 2;
    head.position.z = -0.55;
    head.castShadow = true;
    torch.add(head);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0xfff6df, emissive: 0xfff0c8, emissiveIntensity: 3 });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), lensMat);
    lens.position.z = -0.69;
    lens.rotation.y = Math.PI;
    torch.add(lens);
    torch.scale.setScalar(0.6);
    torchPivot.add(torch);
    scene.add(torchPivot);


    // Visible volumetric-ish beam cone
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfff3d0,
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beamGeo = new THREE.ConeGeometry(1, 1, 40, 1, true);
    beamGeo.translate(0, -0.5, 0);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    scene.add(beam);

    // --- REAL EXPERIMENT OBJECTS ---
    const targets: THREE.Object3D[] = [];
    const labelTextures: THREE.Texture[] = [];

    /** floating name tag above every object so students know what they measure */
    const makeLabel = (text: string) => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 128;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = 'rgba(8,12,20,0.78)';
      ctx.beginPath();
      ctx.roundRect(6, 22, 500, 84, 26);
      ctx.fill();
      ctx.strokeStyle = 'rgba(125,211,252,0.75)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.font = 'bold 54px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e8f5ff';
      ctx.direction = 'rtl';
      ctx.fillText(text, 256, 66, 470);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      labelTextures.push(tex);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      sp.scale.set(1.05, 0.26, 1);
      sp.renderOrder = 999;
      return sp;
    };

    /** @param candela luminous intensity the body PRODUCES itself (0 for reflectors) */
    const register = (group: THREE.Object3D, id: number, candela: number, name: string) => {
      group.traverse((o) => {
        o.userData.id = id;
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      const label = makeLabel(name);
      label.position.set(0, 1.02, 0);
      label.userData.id = id;
      group.add(label);
      group.userData = { id, candela, self: candela > 0, name };
      targets.push(group);
      scene.add(group);
    };


    let mirrorGlass: THREE.Mesh | null = null;

    const slotX = (i: number) => -3 + i * 1.2;
    const findIndex = (id: number) => objects.findIndex((o) => o.id === id);
    const y0 = 1.59;

    // 1 - SUN: incandescent glowing sphere with real light
    if (findIndex(1) >= 0) {
      const g = new THREE.Group();
      const sun = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 48, 48),
        new THREE.MeshStandardMaterial({ color: 0xffcf6b, emissive: 0xffae2b, emissiveIntensity: 6, roughness: 0.4 })
      );
      sun.position.y = 0.55;
      const stand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.12, 0.5, 24),
        new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.4, metalness: 0.8 })
      );
      stand.position.y = 0.25;
      const sunLight = new THREE.PointLight(0xffb838, 12, 6, 2);
      sunLight.position.y = 0.55;
      g.add(sun, stand, sunLight);
      g.position.set(slotX(findIndex(1)), y0, 0);
      register(g, 1, SOURCE_CANDELA.sun, 'מודל השמש');
    }

    // 2 - MIRROR: real reflective glass in a frame
    if (findIndex(2) >= 0) {
      const g = new THREE.Group();
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.9, 0.06),
        new THREE.MeshPhysicalMaterial({ color: 0x8a6a3a, roughness: 0.35, metalness: 0.6, clearcoat: 0.7 })
      );
      // Mirror reflection uses the room environment probe already built above.
      // A live CubeCamera here cost 6 extra renders/frame (plus a full PMREM
      // convolution) for a visually near-identical result on a small mirror.
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.78),
        new THREE.MeshPhysicalMaterial({
          color: 0xf2f6ff,
          roughness: 0.03,
          metalness: 1,
          envMap: envRT.texture,
          envMapIntensity: 1.6,
        })
      );
      glass.position.z = 0.035;
      mirrorGlass = glass;
      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.05, 0.28),
        new THREE.MeshStandardMaterial({ color: 0x6b5228, roughness: 0.5 })
      );
      foot.position.set(0, -0.45, 0.1);
      g.add(frame, glass, foot);
      g.position.set(slotX(findIndex(2)), y0 + 0.47, -0.2);
      g.rotation.y = -0.25;
      register(g, 2, 0, 'מראה');
    }

    // 3 - LIGHT BULB: glass envelope, filament, real emitted light
    if (findIndex(3) >= 0) {
      const g = new THREE.Group();
      const glass = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 48, 48),
        new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          roughness: 0.05,
          metalness: 0,
          transmission: 0.95,
          thickness: 0.25,
          ior: 1.5,
        })
      );
      glass.position.y = 0.62;
      const socket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.13, 0.22, 24),
        new THREE.MeshStandardMaterial({ color: 0xb0a08a, roughness: 0.4, metalness: 0.95 })
      );
      socket.position.y = 0.38;
      const stand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.16, 0.3, 24),
        new THREE.MeshStandardMaterial({ color: 0x3f4650, roughness: 0.35, metalness: 0.85 })
      );
      stand.position.y = 0.15;
      const filament = new THREE.Mesh(
        new THREE.TorusGeometry(0.07, 0.012, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0xfff0b0, emissive: 0xffca63, emissiveIntensity: 12 })
      );
      filament.position.y = 0.62;
      const bulbLight = new THREE.PointLight(0xffd9a0, 9, 5.5, 2);
      bulbLight.position.y = 0.62;
      g.add(glass, socket, stand, filament, bulbLight);
      g.position.set(slotX(findIndex(3)), y0, 0.1);
      register(g, 3, SOURCE_CANDELA.bulb, 'נורה חשמלית');
    }

    // 4 - MOON: cratered dusty rock, no light of its own
    if (findIndex(4) >= 0) {
      const g = new THREE.Group();
      const geo = new THREE.SphereGeometry(0.3, 96, 96);
      const p = geo.attributes.position as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const n = Math.sin(v.x * 14) * Math.sin(v.y * 12) * Math.sin(v.z * 13);
        v.multiplyScalar(1 + n * 0.035);
        p.setXYZ(i, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();
      const moon = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x9ba0a6, roughness: 0.95, metalness: 0 }));
      moon.position.y = 0.42;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.03, 12, 32),
        new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.4, metalness: 0.8 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.13;
      g.add(moon, ring);
      g.position.set(slotX(findIndex(4)), y0, -0.1);
      register(g, 4, 0, 'מודל הירח');
    }

    // 5 - FIREFLY IN A GLASS JAR: bioluminescent, glows on its own
    if (findIndex(5) >= 0) {
      const g = new THREE.Group();
      const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.6, 48, 1, true),
        new THREE.MeshPhysicalMaterial({
          color: 0xe8f5ff,
          roughness: 0.03,
          metalness: 0,
          transmission: 0.95,
          thickness: 0.15,
          ior: 1.45,
          side: THREE.DoubleSide,
        })
      );
      jar.position.y = 0.32;
      const lid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.23, 0.23, 0.06, 32),
        new THREE.MeshStandardMaterial({ color: 0x9aa4b0, roughness: 0.4, metalness: 0.9 })
      );
      lid.position.y = 0.64;
      const bug = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.045, 0.07, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 })
      );
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0xd9ffb0, emissive: 0x8ef05a, emissiveIntensity: 10 })
      );
      glow.position.y = -0.07;
      const bugLight = new THREE.PointLight(0x9dfd6a, 3, 2.6, 2);
      const bugGroup = new THREE.Group();
      bugGroup.add(bug, glow, bugLight);
      bugGroup.position.y = 0.32;
      g.add(jar, lid, bugGroup);
      g.position.set(slotX(findIndex(5)), y0, 0.15);
      g.userData.bug = bugGroup;
      register(g, 5, SOURCE_CANDELA.firefly, 'גחלילית');
      g.userData.bug = bugGroup;
    }

    // 6 - EARTH GLOBE: painted sphere on a brass axis, only reflects
    if (findIndex(6) >= 0) {
      const g = new THREE.Group();
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 256;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#15803d';
      for (let i = 0; i < 26; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.random() * 512, 40 + Math.random() * 180, 20 + Math.random() * 55, 12 + Math.random() * 35, Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(0, 0, 512, 14);
      ctx.fillRect(0, 242, 512, 14);
      const earthTex = new THREE.CanvasTexture(c);
      earthTex.colorSpace = THREE.SRGBColorSpace;
      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 64, 64),
        new THREE.MeshPhysicalMaterial({ map: earthTex, roughness: 0.4, metalness: 0.1, clearcoat: 0.5 })
      );
      globe.position.y = 0.5;
      globe.rotation.z = 0.35;
      const axis = new THREE.Mesh(
        new THREE.TorusGeometry(0.36, 0.02, 10, 40, Math.PI * 1.2),
        new THREE.MeshStandardMaterial({ color: 0xc59a45, roughness: 0.3, metalness: 1 })
      );
      axis.position.y = 0.5;
      axis.rotation.z = 0.35;
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.2, 0.12, 32),
        new THREE.MeshStandardMaterial({ color: 0xc59a45, roughness: 0.35, metalness: 1 })
      );
      base.position.y = 0.06;
      g.add(globe, axis, base);
      g.position.set(slotX(findIndex(6)), y0, -0.05);
      g.userData.globe = globe;
      register(g, 6, 0, 'גלובוס כדור הארץ');
      g.userData.globe = globe;
    }

    // --- CAMERA ORBIT + BEAM AIMING ---
    let orbit = 0.15;
    let elev = 0.32;
    let dist = 7.2;
    let dragging = false;
    let lx = 0;
    let ly = 0;
    const pointer = new THREE.Vector2(0, 0.15);
    const raycaster = new THREE.Raycaster();

    const el = renderer.domElement;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      if (!dragging) return;
      orbit -= (e.clientX - lx) * 0.005;
      elev = THREE.MathUtils.clamp(elev - (e.clientY - ly) * 0.004, 0.05, 0.95);
      lx = e.clientX;
      ly = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      dist = THREE.MathUtils.clamp(dist * Math.exp(dy * 0.0012), 3.5, 14);
    };
    const onClick = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(p, camera);
      const hit = raycaster.intersectObjects(targets, true)[0];
      if (hit) {
        let o: THREE.Object3D | null = hit.object;
        while (o && o.userData.id === undefined) o = o.parent;
        if (o?.userData.id !== undefined) inspectRef.current?.(o.userData.id as number);
      }
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onClick);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    // Materials whose IBL contribution is animated by the room-light switch.
    const envMaterials: THREE.MeshStandardMaterial[] = [];
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      const list = Array.isArray(m) ? m : m ? [m] : [];
      list.forEach((mat) => {
        const std = mat as THREE.MeshStandardMaterial;
        if (!('envMapIntensity' in std)) return;
        std.userData.baseEnv = std.envMapIntensity ?? 1;
        envMaterials.push(std);
      });
    });
    let envTarget = 1;

    const aimPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.35);
    const aim = new THREE.Vector3(0, 1.9, 0);
    const clock = new THREE.Clock();
    let raf = 0;
    let lastKey = '';

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      camera.position.set(Math.sin(orbit) * Math.cos(elev) * dist, 2.0 + Math.sin(elev) * dist * 0.6, Math.cos(orbit) * Math.cos(elev) * dist);
      camera.lookAt(0, 2.0, 0);

      // Room lighting toggle (the "lights off" part of the experiment)
      const on = roomLightRef.current;
      ambient.intensity = THREE.MathUtils.lerp(ambient.intensity, on ? 0.35 : 0.015, dt * 6);
      ceilingSpot.intensity = THREE.MathUtils.lerp(ceilingSpot.intensity, on ? 60 : 0, dt * 6);
      // Drop the image-based light too, otherwise "lights off" still looks lit —
      // but by animating envMapIntensity (a uniform) instead of nulling
      // scene.environment (a shader define, which recompiles every material).
      envTarget = THREE.MathUtils.lerp(envTarget, on ? 1 : 0, dt * 6);
      envMaterials.forEach((m) => (m.envMapIntensity = m.userData.baseEnv * envTarget));


      // Aim the flashlight where the cursor points
      raycaster.setFromCamera(pointer, camera);
      const target = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(aimPlane, target)) {
        target.y = THREE.MathUtils.clamp(target.y, 1.55, 3.2);
        target.x = THREE.MathUtils.clamp(target.x, -4.2, 4.2);
        aim.lerp(target, 0.18);
      }
      flashTarget.position.copy(aim);

      // Flashlight is held on the viewer's side of the bench, aimed at the objects
      const holdPos = new THREE.Vector3()
        .copy(camera.position)
        .lerp(new THREE.Vector3(aim.x, aim.y + 0.7, aim.z), 0.45);
      flash.position.copy(holdPos);
      torchPivot.position.copy(holdPos);
      torchPivot.lookAt(aim);


      const lit = beamRef.current;
      flash.intensity = THREE.MathUtils.lerp(flash.intensity, lit ? 240 : 0, dt * 10);
      lensMat.emissiveIntensity = THREE.MathUtils.lerp(lensMat.emissiveIntensity, lit ? 1.6 : 0, dt * 10);

      // Beam cone geometry from torch head to aim point
      const dir = new THREE.Vector3().subVectors(aim, holdPos);
      const len = dir.length();
      beam.visible = lit;
      if (lit) {
        beam.position.copy(holdPos);
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
        beam.scale.set(Math.tan(flash.angle) * len, len, Math.tan(flash.angle) * len);
        beamMat.opacity = roomLightRef.current ? 0.05 : 0.12;
      }

      // Per-object animation + light meter
      let best: { name: string; lux: number; self: boolean } | null = null;
      targets.forEach((g) => {
        const bug = g.userData.bug as THREE.Group | undefined;
        if (bug) {
          bug.position.x = Math.sin(t * 1.4) * 0.09;
          bug.position.y = 0.32 + Math.sin(t * 2.3) * 0.12;
          const gm = (bug.children[1] as THREE.Mesh).material as THREE.MeshStandardMaterial;
          gm.emissiveIntensity = 6 + Math.sin(t * 5) * 5;
        }
        const globe = g.userData.globe as THREE.Mesh | undefined;
        if (globe) globe.rotation.y += dt * 0.25;

        // measured illumination = self-emission + flashlight contribution
        const wp = new THREE.Vector3();
        g.getWorldPosition(wp);
        wp.y += 0.4;
        const toObj = new THREE.Vector3().subVectors(wp, holdPos);
        const d = toObj.length();
        const cos = toObj.normalize().dot(new THREE.Vector3().subVectors(aim, holdPos).normalize());
        const inCone = cos > Math.cos(flash.angle);
        const beamLux = lit && inCone ? Math.max(0, (1 - d / 12)) * 900 : 0;
        const selfLux = g.userData.self ? 420 : 0;
        const roomLux = roomLightRef.current ? 180 : 8;
        const lux = Math.round(beamLux + selfLux + roomLux);
        if (inCone && (!best || lux > best.lux)) best = { name: g.userData.name, lux, self: !!g.userData.self };
      });
      const key = best ? `${best.name}|${Math.round(best.lux / 25)}` : 'none';
      if (key !== lastKey) {
        lastKey = key;
        setReadout(best);
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
      el.removeEventListener('pointerup', onClick);
      el.removeEventListener('wheel', onWheel);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          const mat = m.material as THREE.Material | THREE.Material[];
          Array.isArray(mat) ? mat.forEach((x) => x.dispose()) : mat.dispose();
        }
      });
      labelTextures.forEach((t) => t.dispose());
      envRT.texture.dispose();
      pmrem.dispose();
      floorTex.dispose();
      woodTex.dispose();
      if (el.parentNode === mount) mount.removeChild(el);
      renderer.dispose();
    };
  }, [objects]);

  return (
    <div ref={mountRef} className="relative w-full h-full bg-background cursor-crosshair">
      {/* Lab controls: explicit on/off switches */}
      <div className="absolute bottom-14 right-3 flex flex-col gap-2 items-end">
        <button
          onClick={() => setRoomLight((v) => !v)}
          aria-pressed={roomLight}
          className={`game-panel flex items-center gap-2 px-3 py-2 text-xs font-bold transition ${
            roomLight ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <span className="text-base">💡</span>
          <span>אור החדר</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] border ${
              roomLight
                ? 'bg-primary/20 border-primary/40 text-primary'
                : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            {roomLight ? 'דלוק' : 'כבוי'}
          </span>
        </button>
        <button
          onClick={() => setBeamOn((v) => !v)}
          aria-pressed={beamOn}
          className={`game-panel flex items-center gap-2 px-3 py-2 text-xs font-bold transition ${
            beamOn ? 'text-accent' : 'text-muted-foreground'
          }`}
        >
          <span className="text-base">🔦</span>
          <span>הפנס</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] border ${
              beamOn
                ? 'bg-accent/20 border-accent/40 text-accent'
                : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            {beamOn ? 'דלוק' : 'כבוי'}
          </span>
        </button>
      </div>


      {/* Light meter readout */}
      <div className="absolute top-[72px] right-3 game-panel px-3 py-2 text-xs min-w-[190px]">
        <div className="font-bold text-primary mb-1">מד עוצמת אור (לוקס)</div>
        {readout ? (
          <>
            <div className="text-foreground">
              גוף נמדד: <strong>{readout.name}</strong>
            </div>
            <div className="text-accent font-mono text-base">{readout.lux} lx</div>
            <div className="text-muted-foreground mt-1">
              {readout.self ? 'קורא אור גם כשהפנס והחדר כבויים → מפיק אור' : 'קורא אור רק כשמאירים עליו → מחזיר אור'}
            </div>
          </>
        ) : (
          <div className="text-muted-foreground">כוונו את הפנס אל אחד הגופים על שולחן המעבדה…</div>
        )}
      </div>

      <div className="absolute bottom-3 right-3 game-panel px-3 py-1 text-xs text-muted-foreground">
        הזזת עכבר - כיוון הפנס • גרירה - סיבוב המעבדה • גלגלת - זום • לחיצה על גוף - בדיקה • L - אור החדר • F - פנס
      </div>

    </div>
  );
};

export default LightLabScene;

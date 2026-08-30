import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

// --- CONTENT AS DATA (decoupled) ---
const SIMULATION_DATA = {
  meta: {
    title: 'מועדון החוקרים: מבוך האור - חדר 1',
    subject: 'אנרגיית קרינה (אור)',
    targetGrade: "כיתה ו'",
    badge: 'כיתה ו׳ | פיילוט אמי״ת',
  },
  narrative: {
    intro:
      'מסיבת ההפתעה עומדת להתחיל, אך לפתע... האורות מתחילים לעמעם והצבעים בסביבה מאיימים להיעלם! עזרו להציל את החגיגה על ידי הבנת חוקי האור.',
    room1Task: 'שלב 1: בחרו את מסלול החקר שלכם וזהו את גופים מפיקי האור לעומת מחזירי האור.',
    peerCheck:
      'הסתכלו על חבר/ה שיושב/ת לידכם בכיתה. האם שניהם הגעתם לאותה מסקנה לגבי ההבדל בין הירח (מחזיר אור) לשמש (מפיק אור)? הסבירו אחד לשני בקצרה לפני שתקבלו את הפנס.',
    unlocked:
      'החדר החשוך הבא במבוך נפתח. כעת תוכלו להמשיך לחקור את התקדמות האור בקו ישר דרך תיבה אפלה.',
  },
  sortingItems: [
    { id: 1, name: 'שמש', type: 'producer', icon: '☀️', color: 0xfacc15, realWorld: 'כוכב המאיר מכוח עצמו במערכת השמש.' },
    { id: 2, name: 'מראה', type: 'reflector', icon: '🪞', color: 0xa78bfa, realWorld: 'משטח חלק המחזיר אלינו את אור השמש.' },
    { id: 3, name: 'נורה חשמלית', type: 'producer', icon: '💡', color: 0xfde68a, realWorld: 'מכשיר הממיר אנרגיה חשמלית לאור מלאכותי בביתנו.' },
    { id: 4, name: 'ירח', type: 'reflector', icon: '🌙', color: 0xc4b5fd, realWorld: 'גוף שמימי שאינו מאיר בעצמו אלא מחזיר את אור השמש.' },
    { id: 5, name: 'גחלילית', type: 'producer', icon: '🐛', color: 0x86efac, realWorld: 'חרק המייצר אור ביולוגי טבעי בטבע.' },
    { id: 6, name: 'כדור הארץ', type: 'reflector', icon: '🌍', color: 0x60a5fa, realWorld: 'כוכב לכת המחזיר לחלל חלק מאור השמש הפוגע בו.' },
  ] as const,
};

type Item = (typeof SIMULATION_DATA.sortingItems)[number];
type GameState = 'intro' | 'pathSelect' | 'room1' | 'peerCheck' | 'unlocked';

const LightMazeGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [learningPath, setLearningPath] = useState<'producersFirst' | 'reflectorsFirst' | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [producersBin, setProducersBin] = useState<Item[]>([]);
  const [reflectorsBin, setReflectorsBin] = useState<Item[]>([]);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [selectedItemInfo, setSelectedItemInfo] = useState<Item | null>(null);
  const [hasFlashlight, setHasFlashlight] = useState(false);

  const mountRef = useRef<HTMLDivElement>(null);
  const sortedIdsRef = useRef<Set<number>>(new Set());
  const flashlightRef = useRef(false);
  flashlightRef.current = hasFlashlight;

  const sceneActive = gameState === 'room1' || gameState === 'peerCheck' || gameState === 'unlocked';

  useEffect(() => {
    setItems([...SIMULATION_DATA.sortingItems].sort(() => Math.random() - 0.5));
  }, []);

  const orderedItems = useMemo(() => {
    if (!learningPath) return items;
    const first = learningPath === 'producersFirst' ? 'producer' : 'reflector';
    return [...items].sort((a, b) => (a.type === first ? -1 : 0) - (b.type === first ? -1 : 0));
  }, [items, learningPath]);

  // --- IMMERSIVE 3D CHAMBER ---
  useEffect(() => {
    if (!sceneActive) return;
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);
    scene.fog = new THREE.Fog(0x0b1220, 14, 42);

    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 200);
    camera.position.set(0, 2.2, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xbfdbfe, 0.55));
    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.5);
    scene.add(hemi);

    const coreLight = new THREE.PointLight(0x38bdf8, 30, 30);
    coreLight.position.set(0, 3.2, 0);
    coreLight.castShadow = true;
    scene.add(coreLight);

    const fill = new THREE.DirectionalLight(0x93c5fd, 1.1);
    fill.position.set(8, 14, 10);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xa78bfa, 0.6);
    rim.position.set(-10, 8, -12);
    scene.add(rim);

    // Floor with procedural grid texture
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#111c30';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 4;
    for (let i = 0; i <= 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
    const floorTex = new THREE.CanvasTexture(c);
    floorTex.colorSpace = THREE.SRGBColorSpace;
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(12, 12);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Exploration table
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.35, 5),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.4 })
    );
    table.position.y = 1;
    table.castShadow = true;
    table.receiveShadow = true;
    scene.add(table);

    // Maze walls (pillars) for depth
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const r = 16 + (i % 3) * 2.5;
      const h = 5 + (i % 4) * 2;
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(2, h, 2),
        new THREE.MeshStandardMaterial({ color: 0x24344f, roughness: 0.7, metalness: 0.25 })
      );
      pillar.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      pillar.rotation.y = a;
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      scene.add(pillar);
    }

    // Central light core
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
      wireframe: true,
    });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), coreMat);
    core.position.set(0, 3.2, 0);
    scene.add(core);

    // Item orbs floating above the table
    const orbs: THREE.Mesh[] = SIMULATION_DATA.sortingItems.map((item, i) => {
      const orb = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.45, 1),
        new THREE.MeshStandardMaterial({
          color: item.color,
          emissive: item.color,
          emissiveIntensity: 0.25,
          roughness: 0.3,
          metalness: item.type === 'reflector' ? 0.9 : 0.1,
        })
      );
      orb.castShadow = true;
      orb.userData = { id: item.id, phase: i * 1.1, radius: 3.4, type: item.type };
      scene.add(orb);
      return orb;
    });

    // Drag to look
    let dragging = false;
    let px = 0;
    let py = 0;
    let yaw = 0;
    let pitch = -0.05;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      px = e.clientX;
      py = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      yaw -= (e.clientX - px) * 0.004;
      pitch = Math.max(-0.5, Math.min(0.4, pitch - (e.clientY - py) * 0.003));
      px = e.clientX;
      py = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    // WASD movement
    const keys: Record<string, boolean> = {};
    const kd = (e: KeyboardEvent) => {
      keys[e.code] = true;
    };
    const ku = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    const pos = new THREE.Vector3(0, 2.2, 9);
    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      // camera-relative movement
      const speed = 7 * dt;
      const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      if (keys['KeyW'] || keys['ArrowUp']) pos.addScaledVector(fwd, speed);
      if (keys['KeyS'] || keys['ArrowDown']) pos.addScaledVector(fwd, -speed);
      if (keys['KeyA'] || keys['ArrowLeft']) pos.addScaledVector(right, -speed);
      if (keys['KeyD'] || keys['ArrowRight']) pos.addScaledVector(right, speed);
      pos.x = THREE.MathUtils.clamp(pos.x, -14, 14);
      pos.z = THREE.MathUtils.clamp(pos.z, -14, 14);
      camera.position.copy(pos);
      camera.rotation.set(pitch, yaw, 0, 'YXZ');

      const lit = flashlightRef.current;
      coreMat.wireframe = !lit;
      coreMat.color.set(lit ? 0x10b981 : 0x38bdf8);
      coreMat.emissive.set(lit ? 0x059669 : 0x0284c7);
      coreLight.color.set(lit ? 0x34d399 : 0x38bdf8);
      coreLight.intensity = 28 + Math.sin(t * 2) * 6;
      core.rotation.x += dt * 0.5;
      core.rotation.y += dt * 0.8;

      orbs.forEach((orb) => {
        const d = orb.userData;
        const done = sortedIdsRef.current.has(d.id);
        const a = t * (done ? 0.9 : 0.35) + d.phase;
        const r = done ? 1.6 : d.radius;
        orb.position.set(Math.cos(a) * r, (done ? 4.4 : 2.1) + Math.sin(t * 1.6 + d.phase) * 0.25, Math.sin(a) * r);
        orb.rotation.y += dt * 1.2;
        const mat = orb.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = done ? 1.1 + Math.sin(t * 4 + d.phase) * 0.2 : 0.2;
      });

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      renderer.dispose();
      floorTex.dispose();
    };
  }, [sceneActive]);

  // --- GAME LOGIC ---
  const handleSort = (item: Item, targetType: 'producer' | 'reflector') => {
    if (item.type === targetType) {
      sortedIdsRef.current.add(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      if (targetType === 'producer') setProducersBin((p) => [...p, item]);
      else setReflectorsBin((p) => [...p, item]);
      setFeedback({ text: 'מצוין! זיהוי נכון מבוסס על עולם האמת 🌟', ok: true });
      setSelectedItemInfo(item);
      if (items.length === 1) setTimeout(() => setGameState('peerCheck'), 900);
    } else {
      setFeedback({
        text: 'שים לב: בדוק האם גוף זה מייצר אור בעצמו או רק מחזיר מקור חיצוני. נסה שוב!',
        ok: false,
      });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div
      dir="rtl"
      className="flex flex-col h-screen w-full bg-background text-foreground font-sans select-none overflow-hidden"
    >
      <header className="flex justify-between items-center px-4 md:px-6 py-4 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <span className="bg-primary text-primary-foreground text-xs px-2.5 py-1 rounded-full font-bold whitespace-nowrap">
            {SIMULATION_DATA.meta.badge}
          </span>
          <h1 className="text-sm md:text-base font-bold text-primary">{SIMULATION_DATA.meta.title}</h1>
        </div>
        <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg border border-border">
          <span className="text-xs text-muted-foreground">ארסנל כלים:</span>
          <span
            className={`text-lg ${hasFlashlight ? 'opacity-100 animate-pulse' : 'opacity-30'}`}
            title="פנס קסם"
          >
            🔦
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* 3D chamber */}
        <div ref={mountRef} className="w-full h-56 md:h-2/5 bg-background relative border-b border-border">
          {sceneActive && (
            <>
              <div className="absolute bottom-3 right-3 game-panel px-3 py-1 text-xs text-primary">
                מבוך אופטי תלת־ממדי • מסלול פעיל:{' '}
                {learningPath === 'producersFirst' ? 'מפיקים תחילה' : 'מחזירים תחילה'}
              </div>
              <div className="absolute bottom-3 left-3 game-panel px-3 py-1 text-xs text-muted-foreground">
                W/A/S/D או חצים - תנועה • גרירה עם העכבר - הסתכלות
              </div>
            </>
          )}
        </div>

        {/* Interactive panel */}
        <div className="flex-1 p-4 md:p-6 flex flex-col gap-4 overflow-y-auto">
          <div className="game-panel p-4 flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-xs md:text-sm font-medium text-primary">{SIMULATION_DATA.narrative.room1Task}</p>
            {feedback && (
              <span
                className={`text-xs px-3 py-1 rounded-full font-bold border ${
                  feedback.ok
                    ? 'bg-primary/15 text-primary border-primary/30'
                    : 'bg-destructive/15 text-destructive border-destructive/30'
                }`}
              >
                {feedback.text}
              </span>
            )}
          </div>

          {gameState === 'room1' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-3 justify-center">
                {orderedItems.map((item) => (
                  <div key={item.id} className="game-panel p-3 flex flex-col gap-2 items-center min-w-[150px]">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-sm font-semibold">{item.name}</span>
                    </div>
                    <div className="flex gap-1 w-full pt-2 border-t border-border">
                      <button
                        onClick={() => handleSort(item, 'producer')}
                        className="flex-1 text-xs bg-primary/80 hover:bg-primary text-primary-foreground py-1.5 rounded-lg transition font-medium"
                      >
                        מפיק אור
                      </button>
                      <button
                        onClick={() => handleSort(item, 'reflector')}
                        className="flex-1 text-xs bg-accent/80 hover:bg-accent text-accent-foreground py-1.5 rounded-lg transition font-medium"
                      >
                        מחזיר אור
                      </button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-center text-primary font-bold py-4">
                    כל הגופים מוינו בהצלחה! מעבר לתחנת שיתוף עמיתים...
                  </div>
                )}
              </div>

              {selectedItemInfo && (
                <div className="game-panel p-3 text-xs text-foreground flex items-center gap-3">
                  <span className="text-xl">💡</span>
                  <div>
                    <strong className="text-primary">חיבור לעולם האמיתי ({selectedItemInfo.name}):</strong>{' '}
                    {selectedItemInfo.realWorld}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-auto pt-2">
                <div className="game-panel p-3">
                  <h2 className="text-xs font-bold text-primary tracking-wider mb-2">
                    מפיקי אור ({producersBin.length})
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {producersBin.map((i) => (
                      <span
                        key={i.id}
                        className="text-xs bg-primary/15 border border-primary/40 text-primary px-2 py-1 rounded-md"
                      >
                        {i.icon} {i.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="game-panel p-3">
                  <h2 className="text-xs font-bold text-accent tracking-wider mb-2">
                    מחזירי אור ({reflectorsBin.length})
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {reflectorsBin.map((i) => (
                      <span
                        key={i.id}
                        className="text-xs bg-accent/15 border border-accent/40 text-accent px-2 py-1 rounded-md"
                      >
                        {i.icon} {i.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {gameState === 'unlocked' && (
            <div className="flex flex-col items-center justify-center my-auto gap-5 game-panel p-8 text-center">
              <div className="text-5xl animate-bounce">🔦</div>
              <h2 className="text-2xl font-bold text-primary">קיבלתם את פנס הקסם!</h2>
              <p className="text-muted-foreground max-w-md text-sm">{SIMULATION_DATA.narrative.unlocked}</p>
              <button
                onClick={() => setFeedback({ text: 'חדר 2 (קו ישר וחומרים שקופים) בפיתוח - בקרוב!', ok: true })}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-xl transition"
              >
                המשך לחדר הבא במבוך ➡️
              </button>
            </div>
          )}
        </div>

        {/* Overlays */}
        {gameState === 'intro' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 backdrop-blur p-6">
            <div className="max-w-xl game-panel p-8 text-center flex flex-col gap-6">
              <div className="text-5xl">🎉</div>
              <h2 className="text-2xl font-bold text-primary">הצלת מסיבת ההפתעה והצבעים</h2>
              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                {SIMULATION_DATA.narrative.intro}
              </p>
              <button
                onClick={() => setGameState('pathSelect')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-xl transition hover:-translate-y-0.5"
              >
                הכנס למבוך האור ➡️
              </button>
            </div>
          </div>
        )}

        {gameState === 'pathSelect' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 backdrop-blur p-6">
            <div className="max-w-xl game-panel p-8 text-center flex flex-col gap-6">
              <div className="text-3xl">🧭</div>
              <h2 className="text-xl font-bold text-primary">בחרו את מסלול החקר שלכם</h2>
              <p className="text-muted-foreground text-sm">
                המבוך מאפשר לכם בחירה אישית באיזה סוג אובייקטים להתחיל לחקור קודם:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setLearningPath('producersFirst');
                    setGameState('room1');
                  }}
                  className="bg-muted hover:bg-muted/70 border border-primary/40 p-4 rounded-xl text-right flex flex-col gap-2 transition"
                >
                  <span className="font-bold text-primary">☀️ מסלול מפיקי האור תחילה</span>
                  <span className="text-xs text-muted-foreground">
                    חקר מקורות אנרגיה טבעיים ומלאכותיים המאירים בכוחות עצמם.
                  </span>
                </button>
                <button
                  onClick={() => {
                    setLearningPath('reflectorsFirst');
                    setGameState('room1');
                  }}
                  className="bg-muted hover:bg-muted/70 border border-accent/40 p-4 rounded-xl text-right flex flex-col gap-2 transition"
                >
                  <span className="font-bold text-accent">🪞 מסלול מחזירי האור תחילה</span>
                  <span className="text-xs text-muted-foreground">
                    חקר גופים המוחזרים אל עינינו מתוך מקור חיצוני.
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState === 'peerCheck' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 backdrop-blur p-6">
            <div className="max-w-xl game-panel p-8 text-center flex flex-col gap-5">
              <div className="text-4xl">👥</div>
              <h2 className="text-xl font-bold text-primary">נקודת עצירה ובדיקת עמיתים (חיבור חברתי-רגשי)</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{SIMULATION_DATA.narrative.peerCheck}</p>
              <button
                onClick={() => {
                  setHasFlashlight(true);
                  setGameState('unlocked');
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-xl transition"
              >
                שוחחנו והסכמנו! קבל את פנס הקסם 🔦
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LightMazeGame;

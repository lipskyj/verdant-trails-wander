import React, { useState, useEffect, useMemo, useRef } from 'react';
import LightLabScene from './LightLabScene';
import { LESSONS, ROOM_1, type SortingItem } from '@/content/lessons';

// --- CONTENT AS DATA (curriculum lives in src/content/lessons.ts) ---
const lesson = ROOM_1;
const SIMULATION_DATA = {
  meta: {
    title: lesson.title,
    subject: lesson.subject,
    targetGrade: lesson.targetGrade,
    badge: lesson.badge,
  },
  narrative: {
    intro: lesson.narrative.intro,
    room1Task: lesson.narrative.task,
    peerCheck: lesson.narrative.peerCheck,
    unlocked: lesson.narrative.unlocked,
  },
  sortingItems: lesson.items,
};

type Item = SortingItem;
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

  const sortedIdsRef = useRef<Set<number>>(new Set());


  const sceneActive = gameState === 'room1' || gameState === 'peerCheck' || gameState === 'unlocked';

  useEffect(() => {
    setItems([...SIMULATION_DATA.sortingItems].sort(() => Math.random() - 0.5));
  }, []);

  const orderedItems = useMemo(() => {
    if (!learningPath) return items;
    const first = learningPath === 'producersFirst' ? 'producer' : 'reflector';
    return [...items].sort((a, b) => (a.type === first ? -1 : 0) - (b.type === first ? -1 : 0));
  }, [items, learningPath]);

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
        {/* Hyper-real optics lab */}
        <div className="w-full h-[46vh] md:h-[52vh] bg-background relative border-b border-border">
          {sceneActive ? (
            <LightLabScene
              objects={SIMULATION_DATA.sortingItems}
              onInspect={(id) => setSelectedItemInfo(SIMULATION_DATA.sortingItems.find((i) => i.id === id) ?? null)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
              מעבדת האופטיקה תיפתח לאחר בחירת מסלול החקר
            </div>
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
              <div className="text-5xl animate-bounce">{lesson.reward?.icon ?? '🔦'}</div>
              <h2 className="text-2xl font-bold text-primary">קיבלתם את {lesson.reward?.name ?? 'פנס הקסם'}!</h2>
              <p className="text-muted-foreground max-w-md text-sm">{SIMULATION_DATA.narrative.unlocked}</p>

              {/* מפת המבוך - שיעורים עתידיים נטענים מרשימת השיעורים */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl">
                {LESSONS.map((room) => {
                  const done = room.slug === lesson.slug;
                  return (
                    <div
                      key={room.slug}
                      className={`rounded-xl border p-3 text-right flex flex-col gap-1 ${
                        done ? 'border-primary/50 bg-primary/10' : 'border-border bg-muted/50 opacity-70'
                      }`}
                    >
                      <span className="text-xs font-bold text-foreground">
                        {done ? '✔' : '🔒'} חדר {room.order}
                      </span>
                      <span className="text-xs text-primary">{room.subject}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {done ? 'הושלם' : 'ייפתח בשיעור הבא'} • פרס: {room.reward?.icon}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() =>
                  setFeedback({
                    text: `${LESSONS[1].title} בפיתוח - בקרוב!`,
                    ok: true,
                  })
                }
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

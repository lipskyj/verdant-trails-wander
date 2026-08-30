import React, { useState, useEffect, useMemo } from 'react';
import LightLabScene from './LightLabScene';
import DarkBoxScene from './DarkBoxScene';
import { LESSONS, ROOM_1, ROOM_2, type SortingItem } from '@/content/lessons';

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
type Choice = 'producer' | 'reflector';
type GameState =
  | 'intro'
  | 'pathSelect'
  | 'room1'
  | 'peerCheck'
  | 'unlocked'
  | 'room2Intro'
  | 'room2'
  | 'room2Done';

const LightMazeGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [learningPath, setLearningPath] = useState<'producersFirst' | 'reflectorsFirst' | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [choices, setChoices] = useState<Record<number, Choice>>({});
  const [wrongIds, setWrongIds] = useState<number[]>([]);
  const [solvedIds, setSolvedIds] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [selectedItemInfo, setSelectedItemInfo] = useState<Item | null>(null);
  const [hasFlashlight, setHasFlashlight] = useState(false);
  const [hasTube, setHasTube] = useState(false);

  // room 2 state
  const [prediction, setPrediction] = useState<'yes' | 'no' | null>(null);
  const [bent, setBent] = useState(false);
  const [offset, setOffset] = useState(0);
  const [testedStraight, setTestedStraight] = useState(false);
  const [testedBent, setTestedBent] = useState(false);
  const [conclusion, setConclusion] = useState<number | null>(null);
  const [room2Feedback, setRoom2Feedback] = useState<{ text: string; ok: boolean } | null>(null);

  const allItems = SIMULATION_DATA.sortingItems;
  const total = allItems.length;

  const sceneActive = gameState === 'room1' || gameState === 'peerCheck' || gameState === 'unlocked';
  const room2Active = gameState === 'room2' || gameState === 'room2Intro' || gameState === 'room2Done';

  useEffect(() => {
    setItems([...allItems].sort(() => Math.random() - 0.5));
  }, [allItems]);

  const orderedItems = useMemo(() => {
    if (!learningPath) return items;
    const first = learningPath === 'producersFirst' ? 'producer' : 'reflector';
    return [...items].sort((a, b) => (a.type === first ? -1 : 0) - (b.type === first ? -1 : 0));
  }, [items, learningPath]);

  const producersBin = allItems.filter((i) => solvedIds.includes(i.id) && i.type === 'producer');
  const reflectorsBin = allItems.filter((i) => solvedIds.includes(i.id) && i.type === 'reflector');
  const pending = orderedItems.filter((i) => !solvedIds.includes(i.id));
  const answeredCount = pending.filter((i) => choices[i.id]).length;
  const canSubmit = pending.length > 0 && answeredCount === pending.length;

  const pick = (id: number, choice: Choice) => {
    setChoices((p) => ({ ...p, [id]: choice }));
    setWrongIds((p) => p.filter((x) => x !== id));
    setSelectedItemInfo(allItems.find((i) => i.id === id) ?? null);
  };

  // --- SUBMIT: grade every answer at once ---
  const handleSubmit = () => {
    const correct = pending.filter((i) => choices[i.id] === i.type).map((i) => i.id);
    const wrong = pending.filter((i) => choices[i.id] !== i.type).map((i) => i.id);
    setSolvedIds((p) => [...p, ...correct]);
    setWrongIds(wrong);
    setChoices((p) => {
      const next = { ...p };
      wrong.forEach((id) => delete next[id]);
      return next;
    });

    if (wrong.length === 0) {
      setFeedback({ text: `כל ${total} הגופים מוינו נכון! 🌟`, ok: true });
      setTimeout(() => setGameState('peerCheck'), 900);
    } else {
      setFeedback({
        text: `${correct.length} תשובות נכונות. ${wrong.length} לא נכונות — שאלו את עצמכם: אם נכבה את כל האורות בחדר, האם עוד נראה את הגוף הזה?`,
        ok: false,
      });
    }
  };

  const submitConclusion = () => {
    if (conclusion === null) return;
    if (conclusion === 1) {
      setHasTube(true);
      setRoom2Feedback({ text: 'מדויק! האור מתקדם בקו ישר בלבד.', ok: true });
      setTimeout(() => setGameState('room2Done'), 700);
    } else {
      setRoom2Feedback({ text: 'לא מדויק. בדקו שוב מה קרה כשכופפתם את הצינור.', ok: false });
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
          <h1 className="text-sm md:text-base font-bold text-primary">
            {room2Active ? ROOM_2.title : SIMULATION_DATA.meta.title}
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg border border-border">
          <span className="text-xs text-muted-foreground">ארסנל כלים:</span>
          <span className={`text-lg ${hasFlashlight ? 'opacity-100' : 'opacity-30'}`} title="פנס קסם">
            🔦
          </span>
          <span className={`text-lg ${hasTube ? 'opacity-100' : 'opacity-30'}`} title="צינור החוקרים">
            📏
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* 3D stage */}
        <div className="w-full h-[46vh] md:h-[52vh] bg-background relative border-b border-border">
          {room2Active ? (
            <DarkBoxScene bent={bent} offset={offset} />
          ) : sceneActive ? (
            <LightLabScene
              objects={allItems}
              onInspect={(id) => setSelectedItemInfo(allItems.find((i) => i.id === id) ?? null)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
              מעבדת האופטיקה תיפתח לאחר בחירת מסלול החקר
            </div>
          )}
        </div>

        {/* Interactive panel */}
        <div className="flex-1 p-4 md:p-6 flex flex-col gap-4 overflow-y-auto">
          {gameState === 'room1' && (
            <>
              <div className="game-panel p-4 flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <p className="text-xs md:text-sm font-medium text-primary">
                    {SIMULATION_DATA.narrative.room1Task} סמנו לכל גוף אם הוא <strong>מפיק אור</strong> או{' '}
                    <strong>מחזיר אור</strong>, ואז לחצו על <strong>"שלחו את המיון"</strong> בתחתית העמוד.
                  </p>
                  <span className="text-xs font-bold text-foreground whitespace-nowrap">
                    מוינו נכון {solvedIds.length} מתוך {total}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(solvedIds.length / total) * 100}%` }}
                  />
                </div>
                {feedback && (
                  <span
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold border ${
                      feedback.ok
                        ? 'bg-primary/15 text-primary border-primary/30'
                        : 'bg-destructive/15 text-destructive border-destructive/30'
                    }`}
                  >
                    {feedback.text}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-3 justify-center">
                  {pending.map((item) => {
                    const c = choices[item.id];
                    const isWrong = wrongIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`game-panel p-3 flex flex-col gap-2 items-center min-w-[160px] border ${
                          isWrong ? 'border-destructive/60' : c ? 'border-primary/50' : 'border-border'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{item.icon}</span>
                          <span className="text-sm font-semibold">{item.name}</span>
                        </div>
                        <div className="flex gap-1 w-full pt-2 border-t border-border">
                          <button
                            onClick={() => pick(item.id, 'producer')}
                            aria-pressed={c === 'producer'}
                            className={`flex-1 text-xs py-1.5 rounded-lg transition font-medium border ${
                              c === 'producer'
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted text-foreground border-border hover:bg-muted/70'
                            }`}
                          >
                            {c === 'producer' ? '✔ ' : ''}מפיק אור
                          </button>
                          <button
                            onClick={() => pick(item.id, 'reflector')}
                            aria-pressed={c === 'reflector'}
                            className={`flex-1 text-xs py-1.5 rounded-lg transition font-medium border ${
                              c === 'reflector'
                                ? 'bg-accent text-accent-foreground border-accent'
                                : 'bg-muted text-foreground border-border hover:bg-muted/70'
                            }`}
                          >
                            {c === 'reflector' ? '✔ ' : ''}מחזיר אור
                          </button>
                        </div>
                        {isWrong && <span className="text-[11px] text-destructive">תשובה לא נכונה — נסו שוב</span>}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground font-bold py-3 px-10 rounded-xl transition"
                  >
                    שלחו את המיון ✅
                  </button>
                  <span className="text-[11px] text-muted-foreground">
                    סימנתם {answeredCount} מתוך {pending.length} הגופים שנותרו
                  </span>
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
            </>
          )}

          {gameState === 'unlocked' && (
            <div className="flex flex-col items-center justify-center my-auto gap-5 game-panel p-8 text-center">
              <div className="text-5xl animate-bounce">{lesson.reward?.icon ?? '🔦'}</div>
              <h2 className="text-2xl font-bold text-primary">קיבלתם את {lesson.reward?.name ?? 'פנס הקסם'}!</h2>
              <p className="text-muted-foreground max-w-md text-sm">{SIMULATION_DATA.narrative.unlocked}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl">
                {LESSONS.map((room) => {
                  const done = room.slug === lesson.slug;
                  const next = room.slug === ROOM_2.slug;
                  return (
                    <div
                      key={room.slug}
                      className={`rounded-xl border p-3 text-right flex flex-col gap-1 ${
                        done
                          ? 'border-primary/50 bg-primary/10'
                          : next
                            ? 'border-accent/50 bg-accent/10'
                            : 'border-border bg-muted/50 opacity-70'
                      }`}
                    >
                      <span className="text-xs font-bold text-foreground">
                        {done ? '✔' : next ? '🔓' : '🔒'} חדר {room.order}
                      </span>
                      <span className="text-xs text-primary">{room.subject}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {done ? 'הושלם' : next ? 'נפתח כעת' : 'ייפתח בשיעור הבא'} • פרס: {room.reward?.icon}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setGameState('room2Intro')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-xl transition"
              >
                המשך לחדר 2: התיבה האפלה ➡️
              </button>
            </div>
          )}

          {gameState === 'room2' && (
            <div className="flex flex-col gap-4">
              <div className="game-panel p-4 flex flex-col gap-2">
                <p className="text-xs md:text-sm font-medium text-primary">
                  שלב 2: {ROOM_2.narrative.task} כופפו את הצינור, הזיזו אותו מול החור, וראו מתי העין רואה את הנר.
                </p>
                <p className="text-[11px] text-muted-foreground">
                  התחזית שלכם הייתה: {prediction === 'yes' ? 'כן, נראה את הנר גם בצינור מכופף' : 'לא, לא נראה את הנר בצינור מכופף'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="game-panel p-4 flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-primary">1. צורת הצינור</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setBent(false);
                        setTestedStraight(true);
                      }}
                      className={`flex-1 text-xs py-2 rounded-lg border font-medium ${
                        !bent ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border'
                      }`}
                    >
                      צינור ישר ➖
                    </button>
                    <button
                      onClick={() => {
                        setBent(true);
                        setTestedBent(true);
                      }}
                      className={`flex-1 text-xs py-2 rounded-lg border font-medium ${
                        bent ? 'bg-accent text-accent-foreground border-accent' : 'bg-muted border-border'
                      }`}
                    >
                      צינור מכופף ⤵️
                    </button>
                  </div>
                  <h3 className="text-xs font-bold text-primary mt-2">2. כיוון הצינור מול חור התיבה</h3>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.05}
                    value={offset}
                    onChange={(e) => setOffset(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>הזזה שמאלה</span>
                    <span>מול החור</span>
                    <span>הזזה ימינה</span>
                  </div>
                </div>

                <div className="game-panel p-4 flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-primary">3. שלחו את המסקנה</h3>
                  {!(testedStraight && testedBent) ? (
                    <p className="text-xs text-muted-foreground">
                      בדקו קודם גם צינור ישר וגם צינור מכופף, ואז תיפתח שאלת המסקנה.
                    </p>
                  ) : (
                    <>
                      {[
                        'האור מתעקל ועובר בכל צינור, גם מכופף.',
                        'האור מתקדם בקו ישר, ולכן נראה רק כשהצינור ישר ומכוון אל החור.',
                        'האור עובר רק כשהתיבה מוארת מבחוץ.',
                      ].map((txt, idx) => (
                        <button
                          key={idx}
                          onClick={() => setConclusion(idx)}
                          className={`text-right text-xs p-2 rounded-lg border transition ${
                            conclusion === idx
                              ? 'bg-primary/20 border-primary text-primary font-bold'
                              : 'bg-muted border-border hover:bg-muted/70'
                          }`}
                        >
                          {txt}
                        </button>
                      ))}
                      <button
                        onClick={submitConclusion}
                        disabled={conclusion === null}
                        className="bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-bold py-2.5 rounded-xl transition"
                      >
                        שלחו מסקנה ✅
                      </button>
                    </>
                  )}
                  {room2Feedback && (
                    <span
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold border ${
                        room2Feedback.ok
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'bg-destructive/15 text-destructive border-destructive/30'
                      }`}
                    >
                      {room2Feedback.text}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {gameState === 'room2Done' && (
            <div className="flex flex-col items-center justify-center my-auto gap-5 game-panel p-8 text-center">
              <div className="text-5xl animate-bounce">{ROOM_2.reward?.icon}</div>
              <h2 className="text-2xl font-bold text-primary">קיבלתם את {ROOM_2.reward?.name}!</h2>
              <p className="text-muted-foreground max-w-md text-sm">{ROOM_2.narrative.unlocked}</p>
              <p className="text-xs text-muted-foreground">{ROOM_2.narrative.peerCheck}</p>
              <button
                onClick={() => setFeedback({ text: `${LESSONS[2].title} בפיתוח - בקרוב!`, ok: true })}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-xl transition"
              >
                המשך לחדר 3 ➡️
              </button>
              {feedback && <span className="text-xs text-primary font-bold">{feedback.text}</span>}
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
                  setFeedback(null);
                  setGameState('unlocked');
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-xl transition"
              >
                שוחחנו והסכמנו! קבל את פנס הקסם 🔦
              </button>
            </div>
          </div>
        )}

        {gameState === 'room2Intro' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 backdrop-blur p-6">
            <div className="max-w-xl game-panel p-8 text-center flex flex-col gap-5">
              <div className="text-4xl">📦</div>
              <h2 className="text-xl font-bold text-primary">{ROOM_2.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{ROOM_2.narrative.intro}</p>
              <p className="text-sm font-bold text-foreground">
                חזו לפני הניסוי: אם נכופף את הצינור — האם עוד נראה את להבת הנר?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setPrediction('yes');
                    setGameState('room2');
                  }}
                  className="bg-muted hover:bg-muted/70 border border-border p-3 rounded-xl text-sm font-bold"
                >
                  כן, נראה 👀
                </button>
                <button
                  onClick={() => {
                    setPrediction('no');
                    setGameState('room2');
                  }}
                  className="bg-muted hover:bg-muted/70 border border-border p-3 rounded-xl text-sm font-bold"
                >
                  לא, יהיה חשוך 🌑
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LightMazeGame;

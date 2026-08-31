import React, { useState, useEffect, useMemo } from 'react';
import LightLabScene from './LightLabScene';
import DarkBoxScene from './DarkBoxScene';
import TransparencyScene from './TransparencyScene';
import FlashlightAnatomyScene from './FlashlightAnatomyScene';
import ZoomBookScene from './ZoomBookScene';
import { LAB_D, LAB_E, FLASHLIGHT_PARTS, FLASHLIGHT_CHAIN, ZOOM_LEVELS } from '@/content/labs';
import GuideQuiz from './island/GuideQuiz';
import IslandMap from './island/IslandMap';
import StoryIntro from './island/StoryIntro';
import ModeSelect from './island/ModeSelect';
import HintBox from './island/HintBox';
import ResearcherReport from './island/ResearcherReport';
import { ISLAND, MYSTERIES, PRE_TEST, PULSE_CHECKS } from '@/content/island';
import { logEvent } from '@/lib/eventLog';
import {

  ROOM_1,
  ROOM_2,
  ROOM_3,
  ROOM_3_SAMPLES,
  type MaterialClass,
  type SortingItem,
} from '@/content/lessons';



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
  | 'islandIntro'
  | 'modeSelect'
  | 'preTest'
  | 'map'
  | 'intro'
  | 'pathSelect'
  | 'room1'
  | 'peerCheck'
  | 'unlocked'
  | 'room2Intro'
  | 'room2'
  | 'room2Done'
  | 'room3Intro'
  | 'room3'
  | 'room3Done'
  | 'room4Intro'
  | 'room4'
  | 'room4Done'
  | 'room5Intro'
  | 'room5'
  | 'room5Done'
  | 'report';

const LightMazeGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('islandIntro');
  const [freeMode, setFreeMode] = useState(false);
  const [withQuizzes, setWithQuizzes] = useState(true);
  const [solvedMysteries, setSolvedMysteries] = useState<string[]>([]);
  const [pulse, setPulse] = useState<string | null>(null);
  const [pulseDone, setPulseDone] = useState<string[]>([]);
  const [pulseNext, setPulseNext] = useState<GameState | null>(null);
  const [attemptsA, setAttemptsA] = useState(0);
  const [attemptsC, setAttemptsC] = useState(0);
  const [learningPath, setLearningPath] = useState<'producersFirst' | 'reflectorsFirst' | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [choices, setChoices] = useState<Record<number, Choice>>({});
  const [wrongIds, setWrongIds] = useState<number[]>([]);
  const [solvedIds, setSolvedIds] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [selectedItemInfo, setSelectedItemInfo] = useState<Item | null>(null);
  const [hasFlashlight, setHasFlashlight] = useState(false);
  const [hasTube, setHasTube] = useState(false);
  const [hasLens, setHasLens] = useState(false);
  const [hasKit, setHasKit] = useState(false);
  const [hasBook, setHasBook] = useState(false);

  // ---- mystery D (flashlight teardown, four inquiry layers) ----
  const [d4Predict, setD4Predict] = useState<number | null>(null);
  const [dExplode, setDExplode] = useState(0);
  const [dSelected, setDSelected] = useState<string | null>(null);
  const [dDiscovered, setDDiscovered] = useState<string[]>([]);
  const [dChain, setDChain] = useState<string[]>([]);
  const [dChainOk, setDChainOk] = useState<boolean | null>(null);
  const [dBattery, setDBattery] = useState(100);
  const [dLightOn, setDLightOn] = useState(true);
  const [dFailSeen, setDFailSeen] = useState(false);
  const [dFailChoice, setDFailChoice] = useState<number | null>(null);
  const [dFeedback, setDFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [dAttempts, setDAttempts] = useState(0);

  // ---- mystery E (zoom book) ----
  const [zLevel, setZLevel] = useState(1);
  const [zMaxLevel, setZMaxLevel] = useState(1);
  const [zAnswer, setZAnswer] = useState<number | null>(null);
  const [zFeedback, setZFeedback] = useState<{ text: string; ok: boolean } | null>(null);


  // room 2 state
  const [prediction, setPrediction] = useState<'yes' | 'no' | null>(null);
  const [bent, setBent] = useState(false);
  const [offset, setOffset] = useState(0);
  const [seen, setSeen] = useState(false);
  const [testedStraight, setTestedStraight] = useState(false);
  const [testedBent, setTestedBent] = useState(false);
  const [conclusion, setConclusion] = useState<number | null>(null);
  const [room2Feedback, setRoom2Feedback] = useState<{ text: string; ok: boolean } | null>(null);

  // room 3 state
  const [r3Prediction, setR3Prediction] = useState<string>('זכוכית שקופה');
  const [activeSample, setActiveSample] = useState<number>(ROOM_3_SAMPLES[0].id);
  const [lampOn, setLampOn] = useState(true);
  const [measuredIds, setMeasuredIds] = useState<number[]>([]);
  const [r3Choices, setR3Choices] = useState<Record<number, MaterialClass>>({});
  const [r3Wrong, setR3Wrong] = useState<number[]>([]);
  const [room3Feedback, setRoom3Feedback] = useState<{ text: string; ok: boolean } | null>(null);

  const allItems = SIMULATION_DATA.sortingItems;
  const total = allItems.length;

  const sceneActive = gameState === 'room1' || gameState === 'peerCheck' || gameState === 'unlocked';
  const room2Active = gameState === 'room2' || gameState === 'room2Intro' || gameState === 'room2Done';
  const room3Active = gameState === 'room3' || gameState === 'room3Intro' || gameState === 'room3Done';
  const room4Active = gameState === 'room4' || gameState === 'room4Intro' || gameState === 'room4Done';
  const room5Active = gameState === 'room5' || gameState === 'room5Intro' || gameState === 'room5Done';

  const dLayer = d4Predict === null ? 1 : dDiscovered.length < FLASHLIGHT_PARTS.length ? 2 : dChainOk ? 4 : 3;
  const zoomData = ZOOM_LEVELS[Math.min(zLevel, ZOOM_LEVELS.length) - 1];

  const activeSampleData = ROOM_3_SAMPLES.find((s) => s.id === activeSample) ?? null;
  const canSubmitRoom3 =
    measuredIds.length === ROOM_3_SAMPLES.length &&
    ROOM_3_SAMPLES.every((s) => r3Choices[s.id] !== undefined);

  // ---- pulse-check helper: guide asks a question inside the mystery itself ----
  const askPulse = (key: string, next?: GameState) => {
    if (!withQuizzes || pulseDone.includes(key)) {
      if (next) setGameState(next);
      return;
    }
    setPulseNext(next ?? null);
    setPulse(key);
  };

  const finishMystery = (slug: string, next: GameState) => {
    setSolvedMysteries((p) => (p.includes(slug) ? p : [...p, slug]));
    logEvent('mystery_complete', { mystery: slug });
    setGameState(next);
  };

  const enterMystery = (slug: string) => {
    logEvent('mystery_start', { mystery: slug });
    if (slug === 'mysteryA') setGameState(solvedMysteries.includes('mysteryA') ? 'room1' : 'pathSelect');
    if (slug === 'mysteryB') setGameState('room2Intro');
    if (slug === 'mysteryC') setGameState('room3Intro');
    if (slug === 'mysteryD') setGameState('room4Intro');
    if (slug === 'mysteryE') setGameState('room5Intro');
  };

  // mark the initially shown sample as measured while the lamp is on
  useEffect(() => {
    if (gameState !== 'room3' || !lampOn) return;
    setMeasuredIds((p) => (p.includes(activeSample) ? p : [...p, activeSample]));
  }, [gameState, lampOn, activeSample]);

  // pulse check in the middle of mystery C — once every sample was measured
  useEffect(() => {
    if (gameState !== 'room3') return;
    if (measuredIds.length === ROOM_3_SAMPLES.length && !pulseDone.includes('c_mid') && !pulse) {
      askPulse('c_mid');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, measuredIds.length]);

  // pulse check in the middle of mystery B — once both tube shapes were tested
  useEffect(() => {
    if (gameState !== 'room2') return;
    if (testedStraight && testedBent && !pulseDone.includes('b_mid') && !pulse) {
      askPulse('b_mid');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, testedStraight, testedBent]);

  const submitRoom3 = () => {
    const wrong = ROOM_3_SAMPLES.filter((s) => r3Choices[s.id] !== s.klass).map((s) => s.id);
    setR3Wrong(wrong);
    setAttemptsC((a) => a + 1);
    logEvent('mystery_attempt', { mystery: 'mysteryC', wrong: wrong.length });
    if (wrong.length === 0) {
      setHasLens(true);
      setRoom3Feedback({ text: 'מיון מושלם! פיצחתם את סוד השקיפות 🌟', ok: true });
      setTimeout(() => askPulse('c_end', 'room3Done'), 800);
    } else {
      setRoom3Feedback({
        text: `${ROOM_3_SAMPLES.length - wrong.length} נכונות. בחומרים המסומנים באדום — חזרו למדידה: מעל 70% שקוף, 15%–70% חלקית, מתחת ל־15% אטום.`,
        ok: false,
      });
    }
  };

  useEffect(() => {
    logEvent('session_start');
  }, []);

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
    setAttemptsA((a) => a + 1);
    logEvent('mystery_attempt', { mystery: 'mysteryA', correct: correct.length, wrong: wrong.length });
    setChoices((p) => {
      const next = { ...p };
      wrong.forEach((id) => delete next[id]);
      return next;
    });

    if (wrong.length === 0) {
      setFeedback({ text: `כל ${total} הגופים מוינו נכון! 🌟`, ok: true });
      setTimeout(() => askPulse('a_end', 'peerCheck'), 800);
    } else {
      setFeedback({
        text: `${correct.length} תשובות נכונות. ${wrong.length} לא נכונות — שאלו את עצמכם: אם נכבה את כל האורות בחדר, האם עוד נראה את הגוף הזה?`,
        ok: false,
      });
      setTimeout(() => askPulse('a_mid'), 700);
    }
  };


  // ---- mystery D handlers (Observe → Investigate → Explain → Apply) ----
  const toggleChain = (id: string) => {
    setDChainOk(null);
    setDChain((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const submitChain = () => {
    const ok = dChain.length === FLASHLIGHT_CHAIN.length && dChain.every((id, i) => id === FLASHLIGHT_CHAIN[i]);
    setDChainOk(ok);
    setDAttempts((a) => a + 1);
    logEvent('mystery_attempt', { mystery: 'mysteryD', stage: 'chain', correct: ok });
    setDFeedback(
      ok
        ? { text: 'שרשרת נכונה! מאנרגיה ועד לקרן שיוצאת. עכשיו שלב היישום — שחקו עם הסוללה.', ok: true }
        : { text: 'הסדר לא מדויק. התחילו מהאנרגיה, המשיכו למה שמפיק אור, ורק אז למה שמחזיר/מעביר/חוסם.', ok: false }
    );
  };

  const submitFail = () => {
    if (dFailChoice === null) return;
    const ok = dFailChoice === LAB_D.failExplain.correct;
    setDAttempts((a) => a + 1);
    logEvent('mystery_attempt', { mystery: 'mysteryD', stage: 'apply', correct: ok });
    setDFeedback({ text: ok ? LAB_D.failExplain.feedbackOk : LAB_D.failExplain.feedbackNo, ok });
    if (ok) {
      setHasKit(true);
      setTimeout(() => askPulse('d_mid', 'room4Done'), 800);
    }
  };

  const submitZoom = () => {
    if (zAnswer === null) return;
    const ok = zAnswer === LAB_E.finalQuestion.correct;
    logEvent('mystery_attempt', { mystery: 'mysteryE', correct: ok });
    setZFeedback({ text: ok ? LAB_E.finalQuestion.feedbackOk : LAB_E.finalQuestion.feedbackNo, ok });
    if (ok) {
      setHasBook(true);
      setTimeout(() => setGameState('room5Done'), 800);
    }
  };

  // הסוללה נשחקת רק בשלב היישום (שכבה 4)
  useEffect(() => {
    if (gameState !== 'room4' || dLayer < 4) return;
    if (dBattery < 15) setDFailSeen(true);
  }, [gameState, dLayer, dBattery]);

  // בדיקת דופק באמצע תעלומה ה' — אחרי שצללנו לרמה 4
  useEffect(() => {
    if (gameState !== 'room5') return;
    if (zMaxLevel >= 4 && !pulseDone.includes('e_mid') && !pulse) askPulse('e_mid');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, zMaxLevel]);

  const submitConclusion = () => {
    if (conclusion === null) return;
    logEvent('mystery_attempt', { mystery: 'mysteryB', choice: conclusion, correct: conclusion === 1 });
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
      className="relative h-screen w-full bg-background text-foreground font-sans select-none overflow-hidden"
    >
      <header className="absolute top-0 inset-x-0 z-20 flex justify-between items-center px-3 md:px-5 py-3 pointer-events-none [&>*]:pointer-events-auto">
        <div className="game-panel flex items-center gap-3 px-3 py-2">
          <span className="bg-primary text-primary-foreground text-xs px-2.5 py-1 rounded-full font-bold whitespace-nowrap">
            {ISLAND.title} • {ISLAND.mission}
          </span>
          <h1 className="text-sm md:text-base font-bold text-primary">
            {room5Active
              ? `${MYSTERIES[4].code} — ${MYSTERIES[4].name}`
              : room4Active
              ? `${MYSTERIES[3].code} — ${MYSTERIES[3].name}`
              : room3Active
              ? `${MYSTERIES[2].code} — ${MYSTERIES[2].name}`
              : room2Active
                ? `${MYSTERIES[1].code} — ${MYSTERIES[1].name}`
                : `${MYSTERIES[0].code} — ${MYSTERIES[0].name}`}
          </h1>
          <button
            onClick={() => setGameState('map')}
            className="text-[11px] bg-muted border border-border rounded-lg px-2 py-1 hover:bg-muted/70"
          >
            🗺️ מפת האי
          </button>
        </div>
        <div className="game-panel flex items-center gap-2 px-3 py-2">
          <span className="text-xs text-muted-foreground">תרמיל החוקר:</span>

          <span className={`text-lg ${hasFlashlight ? 'opacity-100' : 'opacity-30'}`} title="פנס קסם">
            🔦
          </span>
          <span className={`text-lg ${hasTube ? 'opacity-100' : 'opacity-30'}`} title="צינור החוקרים">
            📏
          </span>
          <span className={`text-lg ${hasLens ? 'opacity-100' : 'opacity-30'}`} title="עדשת החוקרים">
            🔬
          </span>
          <span className={`text-lg ${hasKit ? 'opacity-100' : 'opacity-30'}`} title="ארגז הפירוק">
            🧰
          </span>
          <span className={`text-lg ${hasBook ? 'opacity-100' : 'opacity-30'}`} title="ספר החוקרים">
            📖
          </span>
        </div>
      </header>

      <main className="absolute inset-0 overflow-hidden">
        {/* 3D stage — fills the whole experience */}
        <div className="absolute inset-0 bg-background">
          {room5Active ? (
            <ZoomBookScene
              level={zLevel}
              onZoomIn={() => {
                const next = Math.min(zLevel + 1, ZOOM_LEVELS.length);
                setZLevel(next);
                setZMaxLevel((m) => Math.max(m, next));
              }}
              onZoomOut={() => setZLevel((l) => Math.max(1, l - 1))}
            />
          ) : room4Active ? (
            <FlashlightAnatomyScene
              explode={dExplode}
              selected={dSelected}
              onSelect={(id) => {
                setDSelected(id);
                setDDiscovered((p) => (p.includes(id) ? p : [...p, id]));
              }}
              battery={dBattery}
              lightOn={dLightOn}
            />
          ) : room3Active ? (
            <TransparencyScene
              transmission={activeSampleData?.transmission ?? 0}
              sampleName={activeSampleData?.name ?? 'דוגמה'}
              color={activeSampleData?.color ?? 0xbfe6ff}
              lightOn={lampOn}
            />
          ) : room2Active ? (
            <DarkBoxScene bent={bent} offset={offset} onSeen={setSeen} />
          ) : sceneActive ? (
            <LightLabScene
              objects={allItems}
              onInspect={(id) => setSelectedItemInfo(allItems.find((i) => i.id === id) ?? null)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
              אזור הניסוי ייפתח כשתיכנסו לתעלומה מהמפה
            </div>
          )}
        </div>


        {/* Tasks & questions live inside the 3D world as floating glass panels */}
        <div className="absolute z-20 top-[64px] bottom-0 left-0 w-full sm:w-[420px] lg:w-[500px] px-3 pb-4 pt-1 flex flex-col gap-3 overflow-y-auto hud-scroll">
          {gameState === 'room1' && (
            <>
              <div className="game-panel p-4 flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <p className="text-xs md:text-sm font-medium text-primary">
                    <span className="text-accent">{MYSTERIES[0].code}:</span> {MYSTERIES[0].guideIntro} סמנו לכל גוף אם
                    הוא <strong>מפיק אור</strong> או <strong>מחזיר אור</strong>, ואז לחצו על{' '}
                    <strong>"שלחו את המיון"</strong>.
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

              <HintBox hints={MYSTERIES[0].hints} mystery="mysteryA" attempts={attemptsA} />



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

                <div className="grid grid-cols-1 gap-3 pt-2">
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
              <p className="text-muted-foreground max-w-md text-sm">{MYSTERIES[0].rewardLine}</p>
              <p className="text-xs text-accent max-w-md">
                חלק מגבישי האור על מדשאת האור נדלקו מחדש. שתי תעלומות נותרו.
              </p>
              <button
                onClick={() => finishMystery('mysteryA', 'map')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-xl transition"
              >
                חזרה למפת האי 🗺️
              </button>
            </div>
          )}


          {gameState === 'room2' && (
            <div className="flex flex-col gap-4">
              <div className="game-panel p-4 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs md:text-sm font-medium text-primary">
                    <span className="text-accent">{MYSTERIES[1].code}:</span> הביטו דרך צינור החוקרים אל הנר שבתוך
                    התיבה האפלה. שנו את צורת הצינור וכוונו אותו מול חור התיבה — ובדקו מתי העין רואה את הלהבה.
                  </p>

                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border whitespace-nowrap ${
                      seen
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'bg-destructive/15 text-destructive border-destructive/40'
                    }`}
                  >
                    {seen ? '✔ רואים את להבת הנר' : '✖ חשוך — האור נחסם'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  הקו הצהוב בסצנה הוא קרן האור. שימו לב איפה היא נעצרת: בנקודה האדומה האור נחסם ולכן לא מגיע לעין.
                  התחזית שלכם הייתה: {prediction === 'yes' ? 'כן, נראה את הנר גם בצינור מכופף' : 'לא, לא נראה את הנר בצינור מכופף'}.
                </p>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className={`px-2 py-1 rounded-md border ${testedStraight ? 'bg-primary/15 text-primary border-primary/30' : 'bg-muted border-border text-muted-foreground'}`}>
                    {testedStraight ? '✔' : '1.'} בדקתם צינור ישר
                  </span>
                  <span className={`px-2 py-1 rounded-md border ${testedBent ? 'bg-primary/15 text-primary border-primary/30' : 'bg-muted border-border text-muted-foreground'}`}>
                    {testedBent ? '✔' : '2.'} בדקתם צינור מכופף
                  </span>
                  <span className={`px-2 py-1 rounded-md border ${testedStraight && testedBent ? 'bg-accent/15 text-accent border-accent/30' : 'bg-muted border-border text-muted-foreground'}`}>
                    3. שולחים מסקנה
                  </span>
                </div>
              </div>

              <HintBox hints={MYSTERIES[1].hints} mystery="mysteryB" attempts={room2Feedback && !room2Feedback.ok ? 1 : 0} />





              <div className="grid grid-cols-1 gap-3">
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
                  <h3 className="text-xs font-bold text-primary mt-2">2. כוונו את הצינור מול חור התיבה</h3>
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
                    <span className={Math.abs(offset) < 0.22 ? 'text-primary font-bold' : ''}>מול החור 🎯</span>
                    <span>הזזה ימינה</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    החור מסומן בטבעת זוהרת על דופן התיבה. אם הצינור לא מולו — האור פוגע בדופן ולא נכנס.
                  </p>
                </div>

                <div className="game-panel p-4 flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-primary">3. שלחו את המסקנה</h3>
                  {!(testedStraight && testedBent) ? (
                    <p className="text-xs text-muted-foreground">
                      כדי שהמסקנה תהיה מבוססת ניסוי — בדקו קודם גם צינור ישר וגם צינור מכופף. אז תיפתח שאלת המסקנה.
                    </p>
                  ) : (
                    <>
                      <p className="text-[11px] text-muted-foreground">מה מסביר בצורה הטובה ביותר את מה שראיתם?</p>
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
              <p className="text-muted-foreground max-w-md text-sm">{MYSTERIES[1].rewardLine}</p>
              <p className="text-xs text-muted-foreground max-w-md">{ROOM_2.narrative.peerCheck}</p>
              <button
                onClick={() => finishMystery('mysteryB', 'map')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-xl transition"
              >
                חזרה למפת האי 🗺️
              </button>
            </div>
          )}

          {gameState === 'room3' && (
            <div className="flex flex-col gap-4">
              <div className="game-panel p-4 flex flex-col gap-2">
                <p className="text-xs md:text-sm font-medium text-primary">
                  <span className="text-accent">{MYSTERIES[2].code}:</span> {ROOM_3.narrative.task}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  התחזית שלכם: הכי הרבה אור יעבור דרך <strong>{r3Prediction}</strong> • כלל אצבע: מעל 70% = שקוף,
                  15%–70% = מעביר אור חלקית, מתחת ל־15% = אטום.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLampOn((v) => !v)}
                    className={`text-xs py-1.5 px-3 rounded-lg border font-bold ${
                      lampOn
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-foreground border-border'
                    }`}
                  >
                    {lampOn ? '💡 המנורה דולקת — כבו' : '🌑 המנורה כבויה — הדליקו'}
                  </button>
                  <span className="text-[11px] text-muted-foreground">
                    נמדדו {measuredIds.length} מתוך {ROOM_3_SAMPLES.length} דוגמאות
                  </span>
                </div>
              </div>

              <HintBox hints={MYSTERIES[2].hints} mystery="mysteryC" attempts={attemptsC} />



              <div className="grid grid-cols-1 gap-3">
                <div className="game-panel p-4 flex flex-col gap-2">
                  <h3 className="text-xs font-bold text-primary">1. בחרו דוגמת חומר להצבה בקרן</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {ROOM_3_SAMPLES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setActiveSample(s.id);
                          if (lampOn) setMeasuredIds((p) => (p.includes(s.id) ? p : [...p, s.id]));
                        }}
                        className={`text-xs py-2 px-2 rounded-lg border font-medium flex items-center gap-1.5 justify-center ${
                          activeSample === s.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted border-border hover:bg-muted/70'
                        }`}
                      >
                        <span className="text-base">{s.icon}</span>
                        {s.name}
                        {measuredIds.includes(s.id) && <span>✔</span>}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    כשהמנורה דולקת, קראו את המדידה שמופיעה מעל המסך בסצנה — היא אומרת כמה אחוז מהאור עבר.
                  </p>
                </div>

                <div className="game-panel p-4 flex flex-col gap-2">
                  <h3 className="text-xs font-bold text-primary">2. מיינו כל חומר לקבוצה</h3>
                  {ROOM_3_SAMPLES.map((s) => {
                    const c = r3Choices[s.id];
                    const isWrong = r3Wrong.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center gap-2 border rounded-lg p-1.5 ${
                          isWrong ? 'border-destructive/60' : c ? 'border-primary/40' : 'border-border'
                        }`}
                      >
                        <span className="text-xs w-28 shrink-0">
                          {s.icon} {s.name}
                        </span>
                        <div className="flex gap-1 flex-1">
                          {(
                            [
                              ['transparent', 'שקוף'],
                              ['translucent', 'חלקית'],
                              ['opaque', 'אטום'],
                            ] as const
                          ).map(([k, lbl]) => (
                            <button
                              key={k}
                              onClick={() => {
                                setR3Choices((p) => ({ ...p, [s.id]: k }));
                                setR3Wrong((p) => p.filter((x) => x !== s.id));
                              }}
                              className={`flex-1 text-[11px] py-1 rounded-md border ${
                                c === k
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-muted border-border hover:bg-muted/70'
                              }`}
                            >
                              {lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <button
                    onClick={submitRoom3}
                    disabled={!canSubmitRoom3}
                    className="bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground font-bold py-2.5 rounded-xl transition mt-1"
                  >
                    שלחו את המיון ✅
                  </button>
                  {!canSubmitRoom3 && (
                    <span className="text-[11px] text-muted-foreground text-center">
                      מדדו את כל שש הדוגמאות וסמנו קבוצה לכל חומר כדי לשלוח.
                    </span>
                  )}
                  {room3Feedback && (
                    <span
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold border ${
                        room3Feedback.ok
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'bg-destructive/15 text-destructive border-destructive/30'
                      }`}
                    >
                      {room3Feedback.text}
                    </span>
                  )}
                </div>
              </div>

              {activeSampleData && (
                <div className="game-panel p-3 text-xs flex items-center gap-3">
                  <span className="text-xl">🔍</span>
                  <div>
                    <strong className="text-primary">
                      {activeSampleData.name} — {Math.round(activeSampleData.transmission * 100)}% מהאור עבר:
                    </strong>{' '}
                    {activeSampleData.realWorld}
                  </div>
                </div>
              )}
            </div>
          )}

          {gameState === 'room4' && (
            <div className="flex flex-col gap-3">
              <div className="game-panel p-4 flex flex-col gap-2">
                <p className="text-xs md:text-sm font-medium text-primary">
                  <span className="text-accent">{LAB_D.code}:</span> {LAB_D.name} — חקר בארבע שכבות.
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {['1. תצפית וחיזוי', '2. גילוי חלקים', '3. הסבר השרשרת', '4. יישום עד כישלון'].map((lbl, i) => (
                    <span
                      key={lbl}
                      className={`px-2 py-1 rounded-md border ${
                        dLayer > i + 1
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : dLayer === i + 1
                            ? 'bg-accent/15 text-accent border-accent/40 font-bold'
                            : 'bg-muted border-border text-muted-foreground'
                      }`}
                    >
                      {dLayer > i + 1 ? '✔ ' : ''}
                      {lbl}
                    </span>
                  ))}
                </div>
                {dFeedback && (
                  <span
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold border ${
                      dFeedback.ok
                        ? 'bg-primary/15 text-primary border-primary/30'
                        : 'bg-destructive/15 text-destructive border-destructive/30'
                    }`}
                  >
                    {dFeedback.text}
                  </span>
                )}
              </div>

              <HintBox hints={MYSTERIES[3].hints} mystery="mysteryD" attempts={dAttempts} />

              {/* layer 2 — investigate: lift a flap per part */}
              <div className="game-panel p-4 flex flex-col gap-2">
                <h3 className="text-xs font-bold text-primary">
                  שכבה 2 — גילוי: הרימו דש לכל חלק ({dDiscovered.length}/{FLASHLIGHT_PARTS.length})
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  לחצו על חלק בסצנה או על כרטיס כאן — ותקראו מה הוא עושה בפועל.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {FLASHLIGHT_PARTS.map((part) => {
                    const found = dDiscovered.includes(part.id);
                    return (
                      <button
                        key={part.id}
                        onClick={() => {
                          setDSelected(part.id);
                          setDDiscovered((prev) => (prev.includes(part.id) ? prev : [...prev, part.id]));
                          if (dExplode < 0.4) setDExplode(0.6);
                        }}
                        className={`text-right text-[11px] p-2 rounded-lg border transition ${
                          dSelected === part.id
                            ? 'bg-primary/20 border-primary text-primary'
                            : found
                              ? 'bg-primary/10 border-primary/40'
                              : 'bg-muted border-border hover:bg-muted/70'
                        }`}
                      >
                        <span className="font-bold">
                          {part.icon} {part.name}
                        </span>
                        <span className="block text-[10px] text-accent">{part.tag}</span>
                      </button>
                    );
                  })}
                </div>
                {dSelected && (
                  <div className="text-[11px] bg-muted/60 border border-border rounded-lg p-2 leading-relaxed">
                    {FLASHLIGHT_PARTS.find((x) => x.id === dSelected)?.role}
                  </div>
                )}
                <label className="text-[11px] text-muted-foreground mt-1">מחוון פירוק המערכת</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={dExplode}
                  onChange={(e) => setDExplode(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {/* layer 3 — explain: rebuild the cause-and-effect chain */}
              {dDiscovered.length === FLASHLIGHT_PARTS.length && (
                <div className="game-panel p-4 flex flex-col gap-2">
                  <h3 className="text-xs font-bold text-primary">שכבה 3 — הסבר: בנו את שרשרת הסיבה־תוצאה בסדר הנכון</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {dChain.map((id, i) => {
                      const part = FLASHLIGHT_PARTS.find((x) => x.id === id)!;
                      return (
                        <button
                          key={id}
                          onClick={() => toggleChain(id)}
                          className="text-[11px] px-2 py-1 rounded-md border bg-primary/15 border-primary/40 text-primary"
                        >
                          {i + 1}. {part.chainStep} ✕
                        </button>
                      );
                    })}
                    {dChain.length === 0 && (
                      <span className="text-[11px] text-muted-foreground">לחצו על השלבים למטה לפי הסדר.</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
                    {FLASHLIGHT_PARTS.filter((x) => !dChain.includes(x.id)).map((part) => (
                      <button
                        key={part.id}
                        onClick={() => toggleChain(part.id)}
                        className="text-[11px] px-2 py-1 rounded-md border bg-muted border-border hover:bg-muted/70"
                      >
                        {part.icon} {part.chainStep}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={submitChain}
                    disabled={dChain.length !== FLASHLIGHT_PARTS.length}
                    className="bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-bold py-2.5 rounded-xl transition"
                  >
                    שלחו את השרשרת ✅
                  </button>
                </div>
              )}

              {/* layer 4 — apply: wear the battery down until it fails */}
              {dChainOk && (
                <div className="game-panel p-4 flex flex-col gap-2">
                  <h3 className="text-xs font-bold text-primary">שכבה 4 — יישום: שחקו את הסוללה עד שהמערכת נכשלת</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDLightOn((v) => !v)}
                      className={`text-[11px] px-3 py-1.5 rounded-lg border font-bold ${
                        dLightOn ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border'
                      }`}
                    >
                      {dLightOn ? '🔘 מפסק דולק' : '🔘 מפסק כבוי'}
                    </button>
                    <span className="text-[11px] text-muted-foreground self-center">מצב סוללה: {dBattery}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={dBattery}
                    onChange={(e) => setDBattery(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    הורידו את מצב הסוללה והתבוננו בקרן על הקיר: קודם היא נחלשת ומהבהבת, ומתחת ל־15% הפנס נכבה לגמרי.
                  </p>
                  {dFailSeen ? (
                    <>
                      <p className="text-xs font-bold text-foreground">{LAB_D.failExplain.question}</p>
                      {LAB_D.failExplain.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => setDFailChoice(i)}
                          className={`text-right text-[11px] p-2 rounded-lg border transition ${
                            dFailChoice === i
                              ? 'bg-primary/20 border-primary text-primary font-bold'
                              : 'bg-muted border-border hover:bg-muted/70'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                      <button
                        onClick={submitFail}
                        disabled={dFailChoice === null}
                        className="bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-bold py-2.5 rounded-xl transition"
                      >
                        שלחו הסבר ✅
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-accent">
                      הורידו את הסוללה מתחת ל־15% כדי לראות את הכישלון — ואז תיפתח שאלת ההסבר.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {gameState === 'room5' && (
            <div className="flex flex-col gap-3">
              <div className="game-panel p-4 flex flex-col gap-2">
                <p className="text-xs md:text-sm font-medium text-primary">
                  <span className="text-accent">{LAB_E.code}:</span> {LAB_E.name} — לחצו על הנקודה הזוהרת בסצנה (או
                  גללו עם גלגל העכבר) כדי לצלול רמה פנימה.
                </p>
                <div className="flex items-center gap-1.5">
                  {ZOOM_LEVELS.map((l) => (
                    <button
                      key={l.level}
                      onClick={() => l.level <= zMaxLevel && setZLevel(l.level)}
                      className={`flex-1 h-2 rounded-full transition ${
                        l.level === zLevel ? 'bg-primary' : l.level <= zMaxLevel ? 'bg-primary/40' : 'bg-muted'
                      }`}
                      title={`רמה ${l.level}`}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  רמה {zLevel} מתוך {ZOOM_LEVELS.length} • {zoomData.scaleLabel}
                </span>
              </div>

              <div className="game-panel p-4 flex flex-col gap-2">
                <h3 className="text-sm font-bold text-primary">{zoomData.title}</h3>
                <p className="text-xs text-foreground leading-relaxed">{zoomData.text}</p>
                <div className="flex flex-col gap-1.5 pt-1 border-t border-border">
                  {zoomData.parts.map((part) => (
                    <div key={part.name} className="text-[11px] flex gap-2">
                      <span className="text-primary font-bold whitespace-nowrap">{part.name}</span>
                      <span className="text-muted-foreground">{part.note}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setZLevel((l) => Math.max(1, l - 1))}
                    disabled={zLevel === 1}
                    className="flex-1 text-[11px] py-2 rounded-lg border bg-muted border-border disabled:opacity-40"
                  >
                    ⬅️ רמה אחורה
                  </button>
                  <button
                    onClick={() => {
                      const next = Math.min(zLevel + 1, ZOOM_LEVELS.length);
                      setZLevel(next);
                      setZMaxLevel((m) => Math.max(m, next));
                    }}
                    disabled={zLevel === ZOOM_LEVELS.length}
                    className="flex-1 text-[11px] py-2 rounded-lg border bg-primary text-primary-foreground border-primary font-bold disabled:opacity-40"
                  >
                    {zoomData.hotspot}
                  </button>
                </div>
              </div>

              <HintBox hints={MYSTERIES[4].hints} mystery="mysteryE" attempts={zFeedback && !zFeedback.ok ? 1 : 0} />

              {zMaxLevel === ZOOM_LEVELS.length && (
                <div className="game-panel p-4 flex flex-col gap-2">
                  <h3 className="text-xs font-bold text-primary">סוגרים את הספר — שאלת סיכום</h3>
                  <p className="text-xs font-bold text-foreground">{LAB_E.finalQuestion.question}</p>
                  {LAB_E.finalQuestion.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setZAnswer(i)}
                      className={`text-right text-[11px] p-2 rounded-lg border transition ${
                        zAnswer === i
                          ? 'bg-primary/20 border-primary text-primary font-bold'
                          : 'bg-muted border-border hover:bg-muted/70'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                  <button
                    onClick={submitZoom}
                    disabled={zAnswer === null}
                    className="bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-bold py-2.5 rounded-xl transition"
                  >
                    שלחו תשובה ✅
                  </button>
                  {zFeedback && (
                    <span
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold border ${
                        zFeedback.ok
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'bg-destructive/15 text-destructive border-destructive/30'
                      }`}
                    >
                      {zFeedback.text}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Overlays */}
        {gameState === 'islandIntro' && <StoryIntro onDone={() => setGameState('modeSelect')} />}

        {gameState === 'modeSelect' && (
          <ModeSelect
            onDone={({ freeMode: fm, withQuizzes: wq }) => {
              setFreeMode(fm);
              setWithQuizzes(wq);
              logEvent('session_start', { freeMode: fm, withQuizzes: wq });
              setGameState(wq ? 'preTest' : 'map');
            }}
          />
        )}

        {gameState === 'preTest' && (
          <GuideQuiz
            items={PRE_TEST}
            heading="מבחן הכניסה של המועדון"
            intro="ארבע שאלות קצרות. חייבים לענות על כולן כדי להפליג לאי — אין ציון, רק נקודת פתיחה."
            logAs="gate_pre_answer"
            context="pre"
            ctaLabel="להפליג לאי"
            onDone={(res) => {
              logEvent('gate_pre_complete', {
                correct: res.filter((r) => r.correct).length,
                total: PRE_TEST.length,
              });
              setGameState('map');
            }}
          />
        )}

        {gameState === 'map' && (
          <IslandMap
            solved={solvedMysteries}
            tools={{ flashlight: hasFlashlight, tube: hasTube, lens: hasLens, kit: hasKit, book: hasBook }}
            onEnter={enterMystery}
            onFinish={() => setGameState('report')}
            freeMode={freeMode}
          />
        )}

        {gameState === 'report' && <ResearcherReport withQuiz={withQuizzes} />}

        {pulse && PULSE_CHECKS[pulse] && (
          <GuideQuiz
            items={[PULSE_CHECKS[pulse]]}
            heading="בדיקת דופק"
            logAs="pulse_answer"
            context={pulse}
            ctaLabel="חזרה לניסוי"
            onDone={() => {
              setPulseDone((p) => [...p, pulse]);
              setPulse(null);
              if (pulseNext) {
                setGameState(pulseNext);
                setPulseNext(null);
              }
            }}
          />
        )}



        {gameState === 'pathSelect' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 backdrop-blur p-6">
            <div className="max-w-xl game-panel p-8 text-center flex flex-col gap-6">
              <div className="text-3xl">🧭</div>
              <h2 className="text-xl font-bold text-primary">בחרו את מסלול החקר שלכם</h2>
              <p className="text-muted-foreground text-sm">
                שומר האי מאפשר לכם לבחור באיזה סוג גופים להתחיל לחקור קודם:
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

        {gameState === 'room3Intro' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 backdrop-blur p-6">
            <div className="max-w-xl game-panel p-8 text-center flex flex-col gap-5">
              <div className="text-4xl">🔬</div>
              <h2 className="text-xl font-bold text-primary">{ROOM_3.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{ROOM_3.narrative.intro}</p>
              <p className="text-sm font-bold text-foreground">
                חזו לפני הניסוי: דרך איזה חומר יעבור הכי הרבה אור?
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[ROOM_3_SAMPLES[0], ROOM_3_SAMPLES[2], ROOM_3_SAMPLES[4]].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setR3Prediction(s.name);
                      setGameState('room3');
                    }}
                    className="bg-muted hover:bg-muted/70 border border-border p-3 rounded-xl text-xs font-bold flex flex-col gap-1 items-center"
                  >
                    <span className="text-2xl">{s.icon}</span>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {gameState === 'room3Done' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 backdrop-blur p-6">
            <div className="max-w-xl game-panel p-8 text-center flex flex-col gap-5">
              <div className="text-5xl animate-bounce">{ROOM_3.reward?.icon}</div>
              <h2 className="text-2xl font-bold text-primary">קיבלתם את {ROOM_3.reward?.name}!</h2>
              <p className="text-sm text-foreground">{MYSTERIES[2].rewardLine}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{ROOM_3.narrative.peerCheck}</p>
              <button
                onClick={() => finishMystery('mysteryC', 'report')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-xl transition"
              >
                להדליק את מדשאת האור ולהגיש דו"ח 📋
              </button>
            </div>
          </div>
        )}


        {gameState === 'room4Intro' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 backdrop-blur p-6">
            <div className="max-w-xl game-panel p-8 text-center flex flex-col gap-5">
              <div className="text-4xl">{LAB_D.icon}</div>
              <h2 className="text-xl font-bold text-primary">{LAB_D.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{LAB_D.guideIntro}</p>
              <p className="text-sm font-bold text-foreground">{LAB_D.predictQuestion}</p>
              <div className="grid grid-cols-2 gap-2">
                {LAB_D.predictOptions.map((opt, i) => (
                  <button
                    key={opt.label}
                    onClick={() => {
                      setD4Predict(i);
                      setDFeedback({ text: opt.why, ok: opt.ok });
                      logEvent('mystery_attempt', { mystery: 'mysteryD', stage: 'predict', correct: opt.ok });
                      setGameState('room4');
                    }}
                    className="bg-muted hover:bg-muted/70 border border-border p-3 rounded-xl text-xs font-bold"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">שכבה 1 — תצפית וחיזוי: אין ציון, רק התחייבות להשערה.</span>
            </div>
          </div>
        )}

        {gameState === 'room4Done' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 backdrop-blur p-6">
            <div className="max-w-xl game-panel p-8 text-center flex flex-col gap-5">
              <div className="text-5xl animate-bounce">{LAB_D.reward.icon}</div>
              <h2 className="text-2xl font-bold text-primary">קיבלתם את {LAB_D.reward.name}!</h2>
              <p className="text-sm text-foreground">{LAB_D.rewardLine}</p>
              <button
                onClick={() => finishMystery('mysteryD', 'map')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-xl transition"
              >
                חזרה למפת האי 🗺️
              </button>
            </div>
          </div>
        )}

        {gameState === 'room5Intro' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 backdrop-blur p-6">
            <div className="max-w-xl game-panel p-8 text-center flex flex-col gap-5">
              <div className="text-4xl">{LAB_E.icon}</div>
              <h2 className="text-xl font-bold text-primary">{LAB_E.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{LAB_E.guideIntro}</p>
              <p className="text-[11px] text-accent">
                שש רמות: אי → מדשאה → גוף → משטח → קרן → עין. לחיצה על הנקודה הזוהרת מקרבת רמה אחת.
              </p>
              <button
                onClick={() => setGameState('room5')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-xl transition"
              >
                לפתוח את ספר הזום 🔎
              </button>
            </div>
          </div>
        )}

        {gameState === 'room5Done' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 backdrop-blur p-6">
            <div className="max-w-xl game-panel p-8 text-center flex flex-col gap-5">
              <div className="text-5xl animate-bounce">{LAB_E.reward.icon}</div>
              <h2 className="text-2xl font-bold text-primary">קיבלתם את {LAB_E.reward.name}!</h2>
              <p className="text-sm text-foreground">{LAB_E.rewardLine}</p>
              <button
                onClick={() => finishMystery('mysteryE', 'map')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 rounded-xl transition"
              >
                חזרה למפת האי 🗺️
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default LightMazeGame;

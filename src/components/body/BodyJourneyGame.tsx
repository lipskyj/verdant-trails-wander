import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BODY,
  BODY_PRE_TEST,
  BODY_PULSE,
  JOURNEY_CHAIN,
  STATIONS,
  type StationMeta,
} from '@/content/body';
import { logEvent, setPackId } from '@/lib/eventLog';
import GuideQuiz from '../island/GuideQuiz';
import HintBox from '../island/HintBox';
import BodyStoryIntro from './BodyStoryIntro';
import BodyModeSelect, { type BodyPrefs } from './BodyModeSelect';
import BodyMap from './BodyMap';
import BodyReport from './BodyReport';
import MouthScene, { type ToothType } from './MouthScene';
import EsophagusScene from './EsophagusScene';
import StomachScene from './StomachScene';
import IntestineZoomScene from './IntestineZoomScene';
import ColonScene from './ColonScene';
import SceneMeta from '../SceneMeta';

type Phase = 'intro' | 'modeSelect' | 'preTest' | 'map' | 'station' | 'report';
type Slug = StationMeta['slug'];

const FOODS = ['פרוסת לחם', 'חתיכת גבינה', 'פרוסת תפוח'];

/** מסע המזון — מנוע התחנות: סצנה תלת־ממדית במסך מלא ולוחות משימה צפים. */
const BodyJourneyGame: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [prefs, setPrefs] = useState<BodyPrefs>({ freeMode: false, withQuizzes: true });
  const [station, setStation] = useState<Slug>('mouth');
  const [solved, setSolved] = useState<Slug[]>([]);
  const [tools, setTools] = useState<Record<string, boolean>>({});
  const [pulse, setPulse] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [predicted, setPredicted] = useState(false);

  // ----- מצב תחנה א' (פה)
  const [tooth, setTooth] = useState<ToothType | null>(null);
  const [saliva, setSaliva] = useState(false);
  const [chewTick, setChewTick] = useState(0);
  const [breakdown, setBreakdown] = useState(0);

  // ----- מצב תחנה ב' (ושט)
  const [tilt, setTilt] = useState(0);
  const [muscleOn, setMuscleOn] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testedInverted, setTestedInverted] = useState(false);

  // ----- מצב תחנה ג' (קיבה)
  const [churn, setChurn] = useState(0.4);
  const [acid, setAcid] = useState(0.4);
  const [mucus, setMucus] = useState(true);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [digest, setDigest] = useState(0);
  const [foodIdx, setFoodIdx] = useState(0);

  // ----- מצב תחנה ד' (מעי דק)
  const [level, setLevel] = useState(0);
  const [villi, setVilli] = useState(false);
  const [comparedBoth, setComparedBoth] = useState(false);

  // ----- מצב תחנה ה' (מעי גס)
  const [water, setWater] = useState(0.15);
  const [chain, setChain] = useState<string[]>([]);

  const meta = STATIONS.find((s) => s.slug === station)!;

  // --- לולאת סימולציה קצרה לכל התחנות שמודדות זמן
  const raf = useRef<number>();
  const tries = useRef(0);
  // tag this session's analytics with the content pack it belongs to
  useEffect(() => setPackId('digestion-v1'), []);
  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (phase === 'station') {
        if (station === 'esophagus' && muscleOn) {
          setProgress((p) => (p >= 1 ? 0 : Math.min(1, p + dt * 0.22)));
        }
        if (station === 'stomach' && running) {
          setSeconds((s) => s + dt);
          const rate = 0.02 + churn * 0.09 + acid * 0.14 + churn * acid * 0.16;
          setDigest((d) => Math.min(1, d + dt * rate));
        }
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [phase, station, muscleOn, running, churn, acid]);

  useEffect(() => {
    if (station === 'esophagus' && Math.abs(tilt) > 100 && muscleOn) setTestedInverted(true);
  }, [tilt, muscleOn, station]);

  useEffect(() => {
    if (station === 'smallIntestine' && level >= 2 && villi) setComparedBoth(true);
  }, [level, villi, station]);

  const chew = () => {
    setChewTick((c) => c + 1);
    const gain = (tooth === 'molar' ? 0.16 : tooth === 'canine' ? 0.1 : tooth === 'incisor' ? 0.07 : 0.02) + (saliva ? 0.06 : 0);
    setBreakdown((b) => Math.min(1, b + gain));
    logEvent('mystery_attempt', { mystery: station, attempt: ++tries.current, correct: true, detail: { unit: 'digestive', tooth, saliva } });
  };

  const enter = (slug: Slug) => {
    setStation(slug);
    setPhase('station');
    setPredicted(false);
    setFeedback(null);
    setAttempts(0);
    logEvent('mystery_start', { unit: 'digestive', station: slug });
  };

  const solve = () => {
    if (!solved.includes(station)) setSolved((p) => [...p, station]);
    setTools((t) => ({ ...t, [meta.toolKey]: true }));
    logEvent('mystery_complete', { unit: 'digestive', station, attempts });
    const key = `${station === 'smallIntestine' ? 'small' : station === 'colon' ? 'colon' : station}_end`;
    if (prefs.withQuizzes && BODY_PULSE[key]) setPulse(key);
    else setPhase('map');
  };

  const wrong = (msg: string) => {
    setAttempts((a) => a + 1);
    setFeedback({ text: msg, ok: false });
    logEvent('mystery_attempt', { mystery: station, attempt: ++tries.current, correct: false, detail: { unit: 'digestive' } });
  };

  // ---------- שכבות המסך ----------
  if (phase === 'intro') return <div className="relative w-full h-screen overflow-hidden"><BodyStoryIntro onDone={() => setPhase('modeSelect')} /></div>;

  if (phase === 'modeSelect')
    return (
      <div className="relative w-full h-screen overflow-hidden">
        <BodyModeSelect
          onDone={(p) => {
            setPrefs(p);
            logEvent('session_start', { unit: 'digestive', ...p });
            setPhase(p.withQuizzes ? 'preTest' : 'map');
          }}
        />
      </div>
    );

  if (phase === 'preTest')
    return (
      <div className="relative w-full h-screen overflow-hidden">
        <GuideQuiz
          items={BODY_PRE_TEST}
          heading="שאלון הכניסה למעבדה"
          intro="ארבע שאלות קצרות, רק כדי לדעת מאיפה מתחילים."
          logAs="gate_pre_answer"
          context="body-pre"
          ctaLabel="למפת הגוף"
          guideName={BODY.guideName}
          guideIcon={BODY.guideIcon}
          onDone={() => {
            logEvent('gate_pre_complete', { unit: 'digestive' });
            setPhase('map');
          }}
        />
      </div>
    );

  if (phase === 'report')
    return (
      <div className="relative w-full h-screen overflow-hidden">
        <BodyReport withQuiz={prefs.withQuizzes} />
      </div>
    );

  if (phase === 'map')
    return (
      <div className="relative w-full h-screen overflow-hidden">
        <BodyMap
          solved={solved}
          onEnter={enter}
          tools={tools}
          freeMode={prefs.freeMode}
          onFinish={() => setPhase('report')}
        />
      </div>
    );

  // ---------- תחנה פעילה ----------
  const scene =
    station === 'mouth' ? (
      <MouthScene tooth={tooth} saliva={saliva} breakdown={breakdown} chewTick={chewTick} />
    ) : station === 'esophagus' ? (
      <EsophagusScene tilt={tilt} muscleOn={muscleOn} progress={progress} />
    ) : station === 'stomach' ? (
      <StomachScene
        churn={churn}
        acid={acid}
        breakdown={digest}
        running={running}
        foodName={FOODS[foodIdx]}
        mucus={mucus}
        seconds={seconds}
      />
    ) : station === 'smallIntestine' ? (
      <IntestineZoomScene level={level} villi={villi} absorption={villi ? 0.85 : 0.25} />
    ) : (
      <ColonScene water={water} running />
    );

  const btn =
    'text-[11px] px-3 py-1.5 rounded-lg border font-bold transition hover:-translate-y-0.5';
  const on = 'bg-primary/20 border-primary text-primary';
  const off = 'bg-muted border-border text-muted-foreground hover:bg-muted/70';

  const controls = () => {
    if (station === 'mouth')
      return (
        <>
          <div className="flex flex-wrap gap-1.5">
            {(['incisor', 'canine', 'molar'] as ToothType[]).map((k) => (
              <button key={k} onClick={() => setTooth(k)} className={`${btn} ${tooth === k ? on : off}`}>
                {k === 'incisor' ? 'חותכות' : k === 'canine' ? 'ניבים' : 'טוחנות'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setSaliva((s) => !s)} className={`${btn} ${saliva ? on : off}`}>
              רוק {saliva ? 'פעיל' : 'כבוי'}
            </button>
            <button onClick={chew} disabled={!tooth} className={`${btn} ${tooth ? on : off} disabled:opacity-40`}>
              ללעוס פעם אחת
            </button>
            <button onClick={() => { setBreakdown(0); setChewTick((c) => c + 1); }} className={`${btn} ${off}`}>
              לאתחל ביס
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">מדד פירוק: {Math.round(breakdown * 100)}%</p>
        </>
      );

    if (station === 'esophagus')
      return (
        <>
          <label className="text-[11px] text-muted-foreground flex flex-col gap-1">
            זווית הוושט: {tilt}°
            <input type="range" min={-30} max={180} value={tilt} onChange={(e) => setTilt(Number(e.target.value))} />
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setMuscleOn((m) => !m)} className={`${btn} ${muscleOn ? on : off}`}>
              שרירי הוושט {muscleOn ? 'פועלים' : 'כבויים'}
            </button>
            <button onClick={() => setProgress(0)} className={`${btn} ${off}`}>
              להחזיר ביס לפה
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {testedInverted ? 'בדקתם גם ושט הפוך — מעולה.' : 'נסו גם זווית מעל 100° (הפוך) עם שריר פעיל.'}
          </p>
        </>
      );

    if (station === 'stomach')
      return (
        <>
          <label className="text-[11px] text-muted-foreground flex flex-col gap-1">
            ערבול שרירים: {Math.round(churn * 100)}%
            <input type="range" min={0} max={100} value={churn * 100} onChange={(e) => setChurn(Number(e.target.value) / 100)} />
          </label>
          <label className="text-[11px] text-muted-foreground flex flex-col gap-1">
            חומציות מיץ הקיבה: {Math.round(acid * 100)}%
            <input type="range" min={0} max={100} value={acid * 100} onChange={(e) => setAcid(Number(e.target.value) / 100)} />
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setRunning((r) => !r)} className={`${btn} ${running ? on : off}`}>
              {running ? 'עצירת שעון' : 'הפעלת שעון עצר'}
            </button>
            <button onClick={() => { setDigest(0); setSeconds(0); setRunning(false); }} className={`${btn} ${off}`}>
              ניסוי חדש
            </button>
            <button onClick={() => setFoodIdx((i) => (i + 1) % FOODS.length)} className={`${btn} ${off}`}>
              מזון: {FOODS[foodIdx]}
            </button>
            <button onClick={() => setMucus((m) => !m)} className={`${btn} ${mucus ? on : off}`}>
              ריר מגן {mucus ? 'קיים' : 'הוסר'}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            פירוק {Math.round(digest * 100)}% • {seconds.toFixed(1)} שנ'
          </p>
        </>
      );

    if (station === 'smallIntestine')
      return (
        <>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setLevel((l) => Math.min(3, l + 1))} className={`${btn} ${on}`}>
              להתקרב פנימה
            </button>
            <button onClick={() => setLevel((l) => Math.max(0, l - 1))} className={`${btn} ${off}`}>
              להתרחק
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setVilli(false)} className={`${btn} ${!villi ? on : off}`}>
              צינור חלק
            </button>
            <button onClick={() => setVilli(true)} className={`${btn} ${villi ? on : off}`}>
              צינור עם סיסים
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            רמת התקרבות {level + 1}/4 • {comparedBoth ? 'השוויתם את שני הצינורות.' : 'התקרבו לרמת הסיסים והשוו בין הצינורות.'}
          </p>
        </>
      );

    return (
      <>
        <label className="text-[11px] text-muted-foreground flex flex-col gap-1">
          ספיגת מים בדופן: {Math.round(water * 100)}%
          <input type="range" min={0} max={100} value={water * 100} onChange={(e) => setWater(Number(e.target.value) / 100)} />
        </label>
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-bold text-foreground">סדרו את מסע המזון:</p>
          <div className="flex flex-wrap gap-1.5">
            {JOURNEY_CHAIN.map((o) => (
              <button
                key={o}
                disabled={chain.includes(o)}
                onClick={() => setChain((c) => [...c, o])}
                className={`${btn} ${chain.includes(o) ? on : off} disabled:opacity-40`}
              >
                {o}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-accent min-h-4">{chain.join(' ← ')}</p>
          {chain.length > 0 && (
            <button onClick={() => setChain([])} className={`${btn} ${off} self-start`}>
              לאפס שרשרת
            </button>
          )}
        </div>
      </>
    );
  };

  const canSubmit =
    station === 'mouth'
      ? breakdown > 0.75 && saliva
      : station === 'esophagus'
        ? testedInverted
        : station === 'stomach'
          ? digest > 0.9
          : station === 'smallIntestine'
            ? comparedBoth
            : water >= 0.3 && water <= 0.8 && chain.length === JOURNEY_CHAIN.length;

  const submit = () => {
    if (station === 'colon' && chain.join('|') !== JOURNEY_CHAIN.join('|')) {
      wrong('סדר המסע לא נכון — נסו שוב: איפה מתחיל הביס ולאן ממשיך?');
      setChain([]);
      return;
    }
    setFeedback({ text: meta.rewardLine, ok: true });
    setTimeout(solve, 900);
  };

  const missing =
    station === 'mouth'
      ? 'הגיעו למדד פירוק מעל 75% עם רוק פעיל.'
      : station === 'esophagus'
        ? 'בדקו את הוושט גם בזווית הפוכה עם שריר פעיל.'
        : station === 'stomach'
          ? 'הריצו את הניסוי עד פירוק של 90% ומעלה.'
          : station === 'smallIntestine'
            ? 'התקרבו עד רמת הסיסים והשוו בין שני הצינורות.'
            : 'מצאו ספיגת מים מאוזנת וסדרו את כל חמש התחנות.';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background" dir="rtl">
      <div className="absolute inset-0">{scene}</div>

      <SceneMeta
        representation="schematic"
        scaleNote={
          station === 'smallIntestine'
            ? 'המעי והסיסים מוגדלים בהרבה — כדי לראות מבנה שבמציאות הוא במילימטרים.'
            : 'האיברים מוצגים בהגדלה ובחיתוך, לא בגודלם או במקומם המדויק בגוף.'
        }
        keyboardHint="חצים לסיבוב, פלוס ומינוס לזום"
      />

      {/* לוח המשימה הצף */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-3 right-3 bottom-3 w-[330px] max-w-[86vw] flex flex-col gap-2.5 overflow-y-auto hud-scroll pe-1"
      >
        <div className="game-panel p-3.5 flex flex-col gap-2 text-right">
          <div className="flex items-center gap-2">
            <button onClick={() => setPhase('map')} className={`${btn} ${off}`}>
              למפה
            </button>
            <span className="ms-auto text-[11px] text-accent">{meta.code}</span>
          </div>
          <h2 className="text-base font-bold text-primary leading-tight">{meta.name}</h2>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{meta.guideIntro}</p>
        </div>

        {!predicted ? (
          <div className="game-panel p-3.5 flex flex-col gap-2 text-right">
            <p className="text-[11px] font-bold text-accent">שלב 1 — צפייה ושיערוך</p>
            <p className="text-xs text-foreground leading-relaxed">{meta.layers.observe}</p>
            <button
              onClick={() => {
                setPredicted(true);
                logEvent('pulse_answer', { unit: 'digestive', station, step: 'predict' });
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold py-2 rounded-xl transition"
            >
              שיערתי — לניסוי
            </button>
          </div>
        ) : (
          <>
            <div className="game-panel p-3.5 flex flex-col gap-2 text-right">
              <p className="text-[11px] font-bold text-accent">שלב 2 — חקירה</p>
              <p className="text-xs text-foreground leading-relaxed">{meta.layers.investigate}</p>
              {controls()}
            </div>

            <div className="game-panel p-3.5 flex flex-col gap-2 text-right">
              <p className="text-[11px] font-bold text-accent">שלב 3 — הסבר ויישום</p>
              <p className="text-xs text-foreground leading-relaxed">{meta.layers.explain}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{meta.layers.apply}</p>
              <button
                onClick={() => (canSubmit ? submit() : wrong(missing))}
                className={`text-xs font-bold py-2 rounded-xl transition ${
                  canSubmit
                    ? 'bg-accent hover:bg-accent/90 text-accent-foreground'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                להגיש את מסקנת התחנה
              </button>
              {feedback && (
                <span
                  className={`text-[11px] px-3 py-2 rounded-lg font-bold border ${
                    feedback.ok
                      ? 'bg-primary/15 text-primary border-primary/30'
                      : 'bg-destructive/15 text-destructive border-destructive/30'
                  }`}
                >
                  {feedback.text}
                </span>
              )}
            </div>
          </>
        )}

        <HintBox
          hints={meta.hints}
          mystery={station}
          attempts={attempts}
          guideName={BODY.guideName}
          guideIcon={BODY.guideIcon}
        />
      </motion.div>

      {pulse && BODY_PULSE[pulse] && (
        <GuideQuiz
          items={[BODY_PULSE[pulse]]}
          heading="בדיקת דופק"
          logAs="pulse_answer"
          context={`body-${station}`}
          ctaLabel="למפת הגוף"
          guideName={BODY.guideName}
          guideIcon={BODY.guideIcon}
          onDone={() => {
            setPulse(null);
            setPhase('map');
          }}
        />
      )}
    </div>
  );
};

export default BodyJourneyGame;

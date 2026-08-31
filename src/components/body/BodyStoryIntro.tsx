import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BODY, STATIONS } from '@/content/body';
import BodyCanvas from './BodyCanvas';

interface Props {
  onDone: () => void;
}

interface Beat {
  tag: string;
  title: string;
  body: string;
  speaker?: string;
  cta: string;
}

const BEATS: Beat[] = [
  {
    tag: 'קריאה דחופה',
    title: 'מסע המזון',
    body: BODY.distressCall,
    cta: 'מי קורא לנו?',
  },
  {
    tag: 'הדמות המלווה',
    title: 'המעבדה הזעירה',
    body: BODY.guideWelcome,
    speaker: BODY.guideName,
    cta: 'מה המשימה?',
  },
  {
    tag: 'המשימה',
    title: BODY.mission,
    body: `חמש תחנות מחכות לכם לאורך מסע המזון: ${STATIONS.map((s) => s.organ).join(
      ', '
    )}. בכל תחנה תצפו, תשערו, תבדקו ותסבירו — וכל פיצוח מאיר איבר נוסף על מפת הגוף.`,
    cta: 'לשאלון הכניסה',
  },
];

const BodyStoryIntro: React.FC<Props> = ({ onDone }) => {
  const [i, setI] = React.useState(0);
  const beat = BEATS[i];
  const next = () => (i < BEATS.length - 1 ? setI(i + 1) : onDone());

  return (
    <div className="absolute inset-0 z-40 overflow-hidden bg-background" dir="rtl">
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.15, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2.4, ease: 'easeOut' }}
      >
        <BodyCanvas lit={0} total={5} className="w-full h-full object-cover" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-l from-background via-background/80 to-background/20" />

      {/* חלקיקי מזון זעירים */}
      {Array.from({ length: 12 }).map((_, k) => (
        <motion.span
          key={k}
          className="absolute w-1.5 h-1.5 rounded-full bg-accent/60"
          style={{ left: `${10 + ((k * 41) % 80)}%`, top: `${14 + ((k * 57) % 72)}%` }}
          animate={{ y: [0, 24, 0], opacity: [0, 0.85, 0] }}
          transition={{ duration: 5 + (k % 4), repeat: Infinity, delay: k * 0.45 }}
        />
      ))}

      <div className="relative h-full w-full flex items-center">
        <div className="w-full max-w-2xl px-6 md:px-14 text-right">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-4"
            >
              <span className="text-[11px] tracking-[0.3em] text-accent">
                {BODY.clubName} — {beat.tag}
              </span>
              <h1 className="text-3xl md:text-5xl font-bold text-primary leading-tight">{beat.title}</h1>
              {beat.speaker && <p className="text-xs text-accent">{beat.speaker} מדברת אליכם:</p>}
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{beat.body}</p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={next}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-8 rounded-xl transition hover:-translate-y-0.5"
            >
              {beat.cta}
            </button>
            {i < BEATS.length - 1 && (
              <button onClick={onDone} className="text-xs text-muted-foreground hover:text-foreground transition">
                לדלג על הסיפור
              </button>
            )}
            <div className="ms-auto flex gap-1.5">
              {BEATS.map((_, k) => (
                <span
                  key={k}
                  className={`h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-accent' : 'w-1.5 bg-muted'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BodyStoryIntro;

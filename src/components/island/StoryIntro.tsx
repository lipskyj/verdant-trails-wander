import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ISLAND } from '@/content/island';
import IslandCanvas from './IslandCanvas';

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
    tag: 'קריאת מצוקה',
    title: 'אי התעלומות',
    body: ISLAND.distressCall,
    cta: 'מי קורא לנו?',
  },
  {
    tag: 'הדמות המלווה',
    title: 'שומר האי הצעיר',
    body: ISLAND.guideWelcome,
    speaker: ISLAND.guideName,
    cta: 'מה המשימה?',
  },
  {
    tag: 'המשימה',
    title: ISLAND.mission,
    body: 'חמש תעלומות אור מחכות במדשאה: מי מדליק ומי רק מחזיר אור, לאן האור מתקדם, מה עוצר אותו, איך פנס בנוי מבפנים, ומה קורה לאור מהשמש ועד לעין. בכל תעלומה תצפו, תשערו, תבדקו ותסבירו — וכל פיצוח מחזיר עוד אור לאי.',
    cta: 'למבחן הכניסה של המועדון',
  },
];

const StoryIntro: React.FC<Props> = ({ onDone }) => {
  const [i, setI] = React.useState(0);
  const beat = BEATS[i];
  const next = () => (i < BEATS.length - 1 ? setI(i + 1) : onDone());

  return (
    <div className="absolute inset-0 z-40 overflow-hidden bg-background" dir="rtl">
      {/* רקע קינמטי */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.15, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2.4, ease: 'easeOut' }}
      >
        <IslandCanvas lit={0} total={5} className="w-full h-full object-cover" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-l from-background via-background/80 to-background/20" />

      {/* חלקיקי אור */}
      {Array.from({ length: 14 }).map((_, k) => (
        <motion.span
          key={k}
          className="absolute w-1 h-1 rounded-full bg-accent/70"
          style={{ left: `${8 + ((k * 37) % 84)}%`, top: `${12 + ((k * 53) % 76)}%` }}
          animate={{ y: [0, -22, 0], opacity: [0, 0.9, 0] }}
          transition={{ duration: 5 + (k % 5), repeat: Infinity, delay: k * 0.4 }}
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
                {ISLAND.clubName} — {beat.tag}
              </span>
              <h1 className="text-3xl md:text-5xl font-bold text-primary leading-tight">{beat.title}</h1>
              {beat.speaker && <p className="text-xs text-accent">{beat.speaker} מדבר אליכם:</p>}
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

export default StoryIntro;

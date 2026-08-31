import React from 'react';
import { motion } from 'framer-motion';
import { ISLAND } from '@/content/island';

export interface IslandPrefs {
  freeMode: boolean; // כל התעלומות פתוחות, בקצב ובסדר של החוקר
  withQuizzes: boolean; // שאלות לפני, בתוך ואחרי התעלומות
}

interface Props {
  onDone: (prefs: IslandPrefs) => void;
}

const CARD =
  'text-right rounded-2xl border p-4 transition-all backdrop-blur-md hover:-translate-y-0.5 focus:outline-none';

const ModeSelect: React.FC<Props> = ({ onDone }) => {
  const [freeMode, setFreeMode] = React.useState<boolean | null>(null);
  const [withQuizzes, setWithQuizzes] = React.useState<boolean | null>(null);
  const ready = freeMode !== null && withQuizzes !== null;

  const option = (
    active: boolean,
    title: string,
    body: string,
    onClick: () => void,
    key: string
  ) => (
    <button
      key={key}
      onClick={onClick}
      className={`${CARD} ${
        active
          ? 'border-accent bg-accent/15 shadow-[0_0_28px_hsl(var(--accent)/0.25)]'
          : 'border-border/70 bg-background/50 hover:border-primary/60'
      }`}
    >
      <p className={`text-sm font-bold ${active ? 'text-accent' : 'text-foreground'}`}>{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed mt-1">{body}</p>
    </button>
  );

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/92 backdrop-blur p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="game-panel w-full max-w-2xl p-6 flex flex-col gap-6 text-right"
      >
        <div className="flex flex-col gap-1">
          <span className="text-[11px] tracking-[0.3em] text-accent">{ISLAND.clubName}</span>
          <h2 className="text-xl font-bold text-primary">איך תרצו לחקור את האי?</h2>
          <p className="text-xs text-muted-foreground">
            אפשר לבחור עכשיו — ותמיד אפשר לשנות בהמשך מהמפה.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-foreground">1. סדר וקצב התעלומות</p>
          <div className="grid md:grid-cols-2 gap-3">
            {option(
              freeMode === true,
              'חקר חופשי — כל הניסויים פתוחים',
              'כל חמש התעלומות זמינות מיד. נכנסים לכל ניסוי בכל סדר, בקצב שלכם.',
              () => setFreeMode(true),
              'free'
            )}
            {option(
              freeMode === false,
              'מסלול מודרך — תעלומה אחרי תעלומה',
              'שומר האי פותח תעלומה בכל פעם, לפי סדר הסיפור, ומעניק כלי בכל פיצוח.',
              () => setFreeMode(false),
              'guided'
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-foreground">2. שאלות לפני ואחרי</p>
          <div className="grid md:grid-cols-2 gap-3">
            {option(
              withQuizzes === true,
              'כן — עם שאלות',
              'מבחן כניסה קצר, בדיקות דופק בתוך התעלומות ודו"ח חוקר בסיום.',
              () => setWithQuizzes(true),
              'quiz'
            )}
            {option(
              withQuizzes === false,
              'לא — רק לשחק ולהתנסות',
              'בלי שאלונים. נכנסים ישר לניסויים התלת־ממדיים ומתנסים בחופשיות.',
              () => setWithQuizzes(false),
              'noquiz'
            )}
          </div>
        </div>

        <button
          disabled={!ready}
          onClick={() => ready && onDone({ freeMode: freeMode!, withQuizzes: withQuizzes! })}
          className="self-start bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:hover:bg-primary text-primary-foreground font-bold py-3 px-8 rounded-xl transition"
        >
          {ready ? 'להתחיל לחקור' : 'בחרו את שתי ההעדפות'}
        </button>
      </motion.div>
    </div>
  );
};

export default ModeSelect;

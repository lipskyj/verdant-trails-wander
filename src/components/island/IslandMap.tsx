import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ISLAND, ISLAND_ZONES, MYSTERIES } from '@/content/island';
import IslandCanvas from './IslandCanvas';

interface Props {
  solved: string[]; // mystery slugs already solved
  onEnter: (slug: string) => void;
  tools: { flashlight: boolean; tube: boolean; lens: boolean; kit?: boolean; book?: boolean };
  onFinish?: () => void;
}

/** מיקומי התעלומות על גוף האי (באחוזים מתוך מסגרת המפה) */
const NODES: Record<string, { x: number; y: number }> = {
  mysteryA: { x: 27, y: 40 },
  mysteryB: { x: 40, y: 26 },
  mysteryC: { x: 53, y: 40 },
  mysteryD: { x: 66, y: 28 },
  mysteryE: { x: 63, y: 55 },
};

const TOOL_LABELS: { key: keyof Props['tools']; name: string }[] = [
  { key: 'flashlight', name: 'פנס' },
  { key: 'tube', name: 'צינור' },
  { key: 'lens', name: 'עדשה' },
  { key: 'kit', name: 'ערכת פירוק' },
  { key: 'book', name: 'ספר הזום' },
];

const IslandMap: React.FC<Props> = ({ solved, onEnter, tools, onFinish }) => {
  const nextMystery = MYSTERIES.find((m) => !solved.includes(m.slug));
  const allSolved = !nextMystery;
  const [hover, setHover] = React.useState<string | null>(null);
  const hovered = MYSTERIES.find((m) => m.slug === hover) ?? nextMystery;

  const trail = MYSTERIES.map((m) => NODES[m.slug]).filter(Boolean);
  const trailPath = trail.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-30 overflow-y-auto hud-scroll bg-background/95 backdrop-blur-md"
      dir="rtl"
    >
      <div className="min-h-full w-full max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-5 text-right">
        {/* כותרת */}
        <motion.header
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-wrap items-end gap-x-6 gap-y-3"
        >
          <div>
            <p className="text-[11px] tracking-[0.25em] text-accent">{ISLAND.clubName}</p>
            <h2 className="text-2xl md:text-3xl font-bold text-primary leading-tight">מפת {ISLAND.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              משימה נוכחית: {ISLAND.mission} — {solved.length} מתוך {MYSTERIES.length} תעלומות פוצחו
            </p>
          </div>

          <div className="ms-auto flex flex-col gap-2 items-start">
            <span className="text-[11px] text-muted-foreground">תרמיל החוקר</span>
            <div className="flex flex-wrap gap-1.5">
              {TOOL_LABELS.map((t) => {
                const owned = Boolean(tools[t.key]);
                return (
                  <span
                    key={String(t.key)}
                    className={`px-2.5 py-1 rounded-full border text-[11px] transition ${
                      owned
                        ? 'border-accent/60 bg-accent/15 text-accent'
                        : 'border-border/60 bg-muted/30 text-muted-foreground/60'
                    }`}
                  >
                    {t.name}
                  </span>
                );
              })}
            </div>
          </div>
        </motion.header>

        {/* פס התקדמות האור */}
        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-l from-accent to-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(solved.length / MYSTERIES.length) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        {/* המפה */}
        <div className="relative w-full rounded-3xl border border-border/70 bg-card/40 overflow-hidden shadow-2xl">
          <div className="relative w-full" style={{ aspectRatio: '800 / 420' }}>
            <IslandCanvas lit={solved.length} total={MYSTERIES.length} className="absolute inset-0 w-full h-full" />

            {/* שביל התעלומות */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
              <motion.path
                d={trailPath}
                fill="none"
                stroke="hsl(var(--accent))"
                strokeOpacity="0.55"
                strokeWidth="0.4"
                strokeDasharray="1.6 1.6"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, delay: 0.4 }}
              />
            </svg>

            {/* נקודות התעלומות */}
            {MYSTERIES.map((m, i) => {
              const pos = NODES[m.slug] ?? { x: 50, y: 50 };
              const done = solved.includes(m.slug);
              const isNext = m.slug === nextMystery?.slug;
              const locked = !done && !isNext;
              return (
                <motion.button
                  key={m.slug}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6 + i * 0.12, type: 'spring', stiffness: 220, damping: 18 }}
                  whileHover={locked ? undefined : { scale: 1.08 }}
                  disabled={locked}
                  onMouseEnter={() => setHover(m.slug)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(m.slug)}
                  onClick={() => !locked && onEnter(m.slug)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 focus:outline-none"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  aria-label={`${m.code} — ${m.name}`}
                >
                  <span className="relative flex items-center justify-center">
                    {isNext && (
                      <motion.span
                        className="absolute w-14 h-14 rounded-full border border-accent/70"
                        animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                      />
                    )}
                    <span
                      className={`w-10 h-10 rounded-full border flex items-center justify-center text-sm font-bold backdrop-blur-sm ${
                        done
                          ? 'border-accent bg-accent/25 text-accent shadow-[0_0_24px_hsl(var(--accent)/0.5)]'
                          : isNext
                            ? 'border-primary bg-primary/25 text-primary-foreground shadow-[0_0_28px_hsl(var(--primary)/0.55)]'
                            : 'border-border/70 bg-background/70 text-muted-foreground/70'
                      }`}
                    >
                      {done ? '✓' : locked ? '' : m.order}
                    </span>
                    {locked && (
                      <span className="absolute w-2.5 h-3 rounded-sm border border-muted-foreground/60 bg-muted/60" />
                    )}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] whitespace-nowrap ${
                      locked
                        ? 'bg-background/60 text-muted-foreground/70'
                        : 'bg-background/85 text-foreground border border-border/60'
                    }`}
                  >
                    {locked ? 'נעולה' : m.name}
                  </span>
                </motion.button>
              );
            })}

            {/* אזורי האי הנעולים — ערפל */}
            <div className="absolute bottom-3 left-3 flex gap-2">
              {ISLAND_ZONES.filter((z) => z.status === 'locked').map((z) => (
                <div
                  key={z.slug}
                  className="rounded-xl border border-border/60 bg-background/70 backdrop-blur px-3 py-2 max-w-[190px] text-right"
                >
                  <p className="text-[11px] font-bold text-muted-foreground">{z.name} — נעול</p>
                  <p className="text-[10px] text-accent">{z.subject}</p>
                  <p className="text-[10px] text-muted-foreground/80 leading-relaxed mt-0.5">{z.teaser}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* תדריך התעלומה הנבחרת */}
        <AnimatePresence mode="wait">
          {hovered && (
            <motion.div
              key={hovered.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="game-panel p-5 flex flex-col md:flex-row md:items-center gap-4"
            >
              <div className="flex-1">
                <p className="text-[11px] text-accent">{hovered.code}</p>
                <h3 className="text-lg font-bold text-foreground">{hovered.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{hovered.objective}</p>
              </div>
              <button
                onClick={() => onEnter(hovered.slug)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-7 rounded-xl transition hover:-translate-y-0.5 whitespace-nowrap"
              >
                {solved.includes(hovered.slug) ? 'לחזור לתעלומה' : 'להיכנס לתעלומה'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {allSolved && (
          <button
            onClick={onFinish}
            className="self-center bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-3 px-10 rounded-xl transition"
          >
            להגיש את דוח החוקר
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default IslandMap;

import React from 'react';
import { ISLAND, ISLAND_ZONES, MYSTERIES } from '@/content/island';

interface Props {
  solved: string[]; // mystery slugs already solved
  onEnter: (slug: string) => void;
  tools: { flashlight: boolean; tube: boolean; lens: boolean };
  onFinish?: () => void;
}

/** The island map doubles as the learning map: progress + locked "appetite" zones. */
const IslandMap: React.FC<Props> = ({ solved, onEnter, tools, onFinish }) => {
  const nextMystery = MYSTERIES.find((m) => !solved.includes(m.slug));
  const allSolved = !nextMystery;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/92 backdrop-blur p-4 overflow-y-auto hud-scroll">
      <div className="game-panel w-full max-w-3xl p-6 flex flex-col gap-5 text-right my-auto">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🗺️</span>
          <div>
            <h2 className="text-xl font-bold text-primary">מפת {ISLAND.title}</h2>
            <p className="text-[11px] text-muted-foreground">
              משימה נוכחית: {ISLAND.mission} • {solved.length} מתוך {MYSTERIES.length} תעלומות פוצחו
            </p>
          </div>
          <div className="ms-auto flex items-center gap-2 text-lg" title="תרמיל החוקר">
            <span className={tools.flashlight ? '' : 'opacity-25'}>🔦</span>
            <span className={tools.tube ? '' : 'opacity-25'}>📏</span>
            <span className={tools.lens ? '' : 'opacity-25'}>🔬</span>
          </div>
        </div>

        {/* Mysteries of the light meadow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {MYSTERIES.map((m) => {
            const done = solved.includes(m.slug);
            const isNext = m.slug === nextMystery?.slug;
            return (
              <button
                key={m.slug}
                disabled={!done && !isNext}
                onClick={() => onEnter(m.slug)}
                className={`rounded-xl border p-4 text-right flex flex-col gap-1.5 transition ${
                  done
                    ? 'border-primary/50 bg-primary/10 hover:bg-primary/15'
                    : isNext
                      ? 'border-accent/60 bg-accent/10 hover:bg-accent/20 animate-pulse'
                      : 'border-border bg-muted/40 opacity-60 cursor-not-allowed'
                }`}
              >
                <span className="text-2xl">{done ? '✔' : isNext ? m.icon : '🔒'}</span>
                <span className="text-xs font-bold text-foreground">
                  {m.code} — {m.name}
                </span>
                <span className="text-[11px] text-muted-foreground leading-relaxed">{m.objective}</span>
                <span className="text-[11px] text-primary mt-auto pt-1">
                  {done ? 'פוצחה' : isNext ? 'לחצו כדי להיכנס' : 'תיפתח בהמשך'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Island zones — future subjects */}
        <div>
          <h3 className="text-xs font-bold text-primary mb-2">אזורי האי</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {ISLAND_ZONES.map((z) => (
              <div
                key={z.slug}
                className={`rounded-lg border p-3 flex flex-col gap-1 ${
                  z.status === 'locked' ? 'border-border bg-muted/30 opacity-70' : 'border-primary/40 bg-primary/10'
                }`}
              >
                <span className="text-xs font-bold text-foreground">
                  {z.status === 'locked' ? '🔒' : z.icon} {z.name}
                </span>
                <span className="text-[11px] text-accent">{z.subject}</span>
                <span className="text-[11px] text-muted-foreground leading-relaxed">{z.teaser}</span>
              </div>
            ))}
          </div>
        </div>

        {allSolved ? (
          <button
            onClick={onFinish}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-8 rounded-xl transition self-center"
          >
            להגיש את דו"ח החוקר 📋
          </button>
        ) : (
          <button
            onClick={() => nextMystery && onEnter(nextMystery.slug)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-8 rounded-xl transition self-center"
          >
            {nextMystery?.code}: {nextMystery?.name} ➡️
          </button>
        )}
      </div>
    </div>
  );
};

export default IslandMap;

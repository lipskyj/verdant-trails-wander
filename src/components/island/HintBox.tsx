import React, { useState } from 'react';
import { ISLAND } from '@/content/island';
import { logEvent } from '@/lib/eventLog';

interface Props {
  hints: string[];
  mystery: string;
  attempts?: number;
}

/** Progressive hints from the guide — every reveal is logged. */
const HintBox: React.FC<Props> = ({ hints, mystery, attempts = 0 }) => {
  const [open, setOpen] = useState(0);
  const nudge = attempts > 0 && open === 0;

  const reveal = () => {
    const level = open + 1;
    setOpen(level);
    logEvent('hint_opened', { mystery, level, attempts });
  };

  return (
    <div className="game-panel p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{ISLAND.guideIcon}</span>
        <span className="text-xs font-bold text-primary">רמזים של {ISLAND.guideName}</span>
        {open < hints.length && (
          <button
            onClick={reveal}
            className={`ms-auto text-[11px] py-1 px-2.5 rounded-lg border font-bold transition ${
              nudge
                ? 'bg-accent text-accent-foreground border-accent animate-pulse'
                : 'bg-muted border-border hover:bg-muted/70'
            }`}
          >
            {open === 0 ? 'בקשו רמז 💡' : `רמז נוסף (${open + 1}/${hints.length})`}
          </button>
        )}
      </div>
      {open === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          נתקעתם? אני כאן. כל רמז נרשם בדו"ח — וזה בסדר גמור לבקש עזרה.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {hints.slice(0, open).map((h, i) => (
            <li key={i} className="text-[11px] text-foreground bg-muted/60 border border-border rounded-md p-2">
              {i + 1}. {h}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HintBox;

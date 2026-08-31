import React, { useState } from 'react';
import { ISLAND, type Mcq } from '@/content/island';
import { logEvent, type IslandEventType } from '@/lib/eventLog';

interface Props {
  items: Mcq[];
  heading: string;
  intro?: string;
  logAs: IslandEventType;
  context?: string;
  ctaLabel?: string;
  /**
   * Show which option was the right one after answering.
   * Must be false for the entry gate: a pre-test that teaches the answers is
   * the first instructional event, not a baseline.
   */
  revealCorrect?: boolean;
  /** שם הדמות המלווה — ברירת המחדל היא שומר האי */
  guideName?: string;
  guideIcon?: string;
  onDone: (results: { id: string; choice: number; correct: boolean }[]) => void;
}

/** The guide character asks MCQs — used for the entry gate and the in-mystery pulse checks. */
const GuideQuiz: React.FC<Props> = ({
  items,
  heading,
  intro,
  logAs,
  context,
  ctaLabel = 'המשך',
  revealCorrect = true,
  guideName = ISLAND.guideName,
  guideIcon = ISLAND.guideIcon,
  onDone,
}) => {

  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [shown, setShown] = useState(false);
  const [results, setResults] = useState<{ id: string; choice: number; correct: boolean }[]>([]);
  const [askedAt, setAskedAt] = useState(() => Date.now());

  const q = items[index];
  const isCorrect = choice === q.correct;

  const confirm = () => {
    if (choice === null) return;
    const correct = choice === q.correct;
    logEvent(logAs, {
      questionId: q.id,
      placement: q.placement,
      context,
      choice,
      correct,
      msToAnswer: Date.now() - askedAt,
    });
    setResults((p) => [...p, { id: q.id, choice, correct }]);
    setShown(true);
  };

  const next = () => {
    const collected = results;
    if (index + 1 < items.length) {
      setIndex(index + 1);
      setChoice(null);
      setShown(false);
      setAskedAt(Date.now());
    } else {
      onDone(collected);
    }
  };

  return (
    <div dir="rtl" className="absolute inset-0 z-40 flex items-center justify-center bg-background/92 backdrop-blur p-4 md:p-6">
      <div className="game-panel w-full max-w-xl p-6 md:p-7 flex flex-col gap-4 text-right">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{guideIcon}</span>
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground">{guideName}</span>

            <h2 className="text-lg font-bold text-primary">{heading}</h2>
          </div>
          <span className="ms-auto text-[11px] text-muted-foreground whitespace-nowrap">
            {index + 1} / {items.length}
          </span>
        </div>

        {intro && index === 0 && <p className="text-xs text-muted-foreground leading-relaxed">{intro}</p>}

        <p className="text-[11px] text-accent">{q.guide}</p>
        <p className="text-sm md:text-base font-bold text-foreground leading-relaxed">{q.question}</p>

        <div className="flex flex-col gap-2">
          {q.options.map((opt, i) => {
            const picked = choice === i;
            // never reveal the key on the entry gate — see revealCorrect
            const reveal = shown && revealCorrect && i === q.correct;
            const wrongPick = shown && picked && (!revealCorrect ? false : i !== q.correct);
            // a glyph, not just a hue: colour alone is not an accessible encoding
            const mark = reveal ? '✔ ' : wrongPick ? '✘ ' : '';
            return (
              <button
                key={i}
                disabled={shown}
                aria-pressed={picked}
                className={`text-right text-xs md:text-sm p-2.5 rounded-lg border transition ${
                  reveal
                    ? 'bg-primary/20 border-primary text-primary font-bold'
                    : picked
                      ? wrongPick
                        ? 'bg-destructive/15 border-destructive/50 text-destructive'
                        : 'bg-primary/20 border-primary text-primary font-bold'
                      : 'bg-muted border-border hover:bg-muted/70'
                }`}
                onClick={() => setChoice(i)}
              >
                {mark}
                {opt}
              </button>
            );
          })}
        </div>

        {shown && (
          <span
            role="status"
            className={`text-xs px-3 py-2 rounded-lg font-bold border ${
              isCorrect
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'bg-accent/15 text-accent border-accent/30'
            }`}
          >
            {isCorrect ? q.feedbackOk : q.feedbackNo}
            {/* name the right answer in words, so the feedback is not colour-only */}
            {revealCorrect && !isCorrect && (
              <span className="block mt-1 font-normal">התשובה הנכונה: «{q.options[q.correct]}»</span>
            )}
          </span>
        )}


        {!shown ? (
          <button
            onClick={confirm}
            disabled={choice === null}
            className="bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground font-bold py-2.5 rounded-xl transition"
          >
            אישור תשובה
          </button>
        ) : (
          <button
            onClick={next}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 rounded-xl transition"
          >
            {index + 1 < items.length ? 'לשאלה הבאה ➡️' : `${ctaLabel} ➡️`}
          </button>
        )}
      </div>
    </div>
  );
};

export default GuideQuiz;

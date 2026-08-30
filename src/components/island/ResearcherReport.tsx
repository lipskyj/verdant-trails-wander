import React, { useMemo, useState } from 'react';
import { ISLAND, POST_TEST, REFLECTION_PROMPTS } from '@/content/island';
import { logEvent, summarizeEvents } from '@/lib/eventLog';
import GuideQuiz from './GuideQuiz';

/** Post gate: knowledge check + short reflection, framed as the researcher's report. */
const ResearcherReport: React.FC = () => {
  const [phase, setPhase] = useState<'quiz' | 'reflection' | 'done'>('quiz');
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<string[]>(REFLECTION_PROMPTS.map(() => ''));
  const summary = useMemo(() => (phase === 'done' ? summarizeEvents() : null), [phase]);

  if (phase === 'quiz') {
    return (
      <GuideQuiz
        items={POST_TEST}
        heading='דו"ח החוקר — ידע נרכש'
        intro="פיצחתם את שלוש התעלומות והמדשאה נדלקה. לפני חזרה למועדון — מלאו את הדו"ח."
        logAs="gate_post_answer"
        context="post"
        ctaLabel="לרפלקציה"
        onDone={(res) => {
          setScore(res.filter((r) => r.correct).length);
          setPhase('reflection');
        }}
      />
    );
  }

  if (phase === 'reflection') {
    const filled = answers.every((a) => a.trim().length >= 3);
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/92 backdrop-blur p-4">
        <div className="game-panel w-full max-w-xl p-6 flex flex-col gap-4 text-right">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📋</span>
            <h2 className="text-lg font-bold text-primary">דו"ח החוקר — רפלקציה</h2>
          </div>
          {REFLECTION_PROMPTS.map((p, i) => (
            <label key={i} className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-foreground">{p}</span>
              <textarea
                dir="rtl"
                rows={2}
                value={answers[i]}
                onChange={(e) =>
                  setAnswers((prev) => prev.map((a, idx) => (idx === i ? e.target.value : a)))
                }
                className="bg-muted border border-border rounded-lg p-2 text-xs text-foreground outline-none focus:border-primary"
                placeholder="כתבו במשפט או שניים…"
              />
            </label>
          ))}
          <button
            onClick={() => {
              logEvent('reflection_submit', { postScore: score, total: POST_TEST.length, answers });
              logEvent('session_complete', { postScore: score });
              setPhase('done');
            }}
            disabled={!filled}
            className="bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-bold py-2.5 rounded-xl transition"
          >
            להגיש את הדו"ח ✅
          </button>
          {!filled && (
            <span className="text-[11px] text-muted-foreground text-center">
              ענו בקצרה על שתי השאלות כדי להגיש.
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/92 backdrop-blur p-4">
      <div className="game-panel w-full max-w-xl p-7 flex flex-col gap-4 text-center">
        <div className="text-5xl animate-bounce">🌤️</div>
        <h2 className="text-2xl font-bold text-primary">מדשאת האור דולקת מחדש!</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{ISLAND.meadowLit}</p>
        <div className="game-panel p-4 text-right text-xs text-muted-foreground leading-relaxed">
          <strong className="text-primary">סיכום דו"ח החוקר:</strong>
          <br />ידע נרכש: {score} מתוך {POST_TEST.length} סעיפים נכונים.
          {summary && (
            <>
              <br />תשובות שנרשמו: {summary.answers} • נכונות: {summary.correct} • רמזים שנפתחו: {summary.hints} •
              ניסיונות מיון: {summary.attempts} • זמן באי: כ־{summary.minutes} דק'.
            </>
          )}
          <br />
          <br />1. יש גופים שמפיקים אור בעצמם, ואחרים רק מחזירים אור.
          <br />2. האור מתקדם בקו ישר לכל הכיוונים.
          <br />3. חומר שקוף מעביר כמעט את כל האור, אטום חוסם ויוצר צל, ויש גם חומרים שמעבירים חלקית.
        </div>
        <p className="text-xs text-accent">
          🔒 קניון ההד נחשף במפה — האזור הבא באי ייפתח בשיעור הבא.
        </p>
      </div>
    </div>
  );
};

export default ResearcherReport;

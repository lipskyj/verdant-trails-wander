import React from 'react';
import { getTier, prefersReducedMotion } from '@/lib/renderTier';

interface Props {
  /** האם המודל בקנה מידה אמיתי או מוגדל/סכמטי לצורכי הוראה */
  representation: 'scaled' | 'schematic';
  /** הסבר קצר על קנה המידה — למשל "המולקולות מוגדלות פי מיליון" */
  scaleNote?: string;
  /** רמז נגישות: מה עושים במקלדת בסצנה הזאת */
  keyboardHint?: string;
}

/**
 * שקיפות מדעית + מצב תצוגה, בפינת הסצנה.
 * כל הגזמה בקנה מידה חייבת להיות גלויה ללומד — סצנה מציאותית הופכת מודל סכמטי
 * למשכנע יותר, וזו אחריות ולא פיצ'ר.
 */
const SceneMeta: React.FC<Props> = ({ representation, scaleNote, keyboardHint }) => {
  const budget = getTier();
  const reduced = prefersReducedMotion();

  return (
    <div
      dir="rtl"
      className="absolute bottom-3 right-3 z-20 max-w-[260px] rounded-xl border border-border/60 bg-background/70 backdrop-blur px-3 py-2 text-right pointer-events-none"
    >
      <p className="text-[10px] font-bold text-foreground/90">
        {representation === 'scaled' ? 'תצוגה בקנה מידה' : 'תצוגה סכמטית — לא בקנה מידה'}
      </p>
      {scaleNote && <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{scaleNote}</p>}
      <p className="text-[10px] text-accent mt-1">
        {budget.label}
        {reduced ? ' • תנועה מופחתת' : ''}
      </p>
      {keyboardHint && (
        <p className="text-[10px] text-muted-foreground/80 leading-relaxed mt-0.5">מקלדת: {keyboardHint}</p>
      )}
    </div>
  );
};

export default SceneMeta;

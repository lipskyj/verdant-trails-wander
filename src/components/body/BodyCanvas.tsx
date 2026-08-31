import React from 'react';
import { motion } from 'framer-motion';

/**
 * מפת הגוף הפנימית — שכבת ציור בלבד (SVG), ללא לוגיקת משחק.
 * lit = כמה תחנות פוצחו (0..total) ומכאן כמה איברים מוארים.
 */
interface Props {
  lit: number;
  total: number;
  className?: string;
}

const BodyCanvas: React.FC<Props> = ({ lit, total, className }) => {
  const glow = total > 0 ? lit / total : 0;

  return (
    <svg viewBox="0 0 800 420" className={className} role="presentation" aria-hidden="true">
      <defs>
        <radialGradient id="bodyAura" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.08 + glow * 0.32} />
          <stop offset="100%" stopColor="hsl(var(--background))" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="torso" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.16 + glow * 0.22} />
          <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="tractGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.12 + glow * 0.5} />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="800" height="420" fill="url(#bodyAura)" />

      {/* דופק רקע — קו חיים */}
      <g stroke="hsl(var(--primary))" strokeOpacity="0.16" fill="none" strokeWidth="2">
        {[0, 1, 2].map((i) => (
          <motion.path
            key={i}
            d={`M0 ${360 + i * 18} h120 l14 -18 l16 34 l14 -16 h ${520} l14 -14 l16 28 l14 -14 h60`}
            initial={{ opacity: 0.2 }}
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 5 + i * 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </g>

      {/* צללית גוף — ראש, כתפיים, גו */}
      <motion.g
        initial={{ opacity: 0, pathLength: 0 }}
        animate={{ opacity: 1, pathLength: 1 }}
        transition={{ duration: 1.6, ease: 'easeInOut' }}
        fill="url(#torso)"
        stroke="hsl(var(--accent))"
        strokeOpacity="0.45"
        strokeWidth="2"
      >
        <motion.circle cx="400" cy="70" r="40" />
        <motion.path d="M400 108 c -18 0 -26 10 -30 22 c -60 14 -86 42 -92 96 c -6 54 2 122 22 168 h 200 c 20 -46 28 -114 22 -168 c -6 -54 -32 -82 -92 -96 c -4 -12 -12 -22 -30 -22 Z" />
      </motion.g>

      {/* זוהר מערכת העיכול */}
      <circle cx="400" cy="250" r="130" fill="url(#tractGlow)" />

      {/* מסלול העיכול הסכמטי */}
      <motion.path
        d="M400 104 V 176 C 400 196 372 200 366 216 C 356 244 372 264 398 268 C 452 274 470 300 452 322 C 430 348 372 336 358 356"
        fill="none"
        stroke="hsl(var(--accent))"
        strokeOpacity="0.55"
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.8, delay: 0.4 }}
      />
      {/* מתאר המעי הגס */}
      <path
        d="M330 300 v -46 h 140 v 46"
        fill="none"
        stroke="hsl(var(--foreground))"
        strokeOpacity="0.22"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default BodyCanvas;

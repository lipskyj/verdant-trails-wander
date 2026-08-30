import React from 'react';
import { motion } from 'framer-motion';

/**
 * SVG של אי התעלומות — שכבת ציור בלבד (ללא לוגיקת משחק).
 * lit = כמה תעלומות פוצחו (0..total) ומכאן כמה אור חוזר לאי.
 */
interface Props {
  lit: number;
  total: number;
  className?: string;
}

const IslandCanvas: React.FC<Props> = ({ lit, total, className }) => {
  const glow = total > 0 ? lit / total : 0;

  return (
    <svg viewBox="0 0 800 420" className={className} role="presentation" aria-hidden="true">
      <defs>
        <radialGradient id="sky" cx="50%" cy="18%" r="80%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.1 + glow * 0.35} />
          <stop offset="100%" stopColor="hsl(var(--background))" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.18" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.22 + glow * 0.3} />
          <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="meadowGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.15 + glow * 0.55} />
          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="800" height="420" fill="url(#sky)" />

      {/* ים */}
      <g fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.18">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.path
            key={i}
            d={`M0 ${330 + i * 20} q 100 -10 200 0 t 200 0 t 200 0 t 200 0`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.35, 0.8, 0.35] }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </g>
      <rect x="0" y="300" width="800" height="120" fill="url(#sea)" />

      {/* קו החוף של האי */}
      <motion.path
        d="M120 300 C 90 250 110 200 160 172 C 200 150 210 110 270 100 C 330 90 360 62 430 74 C 500 86 540 70 590 104 C 650 144 700 180 690 232 C 682 276 640 306 580 312 C 470 322 250 322 120 300 Z"
        fill="url(#land)"
        stroke="hsl(var(--accent))"
        strokeOpacity="0.5"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.6, ease: 'easeInOut' }}
      />

      {/* מדשאת האור — הזוהר גדל עם ההתקדמות */}
      <circle cx="360" cy="196" r="150" fill="url(#meadowGlow)" />

      {/* הרים ועצים סכמטיים */}
      <g stroke="hsl(var(--foreground))" strokeOpacity="0.28" fill="none" strokeWidth="2">
        <path d="M170 214 l 34 -44 l 30 44 Z" />
        <path d="M600 200 l 30 -38 l 28 38 Z" />
        <path d="M250 262 v -22 m -12 10 l 12 -12 l 12 12" />
        <path d="M508 268 v -22 m -12 10 l 12 -12 l 12 12" />
      </g>
    </svg>
  );
};

export default IslandCanvas;

# "מסע המזון" — Digestive System Experience (same engine, new subject)

A parallel narrative-inquiry experience for 6th grade, built on the exact architecture that already works for the light lesson: cinematic story intro, mode select (free / guided, with or without questions), an interactive map, five 3D experiment stations, pulse-check questions, hints from a companion, and an event log for the pilot.

## The story shell

- Setting: instead of an island, the body itself is the world — "מסע המזון: מפת הגוף הפנימית".
- Companion: a young lab guide ("ד"ר נוֹעָה מהמעבדה הזעירה") who never gives answers, only asks guiding questions — same rule as the island guardian.
- Distress hook: a bite of a sandwich has to reach every cell in the body, but the route map is torn. The learner reconstructs the journey station by station; each solved station lights up one organ on the body map.
- Map: an SVG/canvas body silhouette replacing the island landmass. Organs glow as they are unlocked; two future zones stay fogged ("מערכת הנשימה", "מערכת הדם") exactly like Echo Canyon does today.

## The five stations (mysteries), each with a real 3D manipulation

1. **הפה — טחינה והרטבה.** Interactive teeth model: choose which tooth type to bite/grind with, and add or withhold saliva. Measure particle size and dissolving with a "מודד פירוק" gauge (the Lux-meter pattern reused). Concept: mechanical vs chemical digestion begins here.
2. **הוושט — לא נופל, נדחף.** A tube you can rotate — even upside down — while peristaltic waves push the bolus. Learner predicts first (does food fall by gravity?), then tests. Mirrors the dark-box/tube experiment structure.
3. **הקיבה — מעבדת החומצה.** Drop test foods into a cutaway stomach; control churn speed and acid level, watch break-down over time with a timer readout. Concept: acid + movement = chemical breakdown; safe limits and mucus lining.
4. **המעי הדק — שטח פנים ובליעה לדם.** Zoomable model from gut wall to villi to a single cell (the ZoomBook camera-lerp pattern, six scale levels). Learner compares a smooth tube vs a villi-covered tube and measures how much nutrient crosses per second.
5. **המעי הגס והפסולת — מה נשאר.** Water-absorption slider; too little/too much water changes the outcome. Then an "apply" task: order the whole journey as a chain (the same chain-building interaction already used in the flashlight anatomy station).

Each station follows the four-layer inquiry loop already in the codebase: Observe & predict → Investigate → Explain (pulse-check MCQ) → Apply, and each awards a tool for the researcher's pouch (מגדלת, מודד חומציות, שעון עצר, ערכת דגימות, מפת המסע).

## Assessment & analytics

- Pre-test at the entrance, pulse checks between stations, post-test + reflection as "דו"ח החוקר" — all reusing `GuideQuiz`, `HintBox` and `ResearcherReport` with new question data.
- Every answer, attempt, hint and duration logged through the existing `eventLog` (localStorage now; ready to move to Lovable Cloud tables `sessions / pre_post_responses / events / hint_usage` with RLS and an anonymous class-level student id when the pilot needs cross-device reporting).

## What gets reused vs newly written

- **Reused as-is:** `eventLog`, `GuideQuiz`, `HintBox`, `ModeSelect`, `ResearcherReport`, the map/HUD glassmorphism layout, the fullscreen-3D-with-floating-panels layout, RTL Hebrew styling.
- **New content files:** `src/content/body.ts` (narrative, stations, MCQ pools, hints) and `src/content/bodyLabs.ts` (per-station inquiry layers), mirroring `island.ts` / `labs.ts`.
- **New 3D scenes:** `MouthScene`, `EsophagusScene`, `StomachScene`, `IntestineZoomScene`, `ColonScene` — same Three.js setup (PBR, ACES tone mapping, soft shadows, Hebrew 3D labels with `maxWidth`).
- **New shell:** `BodyJourneyGame.tsx` (state machine cloned from `LightMazeGame.tsx`), `BodyMap.tsx` + `BodyCanvas.tsx`, `BodyStoryIntro.tsx`.
- **Visual direction:** warm organic palette (deep maroon, warm amber, tissue pink) instead of the slate/amber light theme — scientific, not cartoon-gore; cutaway anatomical style.

## Technical notes

- Same stack: React + Vite + TS + Tailwind + Framer Motion + Three.js; simple geometric simulations (particle counts, transmission/absorption rates, timers) rather than a physics engine.
- Refactor opportunity: extract the shared journey shell (state machine, pulse gating, mode select, map frame) into a reusable `journey/` module so light and digestion are two content packs on one engine — this is what makes lesson #3 cheap.
- Chromebook budget kept: <100 draw calls per scene, 1024 shadow maps, capped pixel ratio, one post pass.

## Suggested build order

1. Content data + body map + story intro + mode select (playable shell, no experiments).
2. Stomach station (highest wow, clearest measurement) end-to-end as the vertical slice.
3. Mouth and esophagus stations.
4. Small-intestine zoom station.
5. Colon station + full-journey chain + researcher report.
6. Optional: extract the shared engine, then Cloud-backed analytics.

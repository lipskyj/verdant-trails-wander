/**
 * Draw label text that stays legible in Hebrew.
 *
 * `fillText(..., maxWidth)` CONDENSES glyphs horizontally instead of wrapping.
 * At ~65% width the letters ם/ס, ד/ר and ה/ח lose the width cues an 11-year-old
 * reader relies on — so instead of condensing we step the font size down until
 * the string fits at its natural proportions.
 *
 * The caller's existing `ctx.font` is the starting point, so each scene keeps
 * its own typography; only the size is reduced, and only when needed.
 */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  minPx = 22
) {
  const font = ctx.font;
  const m = /(\d+(?:\.\d+)?)px/.exec(font);
  if (m) {
    let size = parseFloat(m[1]);
    while (size > minPx && ctx.measureText(text).width > maxWidth) {
      size -= 2;
      ctx.font = font.replace(m[0], `${size}px`);
    }
  }
  ctx.fillText(text, x, y); // no maxWidth argument: never condense the glyphs
  ctx.font = font;
}

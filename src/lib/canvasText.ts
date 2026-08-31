/**
 * Draw label text that stays legible in Hebrew.
 *
 * `fillText(..., maxWidth)` CONDENSES glyphs horizontally instead of wrapping.
 * At ~65% width the letters ם/ס, ד/ר and ה/ח lose the width cues an 11-year-old
 * reader relies on — so instead of condensing we step the font size down until
 * the string fits at natural proportions.
 */
export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  basePx = 54,
  family = 'system-ui, sans-serif',
  weight = 'bold'
) {
  let size = basePx;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 20 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  ctx.fillText(text, x, y); // no maxWidth: never condense
  return size;
}

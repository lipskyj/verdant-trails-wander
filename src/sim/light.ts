/**
 * Pure physics model for the light lesson — no `three` import, no rendering.
 * Every scientific number the student reads comes from here, so it can be
 * unit-tested independently of the animation loop.
 */

/** Luminous intensity (candela) of each light producer, from real reference values. */
export const SOURCE_CANDELA = {
  /** the Sun: ~100,000 lx on Earth's surface at noon */
  sun: 100000,
  /** a household LED/incandescent bulb, ~90 lx at 1 m */
  bulb: 90,
  /** a firefly is astonishingly dim: ~0.05 lx close up */
  firefly: 0.05,
  /** a handheld torch, ~1,000 cd → 1,000 lx at 1 m */
  torch: 1000,
} as const;

/** Ambient room illuminance. EN 12464-1 asks for 300–500 lx in a classroom. */
export const ROOM_LUX_ON = 300;
/** Lights off in a windowless lab really is zero — that is the point of mystery A. */
export const ROOM_LUX_OFF = 0;

/** Boundary between "transparent" and "translucent" (percent of light passing). */
export const TRANSPARENT_MIN_PCT = 70;
/** Boundary between "translucent" and "opaque". */
export const TRANSLUCENT_MIN_PCT = 15;

/**
 * Inverse-square law with Lambert's cosine law.
 * E = I · cos θ / d²  where θ is the angle between the surface normal and the
 * direction back to the light.
 */
export function luxAt(intensityCd: number, distanceM: number, cosIncidence = 1): number {
  const d = Math.max(distanceM, 0.05); // avoid a singularity at zero distance
  return (intensityCd * Math.max(0, cosIncidence)) / (d * d);
}

/** Is a point inside a spotlight cone? `cosToAxis` is dot(dirToPoint, beamAxis). */
export function inCone(cosToAxis: number, coneAngleRad: number): boolean {
  return cosToAxis > Math.cos(coneAngleRad);
}

export interface LuxReading {
  /** light the body makes itself */
  self: number;
  /** light arriving from the handheld torch */
  beam: number;
  /** light arriving from the room lighting */
  room: number;
  /** total measured illuminance */
  total: number;
}

export function measure(self: number, beam: number, room: number): LuxReading {
  return { self, beam, room, total: self + beam + room };
}

/**
 * The classification the student is asked to discover, derived from the
 * measurement rather than from an authored flag: a producer is a body that
 * still reads light when every external source is off.
 */
export function classifyFromReading(r: LuxReading): 'producer' | 'reflector' | 'unknown' {
  if (r.beam > 0 || r.room > 0) return 'unknown'; // cannot tell yet — external light present
  return r.total > 0 ? 'producer' : 'reflector';
}

/**
 * Readable display for a quantity spanning six orders of magnitude
 * (moonlight 0.1 lx → sunlight 100,000 lx).
 */
export function formatLux(lux: number): string {
  if (lux <= 0) return '0';
  if (lux < 1) return lux.toFixed(2);
  if (lux < 10) return lux.toFixed(1);
  return Math.round(lux).toLocaleString('en-US');
}

/** Rectilinear propagation: can the eye see the flame through the tube? */
export function tubeSight(opts: { offset: number; bent: boolean; aperture?: number }): {
  seen: boolean;
  blockedBy: 'none' | 'bend' | 'wall';
} {
  const aperture = opts.aperture ?? 0.22;
  if (opts.bent) return { seen: false, blockedBy: 'bend' };
  if (Math.abs(opts.offset) >= aperture) return { seen: false, blockedBy: 'wall' };
  return { seen: true, blockedBy: 'none' };
}

/** Percentage of light passing a sample, and the material category it implies. */
export function transmittedPct(transmission: number, lampOn: boolean): number {
  if (!lampOn) return 0;
  return Math.round(Math.max(0, Math.min(1, transmission)) * 100);
}

export function classifyMaterial(pct: number): 'transparent' | 'translucent' | 'opaque' {
  if (pct >= TRANSPARENT_MIN_PCT) return 'transparent';
  if (pct >= TRANSLUCENT_MIN_PCT) return 'translucent';
  return 'opaque';
}

/** Torch output as a function of remaining battery charge and switch state. */
export function torchPower(opts: { charge: number; switchOn: boolean }): number {
  if (!opts.switchOn) return 0;
  if (opts.charge <= 0) return 0;
  // dims below 35% charge, dead at zero
  return Math.max(0, Math.min(1, opts.charge < 0.35 ? opts.charge / 0.35 : 1));
}

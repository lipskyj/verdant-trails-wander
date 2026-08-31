import { describe, it, expect } from 'vitest';
import {
  luxAt,
  measure,
  classifyFromReading,
  formatLux,
  tubeSight,
  transmittedPct,
  classifyMaterial,
  torchPower,
  ROOM_LUX_OFF,
} from './light';

describe('luxAt — inverse square + Lambert', () => {
  it('quarters when distance doubles', () => {
    expect(luxAt(1000, 2) / luxAt(1000, 4)).toBeCloseTo(4, 5);
  });
  it('scales with the cosine of incidence', () => {
    expect(luxAt(1000, 1, 0.5)).toBeCloseTo(500, 5);
  });
  it('never returns negative light for back-facing surfaces', () => {
    expect(luxAt(1000, 1, -0.9)).toBe(0);
  });
});

describe('classifyFromReading', () => {
  it('calls a body that still reads light in full darkness a producer', () => {
    expect(classifyFromReading(measure(0.05, 0, ROOM_LUX_OFF))).toBe('producer');
  });
  it('calls a body that reads nothing in full darkness a reflector', () => {
    expect(classifyFromReading(measure(0, 0, ROOM_LUX_OFF))).toBe('reflector');
  });
  it('refuses to decide while external light is present', () => {
    expect(classifyFromReading(measure(0, 120, 300))).toBe('unknown');
  });
});

describe('formatLux', () => {
  it('keeps very dim readings legible', () => expect(formatLux(0.05)).toBe('0.05'));
  it('groups very bright readings', () => expect(formatLux(100000)).toBe('100,000'));
});

describe('tubeSight — rectilinear propagation', () => {
  it('sees the flame through a straight aligned tube', () =>
    expect(tubeSight({ offset: 0, bent: false }).seen).toBe(true));
  it('is blocked by a bend regardless of alignment', () =>
    expect(tubeSight({ offset: 0, bent: true })).toEqual({ seen: false, blockedBy: 'bend' }));
  it('is blocked by the wall when misaligned', () =>
    expect(tubeSight({ offset: 0.6, bent: false }).blockedBy).toBe('wall'));
});

describe('material transmission', () => {
  it('reads zero with the lamp off', () => expect(transmittedPct(0.92, false)).toBe(0));
  it('classifies glass, paper and metal', () => {
    expect(classifyMaterial(transmittedPct(0.92, true))).toBe('transparent');
    expect(classifyMaterial(transmittedPct(0.45, true))).toBe('translucent');
    expect(classifyMaterial(transmittedPct(0.02, true))).toBe('opaque');
  });
});

describe('torchPower', () => {
  it('is off when the switch is open', () => expect(torchPower({ charge: 1, switchOn: false })).toBe(0));
  it('is dead at zero charge', () => expect(torchPower({ charge: 0, switchOn: true })).toBe(0));
  it('dims below 35% charge', () => expect(torchPower({ charge: 0.175, switchOn: true })).toBeCloseTo(0.5, 5));
});

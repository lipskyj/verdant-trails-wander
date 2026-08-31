// Render-tier probe + shared renderer contract for every 3D scene in the app.
// Doctrine: the worst device sets the design. Tier is decided once at boot from a
// real capability probe (never user-agent sniffing), and every optional visual
// feature declares the minimum tier it appears at.

import * as THREE from 'three';

export type Tier = 0 | 1 | 2;

export interface TierBudget {
  tier: Tier;
  label: string;
  pixelRatio: number;
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
  softShadows: boolean;
  /** live cube-camera reflections, volumetric beams, transmission materials */
  transmission: boolean;
  reflections: boolean;
  /** particle / instance counts scale with the tier */
  particleScale: number;
}

const BUDGETS: Record<Tier, TierBudget> = {
  0: {
    tier: 0,
    label: 'איכות גבוהה',
    pixelRatio: 2,
    antialias: true,
    shadows: true,
    shadowMapSize: 1024,
    softShadows: true,
    transmission: true,
    reflections: true,
    particleScale: 1,
  },
  1: {
    tier: 1,
    label: 'איכות מאוזנת',
    pixelRatio: 1.5,
    antialias: true,
    shadows: true,
    shadowMapSize: 1024,
    softShadows: false,
    transmission: true,
    reflections: false,
    particleScale: 0.6,
  },
  2: {
    tier: 2,
    label: 'מצב כרומבוק',
    pixelRatio: 1,
    antialias: false,
    shadows: false,
    shadowMapSize: 512,
    softShadows: false,
    transmission: false,
    reflections: false,
    particleScale: 0.35,
  },
};

let cached: TierBudget | null = null;

function probeTier(): Tier {
  if (typeof window === 'undefined') return 1;

  // Software / no WebGL2 → lowest tier, scene stays scientifically complete.
  let gl: WebGL2RenderingContext | null = null;
  let gpu = '';
  try {
    const canvas = document.createElement('canvas');
    gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    if (gl && info) gpu = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) ?? '').toLowerCase();
  } catch {
    /* probe is best-effort */
  }
  if (!gl) return 2;

  const softwareGpu = /swiftshader|software|basic render|llvmpipe|angle \(google/.test(gpu);
  const weakGpu = /intel.*(hd|uhd) graphics|mali-[t4-6]|adreno [3-5]|powervr/.test(gpu);
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 0;

  if (softwareGpu || cores <= 2) return 2;
  if (weakGpu || cores <= 4 || (mem && mem <= 4)) return 1;
  return 0;
}

/** Tier budget for this device — probed once per session. */
export function getTier(): TierBudget {
  if (!cached) cached = BUDGETS[probeTier()];
  return cached;
}

/** Vestibular safety: camera sweeps become cuts when the OS asks for less motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Renderer with one shared color/tone contract for the whole app.
 * Neutral (Khronos PBR Neutral) tone mapping — not ACES — because in these lessons
 * color IS the measurement (lit vs dark, transmitted light, tissue state), and ACES
 * shifts saturated hues.
 */
export function makeSceneRenderer(mount: HTMLElement, opts: { exposure?: number } = {}) {
  const budget = getTier();
  const renderer = new THREE.WebGLRenderer({ antialias: budget.antialias, powerPreference: 'high-performance' });
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, budget.pixelRatio));
  renderer.shadowMap.enabled = budget.shadows;
  renderer.shadowMap.type = budget.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);
  return renderer;
}

/** Texture color spaces are decided by slot, never by hand at authoring time. */
export function asColorTexture<T extends THREE.Texture>(tex: T): T {
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function asDataTexture<T extends THREE.Texture>(tex: T): T {
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

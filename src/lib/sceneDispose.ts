import * as THREE from 'three';

/**
 * Full teardown for a scene + renderer. Written once and shared, because the
 * per-scene `traverse(o => o.isMesh && ...)` variants leaked everything that is
 * not a Mesh: sprites, points, line segments, shadow maps and render targets.
 */
export function disposeScene(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  extras: Array<{ dispose: () => void } | null | undefined> = []
) {
  const disposeMaterial = (mat: THREE.Material) => {
    // dispose every texture the material holds, whatever slot it sits in
    Object.values(mat as unknown as Record<string, unknown>).forEach((v) => {
      if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose();
    });
    mat.dispose();
  };

  scene.traverse((o) => {
    // guard on the resources, not on the node type (Sprite/Points are not isMesh)
    const withGeo = o as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
    withGeo.geometry?.dispose();
    const mat = withGeo.material;
    if (Array.isArray(mat)) mat.forEach(disposeMaterial);
    else if (mat) disposeMaterial(mat);

    const light = o as THREE.Light & { shadow?: THREE.LightShadow };
    // renderer.dispose() does NOT free shadow-map render targets
    light.shadow?.dispose?.();
  });

  scene.environment = null;
  scene.background = null;

  extras.forEach((e) => e?.dispose());

  // Contexts accumulate as students move between stations; browsers cap them
  // around 8–16 and silently kill the oldest.
  renderer.forceContextLoss();
  renderer.dispose();
}

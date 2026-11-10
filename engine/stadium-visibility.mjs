/**
 * Camera-specific visibility for the stadium roof.
 *
 * Roof geometry is assigned to layer 1 only. The normal world remains on
 * layer 0. Broadcast cameras render layer 0, so the roof is omitted only
 * from that camera. Alternate/replay cameras can render both layers.
 */
export const STADIUM_ROOF_LAYER = 1;

export function markRoofForCameraExclusion(mesh) {
  if (!mesh?.layers?.set) throw new TypeError("Roof mesh must expose Three.js layers");
  mesh.layers.set(STADIUM_ROOF_LAYER);
  return mesh;
}

export function configureStadiumCameraLayers(camera, { hideRoof = true } = {}) {
  if (!camera?.layers?.set || !camera?.layers?.enable) {
    throw new TypeError("Camera must expose Three.js layers");
  }
  camera.layers.set(0);
  if (!hideRoof) camera.layers.enable(STADIUM_ROOF_LAYER);
  return camera;
}

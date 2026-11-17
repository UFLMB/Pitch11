# PITCH 11

Original mobile-first football game project.

## Player UV mapping — canonical reference

The accepted player UV atlas convention is documented in [Player UV anatomical mapping](docs/PLAYER-UV-ANATOMICAL-MAPPING.md).

- Known-good visual baseline: GitHub Actions run **18**.
- Projection: `x = u × (image_width − 1)`, `y = v × image_height`.
- No horizontal or vertical mirroring; no image rotation.
- UV outlines and numbered marker centers must use the same projection.
- Keep the source texture unchanged and marker text upright.
- Do not alter this convention without an explicit, deliberate mapping revision.

The generator is `scripts/generate-uv-mapping.py`; its output is diagnostic only and does not modify the match model or gameplay.

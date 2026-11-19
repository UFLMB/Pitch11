# Vendored Three.js runtime

- Upstream: https://github.com/mrdoob/three.js
- Pinned release: **r185 / npm 0.185.0**
- License: MIT (see `LICENSE`)
- `build/three.module.js` is the official r185 minified ES module build, with its matching `three.core.min.js`.
- Only the addons and transitive modules used by PITCH 11's GLTF/FBX player renderer are included.

The project uses `PCFSoftShadowMap`, which was removed in r186. Keep this dependency pinned to r185 until the renderer is deliberately migrated and tested against a newer Three.js release.

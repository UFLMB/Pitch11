# PITCH 11 — Stadium clothing integration status

## Current implementation

The stadium currently creates non-player people procedurally in `stadium-runtime.js` and `stadium-environment-runtime.js`:

- Spectators are assembled from instanced primitive meshes.
- Security personnel are assembled from capsule and box meshes.
- Touchline staff are assembled from simple primitive meshes.

These are not the same UV-mapped character model used by the player kit editor.

## Existing player textures

The player kit editor stores generated kit textures in the browser's IndexedDB database, `pitch11-team-kit-templates`, in the `playerKits` and `teamKits` stores. The current player renderer applies those textures to the matching player-model mesh parts.

Those generated textures are authored for the player character's UV layout. They are not yet wired into the stadium crowd, security, or staff renderers, and cannot safely be assigned to the current primitive meshes as-is because their UV layouts and garment geometry are different.

## Not yet implemented

- Reusing the existing generated player clothing textures on non-player stadium people.
- Replacing or adapting the procedural stadium people with UV-compatible character meshes.
- Visual verification of non-player clothing in a live match.

No claim is made that the FC-style non-player clothing integration is complete. The player models, player rigs, animations, and gameplay systems remain separate and are not part of this work.

## Integration requirements

To reuse the existing textures correctly, the stadium people need compatible character meshes and UV mappings, or a deliberate texture-atlas conversion for each target mesh. The browser-local IndexedDB textures also need to be available in the same browser origin at runtime. Any implementation must preserve instancing and the mobile crowd density/performance budget.

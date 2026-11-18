# Mixamo character model upload

Upload the verified skinned Mixamo character to this folder using the exact filename:

`character.fbx`

The production renderer now checks this asset first and binds the 54 FBX animation clips directly to its skeleton. The existing `assets/players/player.glb` remains a temporary fallback until this character file is present and validated.

## Required model properties

- FBX Binary
- Skinned mesh included
- T-pose or neutral reference pose
- Same Mixamo bone/node names used by the animation package
- Embedded textures preferred
- Keep the original skeleton and skin weights; do not rename bones or retarget

## Large-file upload

The verified character is approximately 49.4 MB, so it must be committed with Git LFS. The repository already tracks this exact path in `.gitattributes`, and the GitHub Pages workflow checks out LFS content.

From a computer with Git and Git LFS installed:

```bash
git lfs install
git clone https://github.com/UFLMB/Pitch11.git
cd Pitch11
# Copy the verified file to:
# input/player-model-candidate/character.fbx
git add .gitattributes input/player-model-candidate/character.fbx
git commit -m "Add verified Mixamo character FBX"
git push origin main
```

Do not upload the file as an ordinary Git blob: GitHub's browser upload limit is 25 MB. Do not split or rename the FBX. The original animation FBX files remain in `input/player-package/` and should not be moved.

Until the model is uploaded, the game continues using the existing fallback model. No production model is removed by this change.

# PITCH 11 — Character FBX

The game renderer uses only the verified skinned Mixamo character at this exact path:

`input/player-model-candidate/character.fbx`

There is no substitute player model. If this FBX is missing or cannot be loaded, the renderer reports an asset error and does not silently switch to another model.

## Required model properties

- Binary FBX
- Skinned mesh included
- T-pose or neutral reference pose
- Same Mixamo bone/node names used by the active animation package
- Embedded textures preferred
- Preserve the original skeleton and skin weights; do not rename bones or retarget

## Animation compatibility

The active package contains 56 FBX sources, including 13 active individually named goalkeeper clips. One fingertip-save candidate was rejected after 54 in-goal contact trajectories. The automated rig audit checks the active animation tracks against this character skeleton. The current audit reports 100% track-target coverage: 105 unique animation targets matched, 0 unmatched.

The 13 active new goalkeeper clips share one consistent skeleton signature and are registered in `engine/mixamo-animation-catalog.mjs`. Keep that catalog and its tests synchronized with any future filename changes.

## Large-file upload

The character is approximately 49.4 MB and must be committed with Git LFS. The repository already tracks this exact path in `.gitattributes`, and the GitHub Actions validation checks out LFS content.

From a computer with Git and Git LFS installed:

```bash
git lfs install
git clone https://github.com/UFLMB/Pitch11.git
cd Pitch11
# Copy the verified file to:
# input/player-model-candidate/character.fbx
git add .gitattributes input/player-model-candidate/character.fbx
git commit -m "Add verified Mixamo character FBX"
git push origin <your-working-branch>
```

Do not upload the file as an ordinary Git blob: GitHub's browser upload limit is 25 MB. Do not split or rename the FBX. The animation sources remain in `input/player-package/`.

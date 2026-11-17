# PITCH 11 – Player UV anatomical mapping

**Status:** Anatomical island identification accepted  
**Model:** `assets/players/player.glb`  
**Mapping:** 38 connected UV islands (HEAD 11 + BODY 27)

This document is the accepted semantic index for the existing UV islands. Island IDs refer to the corresponding numbered islands in the generated HEAD/BODY UV atlases and the diagnostic UV analysis. It does not modify the player mesh, UV coordinates, textures, skeleton, animations, or gameplay.

## HEAD – 11 islands

| Island | Accepted anatomical label |
|---:|---|
| 1 | Fej és arc fő felülete |
| 2 | Bal szem |
| 3 | Jobb szem |
| 4 | Szájüreg belső felülete / állkapocs |
| 5 | Felső fogsor környéke |
| 6 | Jobb szájzug és belső szájfelület |
| 7 | Bal szájzug és belső szájfelület |
| 8 | Alsó fogsor / állkapocs belső része |
| 9 | Nyelv fő felülete |
| 10 | Bal nyelvoldali felület |
| 11 | Jobb nyelvoldali felület |

## BODY – 27 islands

| Island | Accepted anatomical label |
|---:|---|
| 1 | Törzs – mellkas, has és hát |
| 2 | Bal kar – alkar és kéz régiója |
| 3 | Jobb kar – alkar és kéz régiója |
| 4 | Bal lábszár |
| 5 | Jobb lábszár |
| 6 | Jobb comb fő felülete |
| 7 | Bal comb fő felülete |
| 8 | Bal felkar fő felülete |
| 9 | Jobb felkar fő felülete |
| 10 | Jobb térd / comb-lábszár átmenet |
| 11 | Bal térd / comb-lábszár átmenet |
| 12 | Bal lábfej fő felülete |
| 13 | Jobb lábfej fő felülete |
| 14 | Bal comb kisebb felülete |
| 15 | Jobb comb kisebb felülete |
| 16 | Bal felkar kisebb felülete |
| 17 | Jobb felkar kisebb felülete |
| 18 | Jobb lábfej – talp / lábujj felület |
| 19 | Bal lábfej – talp / lábujj felület |
| 20 | Jobb cipő – stoplik |
| 21 | Bal cipő – stoplik |
| 22 | Jobb cipő – nyelv oldalsó része |
| 23 | Bal cipő – nyelv oldalsó része |
| 24 | Bal cipő – külső oldali vonalszerű részlet a cipőnyelv csatlakozásánál |
| 25 | Jobb cipő – külső oldali vonalszerű részlet a cipőnyelv csatlakozásánál |
| 26 | Bal cipő – belső oldali vonalszerű részlet a cipőnyelv csatlakozásánál |
| 27 | Jobb cipő – belső oldali vonalszerű részlet a cipőnyelv csatlakozásánál |

## User-confirmed garment masks

The user has visually confirmed the garment selections as exact. Preserve these masks without changing UV coordinates or island numbering. Island numbers below are the visible one-based IDs; implementation arrays use zero-based indices.

| Garment | BODY island IDs | Notes |
|---|---|---|
| Jersey | 1, 8, 9, 16, 17 | Islands 16 (left) and 17 (right) are the inner jersey panels and must remain included |
| Shorts | 6, 7, 14, 15 | Islands 14 (left) and 15 (right) are the inner shorts panels and must remain included; knee transition islands 10–11 are excluded |
| Socks | 4, 5 | Left and right lower-leg fabric panels |
| Boots | 12, 13, 18–27 | Footwear panels, soles, studs and tongue details |

These four independent selections are user-approved. Do not expand, reduce, reorder, or reinterpret them without explicit user direction. Knee transition islands 10–11 must not be included in the shorts recolouring mask.

## Coordinate and integrity rules

- **Canonical baseline: GitHub Actions run 18** (commit `b3b3ef31baaf396e6a91601a3ab75d1f4f50b0cf`, “Correct UV mapping center calculation”). The user visually confirmed both generated atlases as correct.
- Preserve the stored UV coordinate orientation. Do not apply horizontal/vertical mirroring, image rotation, or a second corrective flip.
- **Exact atlas projection used by the accepted output:** `x = u × (texture_width − 1)`; `y = v × texture_height`. PIL's top-left image origin is used directly with the stored UV values. In particular, do not replace `v` with `1 − v`.
- Island marker centers must use the same convention: `center_x = center_u × (image_width − 1)`; `center_y = center_v × image_height`. Do not independently flip marker positions.
- Keep marker digits upright and readable; do not rotate or mirror the text.
- The yellow UV outlines must continue to represent the source UV triangles exactly. The original base-colour texture remains unchanged.
- Keep the accepted HEAD/BODY island numbering stable. Do not reorder or merge islands.
- Texture editing may change texture pixels only. It must not change mesh geometry, UV coordinates, rigging, animation, physics, AI, or gameplay.
- Treat this document as the semantic label index; use the generated UV analysis JSON for exact triangle coordinates and mesh-local bounds.

## Completion

The 38 anatomical labels and left/right assignments listed above are the accepted mapping. The accepted BODY and HEAD atlases were generated in Actions run 18 and visually confirmed by the user. Run 18 is the known-good reference. Its center calculation uses `center_v` directly (not `1 - center_v`). Keep this convention consistent in the generator, generated report, and all future diagnostic outputs. No additional mirroring or UV-layout adjustment is permitted unless the user explicitly requests a new mapping revision.

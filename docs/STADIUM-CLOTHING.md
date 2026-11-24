# PITCH 11 — Stadium clothing layer

## Scope

This layer improves the clothing variety of non-player stadium characters. It is separate from the match-player renderer and does not alter player rigs, player animation clips, or gameplay systems.

## Spectators

The crowd continues to use instanced meshes and the existing mobile density reduction. Per-spectator variation includes:

- Team-neutral and team-color shirts with varied brightness.
- Outerwear panels in muted jacket and coat palettes.
- Hooded layers, caps with brims, and scarves.
- Varied trouser colors.
- Existing skin-tone and hair-color variation is preserved.

The additional clothing pieces are instanced by garment type rather than creating a separate draw call for each spectator.

## Touchline and security staff

Touchline staff have role-specific jacket layers, visible zippers and collars, photographer camera equipment, and medical-role props. Security uniforms retain dark base clothing and high-visibility vests, with reflective torso and sleeve bands plus a radio.

## Visual QA

The automated workflow validates JavaScript syntax, environment setup, and the existing regression suite. Final appearance and frame-time checks still require a live match on representative mobile hardware, especially the POCO M8 5G. The current procedural meshes are a performance-conscious base layer; they are not a substitute for a future detailed, rigged human-wardrobe asset set if close-up cinematic shots require higher fidelity.

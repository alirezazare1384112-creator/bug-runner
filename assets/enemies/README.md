# Bug Runner — Enemy Design Reference

> Companion to Byte the Debugger hero sheet.
> All enemies share Byte's visual world: stylized 3D cartoon-modern, polished clean surfaces, deep navy background `#10152B`.
> Each enemy has a different signature accent color so they're distinguishable from each other and from the hero at 64–128 px tall.

---

## Roster Overview

| # | Enemy | Type | Accent Color | Hex | Behaviour |
|---|---|---|---|---|---|
| 1 | **Glitch** | Crawler (basic) | Magenta | `#FF3DC8` | Walks toward player, slow but unpredictable |
| 2 | **Syntax Error** | Flying | Red | `#FF4747` | Flies in sine-wave pattern |
| 3 | **Malware Worm** | Fast crawler | Orange | `#FF8A3D` | Slides quickly across ground in S-shape |
| 4 | **Stack Brute** | Heavy / mini-boss | Cyan | `#3DFFEB` | Slow, takes multiple hits, knocks player back |
| 5 | **Null Spike** | Static ground hazard | Purple | `#7A3DFF` | Immobile spike, must jump over |
| 6 | **Infinite Loop** | Rotating ring hazard | Yellow | `#FFD23D` | Spins in place, must time jump |

---

## Design Principles (shared with Byte)

- Same material language: glossy polymer shells, matte tech fabric, glowing accents.
- Same palette base: white-silver `#EAF2FF`, dark blue `#19386B`, primary blue `#477BFF`.
- Each enemy uses ONE distinct accent color to communicate threat type at a glance.
- Cute-but-threatening — readable silhouette even without color.
- All designs convertible to sprite sheets or 3D models later.

---

## Per-Enemy Specs

### 1. Glitch (basic crawler)
- Body: white-silver polymer with magenta glitchy pixel squares scattered on the surface.
- Asymmetric eyes — one big, one small, both glowing magenta.
- Broken pixelated edges, slight digital distortion.
- Short stubby arms and legs, oversized head.
- No mouth.
- Animation plan: walk cycle (3-4 frames), idle flicker, damage dissolve.

### 2. Syntax Error (flyer)
- Body: small dark blue central core.
- Wings: two broken red bracket glyphs (`<` and flipped `>`), glowing red.
- Two small red glowing eyes.
- Always floats — no legs.
- Animation plan: wing flap cycle, sine-wave hover, dive attack.

### 3. Malware Worm (fast crawler)
- Body: 7-8 segmented rounded cubes alternating orange/yellow.
- Each segment has small side spikes.
- Head segment: two orange eyes + small mouth opening.
- Body curls in S-shape on ground.
- Animation plan: slither cycle (4-5 frames), speed lines when rushing.

### 4. Stack Brute (heavy)
- Body: stacked dark blue cubes with cyan glowing seams.
- Large rectangular arms ending in cube fists.
- Single big cyan glowing eye in center of body.
- Short stubby legs (two cubes each).
- White-silver corner trims.
- Animation plan: slow walk, arm slam attack, hit reaction, defeat crumble.

### 5. Null Spike (static hazard)
- Sharp crystal spike rising vertically from ground.
- Dark purple crystal with darker base.
- Single eye near the top.
- "null" symbol engraved at the base.
- No movement — pure placement hazard.
- Animation plan: idle eye blink, subtle glow pulse.

### 6. Infinite Loop (rotating ring hazard)
- Glowing yellow circular ring floating just above ground.
- Two small arrow marks indicating clockwise rotation.
- Translucent energy material.
- Spins continuously.
- Animation plan: constant rotation, slight vertical bob.

---

## Files

All enemy sheets live in `assets/enemies/`:

| File | Contents |
|---|---|
| `00_enemy_roster.png` | All 6 enemies side-by-side for at-a-glance comparison |
| `01_glitch_model.png` | Glitch 5-view turnaround |
| `02_syntax_error_model.png` | Syntax Error 4-view (front, 3/4, side, top) |
| `03_malware_worm_model.png` | Malware Worm 3-view (side, 3/4, head close-up) |
| `04_stack_brute_model.png` | Stack Brute 5-view turnaround |
| `05_hazards.png` | Null Spike + Infinite Loop side-by-side |

Generation scripts kept under `/home/z/my-project/scripts/enemy_prompts/` and `/home/z/my-project/scripts/gen_enemies.sh`.

---

## Difficulty Progression (suggested)

1. **Tutorial / Level 1:** Glitch + Null Spike only
2. **Level 2:** + Syntax Error (flying)
3. **Level 3:** + Malware Worm (fast ground)
4. **Level 4:** + Infinite Loop (timing hazard)
5. **Level 5 (boss):** Stack Brute mini-boss + mixed waves

---

## Next Steps

1. Review enemy designs — approve base looks.
2. Build sprite sheets / animation frames from these references.
3. Design environment themes (terminal, server room, firewall, kernel).
4. Implement in-engine spawn logic + AI per enemy type.

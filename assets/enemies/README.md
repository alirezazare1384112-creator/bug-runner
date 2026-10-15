# Bug Runner — Enemy Design Reference (Rev 2 — Pixel-Glitch Style)

> Companion to Byte the Debugger hero sheet.
> **Style aligned to player reference images**: glossy dark bodies + neon emissive pixel/voxel accents + glitch aesthetic (scattered pixel squares, floating pixel particles, occasional data streaks).
> All enemies rendered on transparent-checkered background (white-and-gray checkerboard indicating alpha channel) for direct use as game assets.

---

## Visual Style (shared across all enemies)

| Property | Value |
|---|---|
| Render style | High-fidelity stylized 3D, polished PBR materials |
| Body material | Glossy dark polymer/metal — charcoal-black, deep navy, dark purple |
| Accents | Neon emissive pixel/voxel squares in red, magenta, orange, cyan, yellow |
| Eye style | Pixel art (slanted angry shapes, X shapes, square grids), emissive |
| Mouth style | Simple pixel lines or jagged voxel voids |
| Glitch details | Scattered glowing pixel squares on body, floating particle squares, horizontal data streaks |
| Lighting | Soft studio, rim light on edges, soft contact shadow |
| Background | Transparent checkered (PNG alpha) |

---

## Roster Overview

| # | Enemy | Type | Accent Color | Hex | Behaviour |
|---|---|---|---|---|---|
| 1 | **Glitch Spider** | Crawler (basic) | Red | `#FF0033` | Walks toward player, predatory low crouch |
| 2 | **Glitch Cube** | Heavy / mini-boss | Magenta + Cyan | `#FF3DC8` / `#3DFFEB` | Slow, takes multiple hits |
| 3 | **Malware Worm** | Fast crawler | Orange | `#FF8A3D` | Slides quickly in S-curve |
| 4 | **Syntax Error** | Flying | Red | `#FF4747` | Flies in sine-wave pattern |
| 5 | **Null Spike** | Static ground hazard | Purple | `#7A3DFF` | Immobile spike, must jump over |
| 6 | **Infinite Loop** | Rotating ring hazard | Yellow | `#FFD23D` | Spins, must time jump |
| 7 | **Server Tower** | Environmental enemy | Red + Cyan | `#FF4747` / `#42E8E0` | Stationary, shoots error projectiles, smokes |

---

## Per-Enemy Specs

### 1. Glitch Spider
- Glossy black dome-bodied robotic spider, 8 mechanical jointed legs with visible ball-and-socket joints.
- Circular black faceplate (visor) with two slanted angry RED pixel eyes + red pixel frown.
- Red pixel squares scattered on abdomen (digital corruption texture).
- Two thin segmented antennae with glowing red tip bulbs.
- Floating red square outlines (hollow squares) drift around body.
- Predatory low crouch pose.

### 2. Glitch Cube
- Perfect cube with heavily beveled edges, made of interlocking voxel segments.
- Deep void-purple / dark indigo, almost black.
- Recessed square face plate on front.
- Two glowing WHITE/MAGENTA X-shaped pixel eyes (voxel blocks forming an X).
- Jagged rectangular void mouth filled with bright magenta voxel energy.
- Thin neon magenta/cyan lines tracing beveled edges.
- Floating magenta particle voxels + horizontal glitch streaks.

### 3. Malware Worm
- Long segmented worm body, 7-8 rounded cube segments.
- Each segment: glossy charcoal-black with orange glowing pixel seams.
- Small orange pixel spikes on each segment.
- Head: two orange pixel eyes + jagged orange pixel mouth.
- Body in S-curve on ground.
- Floating orange pixel particles trail behind.

### 4. Syntax Error
- Small dark navy central body, glossy.
- Two large wings made of broken RED PIXEL bracket glyphs: one `<`, one flipped `>`.
- Wing edges glow red; red pixel particles trail behind wings.
- Two small red pixel eyes in center.
- Always floats — no legs.

### 5. Null Spike
- Sharp crystal spike rising vertically from ground.
- Deep void-purple crystal, darker base.
- Single glowing PURPLE PIXEL EYE near the top (small square grid).
- "null" pixel text engraved at base, glowing purple.
- Floating purple pixel squares drift around.

### 6. Infinite Loop
- Glowing YELLOW circular ring floating just above ground.
- Made of small bright yellow pixel squares arranged in a circle.
- Two small arrow pixel marks indicating clockwise rotation.
- No eyes. Translucent energy material.
- Yellow pixel particles orbiting.

### 7. Server Tower
- Tall rectangular prism tower, deep navy-blue industrial metal, chamfered edges.
- Wider stepped rectangular base.
- Top: recessed ventilation grate, plume of volumetric grey smoke rising, orange-yellow ember glow at smoke source.
- Front-left panel: large illuminated RED WARNING TRIANGLE with "!" exclamation mark (acts as angry eye).
- Front-right panel: four stacked server drive bays with mix of solid BLUE (operational) and RED (error) square LEDs — resembles a mouth/teeth grid.
- Three thick black corrugated cables emerging from bottom-right, coiling onto base like tentacles.
- Thin cyan glowing edge lines on top corners and base edge. One base corner has RED glow instead of cyan (damage indicator).
- Stationary — shoots error projectiles from bays.

---

## Files

All enemy sheets live in `assets/enemies/`:

| File | Contents |
|---|---|
| `00_enemy_roster.png` | All 6 enemies side-by-side for at-a-glance comparison |
| `01_glitch_model.png` | Glitch Spider 5-view turnaround |
| `02_syntax_error_model.png` | Syntax Error 4-view (front, 3/4, side, top) |
| `03_malware_worm_model.png` | Malware Worm 3-view (side, 3/4, head close-up) |
| `04_stack_brute_model.png` | Glitch Cube 5-view turnaround |
| `05_hazards.png` | Null Spike + Infinite Loop side-by-side |
| `06_server_tower_model.png` | Server Tower 4-view (3/4, front, side, back) |

Generation scripts kept under `/home/z/my-project/scripts/enemy_prompts/` and `/home/z/my-project/scripts/gen_enemies.sh`.

---

## Difficulty Progression (suggested)

1. **Tutorial / Level 1:** Glitch Spider + Null Spike only
2. **Level 2:** + Syntax Error (flying)
3. **Level 3:** + Malware Worm (fast ground) + Infinite Loop (timing hazard)
4. **Level 4:** + Server Tower (stationary shooter)
5. **Level 5 (boss):** Glitch Cube mini-boss + mixed waves

---

## Next Steps

1. Review redesigned enemies — confirm they match player reference style.
2. Build sprite sheets / animation frames from these references.
3. Design environment themes (terminal, server room, firewall, kernel).
4. Implement in-engine spawn logic + AI per enemy type.

# Byte — Character Design Reference

> **Bug Runner** • Hero Character Sheet
> **Slogan:** Run. Jump. Debug. Repeat.
> **Project:** Bug Runner (indie runner game) — for CE-Hub

---

## 1. Identity

| Field | Value |
|---|---|
| Name | **Byte** |
| Full name | Byte the Debugger |
| Role | Hero of Bug Runner |
| World | Digital / programming world |
| Personality | Smart, curious, agile, brave, playful, modern |
| Voice | No dialogue — emotion via eyes, head tilt, body language |

## 2. Color Palette

| Role | Color | Hex |
|---|---|---|
| Helmet / gloves (white-silver) |  | `#EAF2FF` |
| Background / base (deep navy) |  | `#10152B` |
| Panels (primary blue) |  | `#477BFF` |
| Eyes / core / accents (glow turquoise) |  | `#42E8E0` |
| Jumpsuit (outfit blue) |  | `#19386B` |

## 3. Proportions

- Head: ~40–45% of total height (large for readability and cuteness).
- Compact athletic runner body, not heavy industrial robot.
- Limbs slightly exaggerated for animation clarity.
- Oversized sporty sneakers (so foot motion reads in small sprites).
- Head is the most important part for visual identity — focus design effort there.

## 4. Head

- Outer shell: white-silver (`#EAF2FF`) glossy polymer, rounded edges — not fully cubic, not fully spherical.
- Subtle turquoise (`#42E8E0`) seam lines along edges.
- Central face: glossy black glass visor with slight depth.
- Two simple glowing turquoise oval eyes — readable from far.
- No human mouth — emotion only via eyes + light bar + head tilt.
- Thin turquoise light bar across top of helmet (the "eyebrow").
- Two small side sensor modules like digital headphones.
- Small unique geometric signature mark (suggested: `< >` or `{ }` glyph motif).

## 5. Body & Outfit

- Dark blue (`#19386B`) athletic tech-wear jumpsuit.
- Light blue (`#477BFF`) panels.
- Turquoise (`#42E8E0`) accent lines along shoulders and arms.
- Simple white gloves.
- Sporty futuristic sneakers with bright soles and limited neon detail.
- **Chest energy core:** glowing turquoise geometric crystal, signature element.
  - Idle: soft glow.
  - Running: slightly more vivid.
  - Collecting item: brightens.
  - Special power: distinct effect.
  - Damaged: brief amber/red shift.
- Optional small digital pouch on lower back — only if it improves silhouette without hurting motion.

## 6. Materials

| Part | Material |
|---|---|
| Helmet shell | Glossy polymer, soft reflections |
| Visor | Glossy black glass |
| Outfit | Matte technical fabric with reinforced panels |
| Sneakers | Sport material, bright sole |
| Chest core | Translucent energy crystal |
| Side modules | Light matte metal |

## 7. Animation Keyframes (planned)

1. Idle — breathing + blink.
2. Run A / Run B — full stride cycle.
3. Jump Prep (anticipation, brief).
4. Jump Apex (airborne, readable).
5. Land (squash + soft recovery).
6. Collect (reach + sparkle).
7. Damage (short flinch).
8. Victory (both arms up + core pulse).

Apply: Squash & Stretch, Anticipation, Follow-through, Overlapping Action — controlled intensity.

## 8. Emotion States (planned)

Idle · Happy · Focused · Excited · Surprised · Scared · Damaged · Determined · Victorious

The helmet form, visor, and chest core stay fixed across all states. Only eyes, light bar intensity, and head tilt change.

## 9. Files

All reference sheets live in `assets/byte/`:

| File | Contents |
|---|---|
| `01_model_sheet_turnaround.png` | 5 views (front, 3/4 front, profile, 3/4 back, back) |
| `02_emotion_expressions.png` | 9 emotion face states (3×3 grid) |
| `03_animation_keyframes.png` | 8 animation keyframes (run, jump, land, collect, victory) |
| `04_detail_callouts.png` | Close-ups: chest core, visor, sneaker, signature mark |
| `05_color_material_palette.png` | Hero pose + 5 color swatches + 4 material samples |
| `06_hero_pinup.png` | Single dynamic hero shot for splash/cover reference |

Generation scripts are kept under `/home/z/my-project/scripts/byte_prompts/` and `/home/z/my-project/scripts/gen_byte.sh` so the sheets can be re-generated or revised later.

## 10. Design Constraints

- Custom silhouette — must read even without color.
- Stays readable at 64–128 px tall on screen.
- No direct copies of famous game characters.
- No over-bloom that hides the body.
- All views must be the same character model — no per-view redesign.
- Designed to be later convertible to 3D model, sprite sheet, or 2D asset pack.

## 11. Next Steps

1. Review this sheet and approve Byte's base look.
2. Design enemies (bugs, glitches, malware types).
3. Build actual sprite sheets / 3D model.
4. Implement in-engine animation state machine.

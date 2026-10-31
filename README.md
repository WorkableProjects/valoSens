# valoSens: Valorant sensitivity finder

Open `index.html` in a browser. It needs no build step or server, and nothing leaves the page.

## How the number is computed

There are no per-answer multipliers. The app minimizes an expected time-cost per engagement over C (cm/360):

```
J(C) = λ·A/C² + B·C + 0.30 s·lifts(C) + 0.15 s·reposition(C) + zone(C)
```

- **Precision term `λ·A/C²`:** hand endpoint noise σ, expressed in degrees, relative to head size at the engagement distance r. It is summed over a role's task mix.
- **Travel term `B·C`:** movement amplitude ÷ limb speed v.
- **Reach terms:** expected overrun of the pad half-width and of the aiming joint's comfortable sweep (wrist ≈ 7 cm, forearm ≈ 30 cm, arm ≈ 45 cm).
- **Zone term:** a soft penalty outside 20–80 cm/360, the band where NVIDIA's study found performance stays flat.

**Calibration from pro data** (`research/vct_2026_pro_player_settings.md`, roles in `research/pro_roles.md`):
- λ is solved so that a reference player (forearm aimer, 49 cm hybrid pad, rifle, flex role) lands on the 32-pro median, 68.1 cm.
- Each role's engagement distance r is solved so that the same reference player of that role lands on the role's pro median. Medians are shrunk toward the overall median with 6 pseudo-players.

**Your current setting** is combined with the model optimum in log space, weighted by inverse variance:
- Satisfaction sets how much the current setting is trusted, from ±10% to ±40%.
- Stats (HS%, K/D and ADR compared with typical values for your rank, weighted by match count) tighten or loosen that trust.
- HS% also scales the precision weight slightly, capped at ×0.85–1.2.

The research behind the model is in `research/model_research.md`.

## Files

- `index.html`: the questionnaire UI and results, with the cost curve and pro comparison charts.
- `model.js`: the model, including the pro dataset and calibration. Works in the browser and in Node.
- `test/model.test.js`: run with `node test/model.test.js`.
- `Valorant sensitivity finder.html`: the earlier multiplier-based version, kept for reference.

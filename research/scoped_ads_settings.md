# Valorant Scoped / ADS Sensitivity Multipliers: research notes

Compiled 2026-11-01. Evidence labels:
- **OFFICIAL (Riot)**: Riot patch notes or Riot statements. The official VALORANT wiki (wiki.playvalorant.com) is used for weapon stats. It is Riot-hosted but community-edited, so its numbers are labeled **COMMUNITY-VERIFIED** unless the page cites game files.
- **MEASURED**: a published in-game measurement with a stated method.
- **COMMUNITY-VERIFIED**: several independent community or calculator sources agree.
- **ESTIMATE**: derived here by calculation from stated assumptions, or a single unverified source.

Limitations:
- mouse-sensitivity.com returns HTTP 403 to automated fetches (forum threads 6717, 7111 and 7604, and /n/valorant/). Its claims are known only second-hand, through other pages that cite it.
- No Riot patch note was found that introduced or described the multipliers.

---

## 1. Settings, defaults and ranges, and which weapon uses which multiplier

| Item | Finding | Label | Source |
|---|---|---|---|
| Hipfire "Sensitivity: Aim" | Base sensitivity. Yaw is 0.07°/count at sens 1. | COMMUNITY-VERIFIED (several converters) | https://ultimatemove.eu/en/sensitivity-calculator-converter/ , https://dcprosens.com/blog/the-math-behind-operator-awp-focal-matching/ |
| "Scoped Sensitivity Multiplier" | Exists under Settings → General → Mouse. Default 1.0. It multiplies Sensitivity: Aim. | COMMUNITY-VERIFIED | https://edpi-calculator.org/tools/valorant-scoped-sensitivity , https://www.setup.gg/game/valorant/best-sens/ |
| "ADS Sensitivity Multiplier" | Is a separate setting: it sits next to the scoped multiplier and defaults to 1.0. Several guides and a calculator describe it, a pro (florescent) is listed with ADS 0.722 / scoped 0.722, and a July 2024 X post gives "ADS/SCOPE" values. No Riot patch note naming when it was added was found. | COMMUNITY-VERIFIED (existence); introduction date unknown | https://edpi-calculator.org/tools/valorant-scoped-sensitivity , https://www.setup.gg/game/valorant/best-sens/ , https://game-sens.jor.dev/ , https://x.com/CARTOONFPS/status/1812969676378632553 (status ID dates it to July 2024; text seen only as a search snippet) |
| Slider min/max range | **Not found** in any source checked. Do not hard-code a range without checking in game. | n/a | — |
| Default hipfire sens value | Not verified in this pass. | n/a | — |
| Hipfire FOV | 103° horizontal, locked. Stretched or 4:3 changes the display but not the horizontal FOV. | COMMUNITY-VERIFIED | https://edpi-calculator.org/tools/valorant-scoped-sensitivity , https://game-sens.jor.dev/ |

**Weapon → multiplier mapping.** Two calculators agree on this mapping (COMMUNITY-VERIFIED). Sources: https://edpi-calculator.org/tools/valorant-scoped-sensitivity , https://game-sens.jor.dev/

| Zoom tier | Weapons / abilities | Multiplier used |
|---|---|---|
| 1.15x | Stinger, Spectre, Ares, Odin | ADS |
| 1.25x | Bulldog, Phantom, Vandal | ADS |
| 1.5x | Guardian, Chamber **Headhunter** | ADS |
| 2.5x / 5x | Operator (two zoom levels), Chamber **Tour de Force** | Scoped |
| 3.5x | Marshal, Outlaw | Scoped |

- Sheriff and Ghost: their wiki pages list no alt-fire or ADS (https://wiki.playvalorant.com/en-us/Sheriff , https://wiki.playvalorant.com/en-us/Ghost). The pages are not exhaustive, so treat this as "no ADS documented."
- One guide (gear-rank.com, via search snippet) says the scoped multiplier applies "only to the three sniper rifles." Tour de Force is a sniper and appears in the scoped group on edpi-calculator. **Verify in game which slider Tour de Force reads.** No first-hand test was found.

## 2. Zoom levels (magnification)

| Weapon | Zoom | Label | Source |
|---|---|---|---|
| Operator | 2.5x and 5x (dual zoom) | COMMUNITY-VERIFIED (official wiki, no game-file citation) | https://wiki.playvalorant.com/en-us/Operator |
| Marshal | 3.5x. Raised from 2.5x in **v2.03**. | COMMUNITY-VERIFIED (wiki patch history) | https://wiki.playvalorant.com/en-us/Marshal |
| Outlaw | 3.5x | COMMUNITY-VERIFIED | https://wiki.playvalorant.com/en-us/Outlaw |
| Guardian | 1.5x | COMMUNITY-VERIFIED | https://wiki.playvalorant.com/en-us/Guardian |
| Vandal (and Phantom, Bulldog) | 1.25x | COMMUNITY-VERIFIED | https://wiki.playvalorant.com/en-us/Vandal , edpi-calculator |
| Spectre (and Stinger, Ares, Odin) | 1.15x | COMMUNITY-VERIFIED | https://wiki.playvalorant.com/en-us/Spectre , edpi-calculator |
| Chamber Headhunter (ADS) | 1.5x. The wiki cites game files. It was reduced from 1.75x in an undocumented change. | COMMUNITY-VERIFIED (game-file citation on wiki) | https://wiki.playvalorant.com/en-us/Headhunter |
| Chamber Tour de Force | Wiki says "2.5x – 5x", marked **estimated / manually tested**. Mobalytics says it has two zoom levels like the Operator. | ESTIMATE | https://wiki.playvalorant.com/en-us/Tour_De_Force , https://mobalytics.gg/blog/valorant/valorant-chamber-agent-guide/ |

**How zoom maps to FOV.** Calculators assume zoomed horizontal FOV = 103° / zoom. That gives 1.25x = 82.40°, 2.5x = 41.20°, 3.5x = 29.43° and 5x = 20.60°. Label: COMMUNITY-VERIFIED (the calculators agree; game-sens.jor.dev says aim trainers use the same Operator FOV). Nobody published a measurement of this.

The alternative definition is "true" magnification, where tan(fz/2) = tan(fh/2)/zoom. It would give different FOVs: 2.5x = 53.39°, for example. The tables below show both.

## 3. How a multiplier of 1.0 scales

**Main finding (COMMUNITY-VERIFIED, not MEASURED):** at a multiplier of 1.0, Valorant does **not** keep cm/360 constant. It scales sensitivity by the FOV ratio (zoomed FOV ÷ hipfire FOV), which is **100% horizontal monitor-distance match**. In vertical terms that is **MDV 177.78%** (16:9).

Evidence:
- game-sens.jor.dev: "both default to 1.0, which matches at the 16:9 screen edge (100% monitor distance)", and "Valorant 1.0 equals MDV 177.78% per mouse-sensitivity.com". https://game-sens.jor.dev/
- edpi-calculator.org: 1.0 "matches hipfire feel only for flicks to the screen edge (100% monitor match)". Near the crosshair, scoped aim at 1.0 feels slightly faster than hipfire. https://edpi-calculator.org/tools/valorant-scoped-sensitivity
- Title of mouse-sensitivity.com forum thread 7604: "Monitor Distance Coefficient. Why does 1.78 feel better than 0? Valorant/cs defaulted to 1.78/1.33?" This implies the MS community treats Valorant's default as coefficient 1.78 (vertical), i.e. 100% horizontal. https://www.mouse-sensitivity.com/forums/topic/7604-monitor-distance-coefficient-why-does-178-feel-better-than-0-valorantcs-defaulted-to-178133/ (title only; the body was 403)
- setup.gg: 1.0 "keeps each mode at the game's default relationship to your hip-fire sensitivity". It "does not make every zoom level move the same physical distance on screen". https://www.setup.gg/game/valorant/best-sens/

**Contradicting source:** ultimatemove.eu says "a scoped multiplier of 1.0 already equals 0% match on every scope". https://ultimatemove.eu/en/sensitivity-calculator-converter/ This is a single source with no derivation, and it conflicts with the others and with the 7604 thread title. I treat it as an outlier, but the tool should still note the disagreement.

**Unreliable source:** DCPROSENS gives "0.847" as the 0% value for the Operator and "1.150" for the 5x zoom, with no derivation. https://dcprosens.com/blog/the-math-behind-operator-awp-focal-matching/ A 0% value above 1.0 is inconsistent with any FOV-ratio model. Coincidentally, 0.847 equals the 50% MDM value for 2.5x under the tan-magnification model below. Do not use this source.

**Riot statements and patch notes:** none found on how the scaling works.

**Measured tests:** no published test was found that rotates a fixed mouse distance while scoped and compares it with hipfire (e.g. a cm/360 scoped vs. hipfire test). The mouse-sensitivity.com Valorant data was not readable here, so a test may exist there.

**Practical consequence:** if 1.0 = 100% MDM, then scoped cm/360 = hipfire cm/360 × zoom. For example, Operator 2.5x at 1.0 needs about 2.5× the mouse distance to turn 360°. This is an ESTIMATE that follows from the model above.

## 4. Multiplier values for common matching methods

Assumption: 1.0 = 100% horizontal MDM, so in-game sens scales by fz/fh.

For monitor fraction p:

```
target_ratio(p) = atan(p·tan(fz/2)) / atan(p·tan(fh/2))     (p→0: tan(fz/2)/tan(fh/2)  = focal-length / 0% MDM)
multiplier(p)   = target_ratio(p) / (fz/fh)
fh = 103° (horizontal), fz = zoomed horizontal FOV
```

**Table A: zoom FOV = 103°/zoom.** This is the calculators' model. Label: ESTIMATE (computed here). The 0% and 75% columns match edpi-calculator.org and game-sens.jor.dev to 3 decimals.

| Zoom (weapons) | slider | fz | 0% (focal) | 25% | 50% | 75% | 100% | 177.78% (MDV100) |
|---|---|---|---|---|---|---|---|---|
| 1.15x Spectre/Stinger/Ares/Odin | ADS | 89.57° | 0.908 | 0.918 | 0.944 | 0.973 | 1.000 | 1.055 |
| 1.25x Vandal/Phantom/Bulldog | ADS | 82.40° | 0.870 | 0.884 | 0.919 | 0.961 | 1.000 | 1.087 |
| 1.5x Guardian / **Headhunter** | ADS | 68.67° | 0.815 | 0.833 | 0.880 | 0.939 | 1.000 | 1.150 |
| 2.5x Operator / **TdF** (1st zoom) | Scoped | 41.20° | 0.747 | 0.769 | 0.828 | 0.909 | 1.000 | 1.281 |
| 3.5x Marshal / Outlaw | Scoped | 29.43° | 0.731 | 0.754 | 0.814 | 0.900 | 1.000 | 1.329 |
| 5x Operator / TdF (2nd zoom) | Scoped | 20.60° | 0.723 | 0.745 | 0.807 | 0.896 | 1.000 | 1.359 |

**Table B: sensitivity check with "true" magnification**, tan(fz/2) = tan(fh/2)/zoom. Label: ESTIMATE. It shows how much the answer depends on the unmeasured zoom definition.

| Zoom | fz | 0% | 50% | 75% | 100% |
|---|---|---|---|---|---|
| 1.15x | 95.10° | 0.942 | 0.965 | 0.984 | 1.000 |
| 1.25x | 90.33° | 0.912 | 0.947 | 0.975 | 1.000 |
| 1.5x | 79.93° | 0.859 | 0.911 | 0.956 | 1.000 |
| 2.5x | 53.39° | 0.772 | 0.847 | 0.920 | 1.000 |
| 3.5x | 39.52° | 0.745 | 0.825 | 0.907 | 1.000 |
| 5x | 28.23° | 0.730 | 0.813 | 0.900 | 1.000 |

Notes:
- The tool should use Table A, the community consensus, but flag the result as model-dependent. At 0%, the two models differ by about 0.025–0.04.
- **Viewspeed** (mouse-sensitivity.com "Viewspeed v2"): no formula or Valorant value was retrievable, so none is given. I did not invent one.
- **Changing hipfire sens while keeping the scoped feel:** new_mult = old_sens × old_mult / new_sens. This is the worked VLR example: 0.45 × 0.945 / 0.35 = 1.215. https://www.vlr.gg/86132/scoped-sens-multiplier (COMMUNITY-VERIFIED arithmetic)
- **One slider covers several zooms.** Within the scoped tiers the 0% values vary by only about 0.024 (0.723–0.747). Within the ADS tiers they vary by about 0.09 (0.815–0.908). Optimise for the player's main weapon in each slider group.
- **Stretched or 4:3 resolutions:** edpi-calculator says the 75% and 100% values assume native 16:9 and recommends 0% for stretched displays. That is COMMUNITY advice. The horizontal FOV stays 103°, so the horizontal-based formulas are unchanged.

## 5. Pro usage of the Scoped Sensitivity Multiplier

| Source | n | Date | Share at 1.0 | Other |
|---|---|---|---|---|
| proconfig.net | 113 "verified" pros | updated 2026-05-21 | 78/113 = **69.0%** | 23 below 1.0 (0.9 ×7, 0.8 ×5, 0.7 ×2, singles at 0.743, 0.75, 0.77, 0.82, 0.825, 0.85, 0.875, 0.945, 0.95); 12 above 1.0 (1.1 ×4, 1.009 ×2, 1.2 ×2, 1.05, 1.15, 1.3, 1.5). https://proconfig.net/stats/valorant-scoped-sensitivity/ |
| setup.gg (from ProSettings live list) | 614 players reporting | checked 2026-09-19 | 456/614 = **74.3%** | https://www.setup.gg/game/valorant/best-sens/ |
| prosettings.net guide | "705 pro players" overall; n for this stat not given | page says modified 2026-05-18, title says Oct 2026 | **79%**; mean 0.97 | https://prosettings.net/guides/valorant-options/ |

- All three are COMMUNITY-VERIFIED: aggregated self-reported or scraped configs.
- No ADS-multiplier distribution was found in any source.
- Anecdotes: TenZ is reported with ADS 1.0 and scoped 0.9 (search snippet, unverified). florescent uses 0.722 for both (setup.gg). 0.722 is close to the 0% values for the 3.5x–5x tiers.
- Reading: about 70–79% of pros run 1.0, i.e. 100% MDM. Most who deviate go **lower** (0.7–0.95), towards 0–75% MDM. The value 0.743 is almost exactly the 0% Operator value.

## 6. Evidence on which matching method helps performance

- **No controlled study found** comparing scoped or ADS matching methods (0% / 75% / 100% MDM) on hit rate or time-to-kill, in Valorant or elsewhere.
- Community arguments (COMMUNITY opinion only):
  - **0% (focal):** keeps the crosshair-near region moving at the same visual speed. It is argued to be best for micro-adjustments and tracking. Sources: https://www.mouse-sensitivity.com/forums/topic/7604-monitor-distance-coefficient-why-does-178-feel-better-than-0-valorantcs-defaulted-to-178133/ (title and snippet: "0 is the best... scales towards the center"), https://ultimatemove.eu/en/sensitivity-calculator-converter/
  - **Higher % (75–100%):** keeps flicks to targets far off-centre consistent with hipfire. Some players find 0% "too slow" when scoped. The 2024 CARTOON X post said the 0% ADS value felt great but the sniper values felt too slow.
  - **CS:GO feel:** edpi-calculator labels 75% "CS:GO feel". Many Valorant players come from CS, which may explain why 0.9 is the most common non-1.0 pro value. That explanation is an ESTIMATE / speculation.
- Pro prevalence of 1.0 is evidence of convention, not of optimality. Many pros may simply never change defaults.
- Strength of evidence: **weak**. Treat any match choice as a preference with a sensible default, not a performance-proven setting.

---

## Implications for the tool

General rule: keep **1.0 as the default** (it is Riot's default and what 70–79% of pros use). Offer a **"crosshair-match" option** computed from Table A for the player's main weapon in each slider group, with an "experimental, preference-based" tag. Always show the formula and the model caveat from §3–4.

**(a) Player who rarely scopes.**
- Recommend Scoped = 1.0 and ADS = 1.0.
- Rationale: there is little scoped time to train any other relationship. The defaults match pro convention. No evidence shows that another match improves performance.
- Optionally mention ADS 0.87 (0% for Vandal/Phantom) for players who right-click rifles at range.
- Evidence strength: convention (COMMUNITY-VERIFIED usage data); performance benefit unproven.

**(b) Chamber.**
- Headhunter is on the **ADS** slider at 1.5x; Tour de Force is on the **Scoped** slider. TdF's zoom is a wiki ESTIMATE of 2.5x/5x and its slider mapping is unverified in game.
- Default: 1.0 / 1.0.
- If the player wants crosshair matching: ADS ≈ 0.815 tunes it for Headhunter, but slows Vandal ADS relative to that weapon's own 0% value of 0.870. A compromise of about 0.84 would sit roughly 3% off each. Scoped ≈ 0.747 for TdF's first zoom.
- Tell the player that one ADS slider cannot be exact for both Headhunter and rifles. Also ask them to verify TdF behaviour in game.
- Evidence: zoom values are COMMUNITY-VERIFIED (Headhunter) or ESTIMATE (TdF); benefit unproven.

**(c) Jett / Operator main.**
- Scoped is the most consequential slider for them. Keep 1.0 as the default (most pros).
- Present 0.9 (≈75% MDM, the most common pro deviation) and 0.747 (0% match at 2.5x) as options.
- Note that only one value serves both 2.5x and 5x. The 0% values are 0.747 and 0.723, about 3% apart, so optimise for 2.5x.
- Evidence: pro distribution (COMMUNITY-VERIFIED, n = 113–614); matching math ESTIMATE; performance claim unproven.

**(d) Marshal / Outlaw heavy.**
- Same slider as the Operator. The 3.5x values are 0.731 (0%), 0.814 (50%), 0.900 (75%) and 1.000 (100%).
- Keep 1.0 as the default. If they also use the Operator, choose one value: the 0% values differ by only about 0.016, so one setting covers both.
- If the player reports being "too fast on Marshal micro-adjusts", suggest stepping toward 0.9 → 0.75.
- Evidence: zoom COMMUNITY-VERIFIED (the Marshal changed in v2.03, so re-check after patches); benefit unproven.

**Caveats the tool should surface:**
1. "1.0 = 100% MDM" is COMMUNITY-VERIFIED, not MEASURED, and one calculator disagrees.
2. The zoom-to-FOV model (Table A vs. B) is unmeasured.
3. No studies show that any match method improves performance.
4. Slider ranges were not verified.
5. Recompute the multiplier if hipfire sens changes: new_mult = old_sens × old_mult / new_sens.

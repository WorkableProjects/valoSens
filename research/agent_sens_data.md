# Agent pool vs mouse sensitivity: what data exists

Generated 2026-11-01. Machine-readable version: `agent_sens_data.json`.

**Short answer:** We found no published dataset that measures sensitivity by agent or role with a stated n and method. The "eDPI by role" figures online come from SEO and calculator sites. They use 9 or fewer named players, contradict themselves and each other, and cannot be reproduced. In our own sample of 28 VCT pros, players in high-mobility duelist and Jett/Chamber groups use somewhat faster sensitivities (about 15% lower cm/360). The result is not significant, it is unstable across time windows, and n is tiny.

## Part 1: agent pools for the 28 pros (VLR.gg)

- **Source:** `https://www.vlr.gg/player/<id>/?timespan=all` and `?timespan=90d`, both fetched on 2026-11-01. All 56 pages returned HTTP 200.
- **"all" window:** This is the longest one VLR offers. It covers every match VLR tracks, including tier-2 matches and older seasons, back to about 2020.
- **Share:** This is VLR's "Use" column, the share of maps played on that agent, shown as a whole-number percentage. The JSON also stores maps, rounds, and the share of rounds, which we computed from the Rnd column.
- **Missing 90d data:** Lakia, ZynX, and Veqaj show "No agent data available for this period."
- **Excluded:** The four creators (SirMaza, Shanks, PROD, Lothar).

The table shows the top 5 agents for the "all" window and the top 4 for the 90d window. The full lists are in the JSON. The last three columns use the "all" window and are based on share of rounds.

| Player | eDPI | cm/360 | All-time top agents (map %) | All maps / rounds | 90d agents | 90d maps | Primary role | Mobility duelist share | Jett+Chamber share |
|---|---|---|---|---|---|---|---|---|---|
| ZmjjKK | 316 | 41.34 | Jett 43%, Raze 18%, Chamber 16%, Neon 13%, Yoru 3% | 674 / 14180 | Jett 33%, Neon 33%, Chamber 17%, Yoru 8% | 12 | duelist | 79% | 59% |
| Smoggy | 248 | 52.67 | Jett 20%, Omen 20%, Raze 9%, Brimstone 7%, Killjoy 6% | 607 / 12881 | Omen 67%, Neon 17%, Raze 8%, Phoenix 8% | 12 | controller | 30% | 22% |
| CHICHOO | 160 | 81.64 | Viper 27%, Killjoy 20%, Cypher 19%, Omen 11%, Sage 5% | 628 / 13233 | Cypher 50%, Viper 33%, Phoenix 8%, Sage 8% | 12 | sentinel | 0% | 0% |
| nobody | 208 | 62.8 | Sova 41%, Skye 17%, Fade 16%, Tejo 4%, Cypher 4% | 656 / 13818 | Sova 58%, Fade 25%, Skye 8%, Tejo 8% | 12 | initiator | 2% | 0% |
| benjyfishy | 216 | 60.48 | Cypher 36%, Killjoy 29%, Viper 13%, Vyse 9%, Jett 8% | 399 / 8331 | Vyse 38%, Cypher 38%, Sage 25% | 8 | sentinel | 9% | 8% |
| RieNs | 216 | 60.48 | Sova 37%, Breach 15%, Fade 12%, Skye 9%, Jett 6% | 524 / 11113 | Sova 50%, Fade 38%, Viper 13% | 8 | initiator | 7% | 7% |
| t3xture | 344 | 37.97 | Jett 50%, Raze 24%, Neon 11%, Chamber 6%, Yoru 3% | 483 / 10287 | Raze 50%, Chamber 38%, Yoru 13% | 8 | duelist | 88% | 55% |
| Lakia | 240 | 54.43 | Sova 47%, Fade 20%, Skye 15%, Raze 7%, Gekko 4% | 394 / 8214 | no data | 0 | initiator | 8% | 1% |
| Karon | 160 | 81.64 | Omen 57%, Astra 11%, Viper 11%, Brimstone 7%, Killjoy 4% | 322 / 6904 | Omen 75%, Astra 25% | 8 | controller | 2% | 2% |
| ZynX | 160 | 81.64 | Cypher 32%, Viper 18%, Vyse 15%, Killjoy 11%, Yoru 9% | 141 / 3043 | no data | 0 | sentinel | 18% | 0% |
| kiNgg | 160 | 81.64 | Viper 34%, Raze 16%, Omen 15%, Kayo 6%, Astra 6% | 497 / 10391 | Viper 44%, Astra 33%, Omen 11%, Vyse 11% | 9 | controller | 21% | 0% |
| spikeziN | 184 | 70.99 | Neon 45%, Kayo 13%, Gekko 13%, Viper 10%, Yoru 6% | 228 / 4752 | Neon 89%, Omen 11% | 9 | duelist | 54% | 0% |
| Sato | 280 | 46.65 | Jett 44%, Raze 16%, Phoenix 13%, Yoru 9%, Neon 8% | 411 / 8757 | Phoenix 56%, Omen 22%, Yoru 11%, Raze 11% | 9 | duelist | 81% | 47% |
| Neon | 168 | 77.76 | Yoru 30%, Jett 25%, Chamber 18%, Raze 7%, Omen 7% | 251 / 5173 | Chamber 44%, Omen 22%, Yoru 22%, Jett 11% | 9 | duelist | 69% | 43% |
| Blowz | 160 | 81.64 | Sova 31%, Fade 21%, Skye 11%, Tejo 10%, Gekko 6% | 265 / 5496 | Fade 56%, Sova 33%, Skye 11% | 9 | initiator | 12% | 3% |
| trent | 256 | 51.03 | Sova 37%, Fade 19%, Skye 12%, Tejo 12%, Viper 10% | 619 / 13171 | Sova 41%, Skye 41%, Fade 19% | 37 | initiator | 2% | 0% |
| babybay | 176 | 74.22 | Jett 52%, Chamber 12%, Vyse 9%, Neon 6%, Raze 5% | 507 / 10533 | Chamber 59%, Vyse 22%, Waylay 19% | 37 | duelist | 68% | 65% |
| leaf | 128 | 102.05 | Viper 20%, Jett 13%, Raze 11%, Killjoy 10%, Omen 5% | 637 / 13396 | Viper 43%, Astra 19%, Vyse 16%, Yoru 11% | 37 | duelist | 31% | 18% |
| valyn | 240 | 54.43 | Omen 38%, Astra 32%, Viper 10%, Brimstone 10%, Harbor 6% | 831 / 17347 | Omen 62%, Harbor 32%, Astra 5% | 37 | controller | 0% | 0% |
| jawgemo | 251.2 | 52.0 | Raze 28%, Yoru 14%, Jett 14%, Neon 14%, Omen 5% | 680 / 14376 | Neon 76%, Raze 16%, Yoru 5%, Phoenix 3% | 37 | duelist | 73% | 15% |
| Alfajer | 180 | 72.57 | Killjoy 34%, Raze 15%, Cypher 13%, Chamber 9%, Viper 6% | 541 / 11603 | Neon 57%, Chamber 29%, Waylay 14% | 7 | sentinel | 23% | 12% |
| crashies | 160 | 81.64 | Sova 51%, Skye 16%, Fade 13%, Cypher 6%, Kayo 4% | 623 / 13194 | Viper 57%, Cypher 43% | 7 | initiator | 0% | 0% |
| Boaster | 160 | 81.64 | Omen 27%, Astra 23%, Brimstone 12%, Breach 12%, Sova 9% | 631 / 13366 | Omen 86%, Harbor 14% | 7 | controller | 1% | 1% |
| Cloud | 320 | 40.82 | Sova 40%, Skye 13%, Fade 8%, Raze 7%, Breach 6% | 483 / 10191 | Sova 43%, Fade 43%, Skye 14% | 7 | initiator | 9% | 1% |
| kaajak | 160 | 81.64 | Jett 30%, Yoru 23%, Raze 20%, Neon 11%, Omen 5% | 487 / 10289 | Phoenix 43%, Raze 29%, Yoru 14%, Waylay 14% | 7 | duelist | 87% | 31% |
| Veqaj | 200 | 65.31 | Jett 22%, Skye 13%, Raze 12%, Viper 12%, Breach 7% | 312 / 6647 | no data | 0 | duelist | 45% | 24% |
| MaKo | 180 | 72.57 | Omen 40%, Viper 25%, Astra 12%, Brimstone 10%, Jett 10% | 587 / 12176 | Omen 93%, Viper 7% | 15 | controller | 10% | 9% |
| BeYN | 160 | 81.64 | Sova 28%, Fade 18%, Jett 17%, Raze 6%, Breach 6% | 370 / 7814 | Sova 67%, Fade 33% | 15 | initiator | 25% | 18% |
## Part 2: larger or aggregate datasets

| Source | Date | n | Agent/role numbers | Reliability |
|---|---|---|---|---|
| [BattlePooja](https://battlepooja.com/average-edpi-valorant-pros/) | Feb 2026 | 9 pros total; no n per role | Duelist avg 266, Initiator 286, Controller 216; Sentinel "no data" on the card but "248" in the text | Very low. Contradicts itself and labels MaKo as an initiator. |
| [edpicalculator.net](https://edpicalculator.net/how-to-calculate-edpi-valorant/) | Feb–Apr 2026 | 10-row table (6 duelists, 3 controllers, 1 initiator, 0 sentinels) | Duelist 266, Sentinel 248, Controller 217, Initiator 260 | Very low. Its own table recomputes to a duelist average of 278. The sentinel figure has no sentinel players behind it. It appears to copy BattlePooja. |
| [proconfig.net](https://proconfig.net/stats/valorant-edpi-distribution/) | 2026-06-03 | 121 | No role or agent breakdown. Overall median 240, mean 259. Says, without counts, that Operator mains sit at 100–149 and sentinels at 180–280. | Overall figures only. Role claims are anecdotal. |
| [esportsettings.com](https://esportsettings.com/blog/valorant-pro-sensitivity-guide/) | 2026-09-20 | 435 overall | Recommendations only: duelists 180–300 eDPI, sentinels 200–350 | No measured role data |
| [sensconverter.app](https://sensconverter.app/valorant-pro-settings/) | Undated | "50+" | Role ranges from hand-picked examples. Here duelists are *lower*, the opposite of BattlePooja. | Low |
| [ProSettings options guide](https://prosettings.net/guides/valorant-options/) | Oct 2026 | 705 | Overall avg eDPI 267, median 240. No role or agent field. | Good for overall figures. No role or agent data. |
| [setup.gg](https://www.setup.gg/game/valorant/best-sens/) / [valorantscout](https://valorantscout.com/valorant-sensitivity) | Sep / Jul 2026 | 668 / 647 | Overall only: median 231.2 / 232 | Overall only (derived from ProSettings) |
| VLR threads ([survey](https://www.vlr.gg/245704/rank-and-sensitivity-survey), [holy grail](https://www.vlr.gg/358356/the-holy-grail-of-valorant-sens-myth-or-reality)) | About 2023 / 2024 | About 19 / 20 | Agent and role were not collected | None |
| tracker.gg, blitz.gg, mobalytics, specs.gg, settings.gg, Reddit surveys, academic work | Searched 2026-11-01 | — | Not found | — |

**Conclusion:** No public dataset joins agent pool to sensitivity with a documented method. The best way to test the question is to join ProSettings (about 700 players) with VLR agent tables ourselves.

## Part 3: analysis on our sample

**Method**

- cm/360 = 914.4 / (DPI × sens × 0.07), using DPI and sens from `pro_data_audit.json`.
- Agent share = each agent's share of rounds in the VLR table.
- High-mobility duelists: **Jett, Raze, Neon, Yoru, Waylay**. Reyna is excluded because she has no movement ability. Her largest all-time share of rounds in the sample is 3.2%, so including her would not change any group.
- Operator-capable agents: Jett and Chamber. Players count as heavy users at two thresholds, 30% and 50% of rounds.
- Primary role = the role with the largest summed share of rounds. Chamber counts as a sentinel and Viper as a controller.
- Test: a two-sided permutation test on the difference in mean ln(cm/360). We enumerated every permutation exactly when there were 300,000 or fewer combinations. Otherwise we drew 200,000 random permutations with seed 1.
- The scripts lived only in the scratch directory and were not saved to the repo.

**Results**

| Comparison (window) | n A vs B | Median cm/360 A vs B | Median eDPI A vs B | Geomean cm ratio A/B | p (two-sided) |
|---|---|---|---|---|---|
| all:mobility_duelist>=50%_vs_rest | 8 vs 20 | 61.5 vs 72.57 | 217.6 vs 180 | 0.846 | 0.1234 (monte_carlo) |
| all:jett+chamber>=30%_vs_rest | 6 vs 22 | 60.44 vs 71.78 | 228 vs 182 | 0.842 | 0.1521 (monte_carlo) |
| all:jett+chamber>=50%_vs_rest | 3 vs 25 | 41.34 vs 72.57 | 316 vs 180 | 0.722 | 0.036 (exact) |
| all:primary_controller_vs_primary_sentinel | 6 vs 4 | 77.11 vs 77.11 | 170 vs 170 | 0.946 | 0.6905 (exact) |
| all:primary_duelist_vs_rest | 10 vs 18 | 68.15 vs 72.57 | 192 vs 180 | 0.924 | 0.4479 (monte_carlo) |
| 90d:mobility_duelist>=50%_vs_rest | 6 vs 19 | 61.5 vs 74.22 | 217.6 vs 176 | 0.838 | 0.1612 (exact) |
| 90d:jett+chamber>=30%_vs_rest | 4 vs 21 | 57.78 vs 72.57 | 246 vs 180 | 0.814 | 0.1618 (exact) |
| 90d:jett+chamber>=50%_vs_rest | 3 vs 22 | 74.22 vs 71.78 | 176 vs 182 | 0.945 | 0.7357 (exact) |
| 90d:primary_controller_vs_primary_sentinel | 8 vs 4 | 81.64 vs 75.99 | 160 vs 172 | 1.019 | 0.8889 (exact) |
| 90d:primary_duelist_vs_rest | 7 vs 18 | 52.0 vs 75.99 | 251.2 vs 172 | 0.798 | 0.0549 (monte_carlo) |
**Group members ("all" window)**

- **Mobility duelist share ≥50%:** ZmjjKK, t3xture, spikeziN, Sato, Neon, babybay, jawgemo, kaajak
- **Jett+Chamber ≥30%:** ZmjjKK, t3xture, Sato, Neon, babybay, kaajak
- **Jett+Chamber ≥50%:** ZmjjKK, t3xture, babybay
- **Primary controller:** Smoggy, Karon, kiNgg, valyn, Boaster, MaKo
- **Primary sentinel:** CHICHOO, benjyfishy, ZynX, Alfajer

The JSON lists the members for the 90d window.

**Interpretation (n is tiny)**

- **Mobility duelists:** In both windows, mobility-duelist players use about 15% lower cm/360 (faster sensitivity), with a median of 61.5 cm against 72.6–74.2 cm for everyone else. The result is not significant (p 0.12–0.16).
- **Jett/Chamber players:** These players are also *faster*, not slower. That runs against the common claim that Operator players use low sensitivity. The only p value below 0.05 is 0.036 for Jett+Chamber ≥50% in the "all" window, and that group has n=3. The same test in the 90d window gives p=0.74. About 10 tests were run, so after Bonferroni correction (threshold about 0.005) nothing is significant.
- **Controllers vs sentinels:** No difference. The medians are identical at 77.1 cm in the "all" window, and the 90d window gives 81.6 vs 76.0 cm.

**Confounds**

- The agent pools cover 2020–2026, but sens is one current snapshot.
- Agent pools change a lot. For example, Alfajer is Killjoy-heavy all-time but Neon-heavy over 90 days, and crashies is Sova-heavy all-time but Viper/Cypher over 90 days.
- cm/360 values are discrete: 9 of the 28 players sit at exactly 81.6 cm, which is 800 DPI × 0.2 or 1600 DPI × 0.1.
- The DPI/sens values come from the ProSettings snapshot used in the audit.

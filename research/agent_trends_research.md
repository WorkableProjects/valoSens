# Agent vs sensitivity: expanded empirical study (147 pros)

Generated 2026-11-02. Machine-readable shifts: `agent_shifts.json`. Prior work (28 pros): `agent_sens_data.md`.

**Bottom line.** In a sample of 147 pro/semi-pro players with a known main agent, role differences exist in direction but are small and not statistically significant. Duelist mains have a median of 0.30 s800 and controller mains 0.24, against an overall median of 0.275. Permutation test, duelist vs everyone else: p = 0.29 to 0.31. Controller vs rest: p about 0.06 to 0.10. Single agents (Jett, Sova, Omen, Raze) show the same pattern, never significant. The shifts in `agent_shifts.json` are weak priors, capped at +/-0.5 SD, and mostly come from shrinkage toward role means. Agent signal beyond role is essentially absent for all but Jett, Sova, Omen and Raze, which are the only agents with n >= 10 mains.

## 1. Method

- **Players.** Settings from ProSettings (the list page `https://prosettings.net/lists/valorant/` plus individual player pages for players not on the list). A player is `s800 = DPI * sens / 800`. Only the VALORANT mouse block was used.
- **Main agent.** From VLR.gg player pages, `?timespan=all` (longest window, maps played per agent). Main = agent with the most maps; role = role of that agent. A second "pool" view weights every agent by its map share.
- **Identity matching.** VLR search by IGN. For players added from individual ProSettings pages, the VLR real name had to overlap the ProSettings name. For the ProSettings list, the VLR candidate with the most maps and a matching current team was used; spot-checked with real name and team (`Current Teams`). Same-name collisions (Neon, Leaf, Laz, Karon) were resolved by hand.
- **Exclusions.** Creators/streamers (SirMaza, Shanks, PROD, Lothar, Nadeshot, tarik, Mendo, ShahZaM), players with <50 VLR maps, and implausible entries (s800 > 0.9: Hyunmin 1.00, frttt 1.51, wippie 0.92; likely entry errors). 153 players had both settings and agent data; 147 remain. ts (no VLR data) was dropped.
- **Shrinkage.** Role raw z = (role median - overall median)/0.1, shrunk toward 0 with k=15: roleZ = rawZ * n/(n+15). Agent raw z the same way from the agent median; shrunk = roleZ + (agentRaw - roleZ) * n/(n+10). Cap |z| <= 0.5. Agents with n=0 get roleZ and basis `role-only`.
- **Tests.** Permutation tests (20,000 shuffles, seed 42): difference in means, in medians, in log means, and a country-stratified version (labels shuffled within VLR country, countries with n<4 pooled).

## 2. Results

Overall: n=147, median s800 = 0.275, mean = 0.296, SD = 0.099 (about 0.099, close to the bell-curve SD of 0.1).

### By role (main agent)

| Role | n | Median s800 | Mean s800 | Raw z | Shrunk z |
|---|---|---|---|---|---|
| Duelist | 61 | 0.3 | 0.3062 | 0.25 | 0.201 |
| Initiator | 40 | 0.2666 | 0.2905 | -0.084 | -0.061 |
| Controller | 29 | 0.24 | 0.2651 | -0.35 | -0.231 |
| Sentinel | 17 | 0.295 | 0.3273 | 0.2 | 0.106 |

### By agent

`Pool mean` = mean s800 weighting each player by their map share on the agent; `eff n` = sum of those shares. It uses all agents a player plays, so it is a smoother but less role-pure signal. It is shown for context and is NOT used for z.

| Agent | Role | n mains | Median s800 | Pool mean (eff n) | z | Basis |
|---|---|---|---|---|---|---|
| Hush | d | 0 | n/a | n/a | +0.201 | role-only |
| Iso | d | 0 | n/a | 0.306 (0.5) | +0.201 | role-only |
| Jett | d | 41 | 0.3000 | 0.303 (19.9) | +0.240 | research |
| Neon | d | 4 | 0.2900 | 0.310 (6.2) | +0.186 | research |
| Phoenix | d | 0 | n/a | 0.312 (2.2) | +0.201 | role-only |
| Raze | d | 13 | 0.3000 | 0.307 (12.7) | +0.229 | research |
| Reyna | d | 0 | n/a | 0.317 (2.3) | +0.201 | role-only |
| Waylay | d | 1 | 0.2000 | 0.283 (1.4) | +0.114 | research |
| Yoru | d | 2 | 0.2680 | 0.289 (4.3) | +0.156 | research |
| Breach | i | 3 | 0.2500 | 0.295 (5.2) | -0.104 | research |
| Fade | i | 0 | n/a | 0.290 (5.4) | -0.061 | role-only |
| Gekko | i | 0 | n/a | 0.323 (1.8) | -0.061 | role-only |
| KAY/O | i | 3 | 0.3900 | 0.310 (4.9) | +0.219 | research |
| Skye | i | 7 | 0.2633 | 0.297 (6.5) | -0.084 | research |
| Sova | i | 27 | 0.2600 | 0.289 (15.4) | -0.126 | research |
| Tejo | i | 0 | n/a | 0.282 (1.6) | -0.061 | role-only |
| Astra | c | 1 | 0.3550 | 0.274 (5.3) | -0.137 | research |
| Brimstone | c | 0 | n/a | 0.274 (2.9) | -0.231 | role-only |
| Clove | c | 0 | n/a | 0.259 (0.2) | -0.231 | role-only |
| Harbor | c | 0 | n/a | 0.311 (1.2) | -0.231 | role-only |
| Miks | c | 0 | n/a | 0.389 (0.0) | -0.231 | role-only |
| Omen | c | 21 | 0.2400 | 0.276 (12.4) | -0.312 | research |
| Viper | c | 7 | 0.2000 | 0.282 (9.7) | -0.445 | research |
| Chamber | s | 3 | 0.2950 | 0.289 (4.8) | +0.128 | research |
| Cypher | s | 10 | 0.2710 | 0.317 (7.7) | +0.033 | research |
| Deadlock | s | 0 | n/a | 0.291 (0.4) | +0.106 | role-only |
| Killjoy | s | 2 | 0.2975 | 0.308 (6.2) | +0.126 | research |
| Sage | s | 2 | 0.3645 | 0.317 (4.3) | +0.238 | research |
| Veto | s | 0 | n/a | 0.262 (0.1) | +0.106 | role-only |
| Vyse | s | 0 | n/a | 0.265 (1.7) | +0.106 | role-only |

## 3. Significance

| Comparison | n in / out | Diff in mean s800 | p (mean) | Diff in median | p (median) | p (log mean) | p (country-stratified) |
|---|---|---|---|---|---|---|---|
| duelist_vs_rest | 61 / 86 | +0.017 | 0.31 | +0.030 | 0.29 | 0.37 | 0.30 |
| duelist_vs_rest_pool | 58 / 89 | +0.017 | 0.31 | +0.030 | 0.28 | 0.45 | 0.29 |
| duelist_vs_rest_confident(main share>=0.3) | 36 / 49 | -0.003 | 0.91 | +0.030 | 0.53 | 0.96 | 0.91 |
| jett_vs_rest | 41 / 106 | +0.018 | 0.31 | +0.030 | 0.31 | 0.48 | 0.30 |
| mobility_duelist(Jett,Raze,Neon,Yoru,Waylay,Phoenix) vs rest | 61 / 86 | +0.017 | 0.31 | +0.030 | 0.29 | 0.36 | 0.31 |
| jett_chamber_vs_rest | 44 / 103 | +0.018 | 0.32 | +0.030 | 0.29 | 0.48 | 0.30 |
| controller_vs_rest | 29 / 118 | -0.039 | 0.06 | -0.043 | 0.10 | 0.06 | 0.07 |
| initiator_vs_rest | 40 / 107 | -0.008 | 0.67 | -0.033 | 0.17 | 0.92 | 0.63 |
| sentinel_vs_rest | 17 / 130 | +0.035 | 0.17 | +0.022 | 0.58 | 0.27 | 0.37 |
| sova_vs_rest | 27 / 120 | -0.009 | 0.66 | -0.026 | 0.47 | 0.88 | 0.64 |
| omen_vs_rest | 21 / 126 | -0.032 | 0.17 | -0.041 | 0.18 | 0.18 | 0.20 |
| cypher_vs_rest | 10 / 137 | +0.041 | 0.21 | -0.009 | 0.87 | 0.42 | 0.18 |
| raze_vs_rest | 13 / 134 | +0.010 | 0.73 | +0.030 | 0.44 | 0.50 | 0.71 |
| duelist_vs_rest_2026only | 57 / 81 | +0.021 | 0.22 | +0.037 | 0.16 | 0.29 | 0.20 |

Omnibus test across the four roles (between-group sum of squares): p = 0.15; with country-stratified shuffles p = 0.26.

Reading: none reaches p < 0.05. Controllers are the closest (about 0.039 slower on average, p about 0.06). The duelist advantage is 0.017 in mean and 0.030 in median (about 6 and 11 percent) and disappears when restricting to players whose main agent has at least 30% of maps (diff -0.003, p=0.91, n=85). Country-stratified p-values are about the same as unstratified ones, so region is not what drives (or hides) these differences in this sample, though regional effects in turn are handled by T01. With about 150 players and an SD of 0.1, a role effect of 0.03 to 0.04 is near the limit of detectability.

Caveats on the statistics: medians sit on round values (0.2, 0.25, 0.3) so median differences are lumpy; many tests were run and none were pre-registered; players are not independent (teammates share coaches and habits); VLR agent pools are all-time while settings are snapshots.

## 4. Independent evidence and qualitative notes

- **VCT Champions 2023 role analysis** (n = 40, 10 per role; role = >50% of matches): duelist mean 291.6 eDPI (about 0.365 s800), initiator 238.2 (about 0.298), sentinel and controller about equal to each other and below that; overall mean 250.8. The author attributes the duelist result to the role requiring "entry, clearing many angles, and using agents that move quickly". Source: https://note.com/unknownsoldier/n/n122a00405e52?hl=en. Same direction as ours (duelist > initiator > controller) with a larger duelist gap; the author notes the gaps were converging.
- **Aggregators disagree.** valorantcalc.online says duelists prefer "medium to slightly high" sensitivity and controllers/sentinels lower, with no n or method (https://valorantcalc.online/how-to-tune-sensitivity-based-on-your-favorite-valorant-agent/). esportsettings.com gives "Duelists often 180 to 300, sentinels 200 to 350" eDPI, which contradicts that direction, again with no n; its own example table violates its ranges (https://esportsettings.com/blog/valorant-pro-sensitivity-guide/). A web search also surfaced pages reporting duelists slightly lower than controllers/sentinels, so the sign is not settled in published material.
- **Operator / scoped sens.** About 69% of pros keep scoped sensitivity at 1.0 (78 of 113 in one sample; https://proconfig.net/stats/valorant-scoped-sensitivity/). Lowering scoped sens to 0.85-0.95 is described as niche, for Operator mains. This affects scoped sens only, not the main hip-fire sens modelled here. No source gave an Operator effect on main sens.
- **Pro quotes.** No first-hand pro statement linking agent choice to sensitivity was found in the searched sources (aggregators and guides only). We therefore quote none. Claims about "holding angles" favouring low sens are guide-site inference, not pro testimony (e.g. https://www.hotspawn.com/valorant/guide/best-valorant-sensitivity-settings).
- **Agent mechanics (general knowledge, not from a sourced study).** Jett (Updraft/Tailwind dash) and Chamber (Operator, teleport) are the two agents where the Operator is an identity pick; Raze (Blast Pack), Neon (slide), Yoru (teleports), Waylay and Phoenix are entry/mobility duelists; Omen/Viper/Cypher/Killjoy/Sage are mostly anchor, hold-angle or lurk-adjacent picks; Sova/Fade/Skye/Breach/KAY/O/Gekko are information/flash initiators. See `agent_mechanics.md` for the model side.

## 5. Agent-by-agent notes

| Agent | Note |
|---|---|
| Hush | New 2026 agent, no pro mains in sample; role-only. |
| Iso | Pool-weighted mean 0.306 from only 0.5 effective players; role-only. |
| Jett | Largest main group (n=41), median 0.30 equals duelist median; Operator is a minority pick per pro pools. |
| Neon | 4 mains, median 0.29; pool-weighted mean 0.31 across 6 effective players. |
| Phoenix | No mains; pool-weighted mean 0.31 from 2 effective players; role-only. |
| Raze | 13 mains, median 0.30, pool-weighted mean 0.307; same as duelist role. |
| Reyna | No mains; role-only. |
| Waylay | Single main (s800 0.20); result mostly shrunk to role. Agent released 2025, little history. |
| Yoru | 2 mains, median 0.268; weak evidence. |
| Breach | 3 mains, median 0.25; weak evidence. |
| Fade | No mains in sample (pool-weighted mean 0.29, 5 effective players); role-only. |
| Gekko | No mains; role-only. |
| KAY/O | 3 mains incl. high-sens players (median 0.39); n too small, shrinkage keeps z near 0.2. |
| Skye | 7 mains, median 0.263; close to initiator role. |
| Sova | 27 mains, median 0.26, mean 0.289: slightly slower than overall; difference not significant (p=0.47 median). |
| Tejo | New 2025 agent, no mains; role-only. |
| Astra | Single main (s800 0.355) is a noisy outlier; pool-weighted mean 0.274 suggests controller-typical. |
| Brimstone | No mains; role-only. |
| Clove | No mains; role-only. |
| Harbor | No mains; role-only. |
| Miks | New 2026 agent, no data; role-only. |
| Omen | 21 mains, median 0.24 (mean 0.269): controller-typical, lowest well-sampled agent; p~0.18 vs rest. |
| Viper | 7 mains, median 0.20 but mean 0.24: median is discretized at round values, so z=-0.445 is probably exaggerated. |
| Chamber | 3 mains, median 0.295; Operator is a core pick but sample is tiny. |
| Cypher | 10 mains, median 0.271 but mean 0.335 (a few very high-sens players); near sentinel-role average. |
| Deadlock | No mains; role-only. |
| Killjoy | 2 mains, median 0.2975; weak evidence. |
| Sage | 2 mains (0.29, 0.44); noisy. |
| Veto | New 2025 agent, no mains; role-only. |
| Vyse | No mains; role-only. |

## 6. Limits

- Pros and semi-pros only; sensitivity of ranked players may differ.
- Main agent from all-time VLR (some players changed role or agent; e.g. Zekken, Leo, Victor).
- Settings are snapshots; 9 players have a ProSettings update date from 2025 or earlier (see table). Settings history is unknown.
- Most agents have n < 10 mains; 14 of 30 have none (role-only). New agents (Hush, Miks, Tejo, Veto, Waylay, Vyse, Clove) have no useful history.
- Identity matching was automated with spot checks; a wrong VLR id would misassign a main agent. Ambiguous cases flagged: Laz (ZETA vs Sharper), Mimi, Kicks, Kamo_val were accepted by team/name match but not independently verified.
- The empirical z partly overlaps with mechanics already in the physical model (dashes and teleports push duelists faster). Applying both fully may double count; consider damping (e.g. 0.5x) in the integration step.
- z is relative to the pro median (0.275), while the app bell curve is centred at 0.3. Apply z as a shift only.
- The shrunk z values are small (|z| <= 0.45) relative to the 1 SD bell width; role z spans -0.23 to +0.20.

## 7. Sources (accessed 2026-11-02)

- `prosettings_list`: https://prosettings.net/lists/valorant/
- `prosettings_players`: https://prosettings.net/players/<slug>/ (one page per added player, listed in the player table)
- `vlr_player_pages`: https://www.vlr.gg/player/<id>/?timespan=all (agent-use tables, ids in the player table)
- `vlr_search`: https://www.vlr.gg/search/?q=<name>&type=players
- `unknownsoldier_2023`: https://note.com/unknownsoldier/n/n122a00405e52?hl=en
- `valorantcalc_agent_guide`: https://valorantcalc.online/how-to-tune-sensitivity-based-on-your-favorite-valorant-agent/
- `esportsettings_guide`: https://esportsettings.com/blog/valorant-pro-sensitivity-guide/
- `hotspawn_guide`: https://www.hotspawn.com/valorant/guide/best-valorant-sensitivity-settings
- `proconfig_scoped`: https://proconfig.net/stats/valorant-scoped-sensitivity/
- `prior_work`: research/agent_sens_data.md (repo file, 28 pros, 2026-11-01)

## 8. Player table

Every row: ProSettings settings source and the VLR page used for the agent pool. `main share` = share of maps on the main agent. `upd` = ProSettings "Last updated" (list rows have no date).

| Player | Team (PS) | Country | DPI | Sens | s800 | Main | Role | Main share | Top agents (maps) | upd | Settings source | Agent source |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SyouTa | ZETA DIVISION | jp | 800 | 0.355 | 0.355 | Astra | c | 0.274 | astra 87, viper 55, cypher 47 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/12990/?timespan=all |
| bang | 100 Thieves | us | 800 | 0.32 | 0.32 | Omen | c | 0.37 | omen 266, viper 113, astra 96 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/3880/?timespan=all |
| Boaster | Fnatic | gb | 800 | 0.2 | 0.2 | Omen | c | 0.274 | omen 173, astra 146, brimstone 78 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/438/?timespan=all |
| cortezia | Sentinels | br | 800 | 0.16 | 0.16 | Omen | c | 0.228 | omen 98, viper 97, brimstone 52 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/5395/?timespan=all |
| dos9 | Karmine Corp | kz | 1600 | 0.135 | 0.27 | Omen | c | 0.351 | omen 86, jett 30, brimstone 24 | Sep 28, 2026 | https://prosettings.net/players/dos9/ | https://www.vlr.gg/player/16215/?timespan=all |
| ec1s | Retired | gb | 800 | 0.314 | 0.314 | Omen | c | 0.288 | omen 99, breach 52, viper 51 | Jul 30, 2026 | https://prosettings.net/players/ec1s/ | https://www.vlr.gg/player/100/?timespan=all |
| erde | LOUD | cl | 800 | 0.2 | 0.2 | Omen | c | 0.328 | omen 76, breach 28, sage 22 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/29242/?timespan=all |
| Karon | Gen.G | kr | 800 | 0.2 | 0.2 | Omen | c | 0.568 | omen 183, astra 37, viper 35 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/34974/?timespan=all |
| Lukxo | LOUD | br | 1600 | 0.1 | 0.2 | Omen | c | 0.284 | omen 86, viper 79, chamber 43 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/28716/?timespan=all |
| MaKo | DRX | kr | 400 | 0.45 | 0.225 | Omen | c | 0.402 | omen 236, viper 144, astra 70 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/4462/?timespan=all |
| marved | Free Agent | ca | 1600 | 0.153 | 0.306 | Omen | c | 0.411 | omen 163, astra 68, brimstone 66 | Oct 5, 2026 | https://prosettings.net/players/marved/ | https://www.vlr.gg/player/263/?timespan=all |
| mazino | MIBR | cl | 1600 | 0.17 | 0.34 | Omen | c | 0.142 | omen 68, harbor 58, sage 58 | Aug 10, 2026 | https://prosettings.net/players/mazino/ | https://www.vlr.gg/player/7603/?timespan=all |
| mindfreak | Free Agent | id | 400 | 0.42 | 0.21 | Omen | c | 0.337 | omen 175, astra 140, viper 107 | Jul 27, 2026 | https://prosettings.net/players/mindfreak/ | https://www.vlr.gg/player/9800/?timespan=all |
| mistic | Free Agent | gb | 800 | 0.24 | 0.24 | Omen | c | 0.449 | omen 235, viper 114, astra 53 | Dec 15, 2025 | https://prosettings.net/players/mistic/ | https://www.vlr.gg/player/1457/?timespan=all |
| monyet | Rex Regum Qeon | id | 800 | 0.4 | 0.4 | Omen | c | 0.225 | omen 98, jett 80, neon 79 | Oct 13, 2026 | https://prosettings.net/players/monyet/ | https://www.vlr.gg/player/8497/?timespan=all |
| pancada | Free Agent | br | 800 | 0.23 | 0.23 | Omen | c | 0.309 | omen 114, astra 91, sage 57 | Oct 19, 2026 | https://prosettings.net/players/pancada/ | https://www.vlr.gg/player/683/?timespan=all |
| s0m | NRG | us | 400 | 0.8 | 0.4 | Omen | c | 0.242 | omen 124, jett 104, astra 56 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/4164/?timespan=all |
| sscary | Free Agent | th | 1600 | 0.18 | 0.36 | Omen | c | 0.291 | omen 127, astra 113, viper 109 | Jun 26, 2026 | https://prosettings.net/players/sscary/ | https://www.vlr.gg/player/4382/?timespan=all |
| SugarZ3ro | ZETA DIVISION | jp | 800 | 0.225 | 0.225 | Omen | c | 0.489 | omen 162, astra 86, viper 39 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/6668/?timespan=all |
| valyn | G2 Esports | us | 1600 | 0.15 | 0.3 | Omen | c | 0.377 | omen 313, astra 270, viper 83 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/3885/?timespan=all |
| Yong | DRX | kr | 800 | 0.393 | 0.393 | Omen | c | 0.326 | omen 42, cypher 15, neon 13 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/51238/?timespan=all |
| zander | Shopify Rebellion Black | ca | 1600 | 0.08 | 0.16 | Omen | c | 0.252 | omen 179, astra 173, viper 156 | Jul 22, 2026 | https://prosettings.net/players/zander/ | https://www.vlr.gg/player/8082/?timespan=all |
| CHICHOO | Edward Gaming | cn | 800 | 0.2 | 0.2 | Viper | c | 0.274 | viper 172, killjoy 125, cypher 122 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/15559/?timespan=all |
| chronicle | Team Vitality | ru | 1600 | 0.175 | 0.35 | Viper | c | 0.228 | viper 156, sova 147, breach 75 | Oct 14, 2026 | https://prosettings.net/players/chronicle/ | https://www.vlr.gg/player/458/?timespan=all |
| kiNgg | Leviatan | cl | 1600 | 0.1 | 0.2 | Viper | c | 0.336 | viper 167, raze 81, omen 77 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/8549/?timespan=all |
| leaf | G2 Esports | us | 1600 | 0.08 | 0.16 | Viper | c | 0.198 | viper 126, jett 82, raze 72 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/7873/?timespan=all |
| Less | KRÜ Esports | br | 800 | 0.32 | 0.32 | Viper | c | 0.411 | viper 161, killjoy 115, cypher 59 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/8447/?timespan=all |
| Munchkin | T1 | kr | 1600 | 0.1 | 0.2 | Viper | c | 0.293 | viper 161, kayo 78, killjoy 56 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/2489/?timespan=all |
| skuba | NRG | us | 800 | 0.25 | 0.25 | Viper | c | 0.295 | viper 226, astra 218, omen 158 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/11118/?timespan=all |
| aspas | MIBR | br | 800 | 0.4 | 0.4 | Jett | d | 0.494 | jett 252, raze 127, reyna 58 | Oct 13, 2026 | https://prosettings.net/players/aspas/ | https://www.vlr.gg/player/8480/?timespan=all |
| babybay | G2 Esports | us | 1600 | 0.11 | 0.22 | Jett | d | 0.525 | jett 266, chamber 63, vyse 44 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/2170/?timespan=all |
| ban | Free Agent | kr | 1600 | 0.2 | 0.4 | Jett | d | 0.419 | jett 241, skye 70, reyna 59 | Dec 15, 2025 | https://prosettings.net/players/ban/ | https://www.vlr.gg/player/5129/?timespan=all |
| bazzi | Free Agent | kr | 1600 | 0.17 | 0.34 | Jett | d | 0.481 | jett 115, breach 27, raze 22 | Jul 2, 2025 | https://prosettings.net/players/bazzi/ | https://www.vlr.gg/player/805/?timespan=all |
| bdog | EG Academy | us | 1600 | 0.117 | 0.234 | Jett | d | 0.396 | jett 301, omen 119, raze 57 | Jun 26, 2026 | https://prosettings.net/players/bdog/ | https://www.vlr.gg/player/844/?timespan=all |
| boostio | Free Agent | us | 800 | 0.233 | 0.233 | Jett | d | 0.341 | jett 201, killjoy 116, chamber 56 | Dec 15, 2025 | https://prosettings.net/players/boostio/ | https://www.vlr.gg/player/604/?timespan=all |
| BuZz | T1 | kr | 400 | 0.57 | 0.285 | Jett | d | 0.337 | jett 210, raze 118, neon 87 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/804/?timespan=all |
| cned | Free Agent | tr | 800 | 0.3 | 0.3 | Jett | d | 0.61 | jett 315, raze 57, chamber 35 | Aug 10, 2026 | https://prosettings.net/players/cned/ | https://www.vlr.gg/player/573/?timespan=all |
| Cryocells | 100 Thieves | us | 1600 | 0.087 | 0.174 | Jett | d | 0.288 | jett 200, sova 181, chamber 118 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/4147/?timespan=all |
| d3ffo | BOOM Esports | ru | 800 | 0.406 | 0.406 | Jett | d | 0.521 | jett 249, raze 87, chamber 32 | Jan 12, 2026 | https://prosettings.net/players/d3ffo/ | https://www.vlr.gg/player/252/?timespan=all |
| derke | Team Vitality | fi | 400 | 0.74 | 0.37 | Jett | d | 0.379 | jett 230, raze 175, yoru 57 | Oct 19, 2026 | https://prosettings.net/players/derke/ | https://www.vlr.gg/player/5022/?timespan=all |
| deryeon | Wolves Esports | sg | 1600 | 0.13 | 0.26 | Jett | d | 0.307 | jett 153, chamber 56, killjoy 52 | Jul 13, 2026 | https://prosettings.net/players/deryeon/ | https://www.vlr.gg/player/9152/?timespan=all |
| dgzin | Evil Geniuses | br | 400 | 0.2 | 0.1 | Jett | d | 0.506 | jett 204, neon 91, raze 51 | Aug 31, 2026 | https://prosettings.net/players/dgzin/ | https://www.vlr.gg/player/8873/?timespan=all |
| f0rsakeN | Paper Rex | id | 800 | 0.712 | 0.712 | Jett | d | 0.158 | jett 117, omen 113, neon 49 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/9801/?timespan=all |
| fit1nho | Barca Esports | es | 800 | 0.314 | 0.314 | Jett | d | 0.362 | jett 203, raze 152, sova 52 | Oct 12, 2026 | https://prosettings.net/players/fit1nho/ | https://www.vlr.gg/player/292/?timespan=all |
| heat | KRÜ Esports | br | 800 | 0.25 | 0.25 | Jett | d | 0.528 | jett 186, chamber 46, kayo 21 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/8673/?timespan=all |
| kaajak | Fnatic | pl | 1600 | 0.1 | 0.2 | Jett | d | 0.3 | jett 146, yoru 111, raze 98 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/9554/?timespan=all |
| kamo | Team Liquid | pl | 1600 | 0.1 | 0.2 | Jett | d | 0.354 | jett 131, raze 76, yoru 54 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/14681/?timespan=all |
| Keiko | NRG | gb | 800 | 0.25 | 0.25 | Jett | d | 0.302 | jett 133, omen 85, raze 70 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/11494/?timespan=all |
| keznit | Team Envy | cl | 800 | 0.346 | 0.346 | Jett | d | 0.334 | jett 138, raze 114, neon 50 | Aug 11, 2026 | https://prosettings.net/players/keznit/ | https://www.vlr.gg/player/2462/?timespan=all |
| lewn | Karmine Corp | tr | 800 | 0.35 | 0.35 | Jett | d | 0.406 | jett 142, neon 69, raze 49 | Sep 28, 2026 | https://prosettings.net/players/lewn/ | https://www.vlr.gg/player/20144/?timespan=all |
| Meteor | T1 | kr | 800 | 0.35 | 0.35 | Jett | d | 0.264 | jett 132, killjoy 104, chamber 52 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/13039/?timespan=all |
| MiniBoo | Team Liquid | lt | 800 | 0.32 | 0.32 | Jett | d | 0.32 | jett 139, neon 99, raze 84 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/18350/?timespan=all |
| purp0 | Team Liquid | ru | 1600 | 0.1 | 0.2 | Jett | d | 0.374 | jett 160, raze 43, skye 35 | Aug 31, 2026 | https://prosettings.net/players/purp0/ | https://www.vlr.gg/player/1885/?timespan=all |
| qck | 2GAME ESPORTS | br | 1600 | 0.05 | 0.1 | Jett | d | 0.26 | jett 116, yoru 67, raze 39 | Aug 24, 2026 | https://prosettings.net/players/qck/ | https://www.vlr.gg/player/1575/?timespan=all |
| rb | Nongshim RedForce | kr | 1600 | 0.175 | 0.35 | Jett | d | 0.229 | jett 135, omen 76, raze 56 | Aug 31, 2026 | https://prosettings.net/players/rb/ | https://www.vlr.gg/player/488/?timespan=all |
| reduxx | Sentinels | us | 1600 | 0.15 | 0.3 | Jett | d | 0.434 | jett 396, raze 196, neon 99 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/8419/?timespan=all |
| Sato | Leviatan | br | 800 | 0.35 | 0.35 | Jett | d | 0.436 | jett 179, raze 65, phoenix 52 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/21659/?timespan=all |
| sayf | Free Agent | se | 800 | 0.4 | 0.4 | Jett | d | 0.194 | jett 84, cypher 66, raze 46 | Apr 20, 2026 | https://prosettings.net/players/sayf/ | https://www.vlr.gg/player/312/?timespan=all |
| seven | PCIFIC Esports | mx | 1600 | 0.25 | 0.5 | Jett | d | 0.203 | jett 176, chamber 118, killjoy 89 | Oct 19, 2026 | https://prosettings.net/players/seven/ | https://www.vlr.gg/player/8376/?timespan=all |
| Smoggy | Edward Gaming | cn | 800 | 0.31 | 0.31 | Jett | d | 0.204 | jett 124, omen 124, raze 53 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/4742/?timespan=all |
| sociablEE | FUT Esports | tr | 800 | 0.3 | 0.3 | Jett | d | 0.269 | jett 165, raze 155, omen 87 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/5568/?timespan=all |
| something | Paper Rex | ru | 800 | 0.5 | 0.5 | Jett | d | 0.411 | jett 211, yoru 120, reyna 54 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/17086/?timespan=all |
| t3xture | Gen.G | kr | 800 | 0.43 | 0.43 | Jett | d | 0.499 | jett 241, raze 114, neon 55 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/9196/?timespan=all |
| TenZ | T1 | ca | 1600 | 0.14 | 0.28 | Jett | d | 0.453 | jett 207, omen 68, reyna 64 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/9/?timespan=all |
| tex | MIBR | de | 800 | 0.22 | 0.22 | Jett | d | 0.17 | jett 97, cypher 81, raze 62 | Jul 27, 2026 | https://prosettings.net/players/tex/ | https://www.vlr.gg/player/1818/?timespan=all |
| timotino | 100 Thieves | ca | 1600 | 0.141 | 0.282 | Jett | d | 0.254 | jett 173, raze 149, neon 124 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/29893/?timespan=all |
| tuyz | Free Agent | br | 800 | 0.2 | 0.2 | Jett | d | 0.202 | jett 86, omen 81, raze 57 | May 26, 2026 | https://prosettings.net/players/tuyz/ | https://www.vlr.gg/player/2408/?timespan=all |
| Veqaj | Fnatic | fr | 1600 | 0.125 | 0.25 | Jett | d | 0.218 | jett 68, skye 42, raze 38 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/12928/?timespan=all |
| Wo0t | FUT Esports | tr | 500 | 0.5 | 0.3125 | Jett | d | 0.149 | jett 60, raze 56, viper 34 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/21328/?timespan=all |
| ZmjjKK | Edward Gaming | cn | 800 | 0.395 | 0.395 | Jett | d | 0.43 | jett 290, raze 119, chamber 108 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/3520/?timespan=all |
| Dantedeu5 | KRÜ Esports | ar | 800 | 0.5 | 0.5 | Neon | d | 0.338 | neon 70, jett 56, raze 36 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/41135/?timespan=all |
| s0pp | FUT Esports | tr | 1600 | 0.175 | 0.35 | Neon | d | 0.535 | neon 114, jett 52, yoru 30 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/39357/?timespan=all |
| spikeziN | Leviatan | br | 800 | 0.23 | 0.23 | Neon | d | 0.452 | neon 103, kayo 30, gekko 29 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/21661/?timespan=all |
| Tkzin | LOUD | br | 1600 | 0.1 | 0.2 | Neon | d | 0.298 | neon 67, jett 51, raze 37 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/41224/?timespan=all |
| Asuna | 100 Thieves | us | 1400 | 0.26 | 0.455 | Raze | d | 0.273 | raze 187, phoenix 102, kayo 81 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/601/?timespan=all |
| jawgemo | G2 Esports | kh | 1600 | 0.157 | 0.314 | Raze | d | 0.281 | raze 191, yoru 94, jett 94 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/3993/?timespan=all |
| Jerrwin | Sentinels | in | 800 | 0.3 | 0.3 | Raze | d | 0.273 | raze 190, jett 174, neon 136 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/34057/?timespan=all |
| Jinggg | Paper Rex | sg | 1600 | 0.175 | 0.35 | Raze | d | 0.589 | raze 389, reyna 54, sage 52 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/7378/?timespan=all |
| jzz | Fluxo | br | 800 | 0.3 | 0.3 | Raze | d | 0.184 | raze 57, vyse 35, sova 33 | Sep 14, 2026 | https://prosettings.net/players/jzz/ | https://www.vlr.gg/player/13093/?timespan=all |
| mada | NRG | ca | 800 | 0.37 | 0.37 | Raze | d | 0.291 | raze 230, jett 147, neon 91 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/5132/?timespan=all |
| mwzera | KRÜ Esports | br | 800 | 0.24 | 0.24 | Raze | d | 0.347 | raze 142, sova 80, jett 78 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/939/?timespan=all |
| trexx | Team Liquid | ru | 800 | 0.226 | 0.226 | Raze | d | 0.352 | raze 141, sova 78, fade 52 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/2168/?timespan=all |
| victor | Free Agent | us | 800 | 0.275 | 0.275 | Raze | d | 0.21 | raze 96, phoenix 96, kayo 46 | Jun 4, 2025 | https://prosettings.net/players/victor/ | https://www.vlr.gg/player/261/?timespan=all |
| xeus | FUT Esports | tr | 400 | 0.4 | 0.2 | Raze | d | 0.353 | raze 131, jett 108, waylay 40 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/12793/?timespan=all |
| zeek | Nightblood Gaming | pl | 1600 | 0.175 | 0.35 | Raze | d | 0.236 | raze 127, sova 116, kayo 74 | Jun 26, 2026 | https://prosettings.net/players/zeek/ | https://www.vlr.gg/player/562/?timespan=all |
| zekken | MIBR | us | 1600 | 0.175 | 0.35 | Raze | d | 0.356 | raze 264, sova 122, neon 83 | Oct 5, 2026 | https://prosettings.net/players/zekken/ | https://www.vlr.gg/player/4004/?timespan=all |
| zyppan | CGN Esports | se | 800 | 0.24 | 0.24 | Raze | d | 0.389 | raze 239, kayo 99, sage 47 | Oct 9, 2026 | https://prosettings.net/players/zyppan/ | https://www.vlr.gg/player/11/?timespan=all |
| Flicker | DRX | kr | 1600 | 0.1 | 0.2 | Waylay | d | 0.172 | waylay 21, sova 19, yoru 18 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/51100/?timespan=all |
| iZu | T1 | kr | 800 | 0.326 | 0.326 | Yoru | d | 0.179 | yoru 59, sova 46, jett 44 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/29833/?timespan=all |
| Neon | Leviatan | ar | 800 | 0.21 | 0.21 | Yoru | d | 0.299 | yoru 75, jett 64, chamber 44 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/29243/?timespan=all |
| Darker | LOUD | co | 1600 | 0.125 | 0.25 | Breach | i | 0.254 | breach 82, omen 62, viper 25 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/10557/?timespan=all |
| mimi | G2 Gozen | dk | 800 | 0.3 | 0.3 | Breach | i | 0.172 | breach 100, kayo 65, killjoy 62 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/17323/?timespan=all |
| stax | T1 | kr | 800 | 0.215 | 0.215 | Breach | i | 0.295 | breach 181, skye 128, kayo 83 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/485/?timespan=all |
| nephh | None | sg | 800 | 0.39 | 0.39 | KAY/O | i | 0.244 | kayo 99, breach 93, omen 50 | Jul 15, 2026 | https://prosettings.net/players/nephh/ | https://www.vlr.gg/player/10698/?timespan=all |
| qRaxs | FUT Esports | tr | 800 | 0.6 | 0.6 | KAY/O | i | 0.308 | kayo 144, sage 114, fade 57 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/1139/?timespan=all |
| Saadhak | KRÜ Esports | ar | 900 | 0.255 | 0.2869 | KAY/O | i | 0.219 | kayo 102, cypher 78, killjoy 57 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/727/?timespan=all |
| Carpe | T1 | kr | 900 | 0.234 | 0.2633 | Skye | i | 0.172 | skye 22, gekko 19, sova 19 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/31207/?timespan=all |
| d4v41 | Paper Rex | my | 900 | 0.23 | 0.2587 | Skye | i | 0.169 | skye 123, viper 120, jett 89 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/9803/?timespan=all |
| Ethan | NRG | us | 400 | 0.58 | 0.29 | Skye | i | 0.214 | skye 113, kayo 108, omen 71 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/11225/?timespan=all |
| JonahP | Sentinels | ca | 800 | 0.22 | 0.22 | Skye | i | 0.178 | skye 121, sova 120, kayo 95 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/4581/?timespan=all |
| Kicks | Team Liquid | ee | 800 | 0.27 | 0.27 | Skye | i | 0.191 | skye 77, kayo 55, omen 51 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/11134/?timespan=all |
| soulcas | Free Agent | gb | 1600 | 0.106 | 0.212 | Skye | i | 0.213 | skye 102, raze 86, sova 81 | Sep 8, 2026 | https://prosettings.net/players/soulcas/ | https://www.vlr.gg/player/101/?timespan=all |
| starxo | Gentle Mates | pl | 800 | 0.27 | 0.27 | Skye | i | 0.209 | skye 109, sova 63, fade 62 | Sep 8, 2026 | https://prosettings.net/players/starxo/ | https://www.vlr.gg/player/565/?timespan=all |
| adverso | KRÜ Esports | cl | 400 | 0.5 | 0.25 | Sova | i | 0.552 | sova 261, viper 69, breach 44 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/3826/?timespan=all |
| ardiis | Free Agent | lv | 800 | 0.27 | 0.27 | Sova | i | 0.339 | sova 133, jett 89, chamber 53 | Sep 1, 2025 | https://prosettings.net/players/ardiis/ | https://www.vlr.gg/player/98/?timespan=all |
| BeYN | DRX | kr | 400 | 0.4 | 0.2 | Sova | i | 0.284 | sova 105, fade 66, jett 63 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/4678/?timespan=all |
| Blowz | Leviatan | br | 800 | 0.2 | 0.2 | Sova | i | 0.309 | sova 82, fade 56, skye 29 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/21251/?timespan=all |
| bonkar | NRG | se | 800 | 0.384 | 0.384 | Sova | i | 0.458 | sova 153, breach 50, cypher 24 | Oct 2, 2026 | https://prosettings.net/players/bonkar/ | https://www.vlr.gg/player/7/?timespan=all |
| brawk | NRG | us | 800 | 0.2 | 0.2 | Sova | i | 0.59 | sova 502, skye 118, breach 57 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/2172/?timespan=all |
| cauanzin | Free Agent | br | 1600 | 0.12 | 0.24 | Sova | i | 0.376 | sova 111, skye 69, breach 34 | Oct 19, 2026 | https://prosettings.net/players/cauanzin/ | https://www.vlr.gg/player/6193/?timespan=all |
| cgrs | Paper Rex | th | 400 | 0.66 | 0.33 | Sova | i | 0.319 | sova 52, cypher 29, gekko 26 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/24679/?timespan=all |
| Cloud | Fnatic | ru | 800 | 0.4 | 0.4 | Sova | i | 0.404 | sova 195, skye 63, fade 38 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/4181/?timespan=all |
| crashies | Fnatic | us | 1600 | 0.1 | 0.2 | Sova | i | 0.509 | sova 317, skye 102, fade 84 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/4/?timespan=all |
| crazyguy | Rex Regum Qeon | vn | 1600 | 0.13 | 0.26 | Sova | i | 0.496 | sova 230, omen 46, fade 34 | Aug 3, 2026 | https://prosettings.net/players/crazyguy/ | https://www.vlr.gg/player/1430/?timespan=all |
| DaviH | LOUD | pt | 800 | 0.25 | 0.25 | Sova | i | 0.379 | sova 184, fade 69, omen 36 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/10885/?timespan=all |
| eko | ZETA DIVISION | kr | 800 | 0.32 | 0.32 | Sova | i | 0.297 | sova 109, neon 71, fade 32 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/1960/?timespan=all |
| enzo | Free Agent | fr | 1600 | 0.13 | 0.26 | Sova | i | 0.706 | sova 433, fade 53, tejo 26 | Sep 9, 2026 | https://prosettings.net/players/enzo/ | https://www.vlr.gg/player/114/?timespan=all |
| foxz | Free Agent | th | 800 | 0.49 | 0.49 | Sova | i | 0.464 | sova 212, skye 74, breach 31 | Nov 7, 2025 | https://prosettings.net/players/foxz/ | https://www.vlr.gg/player/6723/?timespan=all |
| Invy | Paper Rex | ph | 800 | 0.23 | 0.23 | Sova | i | 0.22 | sova 95, fade 81, breach 78 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/8504/?timespan=all |
| Lakia | Gen.G | kr | 800 | 0.3 | 0.3 | Sova | i | 0.475 | sova 187, fade 77, skye 60 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/773/?timespan=all |
| leo | Retired | se | 400 | 0.41 | 0.205 | Sova | i | 0.272 | sova 106, sage 71, omen 52 | Mar 11, 2026 | https://prosettings.net/players/leo/ | https://www.vlr.gg/player/1380/?timespan=all |
| MrFalin | FUT Esports | tr | 800 | 0.42 | 0.42 | Sova | i | 0.376 | sova 178, omen 87, breach 68 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/8044/?timespan=all |
| nobody | Edward Gaming | cn | 800 | 0.26 | 0.26 | Sova | i | 0.405 | sova 266, skye 114, fade 108 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/3017/?timespan=all |
| redgar | Free Agent | ru | 800 | 0.27 | 0.27 | Sova | i | 0.311 | sova 180, omen 147, skye 50 | Mar 9, 2026 | https://prosettings.net/players/redgar/ | https://www.vlr.gg/player/1427/?timespan=all |
| RieNs | Team Heretics | tr | 800 | 0.27 | 0.27 | Sova | i | 0.374 | sova 196, breach 77, fade 64 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/10971/?timespan=all |
| sacy | MIBR | br | 800 | 0.44 | 0.44 | Sova | i | 0.516 | sova 193, skye 53, fade 52 | Oct 5, 2026 | https://prosettings.net/players/sacy/ | https://www.vlr.gg/player/659/?timespan=all |
| shao | Natus Vincere | un | 800 | 0.35 | 0.35 | Sova | i | 0.347 | sova 180, fade 71, sage 62 | Jan 26, 2026 | https://prosettings.net/players/shao/ | https://www.vlr.gg/player/384/?timespan=all |
| trent | G2 Esports | us | 1600 | 0.16 | 0.32 | Sova | i | 0.367 | sova 227, fade 119, skye 74 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/15500/?timespan=all |
| vora | 100 Thieves | ca | 1600 | 0.12 | 0.24 | Sova | i | 0.471 | sova 222, fade 82, skye 38 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/20140/?timespan=all |
| Xdll | ZETA DIVISION | jp | 800 | 0.235 | 0.235 | Sova | i | 0.416 | sova 121, fade 57, sage 29 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/25221/?timespan=all |
| demon1 | Team Envy | us | 1600 | 0.1 | 0.2 | Chamber | s | 0.472 | chamber 167, jett 96, brimstone 18 | May 18, 2026 | https://prosettings.net/players/demon1/ | https://www.vlr.gg/player/26171/?timespan=all |
| johnqt | Sentinels | ma | 800 | 0.4 | 0.4 | Chamber | s | 0.14 | chamber 83, viper 76, cypher 74 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/1265/?timespan=all |
| xccurate | T1 | id | 400 | 0.59 | 0.295 | Chamber | s | 0.222 | chamber 24, jett 20, harbor 11 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/10816/?timespan=all |
| benjyfishy | Team Heretics | gb | 800 | 0.27 | 0.27 | Cypher | s | 0.358 | cypher 143, killjoy 114, viper 51 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/29873/?timespan=all |
| dapr | Cubert Academy | us | 800 | 0.357 | 0.357 | Cypher | s | 0.487 | cypher 271, killjoy 102, viper 93 | Jun 11, 2025 | https://prosettings.net/players/dapr/ | https://www.vlr.gg/player/454/?timespan=all |
| flashback | Retired | kr | 400 | 0.35 | 0.175 | Cypher | s | 0.284 | cypher 59, yoru 43, killjoy 35 | Sep 8, 2026 | https://prosettings.net/players/flashback/ | https://www.vlr.gg/player/35013/?timespan=all |
| free1ng | DRX | kr | 800 | 0.2 | 0.2 | Cypher | s | 0.254 | cypher 82, tejo 57, killjoy 40 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/1916/?timespan=all |
| kiles | Free Agent | ua | 800 | 0.431 | 0.431 | Cypher | s | 0.303 | cypher 176, viper 154, killjoy 123 | Dec 15, 2025 | https://prosettings.net/players/kiles/ | https://www.vlr.gg/player/2894/?timespan=all |
| Laz | ZETA DIVISION | th | 1600 | 0.136 | 0.272 | Cypher | s | 0.252 | cypher 122, killjoy 98, viper 68 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/8582/?timespan=all |
| nAts | Team Liquid | ru | 800 | 0.49 | 0.49 | Cypher | s | 0.543 | cypher 319, viper 175, killjoy 45 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/457/?timespan=all |
| suygetsu | Karmine Corp | un | 800 | 0.25 | 0.25 | Cypher | s | 0.411 | cypher 234, viper 127, killjoy 83 | Oct 5, 2026 | https://prosettings.net/players/suygetsu/ | https://www.vlr.gg/player/2858/?timespan=all |
| yetujey | FUT Esports | tr | 800 | 0.7 | 0.7 | Cypher | s | 0.357 | cypher 155, killjoy 99, viper 74 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/8369/?timespan=all |
| ZynX | Gen.G | kr | 1600 | 0.1 | 0.2 | Cypher | s | 0.319 | cypher 45, viper 26, vyse 21 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/51099/?timespan=all |
| Alfajer | Fnatic | tr | 400 | 0.45 | 0.225 | Killjoy | s | 0.34 | killjoy 184, raze 81, cypher 68 |  | https://prosettings.net/lists/valorant/ | https://www.vlr.gg/player/9810/?timespan=all |
| sushiboys | Retired | th | 800 | 0.37 | 0.37 | Killjoy | s | 0.425 | killjoy 208, cypher 121, jett 32 | Apr 7, 2026 | https://prosettings.net/players/sushiboys/ | https://www.vlr.gg/player/3342/?timespan=all |
| hoody | Free Agent | fi | 400 | 0.628 | 0.314 | Sage | s | 0.171 | sage 110, skye 80, sova 79 | Jun 26, 2026 | https://prosettings.net/players/hoody/ | https://www.vlr.gg/player/2690/?timespan=all |
| sheydos | Karmine Corp | ru | 400 | 0.83 | 0.415 | Sage | s | 0.308 | sage 125, skye 50, raze 50 | Jul 22, 2026 | https://prosettings.net/players/sheydos/ | https://www.vlr.gg/player/1428/?timespan=all |

### Excluded

- SirMaza, Shanks, PROD, Lothar, Nadeshot, tarik, Mendo, ShahZaM: creator/streamer
- Hyunmin (s800 1.00), frttt (1.51), wippie (0.92): implausible s800, likely entry error
- ts: no VLR agent data

# Demographic shifts (region, age, glasses) for the bell-curve algorithm

Date: 2026-11-02. Unit: s800 = sens x DPI / 800 (Valorant in-game sens at 800 DPI). Bell curve mean 0.3, SD 0.1; z = +1 means +0.1 s800 (faster).
Evidence tags: `research` (computed from data), `estimate` (judgement, no direct data). Output constants: `research/demographic_shifts.json`.

## Bottom line
- Region: the pro data does NOT support "North America prefers lower sensitivity than APAC". NA median s800 0.286 vs pooled APAC (KR, JP, CN, SEA) 0.2785; Mann-Whitney z = 0.07 (no difference). All region effects are small (|z| <= 0.14) next to the 0.1 SD unit and rest on pros only.
- Age: no gamer data on age vs sensitivity was found. Shifts are small judgement estimates.
- Glasses: no data linking glasses to mouse sensitivity. All set to 0.

## 1. Region (pro data, n = 99)
Source: ProSettings.net Valorant list, https://prosettings.net/lists/valorant/ (accessed 2026-11-02). 99 rows with DPI, sens and country were read; two further players appear only in page comments (not used). Cross-checks: the first 32 rows match research/pro_data_audit.json (all 32 values identical to the list).

Method
- Region assigned by player country (not team). Mapping: US/Canada = na; Chile/Argentina/Colombia = latam; Brazil = br; China = cn; South Korea = kr; Japan = jp; Indonesia/Singapore/Malaysia/Thailand/Philippines/Cambodia = sea; Turkey/Morocco = mena; all other European countries = eu. Turkey is an assumption (it competes in VCT EMEA); it makes mena a Turkey-dominated group (8 of 9).
- s800 clamped at 0.7 (the app's limit) before computing. Three rows exceed 0.7: HYUNMIN 1.00 (1600 DPI x 0.5, probably a listing error), frttt 1.51 (1600 x 0.755), f0rsakeN 0.71.
- Statistic: median (robust to outliers). Raw z = (region median - overall median 0.270) / 0.1. Shrunk = raw x n/(n+20). Then all region shifts were re-centred so the n-weighted mean is 0 (offset 0.020).

| Region | n | median s800 | mean s800 | raw z | shrunk z | final z |
|---|---:|---:|---:|---:|---:|---:|
| na | 24 | 0.286 | 0.296 | +0.16 | +0.09 | +0.07 |
| latam | 7 | 0.250 | 0.271 | -0.20 | -0.05 | -0.07 |
| br | 10 | 0.235 | 0.285 | -0.35 | -0.12 | -0.14 |
| eu | 17 | 0.270 | 0.299 | 0.00 | 0.00 | -0.02 |
| mena | 9 | 0.313 | 0.381 | +0.43 | +0.13 | +0.11 |
| kr | 17 | 0.263 | 0.295 | -0.07 | -0.03 | -0.05 |
| jp | 4 | 0.254 | 0.272 | -0.17 | -0.03 | -0.05 |
| cn | 4 | 0.285 | 0.291 | +0.15 | +0.03 | 0.00 |
| sea | 7 | 0.314 | 0.354 | +0.44 | +0.11 | +0.09 |
| oce | 0 | none | none | none | 0 | 0 (`estimate`) |

Overall pro median 0.270 (mean 0.315, SD 0.176 before clamp). Note the pro median is below the 0.3 curve mean; centring on the pro mean means these shifts are relative, not absolute.

Hypothesis test (NA lower than APAC): rejected. NA (n=24) median 0.286, mean 0.296; APAC (n=32) median 0.279, mean 0.314. The only visible APAC pattern is a high-sensitivity tail in SEA (and Turkey for mena), not a lower NA centre.

Limits
- Pros only, not ranked players; pros differ from the user population. Country is origin, not residence (e.g. jawgemo, listed Cambodia, plays in the US).
- ProSettings rows may be stale; the audit found conflicts with other sites for some players. Creators and benched players are included.
- jp and cn have n=4, oce n=0, latam n=7; those shifts are mostly shrinkage.
- Searches for Reddit or aim-trainer surveys of sensitivity by region found none (search for regional eDPI breakdowns returned only global pro benchmarks, e.g. a median of about 224 eDPI across 648 pros from a third-party database; unverified). No community regional data used.
- Caps (0.6) were never reached.

## 2. Age (literature; all values `estimate`)
Findings
- Hertzum & Hornbaek 2010, Int J Human-Computer Interaction 26(7): older users point more slowly with the mouse but without more errors, i.e. they trade speed for accuracy; slope about 50% larger than for younger users (via search summary; abstract only, not full text). https://www.tandfonline.com/doi/abs/10.1080/10447318.2010.487198
- Fitts' law for older adults (ACM): throughput 3.29 older vs 4.58 overall (search summary, not verified in full text). https://dl.acm.org/doi/pdf/10.5555/1497470.1497502
- Thompson, Blair & Henrey 2014, PLOS ONE: in 3,305 StarCraft 2 players aged 16 to 44, response-time slowing begins at about 24, independent of skill; older players seem to compensate with game mechanics (exploratory). No one over 44. https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0094215
- Gamer data for age vs sensitivity: none found. Pro databases do not record age.

Conversion: the literature supports slower reaction and lower motor speed with age, but not the direction or size of preferred sensitivity. Shifts are small and capped far below 0.4:

| Group | z |
|---|---:|
| u16 | +0.10 |
| 16-19 | +0.05 |
| 20-24 | 0 |
| 25-29 | -0.05 |
| 30-34 | -0.15 |
| 35+ | -0.25 |

The sign (older = lower sens) is a guess consistent with accuracy-first behaviour. Treat as weak.

## 3. Glasses (`estimate`, all 0)
- Peripheral distortion of spectacle lenses leads wearers to turn the head rather than make large eye movements (progressive-lens sources; 2024 Sci Rep found gaze/head differences did not change perceived distortion strength). https://www.nature.com/articles/s41598-024-54368-3 , https://pmc.ncbi.nlm.nih.gov/articles/PMC8693457/ , https://link.springer.com/article/10.1111/j.1475-1313.1991.tb00541.x
- Wearers adapt to look through clear lens areas. A monitor is a small field of view, so the effect on mouse sensitivity is unproven.
- Contacts vs glasses: only a VR fatigue study (n=32, not Valorant) and anecdotes (VLR, Overwatch forums); no aiming data. Fogt 2021 (esports vision characteristics) was surfaced but not read in full. https://onlinelibrary.wiley.com/doi/10.1097/OPX.0000000000001725
- Decision: none, glasses, contacts, unsure all z = 0.

## Sources
All accessed 2026-11-02; listed with ids in the JSON. Searches via WebSearch; only the ProSettings page was fetched in full. Literature items other than ProSettings are from search-result summaries and abstracts, not full texts.

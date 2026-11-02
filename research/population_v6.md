# Population dataset v6 (D1)

Generated 2026-11-02 by `research/raw_v6/build_v6.py` from cached extracts in `research/raw_v6/`. Machine-readable rows: `population_v6.json`.

**Rows: 5330** (target 400; non-pro sources: specs.gg self-submitted profiles and VLR.gg thread replies). Binned/survey data: none found (see Limitations).

## Method

Rows come from four sources fetched on 2026-11-02: ProSettings VALORANT list, SensLab VALORANT pro table (each row's own player-controlled source URL), specs.gg VALORANT profiles (team-tagged profiles = pro; profiles with no team = general, self-submitted), and replies in a VLR.gg forum thread that give rank, DPI and sens. cm360 = 914.4/(dpi*sens*0.07). Duplicates across sources are removed by normalised name (earlier source in the order above wins). Implausible rows (s800 = dpi*sens/800 > 1.2 or < 0.08) are excluded and counted.

## Sources (accessed 2026-11-02)

- ProSettings VALORANT list: https://prosettings.net/lists/valorant/ (HTML table, 100 rows; fetched with curl and a browser User-Agent, HTTP 200). Player pages https://prosettings.net/players/<slug>/ give the "Last updated" date.
- SensLab VALORANT pro table: https://senslab.pro/pro-settings/valorant (648 rows; each row links the player-controlled source, usually a stream chat-bot command, with its date; 303 rows are flagged by SensLab as "may be outdated", kept here with `stale: true`).
- specs.gg: player index via `https://specs.gg/assets/include/advsearch.php?q[2]=valorant&q[6]=<page>` (5373 VALORANT profiles), then each profile `https://specs.gg/<slug>` for DPI/sens/mouse/mousepad. Profiles have no real update date.
- VLR.gg forum thread: https://www.vlr.gg/245704/rank-and-sensitivity-survey (17 usable replies with rank, DPI and sens).

## Exclusions

- Creators removed from "pro" and labelled `streamer`: SirMaza, Shanks, PROD, Lothar, Nadeshot, tarik, Mendo, ShahZaM (same list as `agent_trends_research.md`) wherever they appear in a pro source.
- Implausible values (s800 > 1.2 or < 0.08), duplicates and missing DPI/sens:

  - `prosettings_list`: 1
  - `senslab`: 1
  - `senslab:duplicate_of_prosettings_list(DIFFERENT eDPI, kept earlier)`: 24
  - `senslab:duplicate_of_prosettings_list(same eDPI)`: 40
  - `specs_gg`: 200
  - `specs_gg:duplicate_of_prosettings_list(DIFFERENT eDPI, kept earlier)`: 26
  - `specs_gg:duplicate_of_prosettings_list(same eDPI)`: 24
  - `specs_gg:duplicate_of_senslab(DIFFERENT eDPI, kept earlier)`: 76
  - `specs_gg:duplicate_of_senslab(same eDPI)`: 31
  - `specs_gg:duplicate_of_specs_gg(DIFFERENT eDPI, kept earlier)`: 48
  - `specs_gg:duplicate_of_specs_gg(same eDPI)`: 7
  - `specs_gg:missing_dpi_or_sens`: 7
  - `specs_gg:unparseable`: 90
  - `vlr_thread`: 1
  - examples excluded for implausible value from `prosettings_list`: frttt dpi=1600 sens=0.755 s800=1.510
  - examples excluded for implausible value from `senslab`: Akira dpi=1600 sens=0.605 s800=1.210
  - examples excluded for implausible value from `specs_gg`: leaf dpi=1600 sens=0.8 s800=1.600; Kevin dpi=6000 sens=1.22 s800=9.150; teen dpi=800 sens=0.05 s800=0.050; specs.gg dpi=800 sens=3.908 s800=3.908; ken dpi=6400 sens=0.44 s800=3.520; AmaneOjakasa dpi=800 sens=8.889 s800=8.889; DRX Foxy9 dpi=400 sens=3.7 s800=1.850; Alexi dpi=1600 sens=0.9 s800=1.800
  - examples excluded for implausible value from `vlr_thread`: SEN_brasileiros dpi=3200 sens=0.314 s800=1.256

## Summary statistics (cm/360)

Log-normal fit = mean and SD (sample, n-1) of ln(cm/360); `exp(mean)` is the geometric mean. IQR is the 25th-75th percentile (linear interpolation).

| Group | n | Median | IQR | mean ln | SD ln | exp(mean) |
|---|---|---|---|---|---|---|
| pro | 732 | 58.3 | 46.6 - 72.6 | 4.055 | 0.333 | 57.7 |
| streamer | 8 | 49.7 | 39.3 - 62.5 | 3.890 | 0.309 | 48.9 |
| general | 4590 | 48.0 | 38.0 - 61.6 | 3.869 | 0.411 | 47.9 |
| pro, excluding SensLab-stale rows | 460 | 60.5 | 47.7 - 77.8 | 4.092 | 0.340 | 59.9 |
| all rows | 5330 | 49.5 | 39.8 - 65.3 | 3.895 | 0.406 | 49.1 |

### By dataset and group

| Dataset / group | n | Median | IQR | mean ln | SD ln | exp(mean) |
|---|---|---|---|---|---|---|
| prosettings_list / pro | 91 | 60.5 | 50.6 - 75.1 | 4.062 | 0.337 | 58.1 |
| prosettings_list / streamer | 8 | 49.7 | 39.3 - 62.5 | 3.890 | 0.309 | 48.9 |
| senslab / pro | 583 | 58.3 | 46.6 - 71.0 | 4.056 | 0.333 | 57.7 |
| specs_gg / general | 4574 | 48.0 | 38.0 - 61.6 | 3.869 | 0.411 | 47.9 |
| specs_gg / pro | 58 | 58.5 | 42.9 - 70.8 | 4.036 | 0.338 | 56.6 |
| vlr_thread / general | 16 | 52.7 | 41.9 - 56.1 | 3.918 | 0.325 | 50.3 |

### Ranked self-reports (VLR.gg thread only)

| Rank | n | Median | IQR | mean ln | SD ln | exp(mean) |
|---|---|---|---|---|---|---|
| bronze | 1 | 54.4 | 54.4 - 54.4 | 3.997 | nan | 54.4 |
| silver | 1 | 58.3 | 58.3 - 58.3 | 4.066 | nan | 58.3 |
| platinum | 4 | 63.3 | 46.8 - 75.7 | 4.031 | 0.379 | 56.3 |
| diamond | 2 | 61.2 | 51.0 - 71.4 | 4.056 | 0.490 | 57.7 |
| immortal | 5 | 42.3 | 40.8 - 50.2 | 3.693 | 0.364 | 40.2 |
| radiant | 1 | 54.4 | 54.4 - 54.4 | 3.997 | nan | 54.4 |
| unranked | 2 | 52.7 | 51.9 - 53.6 | 3.965 | 0.046 | 52.7 |

Rank groups are tiny; do not fit per-rank priors from them.

## Limitations

- **No rank-stratified population data was found.** Searches (reddit, VLR, guide sites) found no published survey or binned eDPI-by-rank table; guide sites quoting "recommended ranges by rank" cite no data. Reddit blocked automated access (HTTP 302). `binned` is therefore empty.
- The only ranked rows are 17 self-reported forum replies from about three years ago (one is a disputed 20,000 DPI claim). They cannot support per-rank priors.
- The "general" group is self-submitted specs.gg profiles. Users who make a profile are not a random sample of players; rank is unknown; profiles are unverified and may include creators or pros missing from team lists, or trolls. Profile data has no update date.
- "Pro" rows come from aggregators. SensLab rows include amateur-org players and 303 rows flagged stale (up to 2020). The tier (pro vs semi-pro) was not verified, so no "semi-pro" group is reported.
- Sources overlap and rows were de-duplicated by normalised handle only. Two different people with the same handle would be merged; the kept row is the earlier source.
- Pros are on average lower sensitivity (higher cm/360) than the general profile group; a prior for ordinary players should lean on the "general" row, with the above selection caveats.
- cm/360 assumes Valorant yaw 0.07 deg/count and ignores Windows scaling, raw-input and scoped sensitivity.

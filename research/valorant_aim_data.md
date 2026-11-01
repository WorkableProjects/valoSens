# Valorant aim and sensitivity data for the cm/360 model

Research date: 2026-11-01. Tags: STRONG = official Riot or measured by Riot; MODERATE = derived from a Riot source or a sizeable tracker; WEAK = community, forum, or secondhand; NO DATA = not found.

Constants used: yaw 0.07 deg/count; cm/360 = 13063 / eDPI (checked: 360/0.07 x 2.54 = 13063).

## 1. Movement speeds

- Base run speed: 5.40 m/s, derived. Riot wiki (Vandal page) gives ADS move speed as 76% = 4.104 m/s. 4.104 / 0.76 = 5.40 m/s. Assumes the 76% is relative to full run speed. Tag MODERATE (derived). Source: https://wiki.playvalorant.com/en-us/Vandal (read 2026-11-01)
- Walk speed: NO DATA as an absolute number. A Roblox-recreation GitHub project says Riot's post put walk at 61% of run (about 3.3 m/s). Tag WEAK. Source: https://github.com/bradleyholt2006-blip/valorant-feel-roblox/pull/4
- Crouch speed: NO DATA. No published crouch-to-run percentage was found.
- Sideways "knife" movement: 6.75 m/s. Quoted in a VLR.gg user post ("about 2 years ago"). Tag WEAK. Source: https://www.vlr.gg/416153/is-valorant-movement-slower-than-cs2
- Agent sprint: Neon High Gear max sideways speed buffed from 6.73 to 9.11 m/s. Ability value, not base movement. Tag WEAK (community wiki). Source: https://valorant.fandom.com/wiki/High_Gear (page returned HTTP 402 on fetch; figure is from search snippet only)
- Per-weapon run speed: Riot wiki Phantom and Vandal list accuracy penalties, not speeds. ADS move speed for Vandal: 76% (4.104 m/s). Phantom ADS fire is 594 RPM (per Riot wiki). Speed per weapon: NO DATA.
- Movement-to-accuracy: the Riot wiki ramps penalties up as the agent accelerates from standing and down as it decelerates. Exact acceleration values: NO DATA. Tag STRONG (qualitative). Source: https://wiki.playvalorant.com/en-us/Weapons
- Deadzone: about 27.5% of max movement speed (Patch 3.0 per a 2026 guide). Tag WEAK. Implies about 1.49 m/s at 5.40 m/s run. Source: 2026 movement guide (secondary, not fetched).
- Jump speed or height: NO DATA.
- Counter-strafe stop timing:
  - Riot-attributed (secondhand): counter-strafe reaches walk-level accuracy in 0.055 s vs 0.065 s for release-only; full stop from run 0.160 s. Tag WEAK. Source: MetaBot.GG article, cited via search snippet only.
  - Roblox-recreation project citing a 2020 Riot-account r/VALORANT post: counter-strafe reaches 25% speed in 0.104 s; full stop 0.160 s; walk-bound stop 0.110 s and 0.170 s. Tag WEAK (unverified). Source: https://github.com/bradleyholt2006-blip/valorant-feel-roblox/pull/4
- Strafe acceleration and deceleration constants: NO DATA.

## 2. Hitboxes

- Head and body size in cm: NO DATA. No datamine or Riot figure found. Tag NO DATA. Sources checked: https://www.vlr.gg/401413/valorant-hitboxes and https://www.gameslearningsociety.org/do-valorant-agents-have-different-hitboxes/ (the second is low-quality and contradicts Playbite).
- Agent height: all agents are "2 virtual meters tall" per a fan write-up of a Riot developer explanation. Tag WEAK. Source: https://theglobalgaming.com/valorant/how-tall-are-agents (secondhand; not verified against Riot).
- Real-scale fan model: standing 1.96 m, crouched 1.40 m. Tag WEAK (hobby project). Source: https://github.com/Technolimit/ValorantReal/pull/5
- Early-beta head hitbox was much larger than the model; Riot shrank it. Tag WEAK. Source: https://win.gg/news/explaining-the-hit-registration-and-latency-problems-in-valorant/
- Head hitbox width used in derivations below: NO DATA. Derived values are given per cm.

## 3. Engagement distances

- Riot Insights, 2023-05-15, 4M+ matches: "Nearly half of all Phantom kills took place within 15m." Vandal kills are "spread more evenly". Charted in 5 m bins in three buckets: 0-15, 15-30, 30+ m. Tag STRONG. Source: https://playvalorant.com/en-us/news/dev/valorant-data-drop-phantom-vs-vandal/
- Riot 2023 duel, 15-30 m: Phantom wins 78% when it deals 140 damage at that range; teammate assist 10%; Vandal wins 11%. Tag STRONG. Same source.
- Vandal headshot: 160 damage at any range without penetration. Tag STRONG. Same source.
- Operator kill distance by weapon class: NO DATA (measured). Operator damage is 255 head / 150 body / 120 legs, flat 0-50 m, per several aggregator sites. Tag MODERATE (multiple agreeing aggregators; not Riot primary). Not fetched directly.
- SMG and shotgun distances: NO DATA.
- Per-map distances:
  - Dodge.gg (qualitative): many Split fights within 15 m; Bind has almost no sightline longer than 20 m. Tag WEAK. Source: https://www.dodge.gg/en-US/valorant/news/operator-weapon-guide-2026
  - Switchblade Gaming planning brackets for Operator: 30 m+ OP territory, 15-30 m jiggle-contestable, under 15 m rifle fight. Author calls these "planning brackets, not hard lines." Tag WEAK. Source: https://www.switchbladegaming.com/valorant/anti-awp-guide/
  - Measured map distance distributions: NO DATA. MetaBot.GG has win rates only (91,543 matches; average 55.2%) and no distance data. Tag NO DATA.

## 4. Time-to-kill and reaction windows

- Riot netcode article, 2020-07-28 (Matt deWet, David Straily):
  - Peeker's advantage: "~141ms longer to react than defenders" under the baseline model. Tag STRONG. Source: https://www.riotgames.com/en/news/peeking-valorants-netcode
  - Riot Direct and 128-tick servers shave "~40ms (28%)" of that. Tag STRONG. Same source.
  - At 144 FPS, peeker's advantage falls to "~71ms (a 49% reduction)." Tag STRONG. Same source.
  - Gunfight outcomes "often came down to 20-50ms." Skilled players can "accurately identify small changes (~10ms)." A 10 ms change can move a fight from 90% to 90% for the other side. Tag STRONG. Same source.
  - Human reaction context: "human reaction times often fall in the 300ms range." Tag STRONG. Same source.
  - Ping goal: 35 ms round trip for 70% of players. Tag STRONG. Same source.
  - Server 128 tick, client targets 60 FPS. Tag STRONG. Same source.
- Phantom fire rate: 660 RPM (11 rounds/s) primary; ADS 594 RPM (9.9 rounds/s). Tag STRONG. Source: https://wiki.playvalorant.com/en-us/Phantom
- Vandal fire rate: 585 RPM (9.75 rounds/s) primary; ADS 8.775 rounds/s. Tag STRONG. Source: https://wiki.playvalorant.com/en-us/Vandal
- Phantom first-shot spread: standing 0.2 deg (0.11 deg ADS); crouched 0.17 deg. Max standing 0.9 deg. Tag STRONG. Source: Phantom wiki.
- Vandal first-shot spread: standing 0.25 deg (0.157 ADS); crouched 0.21 deg. Max standing 1.0 deg. Tag STRONG. Source: Vandal wiki.
- Movement spread penalties (added deg): crouch 0.8, walk 3, run 6, airborne 10 (both Phantom and Vandal). Tag STRONG. Same wiki pages.
- Recovery time: Vandal wiki has no current value; v0.50 patch history shows 0.4 s to 0.375 s (bugfix). Tag STRONG (historical). Phantom recovery: NO DATA for current patch.
- TTK in ms per weapon: NO DATA (derivable only from the stats above, not computed).
- Reaction window beyond the netcode numbers: NO DATA.

## 5. Tracking vs flicking

- Riot data drop: no discussion of moving or tracking targets. Its only angle statements are the verdict lines. Tag NO DATA for tracking-vs-hold.
- FPS Train split: 50% click, 30% flick, 20% track for Valorant. Tag WEAK (unverifiable "coaching data" claim). Source: https://fpstrain.us/tracking-vs-flicking-vs-clicking-aim-training-balance.html
- Measured tracking vs flick success on moving targets: NO DATA.
- Headshot rate guide: 20-25% solid, 30%+ excellent (rules of thumb). Tag WEAK. Source: https://topfragly.com/guides/valorant-headshot-percentage-guide/

## 6. Pro sensitivity and rank

- SensLab (648 verified pros, 2026 snapshot per footer; date not stated):
  - Median eDPI 224; middle 50% 184-280; range 80-968. Tag MODERATE.
  - Median cm/360 58.3 cm (checked as 13063 / 224 = 58.3). Tag MODERATE.
  - 303 values are marked "may be outdated." Source: https://senslab.pro/pro-settings/valorant
- ProConfig (121 verified pros; updated 2026-06-03):
  - Median eDPI 240; mean 259; range 112-1208. Tag MODERATE (smaller sample).
  - Most common bin: 150-199 (34 pros, 28.1%). Source: https://proconfig.net/stats/valorant-edpi-distribution/
- Setup.gg (ProSettings list, 668 players): median 231.2, average 248.3. Tag WEAK (search snippet). Source: https://www.setup.gg/game/valorant/best-sens/
- Turbosmurfs (699 pros, 2026-05-18): median 240, average 267. Tag WEAK (search snippet). Source: https://turbosmurfs.gg/article/valorant-settings
- 2025-specific median: NO DATA. RankedKings (Nov 2025) gives a broad 200-500 average range with a cluster at 300-400. Tag WEAK. Source: https://rankedkings.com/blog/what-sens-do-pro-players-use-in-valorant
- Sensitivity vs rank: NO DATA. VLR.gg survey comments are anecdotal. Tag WEAK. Source: https://www.vlr.gg/245704/rank-and-sensitivity-survey
- Tracker.gg: has rank-relative stats, no published sensitivity-by-rank table found. Tag NO DATA.

## 7. Mice and setup (pros)

- Mouse weight, median 60 g across 1,481 pros; most in 55-70 g. Tag MODERATE (tracker dataset; figures from search snippet). Source: https://esportsettings.com/blog/most-popular-pro-mice/
- Older EsportsMice sample (570 pros): average 55 g. Tag WEAK (older, different pool). Source: https://esportsmice.com/games/valorant
- Polling rate: 1000 Hz 51%, 4000 Hz 15%, 8000 Hz 3%. Tag WEAK (attribution unclear in snippet).
- DPI: 800 at 55%, 400 at 15%. Tag WEAK (same snippet).
- Mousepad size: NO DATA.
- Grip style distribution: NO DATA (quantitative). Qualitative: claw and fingertip use symmetric shells; palm uses ergonomic shells. Tag WEAK.

## 8. Derived: angular velocity of a sideways-moving target

Formula: omega (deg/s) = (v / d) x 57.2958, for lateral motion perpendicular to the line of sight.

Rows use three speeds that each have a source:
- v = 4.104 m/s: Riot ADS move speed (Vandal wiki). Low. Tag STRONG for the value, but it is a walking-speed proxy.
- v = 5.40 m/s: derived run speed (Riot wiki, 76% ADS). Central. Tag MODERATE.
- v = 6.75 m/s: knife movement (WEAK). High.

| Speed (m/s) | 10 m (deg/s) | 20 m (deg/s) | 30 m (deg/s) |
|---|---|---|---|
| 4.104 | 0.4104 rad/s x 57.3 = 23.5 | 0.2052 x 57.3 = 11.8 | 0.1368 x 57.3 = 7.8 |
| 5.40 | 0.540 x 57.3 = 30.9 | 0.270 x 57.3 = 15.5 | 0.180 x 57.3 = 10.3 |
| 6.75 | 0.675 x 57.3 = 38.7 | 0.3375 x 57.3 = 19.3 | 0.225 x 57.3 = 12.9 |

Arithmetic example: 5.40 / 10 = 0.540 rad/s; 0.540 x 57.2958 = 30.94 deg/s.

Angular width of the head: theta = 2 x atan(W / (2d)), with W = head width in metres. Head width is NO DATA, so per 10 cm of head width:
- 10 m: 2 x atan(0.10 / 20) = 0.573 deg
- 20 m: 2 x atan(0.10 / 40) = 0.286 deg
- 30 m: 2 x atan(0.10 / 60) = 0.191 deg
Per 1 cm of head width: 0.057, 0.029 and 0.019 deg at 10, 20 and 30 m. Multiply by the real head width once it is sourced.

Mouse-travel context: at the median cm/360 of 58.3, 1 cm of mouse travel is 360 / 58.3 = 6.18 deg of turn. A 30 deg/s track is about 4.9 cm/s of mouse travel.

## Suggested model inputs

| Quantity | Low | Central | High | Basis |
|---|---|---|---|---|
| Base run speed (m/s) | 4.10 | 5.40 | 6.75 | Riot wiki ADS move speed (STRONG value); derived 76% run (MODERATE); knife speed (WEAK) |
| Walk speed (m/s) | NO DATA | NO DATA | NO DATA | Only a 61%-of-run secondhand ratio (WEAK) |
| Crouch speed | NO DATA | NO DATA | NO DATA | None found |
| Counter-strafe stop time (s) | 0.104 | 0.160 | 0.170 | WEAK (secondhand) |
| Head width (cm) | NO DATA | NO DATA | NO DATA | None found; use the per-cm formula |
| Body width/height (cm) | NO DATA | NO DATA | NO DATA | None found |
| Agent height (m) | 1.40 (crouch) | 1.96 (standing) | 2.00 | WEAK (fan model; secondhand 2 m claim) |
| Engagement distance, Phantom (m) | 0 | 15 | 30 | STRONG (nearly half of kills within 15 m; 15-30 m bucket) |
| Engagement distance, Operator (m) | NO DATA | NO DATA | NO DATA | Only qualitative map brackets (WEAK) |
| Peeker's advantage (ms) | 10 | 40 | 141 | STRONG (Riot article; 141 baseline, 40 after Riot Direct, 10 ms detectable) |
| Human reaction time (ms) | NO DATA | 300 | NO DATA | STRONG (Riot article context; no range given) |
| Phantom fire rate (rounds/s) | 9.9 (ADS) | 11.0 | 11.0 | STRONG (Riot wiki) |
| Vandal fire rate (rounds/s) | 8.775 (ADS) | 9.75 | 9.75 | STRONG (Riot wiki) |
| Phantom first-shot spread, standing (deg) | 0.11 (ADS) | 0.20 | 0.20 | STRONG (Riot wiki) |
| Vandal first-shot spread, standing (deg) | 0.157 (ADS) | 0.25 | 0.25 | STRONG (Riot wiki) |
| Movement spread penalty, running (deg) | 6 | 6 | 6 | STRONG (Riot wiki) |
| Movement spread penalty, walking (deg) | 3 | 3 | 3 | STRONG (Riot wiki) |
| Pro median eDPI | 224 | 232 | 240 | MODERATE (SensLab 224, ProConfig 240, Setup.gg 231.2) |
| Pro median cm/360 (cm) | 54.4 | 56.5 | 58.3 | Derived from 13063 / eDPI (MODERATE) |
| Pro eDPI IQR | 184 | 232 | 280 | MODERATE (SensLab) |
| Sensitivity vs rank | NO DATA | NO DATA | NO DATA | Anecdotal forum comments only (WEAK) |
| Mouse weight (g) | 55 | 60 | 70 | MODERATE (EsportsSettings median 60; older sample 55) |
| Polling rate (Hz) | 1000 | 1000 | 8000 | WEAK (51% at 1000 Hz; 3% at 8000 Hz) |
| Mousepad size | NO DATA | NO DATA | NO DATA | None found |
| Tracking vs flick share of fights | NO DATA | NO DATA | NO DATA | Only a WEAK rule-of-thumb split (FPS Train) |
| Peak velocity of a sideways target at 10 m (deg/s) | 23.5 | 30.9 | 38.7 | Derived from the speed row above |
| Head angular width per 10 cm at 10 m (deg) | NO DATA | 0.573 | NO DATA | Formula; head width NO DATA |

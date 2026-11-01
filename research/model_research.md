# Research for a Valorant cm/360 formula

Compiled 2026-10-31. Evidence-strength tags: STRONG = peer-reviewed with a controlled experiment. MODERATE = peer-reviewed but small or indirect. WEAK = third-party site, vendor or blog. DERIVED = my own arithmetic, with the inputs shown. NO DATA = I searched and found nothing citable.

Conversion used throughout: cm/360 = 360 * 2.54 / (0.07 * eDPI) = 13063 / eDPI, where eDPI = DPI * in-game sens.
- 140 eDPI = 93.3 cm
- 200 eDPI = 65.3 cm
- 240 eDPI = 54.4 cm
- 280 eDPI = 46.7 cm
- 320 eDPI = 40.8 cm

---

## 1. Boudaoud, Spjut, Kim (NVIDIA), "Mouse Sensitivity Effects in First-Person Targeting Tasks"

Source: https://arxiv.org/abs/2203.12050 (v1, 22 Mar 2022). The arXiv title is "Mouse Sensitivity Effects in...". The task prompt's IEEE ToG 2023 venue and title were not verified by me. I read the arXiv PDF text.

**Design**
- 15 recruited, 13 analysed: 12 male, 1 female, ages 11-33. All were regular FPS players with 10-20 or more hours per week.
- 8 sessions of 500 trials each. Six fixed sensitivities were tested, plus each subject's preferred sensitivity in the first and last sessions.
- Fixed sensitivities were 0.225, 0.45, 0.9, 1.8, 3.6 and 7.2 deg/mm. That is 160, 80, 40, 20, 10 and 5 cm/360. The paper gives deg/mm = 36 / (cm/360).
- Render FOV was 103 degrees horizontal on a 25-inch 1080p monitor. The mouse ran at 3200 DPI, which avoids quantization.
- The first 50% of each session's trials were discarded as adaptation.
- Targets were icosahedra 0.57 to 9.15 degrees wide. Distance from the view centre was 7-25 degrees horizontal, giving an index of difficulty (ID) of 0.83-5.50.
- The maximum mouse travel was about 112 mm, at the lowest sensitivity tested. The authors capped travel so subjects would not lift the mouse.

**Results**
- Completion time and throughput both show a significant main effect of sensitivity.
  - Time: F(5,19955) = 111.72, p < 0.0001.
  - Throughput: F(5,19955) = 275.59, p < 0.0001.
- Adjacent sensitivity pairs differ at p < 0.001 everywhere except inside 0.45-1.8 deg/mm. That is **20-80 cm/360, a 4x range**, and the authors call it the near-optimal zone. The optimum is flat inside that zone.
- Minimum variance of completion time falls in the same 20-80 cm/360 zone.
- Performance degrades on both sides.
  - Hit rate is roughly flat (above 85% for most conditions) and drops only at the fastest setting, 7.2 deg/mm = 5 cm/360. That one differs from the rest at p = 0.0146.
  - Hit rate is highest at the lowest sensitivities.
  - Submovement count rises monotonically with sensitivity. Precision degrades at high sensitivity, which forces more corrective submovements.
  - Low-sensitivity loss comes from slower view rotation.
  - The paper fits no closed-form function. Only the shape is reported (ANOVA plus pairwise tests). The curve is U-shaped on a log sensitivity axis.
- Preferred sensitivities clustered at about 1.2 deg/mm = 30 cm/360. All but two subjects preferred values inside the 20-80 zone. The two outside it (higher sensitivity) were among the poorest performers.
- Preference vs optimum:
  - Subjects' preferred sensitivities were not significantly better than other sensitivities in the optimal zone.
  - There was no significant long-term muscle-memory penalty from switching sensitivities. Differences were under 15% of mean time.
  - The paper notes that the most skilled and least skilled subjects tended to show degradation.
- **Target size and distance (Fig. 11):**
  - Low-ID tasks (near or big targets) favour higher sensitivity.
  - High-ID tasks (far or small targets) favour lower sensitivity.
  - The authors state this qualitatively and give no numeric slope.
- The paper describes this as a speed-precision trade-off. It matches the pointer-gain literature, which reports optimal CD gains of 2-8, a 4x range.
- The authors flag these limits themselves:
  - 180-degree turns were not tested. They say large rotations may favour lower sensitivity.
  - Scoped modes were not tested.
  - Targets were within 25 degrees of the view centre.
  - Mouse travel was capped near 100 mm, so clutching was not studied.
  - Gaming pads can be 400-500 mm.
- They also note that vertical aim is bounded at plus or minus 90 degrees.
- Their survey of pro sensitivities from prosettings (Sept 2020) is in Fig. 1 and Table 1 of the paper. I did not extract it.

Evidence: STRONG for the existence of a broad, flat optimum and its rough 20-80 cm/360 bounds. The sample is small (n = 13), the tasks are short single-shot flicks of at most 25 degrees, and there is no fitted function. It is not strong enough to fix a point value within the range.

---

## 2. Fitts' law and CD gain

**Casiez, Vogel, Balakrishnan, Cockburn (2008)**, "The Impact of Control-Display Gain on User Performance in Pointing Tasks", Human-Computer Interaction 23(3):215-250. PDF: https://www.dgp.toronto.edu/~ravin/papers/hci2008_cdgain.pdf (read in full text). DOI page: https://www.tandfonline.com/doi/abs/10.1080/07370020802278163

- The paper reports an "L-shape", not a U-shape.
  - Movement time rises sharply at low gain, because of clutching and limb-speed limits.
  - It is nearly flat at high gain, with only a slight rise for very small targets.
  - Gains tested went up to 64 on the big display. Movement time stayed constant above CD gain 16.
- The paper cites earlier work that found U-shapes:
  - Gibbs 1962.
  - Zhai, Milgram and Buxton 1996.
  - Jellinek and Card 1990 saw quantization limit the top end.
  - Another cited study tested gains 1-16 and also found a U-shape (I did not identify which in the text).
  - The earlier literature is mixed. Some studies found no effect at all.
- Clutching: at low gain, clutching time was 26% and 7% for the two lowest levels in experiment 2. A clutching share of 24% increased movement time by 124%.
- The maximum mouse operating range observed was 36 cm at gain 1, and 37 cm at gain 12 (under 1% clutching).
- The authors recommend a conservative maximum operating range, OR_max, of 30 cm, because limb speed caps performance.
- Usable-gain model:
  - CD_min = D_max / OR_max.
  - CD_max = min(Mouse_res / Screen_res, W_min / Hand_res).
- The minimum hand and finger resolution was estimated at about 0.2 mm. Accuracy problems appeared with 2 mm targets at gain 12 on a 1600 DPI mouse, so the cause was human accuracy, not quantization.
- Maximum limb speed logged: 2441 mm/s (97th percentile value is given in the paper).
- Limb use: wrist, finger and forearm profiles did not map cleanly onto the movement-time curve. The authors had expected arm use to explain the slow low-gain times and did not find a strong correspondence.

**Boudaoud et al. (item 1)** discuss the pointer-gain literature. The reported optimal CD gains span 2-16 across studies, and surveys converge on 2-8, a 4x multiplicative range. They find the FPS optimum has the same 4x width.

**Related**
- Looser, Cockburn and Savage (2005) showed FPS aiming follows Fitts' law. This is cited in Boudaoud's references. I did not read it.
- Pang, Hoffmann and Goonetilleke (2019) is also cited by Boudaoud on gain and ID effects on mouse movement time. I did not read it.

**Mapping to the model**
- Your CD_min analogue is the clutch-free turn: a 180 degree turn in one sweep within OR_max = 30 cm requires cm/360 <= 60. With a 40-45 cm usable pad it is about 80-90.
- Your CD_max analogue is the quantization and precision limit. Hand resolution is about 0.2 mm, so angular precision is 0.2 mm * (360 / cm/360 in mm).

Evidence: STRONG for the L or U shape and for clutching and precision as the limiting mechanisms. DERIVED for the Valorant mapping.

---

## 3. Physical limits (wrist and arm travel)

I found no study that measures wrist sweep during mouse aiming. The wrist-motion numbers below are general joint ROM and functional-ROM data. The travel numbers are my geometry. Pivot radius is an assumption, not a cited figure.

**Wrist ROM sources**
- Palmer et al. (1985), "Functional wrist motion: a biomechanical study", J Hand Surg 10(1):39-46. https://pubmed.ncbi.nlm.nih.gov/3968403/ (abstract only, via search)
  - 10 subjects, 52 tasks, triaxial electrogoniometer.
  - Functional range: 5 degrees flexion, 30 degrees extension, 10 degrees radial deviation, 15 degrees ulnar deviation. That is 25 degrees total in the deviation (yaw) plane.
- Ryu et al. (1991), "Functional ranges of motion of the wrist joint", J Hand Surg 16(3). https://www.jhandsurg.org/article/0363-5023(91)90006-W/abstract (abstract only, via search)
  - 40 subjects, biaxial goniometer.
  - Daily tasks need 60 degrees extension, 54 degrees flexion, 40 degrees ulnar deviation, 17 degrees radial deviation.
  - Most tasks can be done with 70% of the maximal ROM, which is about 40 degrees flexion and extension and about 40 degrees of combined deviation.
- The "about 20 degrees radial, about 30 degrees ulnar" figure that you quoted for deviation is textbook maximal ROM from anatomy references. I did not retrieve a citable source. The Ryu data show 17 radial and 40 ulnar are needed for daily tasks. That is about 57 degrees of useful total and is an upper bound, not a comfortable range.
- The two studies disagree by a factor of about 2 in total deviation (25 vs about 57 degrees). That is a definition and task difference, not noise.

**Derived lateral travel (my geometry, not cited)**
- Travel = r * theta_rad, where r is the pivot-to-sensor distance.
- r = 8-12 cm is my assumption for a wrist pivot at the base of the palm. Anthropometric validation is missing, so treat it as an estimate.

| r (cm) | 40 deg | 50 deg | 60 deg | 70 deg |
|---|---|---|---|---|
| 8 | 5.6 | 7.0 | 8.4 | 9.8 |
| 10 | 7.0 | 8.7 | 10.5 | 12.2 |
| 12 | 8.4 | 10.5 | 12.6 | 14.7 |

- A comfortable wrist-only sweep, Palmer's 25 degrees total up to Ryu's about 57 degrees, at r = 10 cm, is about 4.4 cm to about 10 cm.
- At 50 cm/360, a 90 degree turn is 12.5 cm and a 180 degree turn is 25 cm. A 90 degree turn alone already exceeds a wrist-only range. Anything above about 100 degrees of in-game rotation at that sensitivity needs forearm or arm movement.
- Equivalently, a wrist-only player covering about 10 cm needs cm/360 of at most about 10 * 360 / 90 = 40 cm for a 90 degree turn and about 20 cm for 180.
- Forearm and elbow sweep: I found no cited comfortable value. Casiez et al. report a maximum operating range of about 36-37 cm, and recommend 30 cm as a conservative upper bound. That is the best available cited number for forearm-arm travel. Pro mousepads are about 40-49 cm long (item 7), so the usable lateral range is about 30-45 cm.

Evidence: MODERATE for ROM from the abstracts. WEAK or DERIVED for the travel conversion, because the pivot radius is an assumption.

---

## 4. Kang et al., CHI 2024, "Quantifying Wrist-Aiming Habits with A Dual-Sensor Mouse"

Source: https://dl.acm.org/doi/10.1145/3613904.3642797 (DOI 10.1145/3613904.3642797). Authors: Donghyeon Kang, Namsub Kim, Daekaun Kang, June-Seop Yoon, Sunjun Kim, Byungjoo Lee. Subtitle: "Implications for Player Performance and Workload." I could not retrieve the full text (the ACM HTML and the kuaa.net PDF returned 403 or HTML). Everything below comes from the abstract and search summaries.

- A dual-sensor mouse measures the mouse body's angular velocity. The W-index is the slope of a regression line in the W-diagram, which plots mean wrist angular velocity against mean lateral mouse speed. Average R^2 is about 0.99.
- N = 17 FPS players. A search summary says 5 were professional Rainbow Six Siege players. I did not verify the split in the full text.
- Pros had an average W-index about 20.2% higher than amateurs.
- W-index generally increased with mouse sensitivity. Higher sensitivity means more wrist use.
- Mean pad force correlated positively with W-index. That is a workload cost.
- Performance and W-index had only weak positive correlations, and only for some players.
- Pros set their sensitivity much lower than amateurs in the sample. A prior motion-capture study (Park et al.) found pros rotated their wrists less. The authors say they cannot yet tell whether pros still use less wrist at the same sensitivity.
- A web survey of the top 100 posts and 25 videos found 61% recommended arm aiming over wrist aiming.
- I found no numeric W-index per cm/360 slope, and no cm/360 threshold for the wrist-arm switch.

Evidence: MODERATE and directionally useful. There is no quantitative sensitivity-to-wrist-fraction function that I could extract. Treat wrist share as a monotone increasing function of sensitivity.

---

## 5. Valorant geometry

- **Yaw:** 0.07 degrees per count at sens 1.0. Source: converter sites (e.g. https://senslab.pro/sensitivity, https://www.valorant-spind.de/en/valorant-cs2-sens.html). The CS:GO yaw is 0.022, so the conversion factor is 0.022 / 0.07 = 0.3143. The figure is community-measured, not published by Riot. Evidence: WEAK-MODERATE, but widely agreed.
- **FOV:** 103 degrees horizontal at 16:9, which is a 70.53 degree vertical FOV. It is locked. Boudaoud et al. also used 103 degrees. Evidence: WEAK-MODERATE (secondary sites).
- **Angle per count:** 0.07 * sens degrees. At 800 DPI and sens 0.35 that is 0.0245 degrees per count. At 1600 DPI and 0.175 sens it is the same.
- **Pixel skipping (my derivation, not found documented):**
  - At 1920 px wide with 103 degrees horizontal FOV, the screen centre is 1920 / 2 / tan(51.5 degrees) = 763.6 px per radian, which is 13.3 px per degree. One pixel at the centre is about 0.075 degrees.
  - One count is 0.07 * sens degrees. So counts skip pixels at the centre only when sens is above about 1.07, which is above any pro setting listed.
  - Pro sens values are about 0.1-0.5, so the mouse already addresses sub-pixel angles. Skipping is not a constraint at pro cm/360.
  - What matters at low eDPI is hand precision, not count size (see item 2: hand resolution about 0.2 mm).
  - Edge-of-screen pixels span fewer degrees per pixel at the edges (projection), so skipping would start there at a lower sens, but I did not compute it.
- **Turn sizes and flick-angle distributions:** I found no published flick-angle distribution for Valorant, CS or any tactical shooter. Tools like AimFinder and Offangle compute per-kill flick data but publish no distributions. NO DATA.
  - Boudaoud tested 7-25 degree horizontal target offsets (plus 0-2.8 vertical). That is the only quantified range I found.
  - Geometric facts: a flank turn is up to 180 degrees, and a full spin is 360. Duel flicks are plausibly under 30 degrees (my judgement, not data). Check this against your own replay data if you can.
  - Corner-peek 90 degree turns need 25% of cm/360 (12.5 cm at 50 cm/360).
- **Angle snapping, vertical limit and FOV:** the vertical angle is limited to plus or minus 90 degrees (Boudaoud). Nothing was found that quantifies this for Valorant.

---

## 6. Pro eDPI distribution (2026)

All figures are from 2026 pages. Samples overlap and differ in date, which explains the spread.

| Source | n | Median eDPI | Spread | cm/360 | Date |
|---|---|---|---|---|---|
| prosettings.net guide (https://prosettings.net/guides/valorant-options/) | 705 | 240 | mean 267 | about 45 average (the page says; arithmetic on 267 gives about 49, so treat 45 as loose) | byline May 18, 2026 (title says Oct 2026) |
| prosettings list as quoted by setup.gg (https://www.setup.gg/game/valorant/best-sens/) | 668 | 231.2 | mean 248.3 | 240 eDPI is about 54.4 | Sept 19, 2026 |
| SensLab (https://senslab.pro/guides/best-valorant-sensitivity) | 648 | 224 | Q1 184, Q3 280 | median about 58.3, IQR about 47-71 | Oct 4, 2026 |
| EsportSettings (https://esportsettings.com/blog/valorant-pro-sensitivity-guide/) | 435 (the page also cites 412) | 240 | middle 80%: 120-420 | median 57, middle 80%: 39.8-81.6 | Sept 20, 2026 |
| ProConfig (https://proconfig.net/stats/valorant-edpi-distribution/) | 121 | 240 | mean 259, range 112-1208 | n/a | June 3, 2026 |

- Consensus: median about 224-240 eDPI, which is about 54-58 cm/360. The quartiles come from SensLab only: 184-280 eDPI, or about 47-71 cm/360. The middle 80% is about 120-420 eDPI, or about 31-109 cm/360 (EsportSettings).
- ProConfig distribution (n = 121): 150-199 is the largest band at 28.1%. 200-249 is 25.6%, 250-299 is 19.8%, 100-149 is 5.8%, 300-349 is 8.3%, 350-399 is 5.0%, and about 6% sit above 400 (right tail to 1208).
- DPI: prosettings says about 50% use 800 and about 40% use 400. EsportSettings says 53% / 28% / 16% for 800 / 400 / 1600. SensLab says most use 800, with a 1600 minority.
- Scoped multiplier: 79% of pros use 1.00 (prosettings), 74.3% (setup.gg's 614-player sample).
- **By role:** NO reliable data. Sources conflict.
  - BattlePooja (https://battlepooja.com/average-edpi-valorant-pros/) gives duelists about 266, initiators about 286, controllers about 216, and says it has no verified sentinel data. WEAK.
  - Sens Converter gives ranges: duelists 160-280, initiators 200-280, controllers 224-320, sentinels 212-300 (https://sensconverter.app/valorant-pro-settings/). WEAK.
  - DCPROSENS gives duelists 280-400 and sentinels lowest on their team (https://dcprosens.com/best-valorant-sensitivity-settings-2026/). It conflicts with the other two.
  - EsportSettings gives sentinels 200-350 and duelists 180-300, qualitatively and with no statistics.
  - The ordering is not consistent across sources. Do not build a role term into the formula without your own sample.
- Selected pros (pages above): TenZ 128, Cryocells 139, Demon1 160, OXY 200, florescent 280, Primmie 280, aspas 320.
- Evidence: MODERATE for the pooled median, since several independent trackers agree. WEAK for roles.

---

## 7. Rank/skill vs sensitivity, and mousepad sizes

**Rank vs sensitivity**
- I found no survey that breaks eDPI down by Valorant rank. NO DATA.
- One guide cites a 2022 survey with typical eDPI 312 and range 160-776, with no rank split. WEAK, unverified.
- A coaching blog asserts that 200-300 eDPI is common among Immortal and Radiant players, with no data behind it. WEAK.
- GOACHING says it has rank ranges but I could not retrieve them.
- Boudaoud (item 1) is the only controlled evidence. The two subjects who preferred sensitivities above the optimal range were among the poorest performers. n = 2, so it is anecdotal.
- Kang et al. (item 4): pros set sensitivity much lower than amateurs in their sample, n = 17.
- CS2: SensLab reports a median 49.5 cm/360 for CS2 pros. A single number from one page.

**Mousepad sizes**
- prosettings.net Valorant mousepad guide (https://prosettings.net/guides/valorant-mousepad/), n = 705, Oct 2026. Top pads and dimensions:
  - Artisan Ninja FX Zero 17.59%, 42 x 49 cm.
  - Pulsar eS Saturn Pro 7.80%, 41 x 49 cm.
  - Razer Gigantus V2 4.82%, 40 x 45 cm.
  - Artisan Type-99 4.54%, 49 x 42 cm.
  - VAXEE PA 4.26%, 39 x 47 cm.
  - The page gives no large-or-XL share.
- EsportSettings: Artisan Zero Soft/XSoft 21%, Pulsar Saturn Pro 14%, ZOWIE G-SR-SE 9%.
- So the usable pad length for pros is about 45-49 cm and width about 39-42 cm. The pro sample's typical pad is 40-50 cm. That bounds clutch-free travel at about 40-45 cm in x.
- GameGrids (CS2, 298 pads): 22.0% of players below 800 eDPI vs 28.2% of players at or above 800 eDPI use big cloth formats. The author finds no support for the "lower sensitivity needs a bigger pad" rule. Keyword-based definition, so WEAK-MODERATE. https://gamegrids.io/cs2/blog/cs2-pro-mousepad-surface-census/
- Vendor claims (Odin: 91% XL, DCPROSENS split) have no stated method. Ignore them.

---

## 8. Headshot % by rank

Source: UpForge (https://upforge.gg/valorant/stats/average-headshot-percentage), medians per rank for linked-Riot-account users, 389 players, updated Oct 31, 2026. It is a small, self-selected sample. Tracker.gg returned 403, so I have no tracker.gg numbers.

| Rank | Median HS% |
|---|---|
| Iron 2-3 | 12.4-13.0 |
| Bronze 1-3 | 18.1 / 19.8 / 19.6 |
| Silver 1-3 | 21.2 / 20.5 / 20.6 |
| Gold 1-3 | 21.3 / 21.8 / 23.1 |
| Platinum 1-3 | 24.9 / 30.7 / 26.2 |
| Diamond 1-3 | 27.0 / 28.2 / 24.1 |
| Ascendant 1-3 | 26.8 / 30.8 / 32.7 |
| Immortal 1 | 28.4 |

- Per-rank samples are 5-43 players, so individual rows are noisy (see Platinum 2 at 30.7 and Diamond 3 at 24.1). The trend is the useful part: roughly 13% at Iron, about 20% at Bronze to Gold, about 25-28% at Platinum to Diamond, and about 27-33% at Ascendant and up.
- GameplayKing reports an average of 27% (range 19-34%) for the top 500 Radiant players (https://gameplayking.com/blog/valorant-headshot-percentage-science). I have not verified its method.
- Weapon choice and play style move HS% a lot, and Riot publishes nothing official. Other pages (KJC, FragLy) give rules of thumb with no data, for example 20-25% as solid and 30%+ as excellent.
- Evidence: WEAK-MODERATE. A usable ordinal trend, not a calibration target.

---

## Implications for the formula

- The optimum is broad and flat on a log scale. Boudaoud et al. found a statistically indistinguishable zone of 20-80 cm/360 (4x) for 0-25 degree flicks, and pro preferences cluster inside it. Model the cost as a function of log(cm/360), with a flat-bottomed curve. Do not use a sharp optimum with a narrow tolerance.
- Pro Valorant players sit at the upper end of that zone: median about 54-58 cm/360 (224-240 eDPI), IQR about 47-71 cm/360. Use that as a prior or anchor, not the Boudaoud midpoint of about 40 cm. Valorant's sample is skewed toward larger angles and lower sensitivity than the NVIDIA study's flick range.
- Two opposing cost terms are supported:
  - Low-sensitivity cost: travel needed for the biggest turn you must make (the clutching and limb-speed limit). Casiez et al. give a conservative 30 cm operating range, and pro pads are about 40-49 cm long. Required travel for a turn of angle T is cm/360 * T / 360. A 180 degree turn at 60 cm/360 is 30 cm, which is at the limit.
  - High-sensitivity cost: precision, from hand resolution (about 0.2 mm, Casiez) and submovement growth (Boudaoud). Angular precision in degrees is about 0.2 mm * 360 / (cm/360 in mm).
- Both terms can be written as constraints plus one physical input (arm or wrist), so no per-answer fudge multipliers are needed. Inputs that are supported: pad length (hard clutch-free bound), grip or wrist-vs-arm tendency (monotone in sensitivity, per Kang), and the target turn angle.
- Wrist-only travel is about 4-10 cm (my derivation from 25-57 degrees of deviation, 10 cm pivot). That covers a 90 degree turn only if cm/360 is below about 40. A wrist-only player is therefore pushed toward the low-cm/360 side of the zone (about 25-40 cm/360), and arm aimers can run the high side. Treat the wrist pivot radius (8-12 cm) as a parameter, and say so in the UI.
- Quantization is not binding for Valorant. Counts skip pixels at the screen centre only above sens of about 1.07. Cap DPI/eDPI effects only through hand-precision limits, and don't model pixel skipping at pro-range sensitivities.
- Target size and distance: smaller or farther targets favour lower sensitivity (direction only, no slope in the paper). A task-mix term (duel flick size vs flank turn) is justified qualitatively, but no flick-angle distribution exists. If you want it, collect replay data or expose it as a user-selectable weight.
- Do not add role or rank terms from this data. Role-by-eDPI sources contradict each other, and there is no rank-vs-sensitivity data. HS% rises with rank (about 13% to about 30%), which is only useful as a skill proxy, and not as a target for the formula.
- Do not rely on prosettings' "about 45 cm average" as a number. It does not match its own mean eDPI of 267 (which gives about 49 cm). Use eDPI-to-cm/360 arithmetic directly.
- Open gaps: no published fitted curve for sensitivity vs performance, no flick-angle distribution, no rank-vs-eDPI survey, no comfortable forearm-sweep figure, and I could not read the full text of Kang et al., or the tracker.gg figures.

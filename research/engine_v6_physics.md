# Engine v6 physics constants: literature review

Date: 2026-11-02. Task T06. Extends `research/sensitivity_motor_research.md`, `research/constants_and_ergonomics.md` and `research/nvidia_paper_review.md`; it does not repeat what they already say.

## Method and evidence labels

- Every number below was seen in a source opened or returned by search during this task. I cite title, authors, year, venue and DOI or URL in the reference list at the end (R1, R2, ...).
- Full texts I could extract with `pdftotext`: Casiez et al. 2008 (R1), Boudaoud et al. arXiv 2203.12050 (R2), Meyer et al. 1988 (R3), Elliott et al. 2010 (R4), van Beers et al. 2004 (R5). For those, numbers come from the paper text or tables. Everything else is abstract-level, a fetched web page, or a search-result summary, and is marked SEC (secondary).
- MEASURED = reported in the source. DERIVED = my arithmetic on reported numbers (the arithmetic is shown). JUDGMENT = my choice of prior where the literature gives no value. "No published value found" means exactly that: I searched and did not find one.
- Priors are given as log-normal 10th / 50th / 90th percentiles. Where the evidence is thin, the percentiles are JUDGMENT and the section says so.
- Not retrievable (blocked, 403, or binary): Kang et al. CHI 2024 full text, Ren et al. 2025 full text, Li et al. 2022 tables, Nancel et al. 2015 full text (Anubis block), Jellinek & Card 1990 full text, Schmidt et al. 1979 full text, Fradet et al. 2008 results, Chen et al. 2015 results.

---

## 1. Signal-dependent endpoint noise k

Definition used here: SD of the endpoint of a fast aimed movement as a fraction of amplitude, k = SD / A.

| Value | Units | Condition | N | Source |
|---|---|---|---|---|
| SD of primary-submovement endpoints / D = **0.100 to 0.156** (mean 0.127) across 12 conditions | fraction of D | Wrist rotation, 4 college students, full vision, D = 10 to 39.5 deg, W = 1.6 to 6.3 deg, total MT 300 to 583 ms | 4 | R3, Table 4 (DERIVED: S1/D from the table, e.g. 1.13/10 = 0.113, 5.08/39.52 = 0.129, 2.46/15.81 = 0.156) |
| Primary-submovement endpoint SD is directly proportional to primary-submovement average velocity | n/a (form) | same | 4 | R3 (text: model prediction, tested; Table 4) |
| Signal-dependent noise coefficient 0.103 vs constant-noise coefficient 0.185 vs timing noise (CV of MT) 0.084 | arbitrary command units; CV is dimensionless | Reaching without sight of hand, 10 subjects x 32 directions, target distance 9.6 cm (Exp 1) | 10 | R5 (model fit; the coefficients are in arbitrary command units, so they cannot be read as a fraction of amplitude) |
| Noise SD proportional to command size (existence only) | n/a | Theory plus eye and arm data | n/a | R6 (abstract: no fitted constant) |
| Spatial variability tied to impulse (proportional to amplitude at fixed MT) | n/a | Rapid single-aiming tasks | n/a | R7 (abstract only; constants not retrieved) |
| Final endpoint SD after corrections, sigma = We / 4.133, at IDe 3 gives sigma about A/29 = 0.035 A; at IDe 4 gives about A/62 = 0.016 A | fraction of A | Fitts tasks | n/a | DERIVED in `research/constants_and_ergonomics.md` section 7 from Wobbrock et al.'s We definition |
| Mouse-pointing endpoint spreads (Wobbrock, Zhai) | | | | No published value found. I did not retrieve a mouse-specific k from these sources. |

Notes:
- The two rows of k differ by 4x to 8x because they measure different things. R3's 0.10 to 0.16 is the spread of the open-loop primary submovement. The 0.016 to 0.035 figure is the spread of the final endpoint after corrective submovements (and is a Fitts-definition estimate, not a measured SD).
- The model's `trackK` (velocity error as share of target angular speed) has no fitted published value. R6 and R5 give only the form.

**Recommended priors**
- `k_primary` (open-loop first submovement SD / amplitude): 10/50/90 = **0.09 / 0.125 / 0.17**. Anchored on R3's 0.100 to 0.156 range; widened a little because N = 4 and the task was a wrist rotation, not a mouse sweep.
- `k_final` (endpoint after corrections, fast flicks): 10/50/90 = **0.015 / 0.03 / 0.05** (JUDGMENT, matches the existing kappa-style range; the underlying numbers are DERIVED only).
- `trackK`: **no published value found**. Keep 0.05 / 0.10 / 0.20 as a JUDGMENT prior.

**Caveats.** R3 is a 4-subject, 1988 wrist-rotation task with a lever, not a mouse. Mouse use adds friction and sensor effects (constant floor). In FPS the visible angular error also depends on the in-game conversion and on view distance. Use `k` only as the amplitude-proportional term; the constant floor sigma0 is separate (section 8 of `constants_and_ergonomics.md`).

---

## 2. Joint-specific peak speed and throughput

| Value | Units | Condition | N | Source |
|---|---|---|---|---|
| Finger (unsupported index, left-right): TP **2.96** (3.15 without W = 3 mm), MT 927 ms | bits/s | A = 18/36/72 mm, W = 3/6/12 mm, IDs 1.32 to 4.64 | 10 | R8 (fetched page) |
| Wrist (left-right): TP **4.08**, MT 725 ms | bits/s | same | 10 | R8 |
| Forearm (left-right): TP about **4.1**, MT 741 ms (abstract value; exact text value not reported) | bits/s | same | 10 | R8 |
| Stylus, thumb-and-index pinch: TP 4.20 (L/R), about 4.5 (F/B) | bits/s | same | 10 | R8 |
| Whole arm: not measured in R8; about **10** bits/s cited from Langolf et al. | bits/s | Langolf: 0.25 to 30.5 cm distances | 3 | R9 via R8 (abstract-level; R8 calls the Langolf finger and wrist figures unreliable) |
| Langolf finger 38, wrist 23, arm 10 bits/s | bits/s | microscope-viewed finger and wrist, arm not | 3 | R9 (abstract-level, SEC) |
| Peak hand speed, CG gain 1, maximum **2441 mm/s**, 97th percentile **1536 mm/s** | mm/s | Mouse pointing, D up to 360 mm, 8 subjects, 1600 DPI, Vicon | 8 | R1 |
| Mean peak motor-space velocity across techniques about 296 mm/s (constant gain, all levels and distances) | mm/s | same | 8 | R1 |
| Peak speed by limb (finger / wrist / forearm) | | | | No published value found. R1 measured limb segments with motion capture but I did not retrieve per-segment speeds. |
| Mouse throughput by limb in later work | | | | No published value found beyond R8. |

DERIVED ratios from R8: wrist / finger = 4.08 / 2.96 = 1.38; forearm / finger = 1.39; forearm / wrist = 1.0. R9 gives the opposite ordering (finger 38 vs wrist 23 gives finger / wrist = 1.65), and R8 attributes this to Langolf's unequal viewing conditions and N = 3.

**Recommended priors**
- Wrist (or forearm) throughput relative to finger: 10/50/90 = **1.0 / 1.35 / 1.7** (the lower end leaves room for the Langolf ordering, the median is R8).
- Absolute lab throughput of the large joints on mouse pointing: **3.5 / 4.1 / 5.0 bits/s** (R8 for the median, the spread is JUDGMENT; R8 is a stylus-and-tablet-style laboratory task, not a mouse on a pad).
- `vPeak` (peak hand speed in the largest turn): **100 / 150 / 230 cm/s** (JUDGMENT). R1's 97th percentile of 154 cm/s is the 97th percentile of trial peaks in a lab pointing task, so it bounds typical, not maximal, behaviour. No FPS flick peak speed was found.

**Caveats.** The only throughput by limb measurement in a modern HCI setting is R8 (N = 10, small amplitudes, 72 mm maximum). It does not cover whole arm. Throughput measured over 18 to 72 mm says little about 30 cm sweeps. Pros move farther at similar area (Li et al. via existing notes), which the speed priors do not capture.

---

## 3. Comfortable wrist and forearm excursion on a desk

Existing notes already hold Ryu, Palmer, Gates, Hedge and Karlqvist numbers; only new findings are listed here.

| Value | Units | Condition | N | Source |
|---|---|---|---|---|
| Whole battery of daily-living tasks done within 60 deg extension, 54 deg flexion, 40 deg ulnar, 17 deg radial; most tasks within 70% of maximal ROM | deg | Biaxial electrogoniometer | 40 | R10 (abstract, via search summary) |
| Max target distance in a pro-player aim task, 5.60 cm in mouse space | cm | Aim Lab, pros, reachable "with wrist rotation and finger bending" | 32 | R11 (fetched: conversion counts/CPI x 2.54) |
| Ulnar deviation above 20 deg is associated with MSD | deg | Epidemiology review, as cited | n/a | Gerr et al. 2004, SEC only (via search summary; not opened) |
| How far the wrist moves before the forearm takes over, during mouse use | | | | No published value found. I found no source that partitions lateral mouse movement between wrist rotation and forearm rotation, apart from the Kang et al. W-index (already in `constants_and_ergonomics.md` section 6, abstract-level). |

**Recommended prior** for wrist-arc reach (lateral mouse travel before the forearm must engage), with r = wrist-to-sensor distance 8 to 12 cm times a 25 to 40 deg comfortable swing (as already derived in `constants_and_ergonomics.md`): 10/50/90 = **3.5 / 5.5 / 9 cm** (JUDGMENT). R11's 5.60 cm sits at the median, but it is a different quantity (maximum target distance in a small-target pro task), so it only supports the order of magnitude. This is a tiny change from the model's current `reachSd` basis.

**Caveats.** Goniometer data on daily tasks (R10) is not mouse-specific. R11 players used their own sensitivities (not reported), so their 5.6 cm is a pad distance, not a joint limit.

---

## 4. Control-display gain optimum

| Value | Units | Condition | N | Source |
|---|---|---|---|---|
| Gain 1 slower than gains 2 to 8 (11% improvement from 1 to 2, no significant differences among the others); cause is clutching and maximum limb speed | gain (unitless) | Constant gain 1, 2, 4, 6, 8, 12 (Exp 1); D = 90/180/360 mm | 8 | R1 (full text) |
| Preferred CG: level **4** in Exp 1; level **16** in Exp 2 (very large display, 3 m) | gain | Likert ease ratings | 8 | R1 (text) |
| Usable range worked example: CDmin = 1.4, CDmax = 4 (400 DPI mouse, 100 DPI screen) | gain | derived from CDmin = Dmax / ORmax, CDmax = min(CDqmax, CDlmax) | n/a | R1 (also in existing notes) |
| ORmax conservative recommendation <= 30 cm; mean operating range falls 205 mm (gain 1) to 18 mm (gain 12) | cm | | 8 | R1 (also existing notes) |
| U-shape with best near gain 2; quantization above about 2.7 for 200 DPI mouse / 73 DPI display | gain | gains 1, 2, 4, 8, 16, 32 | not retrieved | R12 (SEC via search summaries) |
| Performance is a U-shaped function of scale, attributed to joint shifts and motor precision limits | n/a | Steering tasks | not retrieved | R13 (abstract only; no numbers) |
| **FPS, N = 13 analysed of 15 recruited, 6 fixed sensitivities 0.225 to 7.2 deg/mm (5 to 160 cm/360 on y = 36/x)**: completion time and throughput significantly affected (F(5,19955) = 111.72 and 275.59, both p < 0.0001); no significant pairwise differences within **0.45 to 1.8 deg/mm = 20 to 80 cm/360** (a 4x flat band) | deg/mm; cm/360 | Static flicks, target 0.57 to 9.15 deg, 7 to 25 deg horizontal eccentricity, ID 0.83 to 5.50, G203 at 3200 DPI, 25" 240 Hz | 13 | R2 (full text) |
| Hit rate was lowest only at the highest sensitivity (7.2 deg/mm = 5 cm/360), p = 0.0146 | | same | 13 | R2 |
| Number of submovements rises monotonically with sensitivity; the loss at low sens is slower view rotation | | same | 13 | R2 (text; values only in figures) |
| Most players' preferred setting was 1.2 deg/mm = 30 cm/360 | | same | 13 | R2 |
| Low-ID tasks favoured higher sensitivity, high-ID tasks lower | | same | 13 | R2 (via search summary) |
| Preferred sensitivity not better than the group-optimal; first vs last session change < 15% of mean time, not significant | | same | 13 | R2 (text) |
| Display size effect on targeting (larger displays help) | | four sizes | not retrieved | R14 (abstract-level; confounds cm/360 comparisons across monitor sizes) |
| Mean completion times per sensitivity | s | | | No numbers in the text (figures only). Typical completion time was 0.4 to 0.8 s (R2 text). |
| One study suggests a higher optimal CD gain for tracking than for pointing | | | | SEC only (cited inside R2 via search summary); I did not find the source. |

**Shape of the curve** (all MEASURED in R2 or R1, no fitted formula published): flat over about 4x in the middle; the high-sensitivity side degrades via more corrective submovements and misses; the low-sensitivity side degrades via slower rotation and, in pointing, clutching. R1's pointing result puts the low-gain failure at gain 1 (operating range limit), R2 puts the FPS low-end failure at 0.225 deg/mm (160 cm/360); the high-end failure appears at 5 cm/360 (hit rate) and across 3.6 deg/mm in time (from the F-statistics, individual pairs not reported in text).

**Mouse-travel terms** (DERIVED from y = 36/x and R1's 30 cm bound): the flat band 20 to 80 cm/360 means 0.56 to 2.2 mm of mouse travel per degree of view, or **5 to 20 cm for a 90 degree turn**. At 80 cm/360 a 180 degree turn is 40 cm, above R1's 30 cm operating-range recommendation, so clutching begins inside the flat band for large turns.

**Recommended prior** for the flick optimum (log-centre of the flat band), `cFlick`: 10/50/90 = **28 / 40 / 57 cm/360** (matches the model's current central and low/high; geometric centre of 20 to 80 is 40, with +/-0.5 octave grid uncertainty from R2's 20/40/80 sampling). `kappa` (penalty per squared octave) remains weakly constrained: R2 gives no fitted curve, so keep 0.015 / 0.035 / 0.05 /oct^2 (JUDGMENT).

**Caveats.** R2 used static flicks with ID 0.83 to 5.50, no 180 degree turns and no scoped sensitivities, N = 13 experienced players, 10 minutes per session. R1 is pointer-based, with a 1600 DPI mouse and displays far from FPS conditions. Tracking: no gain study found.

---

## 5. Clutching (mouse lift) time

| Value | Units | Condition | N | Source |
|---|---|---|---|---|
| Clutching share: Exp 1 under 0.4% of MT even at gain 1 (existing notes); Exp 2 (large display): 26% at CG level 2, 7% at level 5 | % of MT | | 8 | R1 (text) |
| About 24% clutching raised movement time by 124% | % | Exp 2 | 8 | R1 (text) |
| Per-lift duration (seconds per clutch) | | | | **No published value found.** R1 records clutch events but reports shares, not durations. |
| Touchpad clutching: TTclutching measured as a variable | | Laptop trackpad | not retrieved | R15 (title and caption only; values not retrieved; touchpad, not mouse) |
| Clutch-less movements harder, more errors, longer preparation time, not faster | | Touchpad | not retrieved | R15 (abstract-level) |
| Rate-control with elastic spring removes clutching | | Elastic device | not retrieved | R16 (abstract-level; not a mouse) |

Closest proxy, clearly labelled: none for mouse per-lift time. A rough consistency check on R1 (DERIVED, not a measurement): 24% clutch share at 2.24x movement time means clutching occupies about 0.24 x 2.24 = 0.54 of the no-clutch movement time per target acquisition, but the number of clutches per acquisition is not reported, so no per-lift time can be extracted.

**Recommended prior** `tLift`: 10/50/90 = **0.20 / 0.30 / 0.50 s** (JUDGMENT, unchanged; the literature supplies nothing to move it). Basis stays "estimate".

**Caveats.** FPS lifts differ from pointing clutches: a player lifts and re-centres deliberately, often during a turn, and re-acquires the crosshair visually. R1 pointing tasks used a visible cursor at all times. If the planner wants a data-based tLift, it must come from the aim test (T02/T08), not from this review.

---

## 6. Submovement duration and count (corrective phase)

| Value | Units | Condition | N | Source |
|---|---|---|---|---|
| Primary-submovement mean duration **225 to 316 ms**; total MT 300 to 583 ms | ms | Wrist rotation, 12 distance-width conditions | 4 | R3, Table 4 |
| Secondary-submovement mean duration (T2, averaged including trials with none) **75 to 275 ms** | ms | same | 4 | R3, Table 4 |
| Relative frequency of secondary submovements **44.7% to 93.7%**; error rate 2.3% to 17.5% | % | same; the column labels are inferred from the table note and the monotone pattern | 4 | R3, Table 4 (DERIVED reading of columns) |
| Secondary duration on trials that have one = T2 / p2 = **168 to 303 ms**, mean 229 ms | ms | same (R3 text says to divide T2 by p2 for this) | 4 | DERIVED from R3, Table 4 |
| Minimum submovement duration Tmin = 80 ms used for parsing; first-submovement speed roughly flat across sensitivity while submovement count rises monotonically with sensitivity | ms | FPS flicks, parsing after Meyer | 13 | R2 (text; count values in figures only) |
| Submovement duration depends strongly on detector: wavelet 76 ms (SD 39), persistence 1D 180 ms (SD 74), dual-threshold 210 ms (SD 91); mean displacement 6.1 deg, 6.2 deg, 10.4 deg | ms; deg | FPS aim, same lab, 6500 trials, 13 users | 13 | R17 (arXiv 2026, preprint) |
| Visual feedback can be used within about 110 to 140 ms; earlier estimates 190 to 260 ms | ms | Review | n/a | R4 (text) |
| Practice shifts primary submovements toward more hits and fewer undershoots, with a 25% MT reduction over 4 days | | Reaching, feedback on MT | n/a | R4 (Fig. 1 caption) |
| Submovement counts per movement (mouse) | | | | **No published value found** in what I could read. R17 counts are per method and its own text is internally unclear. |
| Fradet et al. 2008 and Chen et al. 2015 numbers | | | | No published value found (abstract-level only: gross submovements relate to termination, fine submovements more frequent for small targets). |

**Recommended priors**
- `tSub` (duration of one corrective submovement): 10/50/90 = **0.10 / 0.17 / 0.28 s**. Median between R3's conditional 229 ms and the faster R17/R2 detector outputs (76 to 210 ms), JUDGMENT because detector choice moves the answer by 3x. This leaves the model's 0.10 / 0.15 / 0.25 almost unchanged, so no change is needed.
- Probability a movement needs at least one corrective submovement: **no direct mouse value found**; R3's 45% to 94% is for 4 subjects, wrist, ID 1.7 to 5.2 (JUDGMENT: 10/50/90 = 0.4 / 0.7 / 0.9).

**Caveats.** Submovement counts and durations depend on the filter and thresholds (R17 shows it directly). Do not tune `tSub` and count independently of the detector used in the aim test (T02).

---

## 7. Pursuit tracking error with a mouse

| Value | Units | Condition | N | Source |
|---|---|---|---|---|
| Position error vs target speed for mouse | | | | **No published value found.** |
| Cursor-target error grows with added cursor latency (0, 100, 150, 200, 250, 300 ms); fundamental pursuit frequency 2.15 +/- 0.29 Hz at 0 ms and 0.61 +/- 0.13 Hz at 300 ms; single target speed about 8 deg/s | Hz | Mouse-controlled visuomotor tracking | 14 | R18 (fetched; error magnitudes graphical only) |
| Head-tracking RMS error is linear in target velocity (20 to 110 deg/s) | | Head, not mouse | not retrieved | R19 (search-result summary only, SEC) |
| Delay hurts tracking more at low target speed than at high speed | | Game targets with a mouse | not retrieved | R20 (search-result summary only, SEC) |
| Mouse beats other devices for time-on-target in a moving-target task | | Game controllers | not retrieved | R21 (search-result summary only, SEC) |
| Tracking scored by RMSE; RMSE hides structure | | Methods paper | n/a | R22 (search-result summary only) |
| Gain and tracking error | | | | No published value found (already noted in `sensitivity_motor_research.md`). |

Closest proxy, labelled: R19's linear error-vs-velocity trend suggests `error = k_t x v`, which is the same form as the model's `trackK`, but it is head tracking and I have no numbers. R18 gives the lag structure, not a fitted speed slope.

**Recommended priors**
- `trackK` 10/50/90 = **0.05 / 0.10 / 0.20** (no source, JUDGMENT; keep).
- `trackFloor`: **no published value found**; keep the current estimate.
- Add the aim-test as the data source for tracking (T02/T08 measure the person).

**Caveats.** Everything here for tracking is proxy-level. FPS tracking targets are 3D, strafing at 4 to 7 m/s and shot with a recoil pattern; none of the lab tracking studies cover this.

---

## 8. Reaction time and visual feedback delay

| Value | Units | Condition | N | Source |
|---|---|---|---|---|
| Simple visual RT mean **231 ms** (213 ms corrected for hardware delay); between-subject SD **27 ms** | ms | Community sample 18 to 65 y, high-precision test | 1469 | R23 (fetched) |
| Mean 228 ms first block, 237 ms last block (fatigue) | ms | same | 1469 | R23 (search-result summary) |
| Online visual feedback in aimed movements usable in 110 to 140 ms; adjustments seen in about 110 to 160 ms; old 190 to 260 ms estimates too long | ms | Review of aiming literature | n/a | R4 (text: Elliott and Allard 1985, Bard et al. 1985, Zelaznik et al. 1983, Cressman et al. 2006) |
| Proprioceptive correction takes about 250 ms in the model (not incompatible with lower values) | ms | Reaching without vision | 10 | R5 (text) |
| Keele and Posner: 190 ms movements not helped by vision (older estimate); later work shorter than 190 to 300 ms | ms | | n/a | R24, R25 (abstract-level via search) |
| Action gamers about 11% faster than non-gamers in RT, accuracy nearly equal | % | Pooled over 89 conditions, 9 task types | n/a | R26 (review, cross-study) |
| Esports-specific simple RT | | | | No published value found. R11 reports RT per player only in figures. |

**Recommended priors**
- Simple visual RT (target onset to first movement): median 231 ms in the general population (R23); for experienced players apply the 11% gamer effect (R26, cross-study): 10/50/90 = **0.17 / 0.205 / 0.25 s**. DERIVED: 231 x 0.89 = 206 ms; spread from R23's SD of 27 ms (about +/-35 ms at 10th/90th percentile) and the hardware-correction gap (18 ms).
- Visual feedback delay for online correction (`trackDelay`): 10/50/90 = **0.11 / 0.15 / 0.20 s** (R4 range 110 to 160 ms). This supports the current 0.10 / 0.15 / 0.20.

**Caveats.** Simple RT is not choice RT or the "recognise a head and flick" time in game. The 11% gamer effect is a cross-study pooled estimate, not within-person. Display and mouse latency add 10 to 30 ms in practice (R23's own hardware-correction difference is 18 ms) and are not in these RT numbers.

---

## 9. Effect of practice and expertise on endpoint variability

| Value | Units | Condition | N | Source |
|---|---|---|---|---|
| Skill gains come mostly from reduced trial-to-trial variability and smoother movement; submovement structure unchanged | n/a | Curved wrist-movement task, no perturbation | not retrieved | R27 (abstract-level; numbers not retrieved) |
| 25% reduction in MT over 4 days with improved primary-submovement accuracy | % | Aiming with MT feedback | n/a | R4 (Fig. 1 caption) |
| Pros: higher throughput and lower path deviation than high-level gamers; higher hand velocity and acceleration (p < 0.05) | n/a | Fitts and Overwatch tasks | 29 pros, 19 high-level | R28 (abstract-level, via search summary; table values not retrieved) |
| Gamers superior to non-gamers in Fitts tasks across CD gain levels | n/a | Fitts task, CD gain, muscle activity | not retrieved | R29 (via search summary only; page returned 403) |
| Precision did not differ between speed and precision tasks (p = 0.88); no novice comparison; no numeric variability reported in text | n/a | Aim Lab, 32 pros | 32 | R11 (fetched) |
| Expert vs novice endpoint SD ratio in mouse aiming | | | | **No published value found.** |
| Pro vs general-player preferred sensitivity | | | | Covered by T05 population data, not this task. |

**Recommended prior** for the endpoint-noise multiplier of an experienced FPS player relative to a general player (applies to `sigma0` and `k`): 10/50/90 = **0.6 / 0.8 / 1.0**. JUDGMENT only. The literature supports the direction (variability falls with practice, R27, and pros beat high-level players, R28) but I found no ratio. Treat it as weakly informative and let the aim test overwrite it.

**Caveats.** All expert-vs-novice results above are either abstract-level or cross-sectional (self-selected pros), and they confound practice with talent, sensitivity choice, and hardware. R28 compared two skilled groups, not novices.

---

## Summary of recommended priors

| # | Constant | Unit | P10 | P50 | P90 | Basis | Notes |
|---|---|---|---|---|---|---|---|
| 1a | k_primary (open-loop SD / amplitude) | fraction | 0.09 | 0.125 | 0.17 | R3 Table 4 (DERIVED) | 4 subjects, wrist task |
| 1b | k_final (post-correction endpoint SD / amplitude) | fraction | 0.015 | 0.03 | 0.05 | DERIVED from Fitts definitions + JUDGMENT | |
| 1c | trackK | fraction | 0.05 | 0.10 | 0.20 | JUDGMENT, no published value found | form only (R5, R6) |
| 2a | Wrist-or-forearm throughput / finger throughput | ratio | 1.0 | 1.35 | 1.7 | R8 (DERIVED), R9 opposite | N = 10, 18 to 72 mm |
| 2b | Large-joint throughput (lab) | bits/s | 3.5 | 4.1 | 5.0 | R8 median, JUDGMENT spread | |
| 2c | vPeak (largest turn) | cm/s | 100 | 150 | 230 | JUDGMENT around R1 | R1 97th pct = 154 cm/s |
| 3 | Wrist-arc reach before forearm engages | cm | 3.5 | 5.5 | 9 | JUDGMENT, order of magnitude from R11 | no published partition found |
| 4a | cFlick (flick-optimum centre) | cm/360 | 28 | 40 | 57 | R2 flat band 20 to 80 (DERIVED centre) | N = 13 |
| 4b | kappa (penalty per octave^2) | /oct^2 | 0.015 | 0.035 | 0.05 | JUDGMENT; no curve published | |
| 5 | tLift | s | 0.20 | 0.30 | 0.50 | JUDGMENT; no published value found | |
| 6a | tSub | s | 0.10 | 0.17 | 0.28 | R3 (DERIVED), R2, R17; detector-dependent | |
| 6b | P(at least one correction) | fraction | 0.4 | 0.7 | 0.9 | R3 (4 subjects) + JUDGMENT | |
| 7 | trackFloor | cm | 0.015 | 0.025 | 0.04 | No published value found; unchanged | |
| 8a | Simple visual RT, experienced players | s | 0.17 | 0.205 | 0.25 | R23 x R26 (DERIVED) | |
| 8b | trackDelay (online visual correction) | s | 0.11 | 0.15 | 0.20 | R4 range 110 to 160 ms | |
| 9 | Expert / general endpoint-noise multiplier | ratio | 0.6 | 0.8 | 1.0 | JUDGMENT; direction only (R27, R28) | |

Where the log-normal is asked for: for each row take mu = ln(P50) and sigma = (ln P90 - ln P10) / 2.563.

### What changes versus the current `PARAMS` in `model.js`
- Nothing contradicts the present central values for `cFlick`, `tSub`, `trackDelay`, `vPeak`, `tLift`, `trackK`.
- New anchored numbers: k_primary 0.125 (R3), 24% clutching = +124% MT (R1; already used), RT 231 ms and SD 27 ms (R23).
- Still no published value: per-lift clutch time, tracking error vs speed, tracking floor, expert/general variability ratio, wrist/forearm split. These should come from the aim test or stay as wide JUDGMENT priors.

---

## References (all seen during this task)

- R1. Casiez, G., Vogel, D., Balakrishnan, R., Cockburn, A. (2008). The Impact of Control-Display Gain on User Performance in Pointing Tasks. Human-Computer Interaction 23(3):215-250. DOI 10.1080/07370020802278163. Full text read from https://www.dgp.toronto.edu/~ravin/papers/hci2008_cdgain.pdf
- R2. Boudaoud, B., Spjut, J., Kim, J. (2022). Mouse Sensitivity Effects in First-Person Targeting Tasks. arXiv:2203.12050. https://arxiv.org/abs/2203.12050 (full text read from https://arxiv.org/pdf/2203.12050). Related: IEEE CoG 2022, DOI 10.1109/CoG51982.2022.9893626 (listing seen at https://dl.acm.org/doi/10.1109/cog51982.2022.9893626; full text not read).
- R3. Meyer, D. E., Abrams, R. A., Kornblum, S., Wright, C. E., Smith, J. E. K. (1988). Optimality in human motor performance: Ideal control of rapid aimed movements. Psychological Review 95(3):340-370. DOI 10.1037/0033-295X.95.3.340. Full text read from https://public.websites.umich.edu/~kornblum/files/psychological_rev_95-3.pdf
- R4. Elliott, D., Hansen, S., Grierson, L. E. M., Lyons, J., Bennett, S. J., Hayes, S. J. (2010). Goal-directed aiming: Two components but multiple processes. Psychological Bulletin 136(6):1023-1044. DOI 10.1037/a0020958. Text read from the journal-club PDF at http://sangerlab.wdfiles.com/local--files/journalclub/Goal-Directed%20Aiming,%20Two%20Components%20but%20Multiple%20Processes%20-%20Elliot%202010.pdf. PubMed 20822209.
- R5. van Beers, R. J., Haggard, P., Wolpert, D. M. (2004). The role of execution noise in movement variability. Journal of Neurophysiology 91(2):1050-1063. DOI 10.1152/jn.00652.2003. Full text read from https://wolpertlab.neuroscience.columbia.edu/sites/wolpertlab.neuroscience.columbia.edu/files/content/papers/VanHagWol04.pdf
- R6. Harris, C. M., Wolpert, D. M. (1998). Signal-dependent noise determines motor planning. Nature 394:780-784. DOI 10.1038/29528. https://www.nature.com/articles/29528 (abstract level; PubMed 9723616).
- R7. Schmidt, R. A., Zelaznik, H., Hawkins, B., Frank, J. S., Quinn, J. T. (1979). Motor-output variability: A theory for the accuracy of rapid motor acts. Psychological Review 86:415-451. DOI 10.1037/0033-295X.86.5.415 (abstract level via search).
- R8. Balakrishnan, R., MacKenzie, I. S. (1997). Performance differences in the fingers, wrist, and forearm in computer input control. CHI '97. DOI 10.1145/258549.258764. https://www.yorku.ca/mack/CHI97.html (page fetched).
- R9. Langolf, G. D., Chaffin, D. B., Foulke, J. A. (1976). An investigation of Fitts' law using a wide range of movement amplitudes. Journal of Motor Behavior 8(2):113-128. DOI 10.1080/00222895.1976.10735061 (abstract level via search; also described in R8).
- R10. Ryu, J., Cooney, W. P., et al. (1991). Functional ranges of motion of the wrist joint. Journal of Hand Surgery. DOI 10.1016/0363-5023(91)90006-W; PubMed 1861019 (abstract level via search).
- R11. Donovan, I., Saul, M. A., DeSimone, K., Listman, J. B., Mackey, W. E., Heeger, D. J. (2022). Assessment of human expertise and movement kinematics in first-person shooter games. Frontiers in Human Neuroscience 16:979293. DOI 10.3389/fnhum.2022.979293 (page fetched).
- R12. Jellinek, H. D., Card, S. K. (1990). Powermice and user performance. CHI '90. DOI 10.1145/97243.97276 (DOI taken from R2's reference list; content seen only through later papers' summaries).
- R13. Accot, J., Zhai, S. (2001). Scale effects in steering law tasks. CHI 2001. DOI 10.1145/365024.365027 (abstract level via search).
- R14. Kim, J., Madhusudan, A., Watson, B., Boudaoud, B., Tarrazo, et al. (2022). Display Size and Targeting Performance: Small Hurts, Large May Help. SIGGRAPH Asia 2022. DOI 10.1145/3550469.3555396 (search listing only).
- R15. Nancel, M., Vogel, D., Lank, E. (2015). Clutching Is Not (Necessarily) the Enemy. CHI 2015, pp. 4199-4202. DOI 10.1145/2702123.2702134 (listing only; full text blocked).
- R16. Casiez, G., Vogel, D. (2008). The effect of spring stiffness and control gain with an elastic rate control pointing device. CHI 2008. DOI 10.1145/1357054.1357321 (listing only).
- R17. Ham, A., Boudaoud, B. (2026). Short-time, Wavelet-inspired Mouse Submovement Detection. arXiv:2604.20673. https://arxiv.org/html/2604.20673v1 (page fetched; preprint).
- R18. Turner, L. J., Wiederman, S. D., O'Rielly, J. L., Ma-Wyatt, A. (2026). The impact of varying cursor latency on visuomotor tracking. Experimental Brain Research 244(6):105. DOI 10.1007/s00221-026-07291-0. https://pmc.ncbi.nlm.nih.gov/articles/PMC13135551/ (page fetched).
- R19. Head tracking of auditory, visual, and audio-visual targets. PubMed 26778952. https://pubmed.ncbi.nlm.nih.gov/26778952/ (title and one-line summary seen in a search result only; authors and year not seen).
- R20. The Impact of Motion and Delay on Selecting Game Targets with a Mouse. http://web.cs.wpi.edu/~claypool/papers/delay-motion-tomm/paper.pdf (search-result summary only; authors and year not seen).
- R21. Performance Measures of Game Controllers in a Three-Dimensional Environment. Graphics Interface 2006. https://www.yorku.ca/mack/GI2006.pdf (search-result summary only).
- R22. Track-tool paper: TRACK, a new algorithm and open-source tool for the analysis of pursuit-tracking sensorimotor integration processes. Behavior Research Methods (2023). https://link.springer.com/article/10.3758/s13428-023-02065-w (search-result summary).
- R23. Woods, D. L., Wyma, J. M., Yund, E. W., Herron, T. J., Reed, B. (2015). Factors influencing the latency of simple reaction time. Frontiers in Human Neuroscience 9:131. DOI 10.3389/fnhum.2015.00131 (page fetched).
- R24. Keele, S. W., Posner, M. I. (1968), as described in R4 and in a search summary (the 190 ms single-aiming result); original not opened, no DOI seen.
- R25. Carlton, L. G. (1981). Processing visual feedback information for movement control. PubMed 6457106 (abstract level via search).
- R26. Dye, M. W. G., Green, C. S., Bavelier, D. (2009). Increasing speed of processing with action video games. Current Directions in Psychological Science 18(6):321-326. DOI 10.1111/j.1467-8721.2009.01660.x (abstract and summary via search).
- R27. Shmuelof, L., Krakauer, J. W., Mazzoni, P. (2012). How is a motor skill learned? Change and invariance at the levels of task success and trajectory control. Journal of Neurophysiology 108:578-594. DOI 10.1152/jn.00856.2011; https://pmc.ncbi.nlm.nih.gov/articles/PMC3404800/ (abstract level via search).
- R28. Li, et al. (2022). Professional and High-Level Gamers: Differences in Performance, Muscle Activity, and Hand Kinematics for Different Mice. International Journal of Human-Computer Interaction 38(8):691-706. DOI 10.1080/10447318.2021.1960742 (abstract level via search; full author list not seen).
- R29. Ren, Y., Gou, B., Chen, R., Wang, M., Fan, H. (2025). Gamers and Non-Gamers: Differences in User Performance, Muscle Activity, and Fitts' Law for Different Mouse Control-Display Gain. DOI 10.1177/10711813251358784 (listing only; page returned 403). Venue (Proceedings of the Human Factors and Ergonomics Society Annual Meeting, by the DOI prefix) not confirmed.

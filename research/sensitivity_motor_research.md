# Sensitivity model: motor-control evidence (tracking, adaptation, skill, grip, weight, direction)

Scope: new evidence only. Not re-researched: hand noise floor (Casiez 2008), submovements (Meyer 1988), NVIDIA flick study (Boudaoud 2022), clutching, wrist reach (Ryu 1991), peak hand speed.

Evidence tags: STRONG (replicated / primary source checked), MODERATE (primary abstract or secondary citation consistent with several sources), WEAK (single small study, or secondary snippet only), NO DATA (not found; nothing invented).

Method note: Primary full texts were mostly not retrievable (WebFetch returned raw PDF bytes for two papers). Numbers marked "secondary" come from abstracts or from other papers citing them. Verify before citing in anything published.

---

## 1. Tracking (smooth pursuit of a moving target with a mouse)

- **CD gain vs tracking error:** NO DATA. Searches found CD-gain studies for discrete pointing only (Casiez et al. 2008, HCI 23(3):215-250, DOI 10.1080/07370020802278163; https://gery.casiez.net/publications/HCIjournal2008-casiez.pdf). That paper reports a usable CD-gain range but no tracking error. Full text was not readable, so no numbers were extracted.
- **Signal-dependent motor noise (existence):** STRONG (qualitative). Harris & Wolpert 1998, Nature 394:780-784 (https://www.nature.com/articles/29528). Control-signal noise variance grows with signal size; trajectories minimize endpoint variance. Abstract gives no fitted fraction.
- **Velocity noise as % of speed (fitted constant):** NO DATA. Harris (2008) writes SD = K x signal with K a constant, but no fitted value was retrieved from any source (https://www.scitepress.org/papers/2008/10571/10571.pdf).
- **Schmidt et al. 1979, Psych Review 86:415-451:** MODERATE (qualitative). Endpoint spatial variability rises roughly linearly with average velocity (secondary summaries). The proportionality constant was not retrieved. Later work questions strict proportionality (secondary).
- **van Beers, Haggard & Wolpert 2004, J Neurophysiol 91:1050-1063 ("role of execution noise"):** Abstract not retrieved. Cited for distinguishing execution noise from planning noise. NO DATA on magnitude.
- **van Beers 2009, Neuron ("Motor learning is optimally tuned to the properties of motor noise"):** MODERATE (qualitative). Motor noise has central (planning) and peripheral (execution) components. Corrections use central planning signals. No magnitudes retrieved (https://pubmed.ncbi.nlm.nih.gov/19679079/ did not render).
- **Constant velocity-noise floor during tracking:** NO DATA.
- **Latency and pursuit tracking (2026, Exp Brain Res, https://pmc.ncbi.nlm.nih.gov/articles/PMC13135551/):** WEAK. Higher cursor latency lowered pursuit frequency, added corrective submovements, and abrupt latency increases raised positional error. This concerns latency, not gain. No numbers extracted.
- **Tracking-error metric:** TRACK tool, Behav Res Methods 2023 (https://link.springer.com/article/10.3758/s13428-023-02065-w). Methods only; notes conventional error measures are hard to interpret.

## 2. Sensorimotor adaptation cost of gain / sensitivity changes

- **Krakauer, Pine, Ghilardi & Ghez 2000, J Neurosci 20(23):8916-8924:** MODERATE (qualitative). Gain (scaling) adaptation generalizes broadly across movement directions. Rotation adaptation generalizes narrowly (roughly within 45 degrees of the trained direction) (secondary, Queen's/2010 reviews).
  - "At least 60% of adaptation transfers to other directions" for gain: WEAK (secondary citation of a 2010 paper, not the 2000 paper's own figure). Source: https://www.jneurosci.org/content/20/23/8916
- **Recovery time after a gain change (time constant):** NO DATA from the 2000 paper's abstract. Not retrieved.
- **NVIDIA sensitivity-switch data (Boudaoud et al.):**
  - arXiv 2203.12050 "Mouse Sensitivity Effects in First-person Targeting Tasks" (https://arxiv.org/pdf/2203.12050). Hypothesis: changing sensitivity for one experiment does not significantly affect performance. Results not retrieved. NO DATA on the outcome.
  - IEEE CoG 2022 paper (https://ieee-cog.org/2022/assets/papers/paper_64.pdf). Eight sessions x 500 trials at different sensitivities. Results not retrieved. NO DATA.
- **Practitioner claims (3-6 weeks; 7 days):** NO DATA. Human Benchmark (3-6 weeks), Gamer Hardware (7 days). No primary source cited. Do not use as central values.
- **Weber fraction / JND for CD gain or mouse sensitivity:** NO DATA. Only generic psychophysics (weight Weber fraction about 0.02, secondary). Not transferable to CD gain without a study.

## 3. Skill and expertise effects

- **Frontiers in Human Neuroscience 2022, "Assessment of human expertise and movement kinematics in FPS games" (PMC9744923):** MODERATE for the pro-player kinematics. 32 professional/semi-pro male players (4 Valorant, 10 PUBG, 18 R6 Siege). Gridshot (speed incentive) vs Sixshot (precision incentive).
  - Task comparison (Wilcoxon): accuracy, reaction time and speed p < 1e-4; precision p = 0.88 (no difference).
  - Motor acuity (SAT intersection) correlated with speed-accuracy trade-off. No numeric acuity values.
  - Fitts' law fit "good when fit separately, poor when combined" (no statistics).
  - No novice comparison group. No endpoint variability numbers. Movement time not reported.
- **Expert vs novice endpoint variability in mouse aiming:** NO DATA. No peer-reviewed study found.
- **Expert eye movements (meta-analysis 2025, Sci Rep, https://www.nature.com/articles/s41598-025-12101-8):** MODERATE for eye behaviour. Seven studies, 165 participants. Experts have shorter average fixation durations. Eye, not hand; not directly usable for hand gain.
- **Eye-tracking aiming study (PsyPost summary of a 2025 study):** WEAK. Final saccade matched crosshair path; no elite players.
- **Preferred gain of experts vs novices:** NO DATA (peer-reviewed). Only forum and blog claims.

## 4. Grip style and finger vs wrist precision

- **Balakrishnan & MacKenzie 1997, CHI '97 (DOI 10.1145/258549.258764; https://www.yorku.ca/mack/CHI97.html):** MODERATE (secondary numbers).
  - Index finger (unsupported) throughput about 3.0 bits/s; wrist and forearm about 4.1 bits/s (secondary summary, Wobbrock et al.).
  - No significant wrist vs forearm difference, contradicting Langolf et al.
  - Authors note small movements may have run finger and wrist conditions below their optimal amplitude.
- **Langolf, Chaffin & Foulke 1976, J Motor Behav 8:113-128:** WEAK. Throughput about 38 bits/s (short finger movements), about 23 bits/s (short wrist), about 10 bits/s (long arm). Three subjects. Later critique: finger and wrist conditions were viewed through a microscope (7x), arm was not.
- **Grip style (palm / claw / fingertip) effect on precision:**
  - Applied Sciences 2024, "Influence of Mouse Grip Type on Flicking and Tracking Tasks Performance" (https://www.researchgate.net/publication/383109350). N = 22, preferred grip. Claw grip had higher minimum cursor-trajectory values in flicking than palm and fingertip. Tracking showed no significant difference in velocity, acceleration or hand movement. WEAK (small N, secondary snippet, metric not fully verified).
  - Throughput by grip style: NO DATA. Vendor guides only.

## 5. Mouse weight

- **Chen et al. 2011, Eur J Appl Physiol (DOI 10.1007/s00421-011-2198-3; https://link.springer.com/article/10.1007/s00421-011-2198-3):** WEAK for timing, MODERATE for biomechanics.
  - Weights 70, 100, 130, 160, 190 g. Wrist ROM and forearm EMG show a V-shape with minimum near 130 g.
  - 190 g: exaggerated movement pattern. Low weights: overshoot and longer travel.
  - Authors suggest about 100-160 g. Movement time not reported.
- **Sandfeld & Jensen 2005 (via perspective piece, https://www.ijesports.org/article/55/html):** WEAK. Three sensitivity levels, 1 px = 0.315 mm. Lower sensitivity improved small-target accuracy (overshoot reduced). Elderly group worse at high sensitivity. No levels given as DPI or cm/360. No statistics reported in the summary.
- **Aimlabs telemetry preprint (bioRxiv, Oct 2026, https://www.biorxiv.org/content/10.64898/2026.10.06.757150v1.full):** WEAK. 9,067 players switching mice, eight weight bands 35-124 g. No band significantly better than the others for one-week improvement. Not peer-reviewed; authors affiliated with Aimlabs.
- **Weight vs movement time or peak speed (controlled Fitts study):** NO DATA. A 2020 CHI paper notes no rigorous performance study exists (secondary).

## 6. Vertical vs horizontal asymmetry

- **Whisenand & Emurian 1996, Computers in Human Behavior 12 ("Effects of angle of approach on cursor movement with a mouse"):** MODERATE for axis-vs-diagonal, WEAK for numbers.
  - Eight approach angles, 32 experienced users (secondary).
  - Horizontal and vertical movements faster than diagonal (multiple secondary sources).
  - Fitts' law variance explained reported inconsistently: 43% (secondary) vs 44%/97% (abstract, depending on analysis). Do not use.
- **Vertical vs horizontal specifically (mouse):** NO DATA / conflicting. One source reports horizontal faster than vertical with a stylus. MacKenzie & Buxton reported nearly equal axis times (secondary). Hertzum (2010) notes standard Fitts models ignore direction effects.
- **Gravity and vertical pointing (2025, Exp Brain Res, https://link.springer.com/article/10.1007/s00221-025-07120-w):** WEAK. Direction-dependent speed-accuracy effects in vertical pointing (not mouse).
- **Mouse index of performance context:** Card, English & Burr 1978 mouse IP about 10.4 bits/s (secondary, text selection task). Context only.

---

## Suggested model constants

Central values are sourced where possible. Where no source exists, the "central" is an assumption and is marked as such. Use the low/high range for sensitivity analysis, not as evidence.

| Parameter | Low | Central | High | Basis |
|---|---|---|---|---|
| Signal-dependent noise fraction k (SD = k x velocity) | NO DATA | NO DATA | NO DATA | Harris & Wolpert 1998 (STRONG, qualitative only); no fitted k found. Sweep 0.05 / 0.10 / 0.20 as assumptions. |
| Tracking velocity-noise floor | NO DATA | NO DATA | NO DATA | Not found. Keep as free parameter. |
| Gain-generalization fraction across directions | 0.6 | 0.8 (assumption) | 1.0 | Krakauer 2000 qualitative (MODERATE); 60% lower bound from secondary citation (WEAK). |
| Recovery time after gain change (time constant) | NO DATA | NO DATA | NO DATA | Not found. Practitioner claims (7 d, 3-6 wk) are unverified; do not use as central. |
| Weber fraction for sensitivity-change JND | NO DATA | NO DATA | NO DATA | Not found for mouse gain. Any placeholder (e.g. 0.02-0.10) is an assumption. |
| Wrist-to-finger throughput ratio | 0.6 | 1.37 | 1.37 | Balakrishnan & MacKenzie 1997 (MODERATE, secondary: 4.1 / 3.0). Langolf 1976 gives 23/38 = 0.6 (WEAK, opposite). |
| Expert vs novice endpoint variability | NO DATA | NO DATA | NO DATA | Not found. |
| Expert preferred gain shift | NO DATA | NO DATA | NO DATA | Not found in peer-reviewed sources. |
| Grip-style precision effect | NO DATA | NO DATA | NO DATA | One WEAK tracking/flick result (Applied Sciences 2024); no throughput data. |
| Mouse weight optimum (biomechanical) | 100 g | 130 g | 160 g | Chen et al. 2011 (WEAK-MODERATE; biomech only). |
| Mouse weight effect on movement time | NO DATA | NO DATA | NO DATA | Only a non-peer-reviewed preprint with no timing outcome. |
| Diagonal vs axis movement-time penalty | NO DATA | NO DATA | NO DATA | Qualitative: diagonal slower (Whisenand & Emurian 1996, MODERATE). Magnitude not retrieved. |
| Vertical vs horizontal movement-time ratio | 0.95 (assumption) | 1.00 (assumption) | 1.05 (assumption) | Sources conflict; NO DATA for magnitude. Use 1.0 as neutral default. |

## Gaps to close next

1. Full text of Harris & Wolpert 1998, Schmidt et al. 1979, Krakauer et al. 2000 (for numbers, not just abstracts).
2. Full text of Boudaoud et al. arXiv 2203.12050 and IEEE CoG 2022 paper_64 (sensitivity-switch results).
3. Whisenand & Emurian 1996 full text (vertical vs horizontal numbers).
4. Balakrishnan & MacKenzie 1997 full text (throughput by limb and amplitude).
5. A targeted search for CD-gain tracking studies (e.g. "CD gain pursuit tracking", "gain manipulation moving target error").

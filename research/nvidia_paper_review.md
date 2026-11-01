# NVIDIA mouse-sensitivity study: what it establishes and what it doesn't

Review date: 2026-11-01. I read the full text of all three versions of the paper. Every number below comes from those texts or figures. When a value was read off a plot by eye rather than taken from the text, it is marked **(fig-read, approx.)**. The paper gives no numeric table for those values.

## 0. Sources and versions

| Version | Where | Pages | Notes |
|---|---|---|---|
| arXiv preprint, "Mouse Sensitivity **Effects** in First-Person Targeting Tasks" | arXiv:2203.12050 **v1** (22 Mar 2022). v1 is the only version: requests for `v2` and `v3` return an HTML error page. | 17 | Read in full from the PDF. |
| Conference paper, "Mouse Sensitivity in First-person Targeting Tasks" | IEEE Conference on Games (CoG) 2022, IEEE Xplore doc 9893626, DOI 10.1109/CoG51982.2022.9893626. The author PDF is on research.nvidia.com/publication/2022-08_mouse-sensitivity-first-person-targeting-tasks | 8 | Read from the NVIDIA author PDF. Its numbers and statistics match the arXiv text (same F values, same 20–80 cm wording). |
| **Journal version**, "Mouse Sensitivity in First-Person Targeting Tasks" | **IEEE Transactions on Games 15(4):493–506, 2023, DOI 10.1109/TG.2023.3293692**. The author version is on research.nvidia.com/publication/2023-07_mouse-sensitivity-first-person-targeting-tasks | 15 | Read in full. **It reuses the same data set and adds no new experiment.** |

**What the journal version changes from arXiv/CoG.** It uses the same 13-subject data set and repeats the same ANOVA and t-test results. The changes are:
- **Added:** a section on DPI and eDPI, with the pros' DPI distribution (Fig. 4). The authors acknowledge that their fixed 3200 DPI "represents a departure from the DPI values most commonly selected by professional gamers."
- **Added:** frame-time validation: ">99.8% of all frames were rendered within 1 ms of the 4.167 ms target" (Fig. 6). Also the ID histogram over "∼26k total trials analyzed" (Fig. 7).
- **Added:** a hit-rate vs. completion-time scatter (Fig. 9), an average view-rotation-speed plot (Fig. 11), and a split of task time into initialization, movement, pause and verification phases (Fig. 13).
- **Added:** a claim that "the sharpness of the completion time/throughput vs sensitivity curve generally increases at higher difficulty … task ID drives not just the optimal mouse sensitivity value, but also the penalty a user pays for selecting a sub-optimal sensitivity" (§V-B).
- **Added:** explicit limitations: "This study does not include any moving targets" (§V-C), and a paragraph on DPI-switching.
- **Added:** a note that the 2 users with preferred sensitivity outside the range "were 2/3 of the worst performers … may indicate … they were not as familiar with the type of aiming tasks" (§IV-B).
- **Dropped:** the Levene-test / standard-deviation section (§4.3 in arXiv). The variance result appears only in arXiv and CoG.
- **Changed:** the bound on session-to-session change went from "<40% of the standard deviation" to "<35%". The conclusion now speaks of a "broadly optimal" range that "is likely to change based on the type and difficulty of task(s)".

**Related NVIDIA work** (checked, not reviewed in depth): FPSci, the experiment platform (Spjut et al., UCI Esports Conf. 2019; Boudaoud et al., SIGGRAPH 2022 Talks; github.com/NVlabs/FPSci), and NVIDIA's latency studies, such as Spjut et al. 2019, "Latency of 30 ms benefits first person targeting tasks more than refresh rate above 60 Hz". **I found no NVIDIA follow-up that tests sensitivity with moving targets, large turns or mouse lifting.** I ran only a couple of searches, so a follow-up could exist and still have been missed.

Section numbers below follow the **journal (TG) version** unless marked. The arXiv equivalents are §3 for design and §4 for results.

---

## 1. Participants (§III-B)

- "15 gamers (age 11-34, 1 female and 14 males) voluntarily participated." "All subjects were experienced FPS players with minimum play times of 10-20 hours per week."
- **13 analyzed** (age 11–33, 1 female, 12 male). One was excluded for a frame-rate problem on their system. One was excluded for skipping trials. A second subject who skipped trials re-ran the whole experiment, and that re-run is included.
- **Recruitment is not described.** Two subjects were minors (11 and 14). "Each subject household [was] provided their own dedicated system." All subjects "had experience with the experimentation platform prior to this study" (§III-E).
- **No skill measure is reported**: no rank, no pro or semi-pro status, no game titles. The arXiv abstract calls them "competitive FPS gamers", but only hours played are documented.
- Motivation: a "$25 gift card to the subject with the highest score."

## 2. Task (§III-C, §III-D)

- **Static targets only**, as one flick from a start point to a target: "a first-person perspective aiming task with a stationary target." There was no weapon model and no scene background.
- Each trial started from a 0.57° reference target. The test target was shown in grey beforehand, and the timer started on a **left-shift** keypress. "Only a single click allowed per trial." Because the target was previewed, "the measured time consisted only of motor response time (visual search time and initial reaction time were excluded)."
- **Target diameters:** 0.57°, 1.15°, 2.29°, 4.59°, 9.15°. These are 8, 15, 31, 61 and 122 px at the screen centre.
- **Target distance:** 7–25° horizontally and 0–2.8° vertically, split into 5 log-spaced sub-ranges. That is 93–339 px from centre.
- **Index of difficulty (ID):** 0.83–5.50 bits (Shannon formulation; Table IV).
- **Display:** 25" 1920×1080 240 Hz LCD viewed from about 610 mm. **103° horizontal FOV.** Valorant's FOV is also 103°, so in-game angles map one-to-one.
- **Mouse:** Logitech G203 at **3200 DPI** for everyone.
- **Trials:** 8 sessions × 500 trials = 4000 per subject, in blocks of 50. One sensitivity per session. Each session took about 10 minutes, about 80 minutes in total, all within one week.
- **Scoring:** the score was the remaining time out of 1.5 s, and a miss scored 0. Typical completion time was 0.4–0.8 s and average hit rate was above 85%.
- **Mouse travel was capped** by design: "limited to a range of 110 mm (the maximum target distance at the lowest sensitivity corresponds to 111.8 mm of mouse travel) to discourage subjects from lifting the mouse" (§V-C).

## 3. Sensitivity conditions (§III-D-1, Table III)

There were six fixed conditions, an octave apart and spanning a factor of 32. There was also each subject's own "preferred" setting, which was used in the **first and last** sessions.

| °/mm | 0.225 | 0.45 | 0.9 | 1.8 | 3.6 | 7.2 |
|---|---|---|---|---|---|---|
| **cm/360** | **160** | **80** | **40** | **20** | **10** | **5** |

The conversion is °/mm = 36 / (cm/360).

**The preferred setting is not clearly the subject's in-game setting.** It was "selected during practice in a previous (similar) aiming task wherein subjects could select and refine their choice of sensitivity" (TG §III-A-b). In one place the TG version calls these "habitual sensitivities", but the method describes a setting picked inside the platform. Many preferred settings overlapped at 1.2 °/mm (30 cm/360).

## 4. Outcome metrics and statistics (§IV)

- **Metrics:** hit rate; task completion time (one click, so a miss still has a time); throughput = ID / time (bits/s); SD of completion time (arXiv/CoG only); view-rotation speed (TG); submovement count, first-submovement speed, and phase durations.
- **Data handling:** "We discard the first 50% of trials from each session as an adaptation period," which leaves 250 trials per session. Missed trials were kept. Trials where the aim at the time of click was more than 50% of the initial distance away were removed (45 trials, <0.2% of the data).
- **Tests:** a one-way ANOVA, followed by pairwise t-tests between **adjacent** sensitivities only. arXiv/CoG also ran Levene tests on variance. **The papers report no effect sizes, no confidence intervals (standard-error bars only), no multiple-comparison correction, and no mixed or repeated-measures model.**
- **The degrees of freedom show what the tests treated as independent observations:**
  - Completion time and throughput: F(5, 19955). These were run on **pooled trials**, as if every trial were independent. With about 250 trials per subject per condition, this greatly inflates significance compared with a subject-level repeated-measures analysis, where N = 13.
  - Hit rate: F(5, 72). That is 78 = 13 × 6 per-subject rates, analysed as a between-groups ANOVA rather than repeated measures.
  - So "p < 0.001" here does **not** mean a large or reliable effect at the level of a player.

## 5. What "20–80 cm/360" actually means

**The definition (TG §IV-B; arXiv §4.2), quoted directly:**
> "ANOVA indicates a significant main effect of sensitivity on task completion time (F(5, 19955) = 111.72, p < 0.0001), with pairwise t-testing validating these differences (p < 0.001) for all adjacent sensitivity pairings except those in the 0.45-1.8 °/mm (20-80 cm/360°) range."

So, mechanically, **"20–80" is the span of grid points where the *adjacent* completion-time differences were not significant**: 80 vs 40 and 40 vs 20. The authors then call it the "zone of optimal sensitivity", the "optimal range" and "near optimal".

Consequences of that definition:
1. **The range is not an equivalence result.** It rests on failing to find a difference. There was no equivalence test, and 80 vs 20 was never compared directly.
2. **On throughput, the range is not flat.** "Pair-wise t-testing between adjacent sensitivities confirm[s] significant differences of mean (p < 0.001) for **all** tested sensitivities." That includes 80 vs 40 and 40 vs 20. The throughput curve peaks at 40 cm.
3. **On hit rate, there is no optimum inside the range.** Hit rate is highest at the lowest sensitivity and declines gradually. The only significant pairwise difference is 5 cm/360 against everything else (p = 0.0146). "Hit rate does not demonstrate a strong optimal range overall or per user."
4. **The edges at 20 and 80 are artifacts of the octave grid.** The next tested points are 160 and 10. The true point where the penalty becomes meaningful could lie anywhere between 80 and 160 on the slow side, and anywhere between 10 and 20 on the fast side. The data cannot locate the boundary more finely than one octave.
5. On SD of completion time (arXiv/CoG only), adjacent Levene tests were "significant (p < 0.005) for all sensitivities outside of the 0.45-1.8 °/mm (20-80 cm/360°) range."

**Effect sizes**, from the group-mean curves in TG Fig. 10 (same plot as arXiv Fig. 6). **(fig-read, approx., ±0.01 s / ±0.1 bit/s)**

| cm/360 | 160 | 80 | **40** | 20 | 10 | 5 |
|---|---|---|---|---|---|---|
| Mean completion time (s) | ~0.58 | ~0.52 | **~0.50** | ~0.515 | ~0.565 | ~0.625 |
| vs best | **+16%** | +4% | 0 | +3% | **+13%** | **+25%** |
| Mean throughput (bit/s) | ~5.1 | ~5.7 | **~5.9** | ~5.75 | ~5.25 | ~4.8 |
| vs best | −14% | −4% | 0 | −3% | −11% | −19% |
| Hit rate | ~95% | ~93.5% | ~92.7% | ~92.5% | ~92.2% | ~86.7% |

- **Penalty outside the range was measured, at three points:** one octave below the range (160) and one and two octaves above it (10 and 5).
- On the group curve, the completion-time penalty grows roughly with the **square of the distance in octaves from 40 cm/360**: about 3–4% per octave² (1 octave ≈ +3–4%, 2 octaves ≈ +13–16%, 3 octaves ≈ +25%). **This fit is my own approximation from the figure, not something the paper states.**
- The paper itself says only that performance degrades more at high sensitivity than at low ("why does performance often degrade more at the highest sensitivities than the lowest ones?", §IV-D).
- The averages hide large differences between players. Per-subject mean times range from about 0.38 s to 0.92 s, so the gaps between players are several times larger than the effect of sensitivity.

## 6. Individual differences and preference vs. performance

- "All users performed optimally in mean task completion time and throughput in the range of 0.45-1.8°/mm (20-80 cm/360°)" (TG §IV-B). This means each user's best tested grid point was 80, 40 or 20.
- In Fig. 10 **(fig-read)**, per-user best points vary within that span. For example, the fastest user (grey) had their best time and throughput at 1.8 °/mm (20 cm), and others had theirs at 0.45 or 0.9. **The paper reports no per-user optimum values and does not test whether per-user optima differ.**
- "Many subjects performed better at a pre-selected sensitivity than at their preferred sensitivity setting … though generally speaking this preferred sensitivity was within their range of optimal performance."
- "The gamers we studied did not demonstrate significantly better choice of preferred sensitivity than generally optimal ones; however, all but two did use preferred sensitivities within the globally optimal region. The two users who selected sensitivities outside of (higher than) the optimal range represented 2 of the 3 poorest performers, but did demonstrate less degradation in performance near these choices than other users" (TG §V-A-b).
  - In Fig. 10 **(fig-read)**, those two preferred settings are about 2.1 °/mm (~17 cm) and about 5 °/mm (~7 cm).
  - This is the only evidence on players who habitually sit outside the range: N = 2, and they were partly adapted to their own setting.

## 7. Adaptation, learning, order effects, counterbalancing

- **Within a session:** a "strong within-session training effect" (Fig. 15 bottom). This was handled by discarding the first 250 of 500 trials. In other words, the authors themselves found that **about 5 minutes and 250 flicks** were needed before performance on a new sensitivity levelled off.
- **Between sessions:** the first and last sessions both used the preferred setting. "On average subjects did not demonstrate a significant degradation of performance between their first and final (preferred) sensitivity sessions."
  - Individual changes were "<35% of the standard deviation of completion time, and <15% of average completion time" (arXiv: <40%).
  - The most and least skilled subjects tended to get worse, and intermediate subjects improved. The paper reads this as a possible small cost for the most skilled players.
  - The conclusion encourages gamers "to experiment with changing mouse sensitivity".
- **Order of the 6 fixed conditions is not reported**, and the paper does not say whether it was counterbalanced or randomized. Subjects chose how many sessions to play per sitting.
  - Fatigue is acknowledged once. One user's spike at 1.8 °/mm "likely occurred due to fatigue impacting the session … (the final session of that day for the user)".
  - There was no warm-up beyond the in-session adaptation trials. Earlier familiarity with the platform is the only pre-training.

## 8. Limitations

**Stated by the authors (TG §V-C and §V-A):**
- The targets were "a subset of targeting tasks presented in real FPS games."
- Large turns were not studied: "Studying the impacts of sensitivity in large angular rotations (i.e. 180° turns in game) may present an added benefit to lower mouse sensitivities not represented in this work." This is quoted verbatim. One would expect large turns to favour *higher* sensitivity, so this may be a slip in the text. Either way, large turns are untested.
- "This study does not include any moving targets." Also: "whether the shape of this trend is consistent across different FPS aiming tasks is not addressed by our study."
- No scoped or zoomed mode, and no DPI-switching.
- Mouse travel was capped at about 110 mm, so lifting the mouse was not studied. "We expect lifting actions will significantly increase pause durations … and further penalize multi-submovement trials."
- The fixed 3200 DPI differs from the 400/800 DPI most pros use.

**Additional limitations relevant to a Valorant recommender (my assessment):**
- **Small sample of mostly non-elite players:** N = 13, ages 11–33, defined by hours played and not by rank. The task was familiar but not their game, and there were no pros.
- **Short exposure:** about 5 minutes of analyzed play per condition, after about 5 minutes of adaptation. Players have used their own setting for months or years. The comparison between fixed and preferred settings is therefore biased *toward* the preferred setting, yet many subjects still did better at a pre-selected one.
- **Only one Valorant-like task:** a pre-cued, static, single-click flick of 7–25°. Things Valorant players do constantly are absent: crosshair placement with micro-adjustments of 1–5°, holding angles, tracking strafing targets (whose apparent speed changes with distance), counter-strafe timing, 90–180° checks, and target acquisition with reaction time included.
- **Mouse pad not modelled:** with travel capped at 110 mm, the low-sensitivity side never faced the real costs of lifting the mouse and running out of pad. At 80 cm/360 a 90° turn is 20 cm of travel; at 160 cm/360 it is 40 cm. So the measured slow-side penalty probably *understates* the real cost for large turns, while possibly overstating the cost for tiny adjustments.
- **Analysed at the trial level, not the player level:** the significance comes from pooling about 20k trials. The paper does not establish that a given individual is reliably worse at 15 or 100 cm/360.
- **Group averages pooled over all target IDs:** the optimum moves with the mix of targets (§9), so "20–80" belongs to *this particular target mix*.
- **No grip, arm vs. wrist, or hand-size variables.**
- **The paper calls 20–80 cm a range that subjects "demonstrated a preference for".** That wording mixes up performance and preference. The performance optimum and the preferred settings largely overlap, but they are separate findings.

## 9. Target size/distance vs. best sensitivity (TG §V-B, Fig. 17; arXiv Fig. 11)

- The paper's claim is qualitative: "subjects performed better at lower sensitivities for high ID tasks, and higher sensitivities for low ID tasks." The TG version adds: "the sharpness of the completion time/throughput vs sensitivity curve generally increases at higher difficulty."
- **No formula, regression, or optimal-sensitivity-vs-ID function is given.**
- Peak throughput per ID band in Fig. 17 **(fig-read, approx.)**:

| ID band (bits) | Peak throughput at | cm/360 |
|---|---|---|
| 0–1 | 1.8 °/mm | 20 |
| 1–2 | 1.8 °/mm, with 0.9 close | 20 |
| 2–3 | 0.9 °/mm | 40 |
| 3–4 | 0.9 °/mm | 40 |
| 4–5 | 0.9 °/mm | 40 |
| 5–6 | 0.9 °/mm | 40 |

- Completion-time minima show the same pattern. The time curve for 0–1 bit is nearly flat from 80 to 20, and the curves for higher IDs are sharper.
- **Implication:** across a 6-bit spread of difficulty, the best grid point moves by **only one octave** (40 → 20), towards higher sensitivity for easy, large or close targets.
- This is consistent with Valorant's small head hitboxes at mid and long range, which are high-ID tasks, favouring the ~40 cm side. That link is my inference; Valorant targets were not tested.
- The authors' mechanism: low sensitivity limits rotation speed, roughly linearly in time, while high sensitivity raises the number of corrective submovements, which increases time super-linearly (TG §VI).

---

## Implications for a recommender

**What is measured:**
- In a static-flick task (13 non-pro players, ~5 minutes per condition, octave grid), group-mean completion time was lowest at 40 cm/360 and within about 3–4% of that at 80 and 20.
- At 160, 10 and 5 cm/360 it was about 16%, 13% and 25% worse **(fig-read)**.
- Hit rate barely changed except at 5 cm/360.
- Every subject's best grid point was one of 80, 40 or 20.

**What is inferred, by the authors or by me:**
- That the range carries over to Valorant, to moving targets, to large turns, and to players with years of adaptation.
- That 20 and 80 are real boundaries rather than grid points.
- That being outside the range hurts a given individual.

**Is a penalty outside 20–80 justified?** A *mild, smooth* penalty that grows with distance from about 40 cm/360 is supported. A *flat zone with walls at 20 and 80* is not:
- Throughput still differs significantly inside the range.
- The real edges could be anywhere within ±1 octave of 20 and 80.
- The steepness outside the range was measured at only three points and with trial-level statistics.

**Hard limit, soft prior, or display only?**
- **Not a hard limit.** Nothing in the paper says 15 or 100 cm/360 is unplayable. A 2-octave miss cost about 13–16% in a lab flick task. The authors themselves tell players to experiment, and they report that the 2 subjects outside the range were well adapted to their own settings.
- **A weak soft prior is defensible**, centred near 40 cm/360 (0.9 °/mm) in log space. Shift the centre slightly lower in cm (toward higher sensitivity) only if the user's role or targets are clearly low-ID. The study does not support role-specific centres finer than one octave.
- **Always show it as context**, for example: "In NVIDIA's static-flick study (N=13), 20–80 cm/360 was the near-optimal band; a 2-octave miss cost ~15% in flick time."

**How strong a prior?**
- A Gaussian in log₂(cm/360) with **σ ≈ 1.0–1.5 octaves** fits the evidence best: about 0.7–1.0 in natural-log units, or a ×2.0–×2.8 multiplicative SD.
  - At σ = 1 octave, 20 and 80 fall at ±1σ and 10 and 160 at ±2σ. That roughly matches a time penalty that is small at 1 octave and clearly worse at 2.
  - σ = 1.5 is the more cautious choice, given the weaknesses for transfer listed in §8.
  - Anything tighter than about 0.75 octave (a hard-ish 20–80 band) claims more precision than the octave grid and N = 13 can give.
- **Weight the prior below the user's own evidence:** their current setting and how long they have used it, measured performance, pad size and turning needs. The paper's large spread between players, and its finding that preference roughly tracks performance, both argue for letting individual data dominate.
- If the recommender scores candidates with a loss function instead of a prior, a quadratic in octaves, roughly **+3.5% flick time per octave² from 40 cm/360**, matches the group curve **(my fit to fig-read values)**. Its asymmetry is uncertain: the fast side was measured 2 octaves out and the slow side only 1.
- **Do not let the prior override pad-space feasibility.** That constraint is physical and was explicitly excluded from the study. Combine the two separately.

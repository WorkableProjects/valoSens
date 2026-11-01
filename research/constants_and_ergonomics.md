# Conversion constants and mouse-travel ergonomics

Research date: 2026-11-01. This is web research only. No numbers are invented. Values I derived arithmetically from cited numbers are labelled "derived".

Evidence labels:
- **MEASURED**: a primary source, either a peer-reviewed study, a technical report, or the publisher or engine documentation.
- **COMMUNITY-VERIFIED**: several independent converters or tests agree, but there is no publisher statement.
- **ESTIMATE**: my inference or a range with weak or indirect support.

Internal formula used throughout:
`cm/360 = 360 * 2.54 / (DPI * sens * yaw)` = `914.4 / (DPI * sens * yaw)`

Some sources could not be fetched (403 or 503): mouse-sensitivity.com pages and forums, the ACM DL full text of Kang et al. 2024, and Physiopedia. Where a claim rests on a search-result summary of such a page rather than the page text, it says so.

---

## Part A: Conversion constants

### 1. Valorant

| Item | Value | Label | Sources |
|---|---|---|---|
| Yaw (deg/count at sens 1) | **0.07** | COMMUNITY-VERIFIED | Every converter checked uses 0.07: [mousetester.io](https://mousetester.io/sensitivity/valorant/), [senslab.pro](https://senslab.pro/sensitivity/valorant), [ultimatemove.eu](https://ultimatemove.eu/en/sensitivity-calculator-converter/), [hangon.live](https://hangon.live/tools/sens-converter), [aimhub.gg](https://aimhub.gg/en/sensitivity-calculator/valorant/) |
| Alternative published value | **0.06996** | COMMUNITY (single source) | KovaaK's converter text: "Counter-Strike and the Quake/Source engine use 0.022, Valorant 0.06996, Overwatch and Call of Duty 0.0066" ([kovaaks.com](https://kovaaks.com/kovaaks/sens-converter)) |
| Riot primary statement | **none found** | n/a | One converter labels 0.07 "Riot Games Official Engine · Method: official-doc" but links no Riot document. I do not count that as primary. |
| Cross-check | mouse-sensitivity.com example: CS2 1.14 becomes Valorant 0.358 at 800 DPI | COMMUNITY-VERIFIED | [mouse-sensitivity.com](https://www.mouse-sensitivity.com/) (search snippet). Derived check: 1.14 × 0.022 / 0.07 = 0.3583, which is consistent with 0.07 (with 0.06996 it would be 0.3585). |

The gap between 0.07 and 0.06996 is 0.06%. That is far below any perceptible difference: about 0.03 cm on a 50 cm/360. **Use 0.07.**

- **Vertical (pitch).** I found no source that gives a separate Valorant pitch constant, and no in-game vertical multiplier setting is documented. Converters treat the game as 1:1. **ESTIMATE**: pitch = yaw = 0.07. This is unverified by any primary measurement. The only per-axis caveats I found concern Fortnite (separate X/Y sliders) and CS2 (separate `m_pitch` cvar).
- **Resolution and FOV dependence.** Valorant's FOV is fixed (103° horizontal on 16:9) and cannot be changed through the menus, config or launch options. Sources agree that stretched or 4:3 resolution does not change cm/360 ([setup.gg](https://www.setup.gg/game/valorant/fov-stretched-resolution/), [fovcalculatorpro.com](https://fovcalculatorpro.com/blogs/valorant-fov-why-you-cant-change-it/)). COMMUNITY-VERIFIED. The yaw does not depend on resolution. KovaaK's notes that only some games (PUBG, Splitgate, Paladins) make yaw depend on FOV ([kovaaks.com](https://kovaaks.com/kovaaks/sens-converter)). One source disputes whether 103° is the horizontal or the vertical value, but that does not affect hipfire cm/360.
- **ADS and scoped multipliers.** These are separate settings: "Scoped Sensitivity Multiplier" and, in newer builds, a separate ADS multiplier. They multiply the hipfire sensitivity while zoomed, on top of the zoom FOV change. The default 1.0 is generally described as matching hipfire at roughly the screen edge, not at the crosshair ([edpi-calculator.org](https://edpi-calculator.org/tools/valorant-scoped-sensitivity), [setup.gg](https://www.setup.gg/game/valorant/best-sens/)). COMMUNITY-VERIFIED. The exact zoomed math is disputed between calculators (for example 0.870 vs 0.847 for "0% match"), so **a hipfire-only converter should ignore the scoped and ADS multipliers.**
- **Raw input.** Valorant reads raw input, so the Windows pointer-speed slider and "Enhance pointer precision" do not affect in-game aim ([dpionmouse.com](https://dpionmouse.com/gaming/windows-mouse-settings-vs-game-sensitivity/), [setup.gg raw input](https://www.setup.gg/game/valorant/raw-input-buffer/), [valorant-spind.de](https://www.valorant-spind.de/en/valorant-raw-input-buffer.html)). COMMUNITY-VERIFIED; there is no Riot doc in hand. The "Raw Input Buffer" toggle is reportedly gone (always on) since patch 11.06. Secondary sources only report this, and it does not change sensitivity.

### 2. Other games

The conversion is `sens_target = sens_source × yaw_source / yaw_target` at equal DPI.

#### Supported: clean linear hipfire yaw

| Game | Yaw (deg/count) | Linear in sens? | Label | Caveats | Sources |
|---|---|---|---|---|---|
| **CS2** (and CS:GO) | **0.022** (`m_yaw` default; `m_pitch` default also 0.022) | Yes, `sens × m_yaw` | COMMUNITY-VERIFIED (Source engine default; Valve-owned material only shows it indirectly, e.g. [ValveSoftware/halflife #650](https://github.com/ValveSoftware/halflife/issues/650) on the `m_pitch "0.022"` default) | Assumes the user has not changed `m_yaw` (some 4:3-stretched players do). Scoped aim uses `zoom_sensitivity_ratio`, so ignore it for hipfire. | [csdb.gg m_yaw](https://csdb.gg/command/m-yaw/), [clutchcrosshair](https://clutchcrosshair.com/commands/m_yaw), [kovaaks.com](https://kovaaks.com/kovaaks/sens-converter) |
| **Apex Legends** | **0.022** at default config yaw | Yes | COMMUNITY-VERIFIED | Respawn's fork of Source. Converters assume the default `m_yaw`. A forum thread asks whether `m_yaw` is user-editable in Apex and I found no answer, so assume the default. Per-zoom ADS multipliers are separate, so ignore them for hipfire. | [sensconverter.app](https://sensconverter.app/cs2-to-apex-sensitivity-converter/), [senslab.pro](https://senslab.pro/sensitivity/apex), [ultimatemove.eu](https://ultimatemove.eu/en/sensitivity-calculator-converter/) |
| **Overwatch 2** | **0.0066** | Yes | COMMUNITY-VERIFIED (KovaaK's, ultimatemove, senslab, sensconverter, mousetester all agree; ratio to CS2 = 3.333) | No Blizzard statement found. Per-hero sensitivity overrides exist, so convert the global value. | [kovaaks.com](https://kovaaks.com/kovaaks/sens-converter), [senslab.pro](https://senslab.pro/sensitivity/cs2-to-overwatch2), [mousetester.io](https://mousetester.io/sensitivity/overwatch-2/) |
| **Call of Duty, MW2019-era and later** (MW2/MW3/BO6/Warzone) | **0.0066** (same as OW2) | Yes, for hipfire | COMMUNITY-VERIFIED | One converter says titles before MW2019 "may have slight differences". ADS uses the "Monitor Distance Coefficient" and "Relative/Legacy" modes, which are not a yaw property, so convert hipfire only. | [sensconverter.app](https://sensconverter.app/cod-sensitivity-converter/), [kovaaks.com](https://kovaaks.com/kovaaks/sens-converter), [ultimatemove.eu](https://ultimatemove.eu/en/sensitivity-calculator-converter/) |

#### Conditionally supported: linear, but the input needs a transform or a precondition

| Game | Constant | Condition | Label | Sources |
|---|---|---|---|---|
| **Rainbow Six Siege** | 0.00572958 deg/count per sens unit, **at the default `MouseSensitivityMultiplierUnit` = 0.02** | If the multiplier is changed, the effective sens is `sens × (multiplier / 0.02)`. The 0.00573 figure is community-measured; Ubisoft documents only the 0.02 default. One calculator says 0.002, which is an outlier and likely an error. | COMMUNITY-VERIFIED (conditional) | [clip.dor.gg](https://clip.dor.gg/en/blog/r6s-sensitivity-range), [r6sensitivity.com](https://r6sensitivity.com/), [codingace.net](https://codingace.net/general/sensitivity_rainbow_six_siege.html), [ultimatemove.eu](https://ultimatemove.eu/en/sensitivity-calculator-converter/), [Steam discussion](https://steamcommunity.com/app/359550/discussions/0/1640919103693902145/) |
| **Fortnite** | 0.5555 deg/count at sens 1.0 (that is, 100%). The UI shows a percentage, so `sens = UI% / 100`, which equals 0.005555 deg/count per 1%. | Use the X-axis value only, and only when X = Y. Sources print 0.5554, 0.5555 or 0.005555, which are the same value at different scales. | COMMUNITY-VERIFIED (conditional) | [sensconverter.app](https://sensconverter.app/fortnite-sensitivity-converter/), [dcprosens.com](https://dcprosens.com/blog/best-fortnite-sensitivity-settings-2026/), [mousetester.io](https://mousetester.io/sensitivity/valorant-to-fortnite/), [senslab.pro](https://senslab.pro/sensitivity) |

#### Not supported: sources disagree, so the yaw is not trustworthy

| Game | Conflicting values | Reason |
|---|---|---|
| **Deadlock** | 0.022 ("1:1 with CS2", [ultimatemove](https://ultimatemove.eu/en/sensitivity-calculator-converter/), [gamesensetools](https://gamesensetools.com/tools/sensitivity-converter/)) vs **0.044** ("verified", [senslab guide](https://senslab.pro/guides/deadlock-sensitivity)) | The values differ by a factor of 2, and the game is still in active development. Do not ship this without an in-game 360 test. |
| **Marvel Rivals** | 0.0066 ([gamesensetools](https://gamesensetools.com/tools/sensitivity-converter/)), 0.0175 ([senslab](https://senslab.pro/sensitivity)), 0.017453 = π/180 ("measured", [ultimatemove](https://ultimatemove.eu/en/sensitivity-calculator-converter/)), 0.022 (others) | Four different values. The game also shipped with mouse acceleration and smoothing on (in-game toggles were added in patch 20250110; [GamesRadar](https://www.gamesradar.com/games/action/marvel-rivals-mouse-acceleration/)), so its input was not linear for some users. |
| **The Finals** | 0.001 ([senslab](https://senslab.pro/guides/the-finals-sensitivity)), 0.002857 ([sensconverter.app](https://sensconverter.app/the-finals-sensitivity-converter/)), 0.0066 ([ultimatemove](https://ultimatemove.eu/en/sensitivity-calculator-converter/), [dcprosens](https://dcprosens.com/blog/the-finals-sensitivity-settings-2026/)) | The values span a factor of 6.6. |

### 3. Input validation ranges

| Input | Range | Label | Sources and notes |
|---|---|---|---|
| Valorant in-game sens | **0.01 to 10.00** | COMMUNITY-VERIFIED (several guides; no Riot doc) | [ilovevalorant.com](https://www.ilovevalorant.com/en/valorant-sensitivity), [hotspawn](https://www.hotspawn.com/valorant/guide/best-valorant-sensitivity-settings). I found no evidence that typed values below 0.01 are accepted. Treat 0.001 as unsupported. |
| Typical Valorant sens | 0.20 to 0.50; pros' eDPI is around 200 to 320 | COMMUNITY | ProSettings reports an average pro eDPI of 267 across 705 pros (Oct 2026) and says "~45 cm" per 360 ([prosettings.net](https://prosettings.net/guides/valorant-options/)). A median of 240 is attributed to ProSettings by secondary sites; [senslab](https://senslab.pro/guides/best-valorant-sensitivity) and [valdb](https://valdb.gg/pro-settings/) report a median of 224. Derived: eDPI 267 gives 48.9 cm/360, 240 gives 54.4, and 224 gives 58.3. ProSettings' "~45 cm" does not exactly match 267 × 0.07, which gives 48.9, so their rounding or method is unclear. |
| Mouse DPI | Hardware covers roughly **50 or 100 up to 26,000–50,000** (2025–26 flagship sensors: Logitech HERO 2 44,000, Razer Focus Pro 45K/50K) | COMMUNITY (vendor and review claims) | [metaprotago](https://metaprotago.com/best-gaming-mouse-sensor-2026/), [tomshardware](https://www.tomshardware.com/best-picks/best-gaming-mouse). The step size (50 or 100) varies by vendor and I could not verify it. Practical pro use is 400 to 1600 (3200 at most). Suggested validation: hard limit 50 to 50,000, with a warning outside 200 to 6400. |
| Windows pointer speed | **Does not affect Valorant** (raw input) | COMMUNITY-VERIFIED | See §1. Do not ask for it. |

---

## Part B: Ergonomics of usable mouse travel

### 4. Wrist range of motion

| Quantity | Value | Label | Source |
|---|---|---|---|
| Normal full active ROM: radial / ulnar | about **20° / 30°** (AAOS, as cited); 20–25° / 30–40° (Norkin & White 2009, as cited) | COMMUNITY (secondary citations of standard references) | [goniometer.io](https://goniometer.io/wrist-range-of-motion), [thestudentphysicaltherapist.com](https://www.thestudentphysicaltherapist.com/wristhand.html) |
| Normal full active ROM: flexion / extension | about 80° / 70° (AAOS, as cited) | COMMUNITY | same |
| Functional ROM, Palmer et al. 1985 (10 subjects, 52 tasks) | **10° radial, 15° ulnar**, 5° flexion, 30° extension | MEASURED | [PubMed 3968403](https://pubmed.ncbi.nlm.nih.gov/3968403/) |
| Functional ROM, Ryu et al. 1991 (40 subjects) | **17° radial, 40° ulnar**, 54° flexion, 60° extension. Most tasks were done within 70% of maximal ROM. | MEASURED | [J Hand Surg 1991](https://www.sciencedirect.com/science/article/abs/pii/036350239190006W) |
| Functional ROM, Gates et al. 2016 (15 subjects, 8 ADLs, motion capture) | **28° radial, 38° ulnar**, 40° extension, 38° flexion | MEASURED | [PMC4690598](https://pmc.ncbi.nlm.nih.gov/articles/PMC4690598/) |
| Wrist posture during mouse use, Hedge, Muss & Barrero 1999, Cornell tech report RP7992 (24 subjects, electrogoniometer) | Mean ulnar deviation **13.4° ± 2.2°** (mouse A) and **13.1° ± 2.4°** (mouse B); men 14.9°, women 11.7°. Mean extension for men about 27.7°. | MEASURED (tech report) | [Cornell PDF](https://ergo.human.cornell.edu/Pub/HFlabReports/MouseRep.pdf) |
| Karlqvist et al. 1994, as cited by Hedge 1999 | Ulnar deviation 17.6° with mouse vs 1.8° without. During mouse use, 34% of time was spent at 15–30° ulnar and 30% at more than 30° ulnar. | MEASURED (secondary citation) | same PDF |
| Burgess-Limerick et al. 1999, Clin Biomech (12 subjects) | Mouse use involves "extreme ulnar deviation and wrist extension"; large individual differences. The abstract gives no numbers. | MEASURED (qualitative) | [PubMed 10619116](https://pubmed.ncbi.nlm.nih.gov/10619116) |
| Injury-risk threshold | Ulnar deviation **greater than 20°** is associated with MSD (Gerr et al. 2004). Deviation or flexion beyond 20° raises carpal pressure (Keir 1998; Rempel 1994/1998, as cited by Hedge). | MEASURED (as cited) | Cornell PDF; Gerr cited in the search summary |

**Interpretation (ESTIMATE).** The mouse hand already sits at about 13° ulnar. Pushing past about 20–30° ulnar is uncomfortable and an injury risk, and radial reserve is about 20° anatomically. A comfortable, repeatable wrist-pivot swing during mouse use is therefore roughly **25–40° total** (radial plus ulnar about the resting posture). It is not the 50–60° full anatomical arc.

The lateral mouse displacement this produces is `arc ≈ r × Δθ`, where r is the wrist-centre-to-sensor distance. I found no measured r. **ESTIMATE**: r = 8–12 cm, by hand anthropometry and grip. This gives about **3.5–8 cm**, central value about **5 cm**.

Flexion and extension contribute little to lateral motion with a palm-down grip, because their axis is roughly horizontal. Lateral travel beyond the wrist arc comes from forearm rotation about the elbow (shoulder internal/external rotation and horizontal abduction) and from fingers. Casiez 2008 (below) measured with motion capture that "limbs are rarely used in isolation": at low gain, all segments are used together; at high gain, hand and fingers are used.

### 5. Measured mouse displacement and clutching

Casiez, Vogel, Balakrishnan & Cockburn 2008, *HCI* 23(3) ([PDF](https://www.dgp.toronto.edu/~ravin/papers/hci2008_cdgain.pdf)), all MEASURED:
- Setup: 8 subjects, 1600 DPI mouse, raw input, Vicon motion capture. Targets: D = 90, 180 and 360 mm; W = 2, 4 and 8 mm (display mm). Constant gain 1, 2, 4, 6, 8 and 12.
- Mean mouse operating range: 74 mm with constant gain. It fell "proportionally with increasing CD gain", **from 205 mm at gain 1 to 18 mm at gain 12** (1-D horizontal).
- **Maximum operating range observed: 36 cm** (gain 1, experiment 1) **and 37 cm** (gain 12 on a 5 m display, experiment 2, with less than 1% clutching). The mean operating range in experiment 2 was 335 mm (constant gain).
- The authors' conservative recommendation is **ORmax ≤ 30 cm**, and they use 250 mm in a worked example.
- Clutching: in experiment 1, clutching stayed under 0.4% of movement time even at gain 1. "Participants preferred to increase the operating range over which they operated the mouse rather than clutching." In experiment 2, the two lowest gains had **26% and 7%** clutch time, and **clutching of about 24% increased movement time by 124%**. This confirms Jellinek & Card's (1990) clutching hypothesis.
- Gaming data:
  - Li et al. 2022, *IJHCI* 38(8) (pro vs high-level gamers): pros' total hand distance travelled was about **2×** that of high-level gamers, but within a **similar movement area**, with similar DPI and sens. Abstract-level data only; area in cm was not retrieved. [ResearchGate](https://www.researchgate.net/publication/353929040).
  - Donovan et al. 2022, *Front Hum Neurosci* (32 pros, Aim Lab): the maximum target distance in mouse space was **5.60 cm**, reachable "with wrist rotation and finger bending" ([PMC9744923](https://pmc.ncbi.nlm.nih.gov/articles/PMC9744923/)). MEASURED.

**Elbow-pivot sweep.** I found no direct measurement. **ESTIMATE**: elbow-to-sensor radius of about 30–40 cm × a comfortable ±10–15° forearm sweep gives about 10–20 cm, on top of the wrist arc. Combined with the wrist arc, this is consistent with the measured 20–37 cm maximum operating ranges.

### 6. Wrist vs arm aiming in FPS

- **Kang et al., CHI 2024**, "Quantifying Wrist-Aiming Habits with A Dual-Sensor Mouse" ([ACM DL](https://dl.acm.org/doi/10.1145/3613904.3642797); full text 403, values from the abstract and search summaries):
  - The dual-sensor mouse estimates wrist angular velocity with R² > 0.94 against motion capture (N = 20).
  - The W-index is the slope of wrist angular velocity vs lateral mouse velocity. Means were **2.907 (σ 0.354) for amateurs vs 3.494 (σ 0.539) for pros**, about 20.2% higher for pros. That is 12 amateurs vs 5 R6 pros, so the pro result is preliminary. I could not verify the W-index units.
  - **The W-index increased with sensitivity**: the higher the sens, the more wrist aiming.
  - Correlation with performance was weak. Pad force (workload) correlated positively with the W-index.
  - Sensitivity was tested over **0.5–2 °/mm** (derived: **72–18 cm/360**). Self-chosen sensitivity averaged 1.1 °/mm (derived: about 32.7 cm/360).
  - MEASURED.
- **Park et al.** (motion capture, pros vs amateurs, as summarised by Kang et al.): pros rotated their wrists less, but they also used much lower sensitivity and moved their hands farther, so the effect may be confounded by sensitivity. I could not retrieve the original; this is a secondary citation only.

### 7. Endpoint precision and motor noise

| Finding | Value | Label | Source |
|---|---|---|---|
| Minimum resolution of hand and fingers | **about 0.2 mm**, from accuracy problems with 2 mm targets at gain 12 on a 1600 DPI mouse | MEASURED (inferred by the authors) | Casiez 2008 |
| Small-target "problematic size threshold" in motor space | **0.1–0.2 mm** for a mouse (1–4 mm on screen at 70 cm). Measured on high-end hardware and "might be higher on lower-end hardware". | MEASURED | Chapuis & Dragicevic 2011, *TOCHI* 18(3) ([HAL](https://hal.science/hal-00614061)) |
| Welford "tremor" constant (fit of `ID = log2(D/(W−c)+1)`) | c = 0.79–0.89 dots at 0.06 mm/dot (derived: about **0.05 mm**). At larger task scales, c = 2.44 dots (about **0.15 mm**); from effective widths, c = 3.10 dots (about **0.19 mm**). | MEASURED | Chapuis & Dragicevic 2011 |
| c grows with task motor scale | "tremor increases with average task motor scale". Their best model replaces c with k·log2(Wm+1), k = 0.92. | MEASURED | same |
| Signal-dependent noise | Motor-command noise variance rises with command magnitude, and minimising its endpoint effect predicts Fitts' trade-off. | MEASURED / theory | Harris & Wolpert 1998, *Nature* 394:780 ([nature.com](https://www.nature.com/articles/29528)) |
| Constant plus signal-dependent noise | Endpoint variability in reaching is explained by a **combination of signal-dependent and signal-independent** execution noise, plus timing noise. | MEASURED | van Beers, Haggard & Wolpert 2004, *J Neurophysiol* 91:1050 ([PubMed](https://pubmed.ncbi.nlm.nih.gov/14561687/)) |
| Impulse variability | Effective width We ∝ A/MT; impulse variability is nearly proportional to amplitude at fixed MT. Later work found force variability is often non-proportional. | MEASURED / theory | Schmidt et al. 1979, *Psych Rev* ([ResearchGate](https://www.researchgate.net/publication/22636817)) |
| Effective width in Fitts tasks | We = 4.133·σ; at fixed ID and MT, We grows with A ("We ∝ A / 2MTe") | MEASURED / model | Wobbrock et al. CHI 2008 ([PDF](https://faculty.washington.edu/wobbrock/pubs/chi-08.01.pdf)) |

**Summary: constant vs amplitude-proportional noise.**
- Endpoint spread in motor space has two parts:
  1. an **amplitude- or speed-proportional term**: signal-dependent noise, impulse variability, and We scaling with A at fixed ID and MT;
  2. a **constant floor**: Welford's tremor constant, roughly 0.05–0.2 mm for a mouse, from neuromotor noise, stick-slip friction and click jitter.
- A model of `σ_motor(A) = sqrt(c0² + (k·A)²)` is consistent with all of the above. It is an ESTIMATE of the functional form, not a published fit.
- Consequence for sensitivity: the proportional term is **invariant to sensitivity** in angular terms. If cm/360 doubles, A in cm doubles, so does k·A, and the angular error is unchanged. **Only c0 creates a sensitivity dependence**: higher sens magnifies the constant floor in degrees.
- **Lower sens** is penalised by travel and limb limits (operating range, clutching, slower arm segments). **Higher sens** is penalised only once c0 × (deg/cm) becomes comparable to target angular size.

**Deriving k from Fitts definitions (ESTIMATE).** σ = We/4.133 and We = A/(2^IDe − 1).
- Fast flicks at IDe ≈ 3 give σ ≈ A/29 ≈ 0.035A.
- IDe ≈ 4 gives σ ≈ A/62 ≈ 0.016A.
- k therefore depends strongly on movement time.

### 8. Fitts' law and CD gain (gain invariance)

- Changing CD gain divides both D and W in motor space, so the **motor-space ID is unchanged**. Fitts' law alone therefore predicts no gain effect, and Fitts' formulation has no gain term (Jellinek & Card 1990, as discussed in Casiez 2008). MEASURED / theory.
- **Empirically, movement time is flat across a middle band of gains and degrades at both ends:**
  - **Low-gain end** (Casiez 2008):
    - Constant gain 1 was significantly slower than gains 2–8. There was an 11% improvement from gain 1 to 2, and no significant differences among the other levels.
    - The cause is **clutching and maximum limb speed**, not limb bandwidth: Accot & Zhai's (2001) muscle-group explanation was not supported.
    - The minimum usable gain is **CDmin = Dmax / ORmax**.
  - **High-gain end:**
    - **Limb precision**: CDlmax = Wmin / Handres, with Handres ≈ 0.2 mm. Constant gain shows a small penalty at small W (2 mm targets: 1.43 s vs 1.35 s with pointer acceleration).
    - **Device quantization**: CDqmax = mouse DPI / screen DPI.
    - **CDmax = min(CDqmax, CDlmax)**. Worked example: 400 DPI mouse, 100 DPI screen, Dmax 360 mm, Wmin 2 mm, ORmax 250 mm gives **CDmin = 1.4, CDmax = 4**.
  - Earlier studies (Jellinek & Card 1990 with gains 1–32; Accot & Zhai 2001 steering with gains 1–16) found a **U-shape**, but were confounded by quantization (for example 200 DPI mouse / 73 DPI display gives quantization above gain 2.7). MEASURED.
  - **Small motor scale breaks Fitts' law** even at constant ID: performance worsens from scale 16 to scale 4, and at scale 1 there are more than 2× errors and about 2× time (Chapuis & Dragicevic 2011). This is the high-sensitivity failure mode in motor space. MEASURED.
  - Blanch, Guiard & Beaudouin-Lafon 2004 (semantic pointing): performance follows **motor-space** ID, not visual ID, which is why gain manipulations that change motor W and D matter (as cited in Casiez 2008).
- **FPS mapping (ESTIMATE).** "Gain" corresponds to deg/cm = 360 / cm/360.
  - Low-sens failure: required arm travel for the largest needed turn exceeds the comfortable operating range (about 30 cm), forcing clutching (up to +124% time at about 24% clutching).
  - High-sens failure: the smallest target's angular width ÷ (deg/cm) falls toward 0.1–0.2 mm in motor space, or the count quantum (deg/count = sens × 0.07) becomes a meaningful fraction of the target.

---

## Defaults a model should use when the user has not measured anything

| Parameter | Range | Central (conservative) | Uncertainty | Label |
|---|---|---|---|---|
| Valorant yaw (deg/count at sens 1), horizontal | 0.06996–0.07 | **0.07** | ±0.1% | COMMUNITY-VERIFIED |
| Valorant pitch | same | **0.07** (1:1 with yaw) | unverified | ESTIMATE |
| CS2 / Apex yaw | n/a | **0.022** | assumes default `m_yaw` | COMMUNITY-VERIFIED |
| OW2 / CoD (MW2019 and later) yaw | n/a | **0.0066** | none observed between sources | COMMUNITY-VERIFIED |
| R6 Siege (multiplier 0.02) | n/a | **0.00572958** | requires the default multiplier | COMMUNITY-VERIFIED |
| Fortnite (sens as fraction = UI%/100) | 0.5554–0.5555 | **0.5555** | requires X = Y | COMMUNITY-VERIFIED |
| Valorant sens validation | 0.01–10 | n/a | lower bound not tested below 0.01 | COMMUNITY-VERIFIED |
| DPI validation | 50–50,000 (hard limit), 200–6400 (typical) | **800** if unknown | vendor-dependent | COMMUNITY |
| Hand/finger endpoint floor c0 (motor space) | 0.05–0.2 mm | **0.2 mm** (conservative = larger) | ±0.1 mm; hardware-dependent | MEASURED (Casiez; Chapuis & Dragicevic) |
| Proportional noise k (σ/A) | 0.015–0.035 | **0.025** | depends on movement time and target ID | ESTIMATE (derived from Fitts We definitions) |
| Max operating range without clutching | 25–37 cm | **30 cm** | ±5 cm; desk, pad and posture dependent | MEASURED (Casiez max 36–37 cm; authors' recommended cap 30 cm) |
| Comfortable single-swipe lateral travel (arm plus wrist, no clutch) | 15–30 cm | **20 cm** | ±7 cm | ESTIMATE |
| Wrist-only lateral travel (wrist pivot, no arm) | 3.5–8 cm | **5 cm** | ±2 cm; r = 8–12 cm × 25–40° | ESTIMATE (ROM MEASURED, lever arm ESTIMATE) |
| Resting ulnar deviation during mouse use | 11–18° | **13°** | ±3° | MEASURED (Hedge 1999; Karlqvist 1994) |
| Functional wrist radial / ulnar ROM | radial 10–28°, ulnar 15–40° | **radial 15°, ulnar 25° from neutral** | large between studies | MEASURED range, ESTIMATE central |
| Pro Valorant cm/360 (prior for "typical") | 45–58 cm | **about 52 cm** (eDPI about 250) | ±7 cm | COMMUNITY (ProSettings and trackers; derived) |
| Gain-invariance band | movement time roughly flat between CDmin = Dmax/ORmax and CDmax = Wmin/c0 | n/a | n/a | MEASURED (Casiez 2008) |

Rows marked **ESTIMATE**: Valorant pitch = yaw; the proportional noise coefficient k; comfortable swipe travel; wrist-only travel (the lever arm); the central values chosen for functional ROM; and the functional form `σ = sqrt(c0² + (kA)²)`.

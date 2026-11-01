# Crosshair research (for the valoSens settings finder)

**Research date:** 2026-11-01. **Method:** web research, plus open-source parsers and in-game data models (read as text only), plus our own scrape of 107 ProSettings.net player pages (the players linked from `prosettings.net/lists/valorant/`; scraped 2026-11-01; 91 had a VALORANT crosshair code).

**Confidence key:** **[V]** verified (official patch notes or several independent sources agree); **[I]** inferred (consistent with all evidence but not documented by Riot); **[U]** uncertain.

---

## 1. Every crosshair setting, its code key, and its valid range

Riot has never published the code format. The table below comes from three independent open-source implementations that agree with each other:
- genesy/crosshair-codes (builder/encoder/decoder): https://github.com/genesy/crosshair-codes (`src/codegenerator.ts`)
- spartytech/Crosshair-Bridge (parser + UI ranges): https://github.com/spartytech/Crosshair-Bridge (`src/lib/valorantCode.ts`, `src/lib/defaults.ts`, `src/games/index.ts`)
- WASD Life generator, a port of genesy: https://wasdlife.com/valorant-crosshair-generator/

Those were cross-checked against the field names in Valorant's own crosshair-profile JSON, as modelled by weedeej/ValorantCC (https://github.com/weedeej/ValorantCC). That tool reads and writes the real client settings. Its fields include `bUseCustomColor`, `bHasOutline`, `bFadeCrosshairWithFiringError`, `bShowSpectatedPlayerCrosshair`, `bFixMinErrorAcrossWeapons`, `bAllowVertScaling`, `firingErrorScale`, `movementErrorScale`, `bUsePrimaryCrosshairForADS`, `bUseCustomCrosshairOnAllPrimary` and `bUseAdvancedOptions`.

### 1a. General section (between the leading `0;` and `P;`)
| In-game setting | Key | Values | Default | Conf. |
|---|---|---|---|---|
| Use Advanced Options (unlocks the ADS and Sniper tabs) | `s` | 0/1 | 0 | [V] |
| ADS: "Copy primary crosshair" / use primary for ADS | `p` | `p;0` = separate ADS crosshair | 1 | [V] |
| Override all primary crosshairs with my primary crosshair (shotguns etc.) | `c` | `c;1` | 0 | [V] |

### 1b. Primary (`P;`) and ADS (`A;`) sections: the same keys in both
| In-game setting | Key | Range / values | Default | Conf. |
|---|---|---|---|---|
| Crosshair color | `c` | 0 White `#FFFFFF`, 1 Green `#00FF00`, 2 Yellow Green `#7FFF00`, 3 Green Yellow `#DFFF00`, 4 Yellow `#FFFF00`, 5 Cyan `#00FFFF`, 6 Pink `#FF00FF`, 7 Red `#FF0000`, 8 Custom | 0 | [V] |
| Custom color hex | `u` | `RRGGBBAA`, 8 hex digits, alpha normally `FF` (e.g. `u;FFFFCCFF`) | `FFFFFFFF` | [V] |
| Use custom color flag | `b` | `b;1` appears with `c;8` in every in-game export | 0 | [I] (`bUseCustomColor`) |
| Outlines on/off | `h` | 0/1 | 1 | [V] |
| Outline thickness | `t` | 1–6, integer | 1 | [V] |
| Outline opacity | `o` | 0–1, up to 3 decimals | 0.5 | [V] |
| Center dot on/off | `d` | 0/1 | 0 | [V] |
| Center dot thickness | `z` | 1–6, integer | 2 | [V] |
| Center dot opacity | `a` | 0–1 | 1 | [V] |
| Fade crosshair with firing error | `f` | 0/1 | 1 | [I] (`bFadeCrosshairWithFiringError`; pros almost always write `f;0`) |
| Show spectated player's crosshair | `s` (inside P) | 0/1 | 1 | [I] (`bShowSpectatedPlayerCrosshair`; seen as `P;…;s;0` in f0rsakeN's and chichoo's codes) |
| Override firing error offset with crosshair offset (Riot 3.03: "minimum firing error across all weapons") | `m` | 0/1 | 0 | [I] (`bFixMinErrorAcrossWeapons`; genesy labels `m` this way) |
| **Inner lines** (prefix `0`) | | | | |
| Show inner lines | `0b` | 0/1 | 1 | [V] |
| Inner line opacity | `0a` | 0–1 | 0.8 | [V] |
| Inner line length (horizontal, or both when linked) | `0l` | 0–20 | 6 | [V] |
| Inner vertical length | `0v` | 0–20, only used when `0g;1` | 6 (= `0l`) | [V] |
| Unlink vertical length (the chain icon) | `0g` | `0g;1` = horizontal and vertical set separately | 0 | [V] |
| Inner line thickness | `0t` | 0–10 | 2 | [V] |
| Inner line offset (gap) | `0o` | 0–20 | 3 | [V] |
| Movement error | `0m` | 0/1 | 0 | [V] |
| Movement error multiplier | `0s` | 0–3 | 1 | [V] |
| Firing error | `0f` | 0/1 | **1** | [V] |
| Firing error multiplier | `0e` | 0–3 | 1 | [V] |
| **Outer lines** (prefix `1`) | same subkeys `1b 1a 1l 1v 1g 1t 1o 1m 1s 1f 1e` | lengths 0–20 (one source allows up to 20 for both), thickness 0–10, offset 0–40 (Crosshair-Bridge; genesy's UI caps at 20) [U on the outer offset max] | `1b` 1, `1a` 0.35, `1l` 2, `1t` 2, `1o` 10, `1m` **1**, `1f` 1 | [V] |

### 1c. Sniper scope section (`S;`, only with Advanced Options on)
| Setting | Key | Values | Default |
|---|---|---|---|
| Show center dot | `d` | `d;0` hides it | 1 |
| Color index | `c` | 0–8, same palette as above | 7 (Red) |
| Use custom color | `b` | `b;1` (e.g. zekken's `S;b;1;c;8;…`) [I] | 0 |
| Custom hex | `t` | `RRGGBBAA` | `FF0000FF` |
| Thickness | `s` | float, about 0–4 (pros use 0 to 2.204) | 1 |
| Opacity | `o` | 0–1 | 0.8 (genesy default; [U]) |

### 1d. Not stored in the code
Hide crosshair, the profile name (some third-party tools append `NAME;"…"`, which the game does not need), and the general-tab toggles.

### 1e. Patch history (official notes)
- **3.03 (Aug 2021):** added crosshair profiles, "Use Advanced Options" (ADS crosshair and sniper center dot), "a setting to set a minimum firing error across all weapons" (the `m` key) and "a setting to use the primary crosshair with shotguns" (general `c;1`). https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-3-03/
- **4.05 (Mar 2022):** import/export of profile codes, according to secondary sources. [U] I did not see this in Riot's own notes. https://dotesports.com/valorant/news/how-to-export-and-import-crosshair-settings-in-valorant
- **5.04 (Aug 2022):** custom hex color, independent horizontal/vertical line lengths (`0v`/`0g`), `/cc` to copy a spectated player's crosshair, and profiles raised from 10 to 15. https://playvalorant.com/en-gb/news/game-updates/valorant-patch-notes-5-04/
- **6.05:** fixed the Import button being greyed out with 10+ profiles (secondary source).
- **2025–2026:** I found **no crosshair option changes**. One third-party guide checked through patch 13.05 (1 Sep 2026) and found none either. https://clip.dor.gg/en/blog/valorant-crosshair-guide [U: absence of evidence]

---

## 2. Code grammar, for generating importable codes

```
code        := "0" ( ";" general-pair )* ( ";P" ( ";" pair )* )? ( ";A" ( ";" pair )* )? ( ";S" ( ";" sniper-pair )* )?
general-pair:= ("s"|"p"|"c") ";" ("0"|"1")
pair        := key ";" value
key         := "c"|"u"|"b"|"h"|"t"|"o"|"d"|"z"|"a"|"f"|"s"|"m"
             | ("0"|"1") ("b"|"a"|"l"|"v"|"g"|"t"|"o"|"m"|"s"|"f"|"e")
value       := integer | decimal (max 3 dp, e.g. 0.5, 0.619, 1.000) | HEX8 (for u / sniper t)
```
Rules (from the parsers above and from real exports):
1. The code always starts with `0`. The bare code `0` is the default crosshair.
2. It is a flat `key;value` stream. `P`, `A` and `S` are lone section markers with no value. Section order is General → P → A → S.
3. **Only non-default values are written.** A missing key takes the game default from §1. So **to switch off firing error you must write `0f;0`**, because inner-line firing error defaults to ON. Writing `1b;0` removes the outer lines, which default to ON with movement and firing error.
4. Booleans are `0`/`1`. Hex values are uppercase `RRGGBBFF`. Never put a trailing `;`, space or newline after the code (sources say the import fails).
5. Custom color: `c;8;u;RRGGBBFF;b;1` (all in-game exports with c=8 carry `b;1`).
6. `0v` is ignored unless `0g;1`.
7. `A;` only matters with `s;1` and `p;0`. `S;` only matters with `s;1`.
8. Recommended key order, which matches the game's own exports: `c,u,h,t,o,d,b,z,a,f,s,m`, then `0t,0l,0v,0g,0o,0a,0m,0s,0f,0e`, then the same for `1…`.

**Generator template** (the app should emit only the deltas):
`0;P;c;{c};[u;{HEX}FF;b;1;]h;{0|1};[t;{1-6};o;{0-1};]f;0;[d;1;z;{1-6};a;{0-1};]0t;{t};0l;{l};0o;{o};0a;1;0f;0;1b;0`

### Verified real pro codes (ProSettings player pages, scraped 2026-11-01; pages updated mid/late 2026)
| Player | Code | Decoded |
|---|---|---|
| TenZ | `0;s;1;P;c;5;o;0;f;0;0l;2;0v;2;0g;1;0o;1;0a;1;0f;0;1b;0` | cyan cross 2/1, outline opacity 0, static |
| aspas | `0;P;h;0;0l;4;0o;0;0a;1;0f;0;1b;0` | white, no outline, length 4, gap 0 |
| Demon1 (Spind DB) | `0;p;0;s;1;P;o;1;f;0;0t;1;0l;3;0o;2;0a;1;0f;0;1b;0;A;…;S;c;1;o;1` | white 1-3-2 with outline |
| Boaster | `0;s;1;P;c;1;o;1;d;1;0l;0;0o;2;0a;1;0f;0;1t;0;1l;0;1o;0;1a;0;S;c;1;o;1` | green dot |
| ZmjjKK | `0;P;h;0;d;1;f;0;0l;2;0v;2;0g;1;0o;1;0f;0;1b;0` | white cross + dot |
| Less | `0;s;1;P;o;1;d;1;f;0;0l;2;0o;0;0a;1;0f;0;1b;0` | white tight cross + dot, outline |
| tarik | `0;s;1;P;o;1;d;1;f;0;0b;0;1b;0;S;d;0` | white outlined dot |
| leaf | `0;P;c;8;u;FF99FFFF;h;0;b;1;0l;8;0o;1;0a;1;0f;0;1t;4;1l;0;1o;3;1a;1;1m;0;1f;0` | custom pink, long |
| jinggg | `0;s;1;P;c;5;o;1;f;0;m;1;0t;3;0l;0;0v;1;0g;1;0o;0;0a;1;0f;0;1t;1;1l;4;1g;1;1o;0;1a;1;1m;0;1f;0;S;c;5;o;1` | cyan, static outer lines |
| s0m | `0;P;h;0;d;1;z;1;0t;1;0l;1;0o;2;0a;1;0f;0;1b;0` | white micro cross + dot |
More, with a 35-code list: https://prosettings.net/blog/best-valorant-crosshair-codes/ and a 402-code DB: https://www.valorant-spind.de/en/valorant-pro-crosshair-datenbank.html

---

## 3. Pro trends (concrete stats)

**A. Our scrape: ProSettings, n = 91 codes (pages updated 2026)**
| Metric | Result |
|---|---|
| Color | White 50 (55%), plus 3 custom-white = **58%**; **Cyan 17 (19%)**; Green 10 (11%); Red 4; Yellow 2; Green-Yellow 2; custom black `000000` 2 [U: odd, but that is what the code decodes to]; custom pink 1 |
| Shape | Cross only 52 (57%); **dot only 24 (26%)**; cross + dot 10 (11%); outer lines visible 5 (5%) |
| Outlines visible (`h=1` and `o>0`) | 54 (59%) |
| Center dot on | 35 (38%) |
| Firing error on any visible line | **1 (1%)** |
| Movement error on any visible line | **1 (1%)** |
| Inner length (n=67 with lines) | 1:7, **2:21, 3:18, 4:13**, 5:4, 6:2, 8:1, 0:1. Median 3 |
| Inner offset (gap) | 0:20, 1:14, **2:27**, 3:6 |
| Inner thickness | 1:21, **2:44**, 3:1, 5:1 |
| Advanced options on | 46 (51%); separate ADS crosshair (`p;0`): 12 (13%) |
| Vertical unlinked | 8 (9%) |

**B. Valorant-Spind DB (updated 30 Oct 2026; 246 VCT pros)**: white 58%, cyan 21%, green 23/246; pure dot 28%; no center dot 63%; 129/246 (52%) with outlines; Champions 2026 white 70% (44/63). https://www.valorant-spind.de/en/valorant-pro-crosshair-datenbank.html. Its counts don't fully reconcile and the vendor sells a tool, but it agrees closely with our independent scrape.

**C. Contradicting claim:** Simple Carry says "cyan 35%, 76% no dot/no outline" with no method given. Treat it as unreliable. https://simple-carry.com/blogs/valorant-guides/best-valorant-crosshair

**By role** (joining our scrape with `pro_roles.md`, n≈28): no meaningful difference. Controllers were slightly more often dot-only (3/7), but n is far too small. **There is no evidence-based role → crosshair rule. Treat role as a weak prior at most.**

**Consensus "pro archetype":** a static (no error) small cross, length 2–4, gap 0–2, thickness 1–2, outer lines off, fade off; or a static outlined dot. The color is white or cyan.

---

## 4. Evidence and rationale

### 4a. Static vs dynamic (firing/movement error)
- About 99% of pros disable error lines. Valorant's accuracy is governed by stopping, and pros learn spread through recoil/tap discipline.
- Vision science: **sudden motion onset captures attention automatically** (Abrams & Christ 2003, *Psych. Sci.* 14:427, https://pubmed.ncbi.nlm.nih.gov/12930472/). Expanding error lines therefore pull attention away from the target at the very moment of a duel, which argues for static lines for most players.
- The counter-argument (beginners): dynamic error is explicit feedback that "you're moving / spraying = inaccurate." That is a plausible teaching aid for counter-strafing, but there is **no controlled study** [U]. The app can recommend movement error ON as a *temporary training mode* for players who self-report shooting while moving, then OFF.

### 4b. Size, gap, and occlusion
- A crosshair should not hide the head hitbox at range. At 1080p a distant head is only a few pixels wide, so a thick, gap-0 cross or a size-4+ dot can hide it. Gap ≥1 with thickness 1–2 keeps the aim point visible.
- **Resolution:** the line values are in screen pixels (community consensus; the resolution-converter project scales `0l/0t/0o` by the resolution ratio: https://github.com/sciencejiho/valorant-crosshair) [I]. A 1440p/4K user should scale the values up ×1.33/×2 to get the same apparent size. Players on 4:3 stretched get horizontally widened lines.
- Aiming.pro (aim-trainer data, correlational, 2019): the top-rated players over-indexed on **small** crosshairs and on dots, while beginners over-indexed on size 10. https://aiming.pro/analysis-the-best-crosshair-for-aiming-performance
- **Crowding** (Pelli & Tillman 2008, *Nat. Neurosci.*, https://pubmed.ncbi.nlm.nih.gov/18828191/): flankers within roughly 0.4–0.5 × eccentricity impair recognition. Lines right next to the target add clutter, and this matters most when the target is slightly off-center during a flick. It is a supporting argument for short lines with a gap, not a direct test.
- Visual search is guided by how distinct an item is from its surroundings (Wolfe & Horowitz 2017, https://www.nature.com/articles/s41562-017-0058). The crosshair should differ from the scene and also from the enemy highlight color.

### 4c. Color
- Luminance contrast drives fast detection, and in the periphery **red-green chromatic sensitivity drops faster than luminance or blue-yellow** (Hansen, Pracejus & Gegenfurtner 2009, *JOV* 9(4):26, https://jov.arvojournals.org/article.aspx?articleid=2193447).
- Relative luminance (sRGB, WCAG formula; our calculation): white 1.00, yellow 0.93, cyan 0.79, green 0.72, pink 0.29, red 0.21. Against a mid-gray wall, red has a contrast ratio of about 1.0 (invisible by luminance alone), while cyan's is 3.2. **Avoid red or pink as a crosshair color,** also because they clash with red enemy highlights and red/orange utility.
- **Outlines** add a dark border, which gives luminance contrast on bright, sandy maps (Breeze, Bind, Sunset) where white/cyan/yellow wash out. Our sand `#C8B48C` example: white only reaches 2.0:1, while a black outline reaches 10:1. Recommend outlines ON (opacity 0.5–1, thickness 1) for white/yellow/green crosshairs and for players who report "losing" the crosshair.
- Community visibility test (not peer reviewed): cyan scored 4.8 and white 3.4 across 12 maps. https://gamegrids.io/valorant/blog/valorant-crosshair-color-visibility-score/
- **Color vision deficiency:** red-green CVD affects about 8% of males and 0.5% of females (deutan types are the most common, ~5% of males deuteranomalous; https://en.wikipedia.org/wiki/Color_blindness, https://www.webexhibits.org/causesofcolor/2C.html). For deutan and protan users, avoid green, yellow-green and red, and use **white, cyan, or yellow + outline**. For tritan users (very rare), avoid yellow vs white and cyan vs green distinctions; white or pink work.
- Don't use the same hue as your enemy highlight (yellow crosshair + yellow highlight). Pick a crosshair hue that is distinct from the highlight.

### 4d. Aim style
- **Flick / tap players** usually prefer a **small cross or dot** that marks a precise point (most pros).
- **Trackers / spray players** usually prefer a **slightly larger cross (length 3–5, gap 1–3)**, because the lines stay visible around a moving target. This is a heuristic with no study [U].
- **Dot users** typically use thickness 2–4 with an outline. A dot hides less of the scene, but on bright backgrounds it gives a weaker sense of "center."

---

## 5. Questionnaire and decision mapping

| # | Question | Options → effect |
|---|---|---|
| Q1 | Do you have (or suspect) color blindness? | None / red-green / blue-yellow / unsure (→ offer a short screening). red-green → exclude green, yellow-green, red; prefer cyan/white. blue-yellow → prefer white/pink, avoid yellow. |
| Q2 | Which enemy highlight color do you use? | Must differ: if yellow, avoid a yellow/green-yellow crosshair; if red, avoid red/pink. |
| Q3 | Do you lose your crosshair on bright maps (Breeze/Bind/Sunset) or in dark corners? | bright → outlines ON, opacity 1; dark → white/cyan, outline optional. |
| Q4 | Preferred shape? | dot / small cross / medium cross / unsure (default: small cross). |
| Q5 | How do you mostly aim? | flicks/taps → small cross (1-2-2 / 1-3-2) or dot; tracking/spray → 1-4-2 / 2-4-2. |
| Q6 | Experience level, and do you shoot while moving? | beginner + "yes, often" → movement error ON (training), firing error OFF; everyone else → both OFF. |
| Q7 | Resolution and stretched? | 1080p → base values; 1440p → ×1.33; 4K → ×2 (round, min 1). Stretched 4:3 → reduce `0l` by about 1. |
| Q8 | Do you want a different ADS or sniper dot? | Only then emit `s;1`, `p;0`, `A;`, `S;`. |
| Q9 | Main role (optional) | Weak prior only: no evidence that role changes the best crosshair. |

**Default output for an undecided user (matches the pro median):** cyan (white if the highlight would clash or for deutans who dislike cyan), outline ON at 1/0.5 for bright-map complaints, otherwise OFF, inner 1/3/2 or 2/3/2, no error, outer off:
`0;P;c;5;h;0;f;0;0t;2;0l;3;0o;2;0a;1;0f;0;1b;0`
Dot variant: `0;P;c;5;o;1;d;1;z;2;f;0;0b;0;1b;0`

---

## 6. In-browser mini-tests

1. **Visibility A/B (≈60 s):** render 4–6 candidate crosshairs (canvas, at their real pixel size × devicePixelRatio) over 3 map-like backgrounds (bright sand, mid-grey concrete, dark blue shadow, each with noise texture). For each background, the user picks the crosshair they can "see instantly without hunting." Tally the wins.
2. **Precision task (≈90 s):** a head-sized target (6–10 px at 1080p scale) moves or appears at random. The page moves a *fake scene* under a fixed central crosshair with the mouse (pointer lock), and the user clicks when the crosshair is on the head. Record the hit rate and the time to click per crosshair variant (randomized, about 10 trials each). Choose the variant with the best speed–accuracy, and break ties by the user's rating. Caveat: browser input differs from the game, so this measures *visibility/occlusion*, not real aim skill.
3. Use the Machado et al. 2009 CVD simulation matrices (https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html) to preview a recommendation as a colorblind user would see it.

---

## Sources
- Riot patch notes 3.03: https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-3-03/ · 5.04: https://playvalorant.com/en-gb/news/game-updates/valorant-patch-notes-5-04/
- genesy/crosshair-codes: https://github.com/genesy/crosshair-codes · Crosshair-Bridge: https://github.com/spartytech/Crosshair-Bridge · ValorantCC: https://github.com/weedeej/ValorantCC · sciencejiho/valorant-crosshair: https://github.com/sciencejiho/valorant-crosshair · WASD Life: https://wasdlife.com/valorant-crosshair-generator/
- ProSettings codes: https://prosettings.net/blog/best-valorant-crosshair-codes/ · player pages, e.g. https://prosettings.net/players/tenz/ · list: https://prosettings.net/lists/valorant/
- Valorant-Spind DB: https://www.valorant-spind.de/en/valorant-pro-crosshair-datenbank.html
- Aiming.pro analysis: https://aiming.pro/analysis-the-best-crosshair-for-aiming-performance
- GameGrids color test: https://gamegrids.io/valorant/blog/valorant-crosshair-color-visibility-score/
- Abrams & Christ 2003: https://pubmed.ncbi.nlm.nih.gov/12930472/ · Pelli & Tillman 2008: https://pubmed.ncbi.nlm.nih.gov/18828191/ · Wolfe & Horowitz 2017: https://www.nature.com/articles/s41562-017-0058 · Hansen et al. 2009: https://jov.arvojournals.org/article.aspx?articleid=2193447 · Machado et al. 2009: https://doi.org/10.1109/tvcg.2009.113
- CVD prevalence: https://en.wikipedia.org/wiki/Color_blindness · https://www.webexhibits.org/causesofcolor/2C.html
- Import troubleshooting/history: https://dotesports.com/valorant/news/how-to-export-and-import-crosshair-settings-in-valorant · https://clip.dor.gg/en/blog/valorant-crosshair-guide

---

## 7. v3.0 additions (2026-11-01)

### 7a. No controlled crosshair study exists
- **What was searched:** CHI, CHI PLAY, IEEE CoG and military reticle literature.
- **Result:** no controlled study that varies crosshair size, gap or color and measures aiming.
  - The closest work is Vicencio-Moreira, Mandryk & Gutwin, CHI 2014 (doi:10.1145/2556288.2557308), on aim assists, not visual crosshairs.
- **Consequence:** every geometry rule below is an inference from vision science, and the app says so.

### 7b. Color scoring is now computed
For each crosshair color and each of 8 scenes (`SCENES` in `xhair.js`), the app computes a weighted CIELAB color difference against the scene's three representative surface colors.

**How the score is built:**
- **Color vision simulation:** applied first, using Machado, Oliveira & Fernandes 2009 at severity 1.0, in linear RGB.
- **Chroma weight 0.25 (a\*, b\*):** thin 1–2 px lines sit near the resolution limit for pure color. That limit is about 11–12 c/deg, against about 60 c/deg for luminance (Mullen 1985, *J. Physiol.* 359:381). Luminance carries the detail.
- **Saturation:** `1 − exp(−ΔE/50)`.
- **Combining scenes:** `0.6 × weighted mean + 0.4 × worst scene`. This leans toward maximin: you lose the crosshair on its worst background.
- **Scene weights:** follow the "when do you lose it" answer.
- **Priors:** small, from pro use and the GameGrids community test (cyan 4.8, pink 3.8, white 3.4) [U: method not checked].
- **Outline decision:** compares the worst-case visibility with and without a black outline. The outline wins when it lifts the worst scene enough (or the player reports bright maps).

### 7c. Geometry from head size on screen
- **Head size:**
  - Pixel focal length = `(width / 2) / tan(51.5°)` (103° hFOV).
  - Head width = focal length × 0.25 m / range, with range from the weapon answer: 10 m close range, 20 m rifle, 30 m sniper.
  - At 1080p that gives about 19, 9.5 and 6.4 px.
- **Size caps:**
  - Dot size ≤ 0.35 × head.
  - Line thickness ≤ 0.2 × head.
- **Crowding:**
  - Foveal contour interaction spans only a few arcminutes (Siderov, Waugh & Bedell 2013; "Foveal crowding resolved", *Sci. Rep.* 2018).
  - Lines 3 px or longer therefore keep a gap of ≥ 2 px.
  - Lateral masking (Polat & Sagi 1993) supports the same rule [M].
- **Pixel angle:**
  - On a 24″ 1080p screen at 60 cm, 1 px ≈ 1.6′. On a 27″ 4K screen at 70 cm, 1 px ≈ 0.76′, so thickness 2 is the safer minimum there.
  - Resolution scaling (×1.33 at 1440p, ×2 at 4K) keeps the crosshair the same size relative to heads.

### 7d. Rotating visibility test
- **Pool:** 18 archetypes from the pro data (`POOL` in `xhair.js`).
  - Covers white, cyan, green, yellow, pink and yellow-green.
  - Shapes: cross, dot, cross + dot, micro cross and taller vertical lines.
  - Includes a red control.
- **Sessions:** each page load draws a new random seed (`crypto.getRandomValues`), so the subset changes.
  - Each session is 8 rounds of 4 crosshairs.
  - Exposure is balanced, least-shown first.
  - Colors within a round are distinct where possible.
  - Slot order is random every round, because position biases choice (Mantonakis et al. 2009, *Psych. Sci.* 20:1309).
  - Scenes cycle through a shuffled list.
- **Scoring:** a conditional-logit (Luce choice / Plackett–Luce) model on the crosshair's attributes.
  - Attributes: color, outline, outline × bright scene, shape, thin lines.
  - Ridge prior N(0, 1) on each coefficient; fitted by Newton's method.
  - Background: Bradley & Terry 1952; Hunter 2004.
  - Random incomplete blocks give near-optimal ranking estimates (Hajek, Oh & Xu 2014, arXiv:1406.5638).
- **Effect on the result:**
  - The color coefficient adds up to ±2 points.
  - The outline coefficient feeds the outline decision.
  - Shape coefficients are used only when the player chose "no preference".
  - The best-scoring candidate the player saw is offered as "Your test favorite".

### 7e. Pro data cross-check
- **Valorant-Spind** (246 VCT codes, Sep/Oct 2026):
  - Color: white 58%, cyan 21%, green 23/246.
  - Outlines: 52%.
  - Dot-only: 28%.
  - No dot: 63%.
- **Agreement:** these are within a few points of our ProSettings scrape.

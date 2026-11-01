# Enemy highlight color research

**Research date:** 2026-11-01. **Confidence key:** [V] verified, [I] inferred, [U] uncertain.

## 1. Options in the current client
Settings → General → Accessibility → **Enemy Highlight Color** [V; menu placement can move between UI updates]:
| Client label | Hue | Intended for |
|---|---|---|
| Red (Default) | red | normal vision |
| Yellow (Deuteranopia) | yellow | green-weak/blind |
| Yellow (Protanopia) | yellow (a slightly different shade than the Deuteranopia yellow; Riot publishes no hex) [U] | red-weak/blind |
| Purple (Tritanopia) | purple/magenta | blue-yellow-blind |

ProSettings records the labels exactly as above ("Yellow (Deuteranopia)", "Red (Default)", "Purple (Tritanopia)", "Yellow (Protanopia)"). **I found no newer options in 2025–2026** [U: absence of evidence]. The setting only recolors the enemy outline/highlight. It does not recolor all enemy abilities, thicken outlines, or reveal enemies through smoke (https://dcprosens.com/blog/colorblind-mode-settings-valorant-cs2-2026, vendor source). The exact RGB values are not published.

## 2. Pro usage: our own count
Scraped 107 ProSettings.net player pages (all players linked from https://prosettings.net/lists/valorant/, pages updated through Oct 2026) on 2026-11-01. 58 pages list a known value:
| Color | Count | Share of known |
|---|---|---|
| **Yellow (Deuteranopia)** | 39 | **67%** |
| Yellow (Protanopia) | 2 (s0m, tkzin) | 3% |
| → any yellow | 41 | **71%** |
| Red (Default) | 13 (e.g. f0rsakeN, stax, Something, tarik, nAts, johnqt) | 22% |
| Purple (Tritanopia) | 4 (Ethan, Miniboo, Buzz, jonahp) | 7% |
41 pages say "Unknown" and 8 have no field, so there is selection bias. Example: TenZ = Yellow (Deuteranopia) (https://prosettings.net/players/tenz/). The ProSettings guide (705 pros) says "Yellow – Deuteranopia seems to be the most common" (https://prosettings.net/guides/valorant-options/). Older community lists say the same (TenZ, ScreaM, Brax, Hiko → yellow).

**Role split** (joined with `pro_roles.md`, tiny n): duelists 5/5 yellow, sentinels 4/4, initiators 2 yellow/1 red, controllers 3/1. There is no usable role signal.

## 3. Why yellow: vision science
- **Luminance.** In sRGB, relative luminance is Y = 0.2126R + 0.7152G + 0.0722B (linear). Pure yellow Y ≈ 0.93, red ≈ 0.21, purple (`#A020F0`) ≈ 0.15 (our calc, nominal hues, not the in-game hexes). Yellow is nearly as bright as white, so it stands out by **luminance** on dark and mid-tone surfaces. Contrast ratio vs mid-gray: yellow ≈ 3.7:1, red ≈ 1.0:1, purple ≈ 1.3:1. Red relies almost entirely on **chromatic** contrast.
- **Red-green chromatic contrast degrades fastest in peripheral vision** (Hansen, Pracejus & Gegenfurtner 2009, JOV 9(4):26, https://jov.arvojournals.org/article.aspx?articleid=2193447). Luminance and blue-yellow hold up better. Enemies usually first appear off-center, and yellow keeps a strong luminance signal there.
- **Pop-out / guidance:** attention is guided by how different an item's features are from its surroundings (Wolfe & Horowitz 2017, https://www.nature.com/articles/s41562-017-0058; feature-integration theory, Treisman & Gelade 1980). Any of the three hues pops out when it is rare in the scene. It loses that advantage where the map or utility shares its hue.
- **Where yellow is weaker:** on bright, warm, sandy surfaces (Breeze, Bind, Sunset, parts of Ascent) yellow's luminance is close to the background (sand `#C8B48C` vs yellow ≈ 1.9:1, the same as red). There it pops only by saturation. Warm-yellow utility (Killjoy, Raze, Gekko, Tejo effects) and yellow skins and VFX can also blend [I: qualitative; no controlled test found]. Users of a yellow or green-yellow crosshair should not pair it with yellow highlights.
- **Red's weaknesses:** red/orange utility and fire (Phoenix, Brimstone incendiary/orbital, Breach), red-accented maps (some Split, Haven, Fracture areas), red tracers and skins, and red-green CVD users [I]. Its advantage is familiarity: it is the default, and the game's UI language codes enemies as red.
- **Purple's weaknesses:** purple utility and VFX from Reyna, Omen, Astra, Clove, Fade and Iso [I], and blue/cool maps (Icebox, Pearl, Abyss), where its low luminance and closeness to blue reduce contrast. Its strength is that it separates from sand/wood/warm lighting (https://alviran.net/blog/valorant-enemy-highlight-color-2026/, editorial). It is also the only option designed for tritans.
- **No performance data:** I found no controlled study or credible win-rate/KD data by highlight color. Multiple guides say the choice does not change accuracy and is mostly preference/visibility (https://1v9.gg/blog/how-to-change-enemy-color-in-valorant). Community threads show the same split (https://www.vlr.gg/228771/enemy-highlight-color-settings).

## 4. Color vision deficiency (CVD)
- Red-green CVD affects about 8% of males and 0.5% of females (Northern-European ancestry). By type in males: deuteranomaly ~5%, protanomaly ~1.3%, protanopia ~1.3%, deuteranopia ~1.2%. Tritan types are about 0.01% or less, with no sex difference (https://en.wikipedia.org/wiki/Color_blindness; https://www.webexhibits.org/causesofcolor/2C.html; NCBI Webvision table https://www.ncbi.nlm.nih.gov/books/NBK11538/table/ch28kallcolor.T1/).
- Protanopes perceive red as dark and low-luminance, so a red highlight can nearly vanish on dark surfaces. **For protan or deutan users, use yellow, and choose the variant named for their type.**
- For tritan users, use purple. Yellow and white/grey may be confusable for them.
- Simulation for previews: Machado, Oliveira & Fernandes 2009, physiologically based CVD simulation (https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html).

## 5. Questionnaire and decision mapping
| Q | Ask | Mapping |
|---|---|---|
| H1 | Do you have a known color vision deficiency? (none / red-green: protan / red-green: deutan / blue-yellow / don't know) | protan → Yellow (Protanopia); deutan or unspecified red-green → Yellow (Deuteranopia); tritan → Purple (Tritanopia). "Don't know" → offer the screening (below). |
| H2 | What is your crosshair color? | yellow/green-yellow crosshair → avoid yellow highlight (use red or purple); red/pink crosshair → avoid red highlight. |
| H3 | Which maps or situations do you lose enemies in? | warm/sandy/bright (Breeze, Bind, Sunset) → Purple or Red; dark corners/shadow (Split, Abyss, Lotus interiors) → Yellow. |
| H4 | Which agents/utility do you play against most (or which feel cluttered)? | lots of fire/orange (Phoenix, Brim, Breach) → not Red; lots of purple smokes/blinds (Omen, Reyna, Astra, Clove) → not Purple; Killjoy/Raze/Gekko yellow → slight minus for Yellow. |
| H5 | Is a familiar look important to you (clips/VODs, default feel)? | yes → keep Red unless H1/H3 override. |
| **Default** | — | **Yellow (Deuteranopia)**. It is the pro majority (~70%) and has the highest luminance, so it works for normal vision and both red-green types. |

Priority: H1 (CVD) > H2 (crosshair clash) > H3/H4 (scene conflicts) > H5 (preference) > default.

## 6. In-browser tests
1. **Screening (≈30 s, not diagnostic):** 4–6 Ishihara-style plates generated on canvas (red-green and tritan confusion lines). The user types a number or answers "can't see." Disclaimer: monitor calibration varies, so this is a hint, not a diagnosis.
2. **Timed detection (≈60–90 s):** draw silhouettes with a 2-px outline + fresnel glow in each candidate color (red `#E23B3B`, yellow `#F2E33A`, purple `#B04CF0`, approximations [U]) on 3–4 map-like backgrounds: sandy warm, dark blue-grey, mid concrete, and one "utility" background with fire-orange or purple smoke. Use a fixation cross, then flash the silhouette at a random peripheral spot for 300–500 ms. The user clicks it or presses a key. Measure hit rate and RT per color with about 8 trials/color, interleaved and randomized. Recommend the color with the best combined score, unless H1 forces a choice. Optionally run a second pass through the Machado simulation to show the "you vs. colorblind teammate" view.
3. Show the result alongside the user's chosen crosshair color to confirm there is no clash.

## Sources
- ProSettings guide (705 pros): https://prosettings.net/guides/valorant-options/ · players list: https://prosettings.net/lists/valorant/ · TenZ: https://prosettings.net/players/tenz/
- Hansen et al. 2009: https://jov.arvojournals.org/article.aspx?articleid=2193447 · Wolfe & Horowitz 2017: https://www.nature.com/articles/s41562-017-0058 · Machado et al. 2009: https://doi.org/10.1109/tvcg.2009.113
- CVD prevalence: https://en.wikipedia.org/wiki/Color_blindness · https://www.webexhibits.org/causesofcolor/2C.html · https://www.ncbi.nlm.nih.gov/books/NBK11538/table/ch28kallcolor.T1/
- Community/editorial: https://www.vlr.gg/228771/enemy-highlight-color-settings · https://alviran.net/blog/valorant-enemy-highlight-color-2026/ · https://1v9.gg/blog/how-to-change-enemy-color-in-valorant · https://tier1settings.com/valorant-best-visibility-settings/ (unsupported claims, e.g. "purple most common", contradicted by our data)

---

## 7. v3.0 changes (2026-11-01)

### Scoring is now computed
- **What is compared:** each highlight option against 8 scenes (sand, concrete, shadow, cool blue, foliage, purple utility, fire, yellow utility) in CIELAB, after simulating the player's color vision (Machado et al. 2009).
- **Peripheral weighting:** red-green (a\*) counts 0.4 and blue-yellow (b\*) counts 0.9, because enemies are first seen off-center:
  - red-green sensitivity falls steeply with eccentricity (Mullen & Kingdom 2002, *Vis. Neurosci.* 19:109);
  - red-green opponency is behaviourally absent by about 25–30° (Mullen, Sakurai & Chu 2005);
  - see also Hansen et al. 2009.
- **Answers become weights:** the map and utility answers raise the weight of the matching scene, so utility that shares a hue now lowers a color through contrast. The hand-set ±1.5 penalties are gone.
- **Riot's color-blind labels:** the option Riot made for the player's type gets +2. This is less than before (+5), because the simulation already captures most of the effect.
- **Tritanopia:** red can now outrank purple. Tritanopia leaves red-green vision intact, and red keeps its contrast in the simulation.
- **The vision test can override the self-reported type:** it measures the player's own vision, and is capped at ±2.5.

### Colors
- **Values used:** community-posted, Yellow `#FFFF00` (both labels), Red `#FF0000`, Purple `#A907E4` [U].
- **New options:** none found in 2024–2026 guides.

### Test
- **What replaced the reaction-time test:** a masked threshold test. See `research/vision_test_method.md`.

### Real-world conspicuity, for context
- Solomon & King 1995 (*J. Safety Res.* 26:41) found that lime-yellow fire engines had about a third of the visibility-related crash rate of red ones.
- This is a field study with confounds. It is consistent with the luminance argument, but it is not evidence about games.

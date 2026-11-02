# Physics calibration dataset v6 (D2)

Generated 2026-11-02 by `research/raw_v6/build_v6.py`. Rows: `physics_calibration_v6.json`; pad table in the same file under `pads`.

**Rows: 1028; with pad width: 995** (target 120); rows with mouse weight: 257; rows with aim_style: 0.

## Method

- **ProSettings player pages** (`https://prosettings.net/players/<slug>/`): one page per player gives VALORANT DPI and sens, the mouse (with weight in g) and the mousepad with its listed dimensions ("Height" and "Length" in cm). Pages were found for the 100 players on the ProSettings VALORANT list and for 600 candidate slugs derived from the SensLab handle list (362 returned 404; the rest were checked to have a VALORANT settings title).
- **Pad width** = the longer of ProSettings' two numbers (they are not consistently ordered; cross-checks: QcK Heavy XXL page 40x90 vs 900x400 mm from SteelSeries/retailers, Artisan FX Zero XL 42x49 vs 490x420 mm from jpgamingusa.com). The page the pad was read from is the row's `settings_url`; the first page per model is `pads[model].source_url`.
- **specs.gg community profiles** (`https://specs.gg/<slug>`) give DPI, sens, mouse and mousepad name but not size. Rows were added only when the pad name states a single known size that was looked up on a manufacturer/retailer page seen during this task (`raw_v6/pad_dims_manual.json`: Artisan FX Zero XL, SteelSeries QcK Heavy Large and XXL, Logitech G640 Large) or equals the ProSettings pad `ZOWIE G-SR`. Pad names without a size (for example "Razer Gigantus V2", "X-Raypad Aqua Control Plus White") were NOT given a width.
- Same exclusions as the population set (s800 > 1.2 or < 0.08). Rows are de-duplicated by normalised name (ProSettings page wins).
- `aim_style` is null in every row: no source found (see Limitations).

## Exclusions and nulls

- `pad_spec_conflict_G740`: 3
- `pad_spec_implausible(<30cm)`: 23
- `pad_spec_implausible(>100cm)`: 1
- `ps_page_no_dpi_sens`: 27
- `ps_page_pad_without_spec`: 6
- implausible sens, `physics_ps`: frttt dpi=1600 sens=0.755 s800=1.510
- implausible sens, `physics_specs`: Alexi dpi=1600 sens=0.9 s800=1.800; SylVie09 dpi=800 sens=4.1 s800=4.100; yourfavmikasa dpi=1400 sens=0.977 s800=1.710; yeonho dpi=3250 sens=0.45 s800=1.828; DRX Dean dpi=400 sens=0.15 s800=0.075; sez4n dpi=800 sens=43.0 s800=43.000; BlueKoodex dpi=1600 sens=1.2 s800=2.400; Sxg dpi=800 sens=0.0 s800=0.000

## Pads

| Pad model | width cm | height cm | source |
|---|---|---|---|
| ASUS ROG Hone Ace Aim Lab | 50 | 42 | https://prosettings.net/players/curry/ |
| ASUS ROG Hone Control Ace Vitality Edition | 49 | 42 | https://prosettings.net/players/sayonara/ |
| Artisan FX Hien Mid Black | 49 | 42 | https://prosettings.net/players/keiko/ |
| Artisan FX Hien Soft Black | 49 | 42 | https://prosettings.net/players/geeza/ |
| Artisan FX Hien Soft Wine Red | 42 | 33 | https://prosettings.net/players/dantedeu5/ |
| Artisan FX Hien XSoft Wine Red | 42 | 33 | https://prosettings.net/players/erde/ |
| Artisan FX Zero MID XL | 49 | 42 | https://jpgamingusa.com/products/artisan-fx-zero-mousepad |
| Artisan FX Zero SOFT XL | 49 | 42 | https://jpgamingusa.com/products/artisan-fx-zero-mousepad |
| Artisan FX Zero SOFT XL Daidai Orange | 49 | 42 | https://jpgamingusa.com/products/artisan-fx-zero-mousepad |
| Artisan FX Zero XSOFT XL | 49 | 42 | https://jpgamingusa.com/products/artisan-fx-zero-mousepad |
| Artisan FX Zero XSOFT XL Daidai Orange | 49 | 42 | https://jpgamingusa.com/products/artisan-fx-zero-mousepad |
| Artisan Hayate Otsu V2 Soft Black | 49 | 40 | https://prosettings.net/players/cgrs/ |
| Artisan Hayate Otsu V2 Soft Wine Red | 49 | 42 | https://prosettings.net/players/meteor/ |
| Artisan Hayate Otsu V2 XSoft Black | 49 | 42 | https://prosettings.net/players/soulcas/ |
| Artisan Ninja FX Zero Mid | 49 | 42 | https://prosettings.net/players/jelly/ |
| Artisan Ninja FX Zero Mid Orange | 49 | 42 | https://prosettings.net/players/chichoo/ |
| Artisan Ninja FX Zero Soft Orange | 49 | 42 | https://prosettings.net/players/alfajer/ |
| Artisan Ninja FX Zero XSoft Black | 49 | 42 | https://prosettings.net/players/riens/ |
| Artisan Ninja FX Zero XSoft Orange | 49 | 42 | https://prosettings.net/players/yong/ |
| Artisan Raiden FX Mid | 49 | 42 | https://prosettings.net/players/dgzin/ |
| Artisan Raiden FX XSoft | 49 | 42 | https://prosettings.net/players/free1ng/ |
| Artisan Type-99 Gray | 49 | 42 | https://prosettings.net/players/zmjjkk/ |
| Artisan Type-99 Matcha | 49 | 42 | https://prosettings.net/players/smoggy/ |
| Artisan Type-99 Soft Black | 49 | 42 | https://prosettings.net/players/kicks/ |
| Artisan Type-99 XSoft Black | 49 | 42 | https://prosettings.net/players/magnum/ |
| BanKs Collection Heavy Claw by ESPTIGER | 49 | 42 | https://prosettings.net/players/tuli/ |
| Corsair MM350 Champion Series | 45 | 40 | https://prosettings.net/players/qutionerx/ |
| GLSSWRKS Hana | 49 | 42 | https://prosettings.net/players/szalony/ |
| Higround Performance Mousepad | 90 | 40 | https://prosettings.net/players/lidyuh/ |
| HyperX Fury S Pro | 42 | 40 | https://prosettings.net/players/mitch/ |
| InfinityMice Shogun | 49 | 49 | https://prosettings.net/players/neth/ |
| Kurosun Samurai | 49 | 40 | https://prosettings.net/players/mistic/ |
| Logitech G640 | 46 | 40 | https://www.logitechg.com/en-us/shop/p/g640-cloth-gaming-mouse-pad |
| Logitech G640 Black | 45.5 | 40 | https://prosettings.net/players/alexis/ |
| Logitech G640 Original | 45.5 | 40 | https://prosettings.net/players/mimi/ |
| Pulsar Meiy Glass | 50 | 45 | https://prosettings.net/players/hyunmin/ |
| Pulsar d4v41 Mousepad | 49 | 42 | https://prosettings.net/players/d4v41/ |
| Pulsar eS Jupiter Pro | 49 | 40 | https://prosettings.net/players/xeus/ |
| Pulsar eS Saturn Pro Black | 50 | 50 | https://prosettings.net/players/zynx/ |
| Pulsar eS Saturn Pro Red | 50 | 50 | https://prosettings.net/players/kaajak/ |
| Pulsar x LGG Hyperion Soft | 49 | 42 | https://prosettings.net/players/loita/ |
| Pulsar x LGG Saturn Pro Black | 49 | 41 | https://prosettings.net/players/pancada/ |
| Pulsar x LGG Saturn Pro Red | 49 | 41 | https://prosettings.net/players/olizera/ |
| Razer Gigantus Elite | 46 | 46 | https://prosettings.net/players/azury/ |
| Razer Gigantus V2 | 45 | 40 | https://prosettings.net/players/obnoks/ |
| Razer Gigantus V2 Pro Balance | 50 | 48 | https://prosettings.net/players/jotinha/ |
| Razer Gigantus V2 Pro Control | 50 | 48 | https://prosettings.net/players/thebigfiz/ |
| Razer Gigantus V2 Pro Max Control | 50 | 48 | https://prosettings.net/players/heat/ |
| Razer Gigantus V2 Pro Speed | 50 | 48 | https://prosettings.net/players/shalaby/ |
| SONY INZONE MAT-F | 48 | 40 | https://prosettings.net/players/boaster/ |
| Scyrox Kumo | 49 | 42 | https://prosettings.net/players/mwzera/ |
| Solstice Arrival | 49 | 42 | https://prosettings.net/players/tisora/ |
| SteelSeries QcK Heavy Black | 44.5 | 39.7 | https://prosettings.net/players/t3xture/ |
| SteelSeries QcK Heavy Large | 45 | 40 | https://www.newegg.com/p/N82E16826995181 |
| SteelSeries QcK Heavy XXL | 90 | 40 | https://prosettings.net/players/sato/ |
| SteelSeries QcK Large Black | 45 | 40 | https://prosettings.net/players/aslanm4shadow/ |
| SteelSeries QcK Performance Balance | 49 | 42 | https://prosettings.net/players/wolfen/ |
| SteelSeries QcK Performance Speed | 49 | 42 | https://prosettings.net/players/tdawgg/ |
| SteelSeries QcK+ | 45 | 40 | https://prosettings.net/players/paura/ |
| VAXEE PA Angel | 47 | 39 | https://prosettings.net/players/nekky/ |
| VAXEE PA Black | 47 | 39 | https://prosettings.net/players/tennn/ |
| VAXEE PA FunSpark | 47 | 39 | https://prosettings.net/players/joojina/ |
| VAXEE PA Lemonade | 47 | 39 | https://prosettings.net/players/guardy/ |
| VAXEE PA Little Devil | 47 | 39 | https://prosettings.net/players/berlin/ |
| VAXEE PA O22 | 47 | 39 | https://prosettings.net/players/havoc/ |
| VAXEE PA ZYGEN | 47 | 39 | https://prosettings.net/players/d3ffo/ |
| VAXEE PB Black | 47 | 39 | https://prosettings.net/players/qraxs/ |
| VAXEE PC | 46 | 38 | https://prosettings.net/players/mrfalin/ |
| VAXEE PD140+ | 50 | 50 | https://prosettings.net/players/flickless/ |
| VAXEE PD150 | 48 | 40 | https://prosettings.net/players/jonahp/ |
| VAXEE PD151 | 48 | 40 | https://prosettings.net/players/nobody/ |
| VAXEE PD155 | 50 | 50 | https://prosettings.net/players/mazino/ |
| VAXEE PE-K GEh Pink | 51 | 50 | https://prosettings.net/players/splash/ |
| WALLHACK CR-005 | 51 | 44 | https://prosettings.net/players/al0rante/ |
| WALLHACK SP-004 Black | 49 | 43 | https://prosettings.net/players/serena/ |
| WALLHACK SY-001 | 49 | 43 | https://prosettings.net/players/pika/ |
| X-raypad Aqua Control Pro Neon | 50 | 50 | https://prosettings.net/players/ponix/ |
| X-raypad Aqua Control Zero | 45 | 40 | https://prosettings.net/players/trent/ |
| X-raypad Aqua Control+ PORON | 45 | 40 | https://prosettings.net/players/jawgemo/ |
| X-raypad Aqua Control+ Wave Black | 45 | 40 | https://prosettings.net/players/lakia/ |
| X-raypad Aqua Control+ White | 89 | 39.5 | https://prosettings.net/players/adverso/ |
| X-raypad Equate Plus V2 Kiwami Black | 45 | 40 | https://prosettings.net/players/leaf/ |
| X-raypad Origin Pro Cerberus Xsoft | 50 | 45 | https://prosettings.net/players/guuih/ |
| Xraypad Aqua Control II Black | 45 | 40 | https://prosettings.net/players/palla/ |
| Xraypad Aqua Control II Mako VOID | 45 | 40 | https://prosettings.net/players/batujnax/ |
| Xraypad Aqua Control II Sakura Blue | 45 | 40 | https://prosettings.net/players/jzz/ |
| Xraypad Heavy Bee | 50 | 50 | https://prosettings.net/players/skz/ |
| Yuki Aim Hayai | 45 | 40 | https://prosettings.net/players/vanitas/ |
| Yuki Aim x Demon1 Cloth | 50 | 50 | https://prosettings.net/players/demon1/ |
| ZOWIE G-SR | 47 | 39 | https://prosettings.net/players/sirmaza/ |
| ZOWIE G-SR III | 47 | 39 | https://prosettings.net/players/lukxo/ |
| ZOWIE G-SR-SE BLUE II | 47 | 39 | https://prosettings.net/players/loss/ |
| ZOWIE G-SR-SE Bi | 47 | 39 | https://prosettings.net/players/prod/ |
| ZOWIE G-SR-SE Bi II | 47 | 39 | https://prosettings.net/players/fireballops/ |
| ZOWIE G-SR-SE Deep Blue | 47 | 39 | https://prosettings.net/players/redgar/ |
| ZOWIE G-SR-SE Gris | 47 | 39 | https://prosettings.net/players/takas/ |
| ZOWIE G-SR-SE ROUGE II | 47 | 39 | https://prosettings.net/players/yetujey/ |
| ZOWIE G-SR-SE Red | 45 | 39 | https://prosettings.net/players/surf/ |
| ZOWIE G-SR-SE Rouge | 47 | 39 | https://prosettings.net/players/boostio/ |
| ZOWIE H-SR III | 50 | 50 | https://prosettings.net/players/nats/ |
| ZOWIE H-SR-SE BLUE II | 47 | 39 | https://prosettings.net/players/verno/ |
| ZOWIE H-SR-SE ROUGE II | 47 | 39 | https://prosettings.net/players/brawk/ |
| ZOWIE H-TR | 50 | 50 | https://prosettings.net/players/skuba/ |
| Zowie G-SR II | 47 | 39 | https://prosettings.net/players/kryptix/ |

## Statistics

- n with pad width: **995** (ProSettings pages: 264, specs.gg: 731).
- **Spearman correlation of ln cm360 with ln pad width: rho = 0.059** (n = 995; two-sided p ~ 0.0613, t approximation).
  - within `prosettings_player_page`: rho = 0.008 (n = 264)
  - within `specs_gg_profile`: rho = 0.027 (n = 731)
- OLS slope of ln cm360 on ln pad width: 0.009 (intercept 3.936); i.e. a 10% wider pad goes with 0.1% change in cm/360 (descriptive only; pad choice is confounded with player style and region).
- Spearman, ln cm360 with ln mouse weight (rows with weight): rho = -0.065, n = 257.

### Median cm/360 by pad-width tercile (cut points 46.0 and 49.0 cm; groups use <= cut)

| Tercile | pad widths (cm) | n | median cm/360 | IQR |
|---|---|---|---|---|
| low | 42-46 | 396 | 51.9 | 40.8 - 64.0 |
| mid | 47-49 | 489 | 54.4 | 41.9 - 69.3 |
| high | 50-90 | 110 | 54.4 | 46.6 - 68.0 |

### Median cm/360 by exact pad width

| width cm | n | median cm/360 |
|---|---|---|
| 42 | 6 | 56.4 |
| 44.5 | 8 | 53.1 |
| 45 | 238 | 52.5 |
| 45.5 | 5 | 54.4 |
| 46 | 139 | 49.5 |
| 47 | 167 | 53.5 |
| 48 | 6 | 68.5 |
| 49 | 316 | 54.4 |
| 50 | 61 | 54.4 |
| 51 | 4 | 71.5 |
| 89 | 3 | 65.3 |
| 90 | 42 | 51.4 |

### By aim_style

No aim_style values exist in the dataset (0 rows), so no per-group medians can be given.

## Limitations

- **Aim style (wrist/arm) was not found for any player.** ProSettings and specs.gg do not record it. Web searches only returned guide articles and forum threads that talk about wrist vs arm aiming in general or give unsourced percentages; none names players. All `aim_style` fields are null.
- Pad width is the pad's listed size, not the usable travel (desk space, mouse-bungee, how far the player actually swipes). Orientation of the ProSettings dimension fields is inconsistent, so the longer side is used as width.
- ProSettings lists a pad model, and ProSettings sizes can disagree with other listings: Logitech G740 (ProSettings 46 x 37.5 cm vs 460 x 600 mm at retailers) and Artisan Ninja FX Zero "Soft Black"/"TenZ" (spec reads 24 x 21 cm) were set to null width.
- Mostly pros (ProSettings pages) plus self-submitted specs.gg profiles with a sized pad name. Pad choice is self-selected, so any correlation measures association, not the effect of pad size on sensitivity.
- Mouse weight is only available from ProSettings pages (spec of the mouse model, not the player's modification).
- The specs.gg rows are unverified and undated.

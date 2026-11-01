# Pro settings data audit (2026-11-01)

Companion to `pro_data_audit.json`. Checked all 32 rows of `vct_2026_pro_player_settings.md` against ProSettings.net (list page and all 32 player pages), specs.gg, vlr.lol and VLR.gg player pages. Every site returned HTTP 200; nothing was blocked.

## Summary table

| Player | Status | Team in 2026 | DPI / sens / eDPI | ProSettings updated | Conflict | Role (conf) |
|---|---|---|---|---|---|---|
| ZmjjKK | active_pro | EDward Gaming | 800 / 0.395 / 316 | 2026-08-31 | yes | duelist (medium) |
| Smoggy | active_pro | EDward Gaming | 800 / 0.31 / 248 | 2026-10-12 | yes | controller (medium) |
| CHICHOO | active_pro | EDward Gaming | 800 / 0.2 / 160 | 2026-08-03 | yes | sentinel (low) |
| nobody | active_pro | EDward Gaming | 800 / 0.26 / 208 | 2026-09-30 | yes | initiator (medium) |
| benjyfishy | active_pro | Team Heretics | 800 / 0.27 / 216 | 2026-09-08 | yes | sentinel (medium) |
| SirMaza | creator_or_streamer | - | 400 / 0.5 / 200 | 2026-02-23 | no | unverified (unverified) |
| RieNs | active_pro | Team Heretics | 800 / 0.27 / 216 | 2026-07-13 | no | initiator (medium) |
| t3xture | active_pro | Gen.G | 800 / 0.43 / 344 | 2026-10-26 | yes | duelist (medium) |
| Lakia | inactive_or_benched | Gen.G (Dec 2025 - Jul 2026) | 800 / 0.3 / 240 | 2026-07-27 | no | initiator (medium) |
| Karon | active_pro | Gen.G | 800 / 0.2 / 160 | 2026-07-20 | no | controller (medium) |
| ZynX | inactive_or_benched | Gen.G | 1600 / 0.1 / 160 | 2026-07-20 | no | sentinel (low) |
| kiNgg | active_pro | LEVIATAN | 1600 / 0.1 / 160 | 2026-08-10 | no | controller (medium) |
| spikeziN | active_pro | LEVIATAN | 800 / 0.23 / 184 | 2026-08-31 | no | duelist (high) |
| Sato | active_pro | LEVIATAN | 800 / 0.35 / 280 | 2026-10-05 | no | duelist (medium) |
| Neon | active_pro | LEVIATAN | 800 / 0.21 / 168 | 2026-08-10 | no | flex (low) |
| Blowz | active_pro | LEVIATAN | 800 / 0.2 / 160 | 2026-07-13 | no | initiator (medium) |
| trent | active_pro | G2 Esports | 1600 / 0.16 / 256 | 2026-05-26 | yes | initiator (high) |
| babybay | active_pro | G2 Esports | 1600 / 0.11 / 176 | 2026-09-28 | yes | sentinel (medium) |
| leaf | active_pro | G2 Esports | 1600 / 0.08 / 128 | 2026-10-19 | yes | controller (medium) |
| Shanks | creator_or_streamer | - | 800 / 0.22 / 176 | 2026-03-11 | no | unverified (unverified) |
| valyn | inactive_or_benched | G2 Esports (Sep 2023 - Oct 2026) | 1600 / 0.15 / 240 | 2026-02-16 | no | controller (high) |
| jawgemo | active_pro | G2 Esports | 1600 / 0.157 / 251.2 | 2026-10-19 | yes | duelist (high) |
| Alfajer | active_pro | FNATIC | 400 / 0.45 / 180 | 2026-08-31 | yes | duelist (medium) |
| crashies | active_pro | FNATIC | 1600 / 0.1 / 160 | 2026-08-31 | yes | flex (low) |
| Boaster | inactive_or_benched | FNATIC | 800 / 0.2 / 160 | 2026-09-08 | yes | controller (medium) |
| PROD | creator_or_streamer | - | 800 / 0.52 / 416 | 2026-02-04 | no | duelist (low) |
| Cloud | active_pro | FNATIC (from Jun 2026; GIANTX before) | 800 / 0.4 / 320 | 2026-08-31 | yes | initiator (medium) |
| kaajak | active_pro | FNATIC | 1600 / 0.1 / 160 | 2026-10-26 | yes | duelist (medium) |
| Veqaj | inactive_or_benched | FNATIC (Nov 2025 - Oct 2026, inactive from Apr 2026) | 1600 / 0.125 / 200 | 2026-10-05 | no | unverified (unverified) |
| MaKo | inactive_or_benched | KIWOOM DRX (to Oct 2026) | 400 / 0.45 / 180 | 2026-07-20 | yes | controller (medium) |
| Lothar | creator_or_streamer | - | 1600 / 0.2 / 320 | 2025-11-07 | no | unverified (unverified) |
| BeYN | inactive_or_benched | KIWOOM DRX (Jan 2025 - Oct 2026) | 400 / 0.4 / 160 | 2026-07-20 | no | initiator (medium) |

## Counts

- **Status:** 21 active_pro, 7 inactive_or_benched (Lakia, ZynX, valyn, Boaster, Veqaj, MaKo, BeYN), 4 creator_or_streamer (SirMaza, Shanks, PROD, Lothar), 0 coach_or_analyst, 0 unknown.
- **Dataset vs ProSettings:** all 32 rows match ProSettings exactly, on both the list page and the player pages.
- **settings_conflict = true: 16 rows.** These are disagreements with secondary sources only: specs.gg, which has no real update date, and vlr.lol, which is dated March 2026 and unreliable. Two of the specs.gg values cannot be right: kaajak 0.9 and leaf 0.8 sens, both over 1000 eDPI. Smoggy's specs.gg entry gives the same eDPI (248) with a different DPI/sens split. ProSettings is the most recently dated source, so its values should be kept.
- **settings_stale: 0** (every ProSettings date is on or after 2025-07-01). The oldest are Lothar (2025-11-07), PROD (2026-02-04), valyn (2026-02-16), SirMaza (2026-02-23) and Shanks (2026-03-11).
- **Duplicates: 0.** All 32 real names and VLR ids are distinct. I resolved the ambiguous handles by matching the real name on ProSettings to the one on VLR: Neon = Bruno Rodriguez, Cloud = Kirill Nehozhin, PROD = Connor Moran, leaf = Nathan Orf, nobody = Wang Senxu, Karon = Kim Won-tae (VLR id 34974), Sato = Eduardo Sato, Lothar = Jakub Szygulski. The specs.gg `kingg` profile belongs to someone else and is not used.
- **Roles:** carried over from pro_roles.md with no changes. vlr.lol's role labels were not trusted.

## Recommendation: exclude these from a "current active pro" comparison group

**Always exclude (not pro players): 4 rows**
- **SirMaza:** content creator for Team Heretics, never a VCT player (ProSettings bio; VLR shows no team).
- **Shanks:** streamer and former pro. His last pro team was Rise in 2022.
- **PROD:** Fnatic content creator (Fnatic community post), not on Fnatic's VCT roster. ProSettings' 'Fnatic' label and 'professional player' bio are misleading.
- **Lothar:** DRX content creator, former Fortnite pro and broadcast analyst.

**Exclude if the group means "on an active roster today": 7 rows.** Keep them if it means "played in VCT 2026".
- **ZynX:** out for the rest of 2026 with a wrist injury (inactive since June).
- **Boaster:** inactive at FNATIC since September 2026 and exploring other teams.
- **Veqaj:** benched at FNATIC from April to October 2026 and now on Mandatory (Challengers). He is on a roster again but was barely active in 2026.
- **Lakia, valyn, MaKo, BeYN:** free agents after July–October 2026 departures. They played the 2026 season, so their settings are still valid pro data points.

**Keep all 21 active_pro rows.** Their ProSettings values should be the reference values. Some conflict with specs.gg or vlr.lol, but those sources are older or undated.

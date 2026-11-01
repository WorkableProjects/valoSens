# Agent mechanics for sensitivity recommendation (2026-11-01)

Data: `agent_mechanics.json`, with 30 agents and their C/Q/E/X abilities (plus Hush's passive).

## Roster
The 30 playable agents come from https://playvalorant.com/en-us/agents/. I cross-checked them against Riot's official wiki (https://wiki.playvalorant.com/en-us/Agents). The agents added in 2025–2026:
- Tejo (Initiator, v10.00, 2025-01-08)
- Waylay (Duelist, v10.04, 2025-03-05)
- Veto (Sentinel, v11.07b, 2025-10-07)
- Miks (Controller, v12.05, 2026-03-18)
- Hush (Duelist, v13.09, 2026-10-27). Her Riot wiki page is marked "under construction".

Ability stats come from each agent's page on Riot's official wiki. Where the wiki gives no number (dash distances, teleport ranges for Omen and Waylay, Tour de Force zoom, Blade Storm projectile type), the value is `null` or the note is labelled ESTIMATE.

## Key findings
- **Teleports and repositions** (players usually need to re-orient afterwards): Yoru Gatecrash and Drift, Omen Shrouded Step and From the Shadows, Chamber Rendezvous (18 m), Veto Crosscut (30 m), Waylay Refract. Every `reorient_deg` range is an ESTIMATE, usually 45–180°. No source puts a number on it.
- **Dashes and slides that keep the camera direction**: Jett Tailwind (0.45 s), Waylay Lightspeed (2 × 0.45 s), Neon High Gear (+35% speed) and slide, Raze Blast Pack, Reyna Dismiss (12 m/s), Hush Flow.
- **Weapon abilities**:
  - Chamber Headhunter: the only documented zoom (ADS x1.5). It does 159 damage to the head and 55 to the body.
  - Chamber Tour de Force: does 255 to the head and 150 to the body. Its zoom is not documented.
  - Jett Blade Storm: 150 head / 50 body, so it needs headshots.
  - Neon Overdrive: a continuous beam with a 3.0 head multiplier. It is a tracking weapon.
  - Raze Showstopper: does splash damage.
  - Sova Hunter's Fury: 80 damage per blast.
  - Iso Kill Contract: a 1v1 duel. Iso's Double Tap also requires shooting orbs.
- **Guided abilities** (steered toward the crosshair or piloted in first person): Phoenix Blaze, Harbor High Tide, Skye Guiding Light and Trailblazer, Fade Prowler, Gekko Thrash, Sova Owl Drone, Cypher Spycam, Tejo Stealth Drone, Jett Cloudburst, and Hush Flashbulb, Displacement and Suspension. Gekko's Wingman and Dizzy are not steered.
- **Map-targeted abilities** use a tactical-map cursor rather than first-person aim: Brimstone E/X, Omen X, Clove E, Tejo E/X, Miks E. Omen's Dark Cover is aimed in first person, not on the map. The Riot wiki does not say how Astra places her stars.

## Sensitivity settings
Valorant has these sensitivity settings:
- Sensitivity: Aim
- Scoped Sensitivity Multiplier
- ADS Sensitivity Multiplier. I only found this one in third-party guides and could not find the Riot patch that added it.

I found no per-ability or per-drone sensitivity setting in Riot's wiki, Riot's patch notes or settings guides. Guided and piloted abilities therefore use the normal look sensitivity. This is an inference, because Riot never states it. Patch 9.02 added a console-only option to make steering a toggle for High Tide, Blaze and Guiding Light; it changes how the button works, not the sensitivity. Riot does not say which multiplier applies to Chamber's zoom.

## Caveats
- Engagement profiles are mostly ESTIMATE based on role descriptions. The Operator pattern for Jett and Chamber is cited to a dodge.gg guide, which is opinion rather than usage data.
- I found no per-agent weapon usage statistics.
- Hush and Miks are too new for guide-based engagement data.

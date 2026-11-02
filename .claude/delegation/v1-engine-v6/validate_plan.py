#!/usr/bin/env python3
"""Validate a plan-and-delegate plan.json and print the wave schedule.

Usage:
    python validate_plan.py path/to/plan.json [--agents-dir .claude/agents]

Checks:
  errors   - malformed fields, duplicate ids, unknown dependencies, cycles,
             missing spec files, tasks in the same wave owning overlapping files
  warnings - missing verify_cmd, writer with empty owns, reads owned by a
             concurrent task, agent definition not installed, wide waves

Exit code 0 if no errors, 1 otherwise.
"""
import argparse
import json
import os
import sys

BUILTIN_AGENTS = {
    "opus",
    "executor-sonnet",
    "executor-haiku",
    "reviewer-sonnet",
    "explorer-haiku",
}
READ_ONLY_AGENTS = {"reviewer-sonnet", "explorer-haiku"}
MAX_WAVE_WIDTH = 5


def static_prefix(pattern):
    """Part of a glob before the first wildcard, normalized without trailing slash."""
    p = pattern.replace("\\", "/")
    cut = len(p)
    for ch in "*?[":
        i = p.find(ch)
        if i != -1:
            cut = min(cut, i)
    return p[:cut].rstrip("/")


def patterns_overlap(a, b):
    """Conservative overlap test for two globs: true if one's static prefix
    contains the other's (so they could match the same path)."""
    pa, pb = static_prefix(a), static_prefix(b)
    if pa == pb:
        return True
    if pa == "" or pb == "":
        return True
    return pa.startswith(pb + "/") or pb.startswith(pa + "/") or (
        # a literal file inside a directory glob, e.g. src/api/** vs src/api/x.ts
        pa.startswith(pb) and "*" in b and "/" not in pa[len(pb):]
    ) or (pb.startswith(pa) and "*" in a and "/" not in pb[len(pa):])


def any_overlap(owns_a, owns_b):
    hits = []
    for a in owns_a:
        for b in owns_b:
            if patterns_overlap(a, b):
                hits.append((a, b))
    return hits


def compute_waves(tasks, errors):
    by_id = {t["id"]: t for t in tasks}
    remaining = set(by_id)
    done = set()
    waves = []
    while remaining:
        ready = sorted(t for t in remaining if set(by_id[t]["depends_on"]) <= done)
        if not ready:
            errors.append(
                "Dependency cycle among: " + ", ".join(sorted(remaining))
            )
            break
        waves.append(ready)
        done.update(ready)
        remaining.difference_update(ready)
    return waves


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plan")
    ap.add_argument("--agents-dir", default=".claude/agents")
    args = ap.parse_args()

    errors, warnings = [], []

    try:
        with open(args.plan) as f:
            plan = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(f"ERROR: cannot read plan: {e}")
        return 1

    tasks = plan.get("tasks")
    if not isinstance(tasks, list) or not tasks:
        print("ERROR: plan.json needs a non-empty 'tasks' list")
        return 1

    base_dir = plan.get("base_dir") or os.path.dirname(os.path.abspath(args.plan))

    # --- per-task checks -------------------------------------------------
    seen = set()
    for i, t in enumerate(tasks):
        tid = t.get("id")
        label = tid or f"tasks[{i}]"
        if not tid:
            errors.append(f"{label}: missing 'id'")
            continue
        if tid in seen:
            errors.append(f"{tid}: duplicate id")
        seen.add(tid)
        for field in ("title", "agent"):
            if not t.get(field):
                errors.append(f"{tid}: missing '{field}'")
        t.setdefault("depends_on", [])
        t.setdefault("owns", [])
        t.setdefault("reads", [])
        for field in ("depends_on", "owns", "reads"):
            if not isinstance(t[field], list):
                errors.append(f"{tid}: '{field}' must be a list")
                t[field] = []

        agent = t.get("agent", "")
        if agent and agent != "opus":
            spec = t.get("spec")
            if not spec:
                errors.append(f"{tid}: missing 'spec' (required unless agent is opus)")
            else:
                spec_path = spec if os.path.isabs(spec) else os.path.join(base_dir, spec)
                if not os.path.isfile(spec_path):
                    errors.append(f"{tid}: spec file not found: {spec_path}")
        if agent not in READ_ONLY_AGENTS and not t["owns"]:
            warnings.append(f"{tid}: writer task has empty 'owns' (what may it edit?)")
        if agent in READ_ONLY_AGENTS and t["owns"]:
            warnings.append(f"{tid}: read-only agent '{agent}' has 'owns' set")
        if not t.get("verify_cmd") and agent != "explorer-haiku":
            warnings.append(f"{tid}: no 'verify_cmd' - how will you check it?")
        if agent and agent not in BUILTIN_AGENTS:
            agent_file = os.path.join(args.agents_dir, f"{agent}.md")
            if not os.path.isfile(agent_file):
                warnings.append(f"{tid}: custom agent '{agent}' not found at {agent_file}")
        elif agent in BUILTIN_AGENTS and agent != "opus":
            agent_file = os.path.join(args.agents_dir, f"{agent}.md")
            if not os.path.isfile(agent_file):
                warnings.append(
                    f"{tid}: agent '{agent}' is not installed in {args.agents_dir} "
                    "(run scripts/install_agents.sh)"
                )

    ids = {t["id"] for t in tasks if t.get("id")}
    for t in tasks:
        for d in t.get("depends_on", []):
            if d not in ids:
                errors.append(f"{t.get('id')}: depends on unknown task '{d}'")
            if d == t.get("id"):
                errors.append(f"{t.get('id')}: depends on itself")

    if errors:
        report(errors, warnings, [], tasks)
        return 1

    # --- waves -------------------------------------------------------------
    waves = compute_waves(tasks, errors)
    by_id = {t["id"]: t for t in tasks}

    for n, wave in enumerate(waves, start=1):
        if len(wave) > MAX_WAVE_WIDTH:
            warnings.append(
                f"wave {n}: {len(wave)} parallel tasks (> {MAX_WAVE_WIDTH}); "
                "consider splitting into sub-waves"
            )
        for i in range(len(wave)):
            for j in range(i + 1, len(wave)):
                a, b = by_id[wave[i]], by_id[wave[j]]
                for pa, pb in any_overlap(a["owns"], b["owns"]):
                    errors.append(
                        f"wave {n}: {a['id']} and {b['id']} run in parallel but own "
                        f"overlapping paths ('{pa}' vs '{pb}'); serialize with depends_on "
                        "or split ownership"
                    )
        for a in (by_id[x] for x in wave):
            for b in (by_id[x] for x in wave):
                if a["id"] == b["id"]:
                    continue
                for r in a["reads"]:
                    for o in b["owns"]:
                        if patterns_overlap(r, o):
                            warnings.append(
                                f"wave {n}: {a['id']} reads '{r}' which {b['id']} "
                                "is editing in the same wave"
                            )

    report(errors, warnings, waves, tasks)
    return 1 if errors else 0


def report(errors, warnings, waves, tasks):
    by_id = {t["id"]: t for t in tasks if t.get("id")}
    if waves:
        print("Wave schedule")
        print("-------------")
        for n, wave in enumerate(waves, start=1):
            par = "parallel" if len(wave) > 1 else "single"
            print(f"Wave {n} ({par}):")
            for tid in wave:
                t = by_id[tid]
                deps = ",".join(t["depends_on"]) or "-"
                print(f"  {tid}  [{t['agent']}]  {t['title']}  (after: {deps})")
        print()
    for w in warnings:
        print(f"WARNING: {w}")
    for e in errors:
        print(f"ERROR: {e}")
    if errors:
        print(f"\nFAILED: {len(errors)} error(s), {len(warnings)} warning(s)")
    else:
        print(f"OK: {len(tasks)} task(s), {len(waves)} wave(s), {len(warnings)} warning(s)")


if __name__ == "__main__":
    sys.exit(main())

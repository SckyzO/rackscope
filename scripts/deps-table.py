#!/usr/bin/env python3
"""
deps-table.py — Dependency update status for Rackscope.

Queries PyPI, npm registry, and GitHub API to compare pinned versions
against latest available. No external dependencies required (stdlib only).

Usage:
    python3 scripts/deps-table.py
    GITHUB_TOKEN=ghp_xxx python3 scripts/deps-table.py
"""

import json
import os
import re
import sys
import tomllib
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError

ROOT = Path(__file__).resolve().parent.parent

# ── ANSI ─────────────────────────────────────────────────────────────────────

G  = "\033[32m"   # green
Y  = "\033[33m"   # yellow
R  = "\033[31m"   # red
C  = "\033[36m"   # cyan
B  = "\033[1m"    # bold
D  = "\033[2m"    # dim
RE = "\033[0m"    # reset

# ── HTTP ──────────────────────────────────────────────────────────────────────

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")


def _fetch(url: str, headers: dict | None = None) -> dict | list | None:
    try:
        req = Request(url, headers={"User-Agent": "rackscope-deps-table/1.0", **(headers or {})})
        with urlopen(req, timeout=12) as r:
            return json.loads(r.read())
    except Exception:
        return None


def _gh(path: str) -> dict | list | None:
    h = {"Authorization": f"Bearer {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}
    return _fetch(f"https://api.github.com/{path}", headers=h)


# ── Version helpers ───────────────────────────────────────────────────────────

_STRIP = re.compile(r"^[~^>=<!vV]+")
_ANSI  = re.compile(r"\033\[[0-9;]*m")


def _clean(v: str) -> str:
    """Strip constraint operators, take first part before comma."""
    return _STRIP.sub("", v.split(",")[0]).strip()


def _vparts(v: str) -> list[int]:
    parts = []
    for p in re.split(r"[\.\-]", _clean(v))[:4]:
        try:
            parts.append(int(p))
        except ValueError:
            pass
    return parts


def _is_newer(latest: str, current: str) -> bool:
    try:
        return _vparts(latest) > _vparts(current)
    except Exception:
        return latest.strip() != current.strip()


def _icon(current: str, latest: str) -> str:
    if not latest or latest == "?":
        return f"{D}?{RE}"
    c = _clean(current)
    l = _clean(latest)
    if c == l:
        return f"{G}✓{RE}"
    return f"{Y}↑{RE}" if _is_newer(latest, current) else f"{G}✓{RE}"


# ── Registries ────────────────────────────────────────────────────────────────

def _pypi_latest(pkg: str) -> str:
    data = _fetch(f"https://pypi.org/pypi/{pkg}/json")
    return (data or {}).get("info", {}).get("version", "?")  # type: ignore[union-attr]


def _npm_latest(pkg: str) -> str:
    encoded = pkg.replace("/", "%2F")
    data = _fetch(f"https://registry.npmjs.org/{encoded}/latest")
    return (data or {}).get("version", "?")  # type: ignore[union-attr]


def _gh_action_latest(owner_repo: str) -> tuple[str, str]:
    """Return (latest_tag, latest_sha_short)."""
    rel = _gh(f"repos/{owner_repo}/releases/latest")
    if not rel or not isinstance(rel, dict):
        return ("?", "?")
    tag = rel.get("tag_name", "?")
    ref = _gh(f"repos/{owner_repo}/git/refs/tags/{tag}")
    if not ref or not isinstance(ref, dict):
        return (tag, "?")
    obj = ref.get("object", {})
    sha = obj.get("sha", "?")
    # Dereference annotated tags
    if obj.get("type") == "tag":
        deref = _gh(f"repos/{owner_repo}/git/tags/{sha}")
        if deref and isinstance(deref, dict):
            sha = deref.get("object", {}).get("sha", sha)
    return (tag, sha[:7] if sha != "?" else "?")


# ── Parsers ───────────────────────────────────────────────────────────────────

def _parse_python() -> list[tuple[str, str, str]]:
    """Returns [(name, min_version, group)]."""
    with open(ROOT / "pyproject.toml", "rb") as f:
        data = tomllib.load(f)
    deps = []
    for d in data.get("project", {}).get("dependencies", []):
        m = re.match(r"^([A-Za-z0-9_\-\.]+)(.*)", d.strip())
        if m:
            raw = m.group(2).strip()
            ver = _clean(raw) if raw else "?"
            deps.append((m.group(1).lower(), ver, "prod"))
    for d in data.get("project", {}).get("optional-dependencies", {}).get("dev", []):
        m = re.match(r"^([A-Za-z0-9_\-\.]+)(.*)", d.strip())
        if m:
            raw = m.group(2).strip()
            ver = _clean(raw) if raw else "?"
            deps.append((m.group(1).lower(), ver, "dev"))
    return deps


def _parse_npm() -> list[tuple[str, str, str]]:
    """Returns [(name, version, group)]."""
    with open(ROOT / "frontend" / "package.json") as f:
        data = json.load(f)
    deps = []
    for name, ver in data.get("dependencies", {}).items():
        deps.append((name, _clean(ver), "prod"))
    for name, ver in data.get("devDependencies", {}).items():
        deps.append((name, _clean(ver), "dev"))
    return deps


def _parse_actions() -> list[tuple[str, str, str]]:
    """Returns [(owner/repo, sha_short, comment_tag)] — unique entries."""
    seen: dict[str, tuple[str, str]] = {}
    pattern = re.compile(
        r"uses:\s+([\w\-\.]+/[\w\-\.]+)@([a-f0-9]{40})\s*(?:#\s*(.+))?"
    )
    for wf in (ROOT / ".github" / "workflows").glob("*.yml"):
        for m in pattern.finditer(wf.read_text()):
            action = m.group(1)
            sha    = m.group(2)[:7]
            tag    = (m.group(3) or "").strip()
            if action not in seen:
                seen[action] = (sha, tag)
    return [(k, v[0], v[1]) for k, v in sorted(seen.items())]


# ── Table renderer ────────────────────────────────────────────────────────────

def _vis(s: str) -> int:
    """Visible length (strip ANSI escape codes)."""
    return len(_ANSI.sub("", s))


def _pad(s: str, w: int) -> str:
    """Pad string to visible width w."""
    return s + " " * max(0, w - _vis(s))


def _table(headers: list[str], rows: list[list[str]]) -> None:
    cols = len(headers)
    widths = [_vis(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            if i < cols:
                widths[i] = max(widths[i], _vis(cell))

    def hline(l: str, m: str, r: str, j: str) -> str:
        return l + j.join("─" * (w + 2) for w in widths) + r

    print(hline("┌", "", "┐", "┬"))
    header_line = "│" + "│".join(f" {B}{_pad(h, widths[i])}{RE} " for i, h in enumerate(headers)) + "│"
    print(header_line)
    print(hline("├", "", "┤", "┼"))
    for row in rows:
        line = "│" + "│".join(f" {_pad(row[i] if i < len(row) else '', widths[i])} " for i in range(cols)) + "│"
        print(line)
    print(hline("└", "", "┘", "┴"))


# ── Sections ─────────────────────────────────────────────────────────────────

def _section_python() -> int:
    print(f"\n{B}{C}▸ Python{RE}")
    deps = _parse_python()
    with ThreadPoolExecutor(max_workers=10) as ex:
        fut = {ex.submit(_pypi_latest, name): (name, ver, grp) for name, ver, grp in deps}
        results = []
        for f in as_completed(fut):
            name, ver, grp = fut[f]
            results.append((name, ver, grp, f.result()))

    results.sort(key=lambda x: (0 if x[2] == "prod" else 1, x[0]))

    rows = []
    upgrades = 0
    for name, ver, grp, latest in results:
        icon = _icon(ver, latest)
        lbl = f"{D}dev{RE}" if grp == "dev" else "   "
        rows.append([lbl, name, ver, latest if latest else "?", icon])
        if _ANSI.sub("", icon) == "↑":
            upgrades += 1

    _table(["", "Package", "Pinned (min)", "Latest", ""], rows)
    msg = f"{Y}{upgrades} upgrade(s) available{RE}" if upgrades else f"{G}All up to date{RE}"
    print(f"  {msg}")
    return upgrades


def _section_npm() -> int:
    print(f"\n{B}{C}▸ npm{RE}")
    deps = _parse_npm()
    with ThreadPoolExecutor(max_workers=10) as ex:
        fut = {ex.submit(_npm_latest, name): (name, ver, grp) for name, ver, grp in deps}
        results = []
        for f in as_completed(fut):
            name, ver, grp = fut[f]
            results.append((name, ver, grp, f.result()))

    results.sort(key=lambda x: (0 if x[2] == "prod" else 1, x[0]))

    rows = []
    upgrades = 0
    for name, ver, grp, latest in results:
        icon = _icon(ver, latest)
        lbl = f"{D}dev{RE}" if grp == "dev" else "   "
        rows.append([lbl, name, ver, latest if latest else "?", icon])
        if _ANSI.sub("", icon) == "↑":
            upgrades += 1

    _table(["", "Package", "Pinned (min)", "Latest", ""], rows)
    msg = f"{Y}{upgrades} upgrade(s) available{RE}" if upgrades else f"{G}All up to date{RE}"
    print(f"  {msg}")
    return upgrades


def _section_actions() -> int:
    print(f"\n{B}{C}▸ GitHub Actions{RE}")
    actions = _parse_actions()
    with ThreadPoolExecutor(max_workers=8) as ex:
        fut = {ex.submit(_gh_action_latest, name): (name, sha, tag) for name, sha, tag in actions}
        results = []
        for f in as_completed(fut):
            name, sha, tag = fut[f]
            latest_tag, latest_sha = f.result()
            results.append((name, sha, tag, latest_tag, latest_sha))

    results.sort(key=lambda x: x[0])

    rows = []
    upgrades = 0
    for name, sha, tag, latest_tag, latest_sha in results:
        current_label = tag if tag else sha
        if latest_sha == "?":
            icon = f"{D}?{RE}"
        elif latest_sha == sha:
            icon = f"{G}✓{RE}"
        else:
            icon = f"{Y}↑{RE}"
            upgrades += 1
        rows.append([name, current_label, latest_tag, icon])

    _table(["Action", "Pinned", "Latest", ""], rows)
    if not GITHUB_TOKEN:
        print(f"  {D}Tip: set GITHUB_TOKEN to avoid rate limiting{RE}")
    msg = f"{Y}{upgrades} action(s) possibly outdated{RE}" if upgrades else f"{G}All up to date{RE}"
    print(f"  {msg}")
    return upgrades


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print(f"\n{B}Rackscope — Dependency Status{RE}")
    print(f"{D}Querying PyPI, npm registry and GitHub API…{RE}")

    py_up  = _section_python()
    npm_up = _section_npm()
    gh_up  = _section_actions()

    total = py_up + npm_up + gh_up
    print(f"\n{'─' * 60}")
    if total == 0:
        print(f"{G}{B}All dependencies up to date.{RE}")
    else:
        print(f"{Y}{B}{total} item(s) have updates available.{RE}")
    print()


if __name__ == "__main__":
    main()

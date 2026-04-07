## Description

<!-- What does this PR do and why? Link to the issue. -->

Closes #

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Documentation
- [ ] Chore / CI

---

## Checklist

### Development
- [ ] New tests written for the added/changed code
- [ ] No new `TODO` or `FIXME` left without a linked issue
- [ ] Backward compatibility preserved — existing YAML configs still load without changes
- [ ] All new config keys have a corresponding Pydantic field (not silently ignored)

### UI changes (skip if no frontend changes)
- [ ] Page structure follows `frontend/src/app/pages/templates/EmptyPage.tsx`
- [ ] Components sourced from `frontend/src/app/pages/templates/TemplateDefaultPage.tsx`
- [ ] No external UI library introduced (Tailwind + lucide-react only)
- [ ] Dark mode tested
- [ ] `/frontend-design` skill used for new pages

### Quality gates (run locally before pushing)
- [ ] `make lint` — 0 errors, 0 warnings (9 linters)
- [ ] `make typecheck` — mypy 0 errors
- [ ] `make test` — all tests pass (no regression)
- [ ] `make coverage` — coverage ≥ 70%
- [ ] `act push --job backend --pull=false` — CI backend passes locally
- [ ] `act push --job frontend --pull=false` — CI frontend passes locally

### Manual testing
- [ ] Tested on dev with `make use CONFIG=...` + visual verification
- [ ] Cross-profile tested — `homelab`, `hpc-cluster`, `exascale` still work after this change
- [ ] `make security` — no new findings (bandit + pip-audit + npm audit)
- [ ] Security review done (if change touches API endpoints, auth, filesystem, or file upload)

### Integration
- [ ] CHANGELOG updated (for user-facing changes)
- [ ] `docs/_status.md` updated in `rackscope_documentation` (if feature status changed)
- [ ] Documentation PR opened or updated — see section below

---

## Documentation

> Documentation lives in a separate repository: **[SckyzO/rackscope-documentation](https://github.com/SckyzO/rackscope-documentation)**
> If this PR requires doc changes, open a matching PR there and link it below.

**Doc PR:** <!-- link to the rackscope-documentation PR, or "N/A" -->

| Changed | Doc file in `rackscope-documentation` |
|---------|---------------------------------------|
| New UI page | `docs/user-guide/*.md` |
| New config key | `docs/admin-guide/app-yaml.md` |
| New API endpoint | `docs/api-reference/*.md` |
| Simulator change | `docs/plugins/simulator.md` |
| Slurm plugin | `docs/plugins/slurm.md` |
| Architecture change | `docs/architecture/*.md` |

<!-- Remove rows that don't apply. -->

---

## Screenshots (UI changes only)

<!-- Before / After screenshots or screen recording -->

---

## Rollback plan (risky changes only)

<!-- How to revert if this breaks in production? -->

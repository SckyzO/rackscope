# Simulator & Demo Mode Configuration

## Current Issue: Redundancy

There are currently **two separate settings** that control simulator functionality:

### 1. `features.demo` (in `config/app.yaml`)
```yaml
features:
  demo: false  # Enable demo mode
```

### 2. `plugins.simulator.enabled` (in `config/app.yaml`)
```yaml
plugins:
  simulator:
    enabled: true  # Enable simulator plugin
```

**Problem:** These two settings are redundant and can be confusing.

---

## Proposed Solution

**Option A: Make `features.demo` control the plugin**
- When `features.demo = true` → automatically enable `plugins.simulator.enabled`
- When `features.demo = false` → automatically disable `plugins.simulator.enabled`
- Remove `plugins.simulator.enabled` from UI (Settings page)
- Keep only "Demo Mode" toggle in Settings → Features section

**Option B: Remove `features.demo` entirely**
- Use only `plugins.simulator.enabled`
- Rename to "Demo Mode" in UI for clarity
- All simulator control happens in Plugins section

---

## Recommended Approach: Option A

**Rationale:**
- "Demo Mode" is more user-friendly terminology
- Aligns with other feature flags (notifications, playlist, offline)
- Plugin system remains flexible (can have simulator enabled for other purposes than demo)

**Implementation:**
1. Backend: When loading config, if `features.demo = true`, force `plugins.simulator.enabled = true`
2. Frontend Settings: Only show "Demo Mode" toggle (in Features section)
3. When user toggles Demo Mode, update both `features.demo` and `plugins.simulator.enabled`

**Code Location:**
- Backend logic: `src/rackscope/model/config.py` (AppConfig validation)
- Frontend UI: `frontend/src/pages/SettingsPage.tsx`

---

## Current Behavior

- `features.demo` is defined but **not used** anywhere in the codebase
- `plugins.simulator.enabled` controls whether SimulatorPlugin is registered and active
- Both can be set independently (causing confusion)

---

## Migration Path

1. **Short term**: Document the redundancy (this file)
2. **Medium term**: Implement Option A linking
3. **Long term**: Deprecate `features.demo` or merge functionality

# Phase 10 — TanStack Query v5 Migration

**Status**: 📅 PLANNED (post-v1.0)
**Priority**: HIGH
**Duration estimate**: 1 week
**Risk**: MEDIUM (frontend only, no backend changes)

---

## Why

The frontend uses a manual `useEffect + fetch + useState` pattern with a custom localStorage cache (`fetchWithCache`). Problems:

- Code duplicated across 32 files (loading/error/data state)
- Manual polling via `setInterval` in 4 places
- Fragile cache invalidation (`writeCache(key, null)` after every mutation)
- Frontend tests are very hard to write on this pattern (mocking `global.fetch` + async state)
- No request deduplication (3 components = 3 identical HTTP requests)

TanStack Query v5 (only version compatible with React 19) solves all of this.

---

## Scope

- **32 files** importing from `api.ts`
- **~36 useQuery** instances (read endpoints)
- **~24 useMutation** instances (POST/PUT/DELETE)
- **4 polling sources** replaced by `refetchInterval`
- **30+ localStorage cache keys** replaced by TanStack in-memory + persist plugin

---

## Key design decisions (already resolved)

### Error handling: Toast + persistent banner

When a query fails, show a **fixed orange banner** at the top of the app (not a disappearing toast):
```
┌────────────────────────────────────────────────────────┐
│ ⚠  Connection lost · Last update: 2min ago   [Retry]  │
└────────────────────────────────────────────────────────┘
```
- Banner stays until connection is restored
- Stale data remains visible underneath
- "Last update X ago" tells operator how old the data is
- Retry button forces immediate refetch
- Auto-disappears when connection comes back

This is the standard NOC tool behavior (same as Prometheus/Grafana).

### Offline / localStorage persistence

Use `@tanstack/react-query-persist-client` with localStorage adapter.

Preserves current Rackscope behavior: data survives F5 and backend restarts.

```ts
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'rackscope.query-cache',
})
```

---

## Architecture

### New files to create

```
frontend/src/
├── lib/
│   ├── queryClient.ts          ← QueryClient singleton + default config
│   └── queryKeys.ts            ← Type-safe query key factory
└── hooks/
    ├── useTopologyQueries.ts   ← useRooms, useRoomLayout, useRack, useSites
    ├── useTelemetryQueries.ts  ← useRoomState, useRackState, useDeviceMetrics, useAlerts, useStats
    ├── useCatalogQueries.ts    ← useCatalog
    ├── useChecksQueries.ts     ← useChecks, useChecksFiles, useChecksFile
    ├── useConfigQueries.ts     ← useConfig
    ├── useSimulatorQueries.ts  ← useSimulatorOverrides, useSimulatorScenarios
    ├── useSlurmQueries.ts      ← useSlurmSummary, useSlurmPartitions, useSlurmNodes, useSlurmRoomNodes
    ├── usePluginsQueries.ts    ← usePluginsMenu (staleTime:0, refetchInterval:30s)
    ├── useTopologyMutations.ts ← 14 mutations (site/room/aisle/rack/device CRUD)
    ├── useCatalogMutations.ts  ← createTemplate, updateTemplate, deleteDeviceTemplate
    ├── useChecksMutations.ts   ← updateChecksFile
    ├── useConfigMutations.ts   ← updateConfig, restartBackend
    └── useSimulatorMutations.ts← addOverride, deleteOverride, clearOverrides
```

### Cache invalidation graph

```
createSite / deleteSite         → invalidate ['sites'], ['rooms']
createRoom / deleteRoom         → invalidate ['rooms']
createRoomAisles / deleteAisle  → invalidate ['rooms']
updateRoomAisles                → invalidate ['rooms'], ['room', id, 'layout']
createRack / updateRackTemplate → invalidate ['rooms'], ['rack', id]
addRackDevice / updatePosition  → invalidate ['rooms'], ['rack', id]
deleteRackDevice                → invalidate ['rooms'], ['rack', id]
createTemplate / updateTemplate → invalidate ['catalog']
updateChecksFile                → invalidate ['checks', 'files']
addSimulatorOverride            → invalidate ['simulator', 'overrides']
```

### Default staleTime / refetchInterval per query type

| Query | staleTime | refetchInterval |
|-------|-----------|-----------------|
| Room state | 5s | 60s |
| Rack state + metrics | 5s | 30s |
| Device metrics | 60s | — |
| Slurm data | 5s | 30s |
| Plugin menu | 0 | 30s |
| Config | 60s | — |
| Catalog / checks | 5min | — |
| Sites / rooms | 60s | — |

---

## Migration plan (8 commits)

```
Phase 0: feat(frontend): add TanStack Query v5 infrastructure
         → queryClient.ts, queryKeys.ts, QueryClientProvider in main.tsx,
           PersistQueryClientProvider with localStorage, ReactQueryDevtools (dev only)

Phase 1: feat(frontend): add query and mutation hooks library
         → Create all hooks/use*.ts files (no component changes yet)

Phase 2: refactor(contexts): migrate AppConfigContext + PluginsMenuContext to useQuery
         → Remove useState+useEffect+setInterval from both contexts

Phase 3: refactor(views): migrate physical views to useQuery
         → useRackData.ts, RackPage, RoomPage, DevicePage, WorldMapPage, ClusterPage

Phase 4: refactor(slurm): migrate Slurm pages to useQuery
         → SlurmWallboardPage, SlurmOverviewPage, SlurmNodesPage, SlurmPartitionsPage, SlurmAlertsPage

Phase 5: refactor(editors): migrate editors to useMutation
         → TopologyEditorPage, RackEditorPage, TemplatesEditorPage, ChecksEditorPage,
           DatacenterEditorPage, DatacenterWizard, RoomEditorCanvas

Phase 6: refactor(settings): migrate settings and components
         → SettingsPage, useSettingsConfig, PluginsSettingsSection,
           AlertToastContainer, AppHeader (replace isStale/getLastSuccessTs with useIsFetching)
         → Add ConnectionLostBanner component (persistent error banner)

Phase 7: refactor(api): remove fetchWithCache cache layer
         → Delete: fetchWithCache, readCache, writeCache, markSuccess, isStale, getLastSuccessTs
         → Keep: apiFetch (auth injection), logClientError, getErrorLog, clearErrorLog
         → Keep all GET/mutation functions (they become queryFn/mutationFn bodies)
```

---

## Notes TanStack v5 vs v4 (breaking changes)

- `onError` removed from queryOptions → handle via `isError` / `error` in component
- `cacheTime` renamed → `gcTime`
- `keepPreviousData` → `placeholderData: keepPreviousData`
- `useMutation.isLoading` → `useMutation.isPending`
- `QueryCache` events: `error` callback available globally for the banner

---

## Connection Lost Banner — implementation sketch

```tsx
// components/ConnectionLostBanner.tsx
import { useIsFetching, useQueryClient } from '@tanstack/react-query'

export function ConnectionLostBanner() {
  const [lastSuccess, setLastSuccess] = useState<Date | null>(null)
  const [isLost, setIsLost] = useState(false)

  // Listen to QueryCache errors globally
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.status === 'error') {
        setIsLost(true)
      }
      if (event.type === 'updated' && event.query.state.status === 'success') {
        setLastSuccess(new Date())
        setIsLost(false)
      }
    })
    return unsubscribe
  }, [])

  if (!isLost) return null

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] bg-amber-500 text-white px-4 py-2 flex items-center gap-3">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium">
        Connection lost · Last update: {formatRelative(lastSuccess)}
      </span>
      <button onClick={() => queryClient.refetchQueries()} className="ml-auto text-sm underline">
        Retry
      </button>
    </div>
  )
}
```

---

## Validation checklist

```bash
make build        # all 4 images build cleanly
make lint         # ruff + eslint + stylelint + prettier
make test         # 362/362 (backend unchanged)
make typecheck    # 0 mypy errors

# UI smoke tests:
# ✅ Dashboard loads
# ✅ Room view loads and auto-refreshes
# ✅ Rack view loads and auto-refreshes
# ✅ Slurm wallboard loads and polls
# ✅ Topology editor: create site → list updates
# ✅ Settings save → config refreshes
# ✅ Disconnect backend → banner appears, data stays visible
# ✅ Reconnect → banner disappears
# ✅ Page reload → data loads from localStorage (persist)
```

---

## Post-migration: frontend test coverage

Once stable, write frontend tests with Vitest + Testing Library:
```tsx
// Example: test that RoomPage shows stale banner on error
const qc = new QueryClient({ defaultOptions: { queries: { retry: false }}})
qc.setQueryData(queryKeys.roomState('r001'), mockRoomState)
// Simulate error
server.use(http.get('/api/rooms/r001/state', () => HttpResponse.error()))
render(
  <QueryClientProvider client={qc}><RoomPage roomId="r001" /></QueryClientProvider>
)
expect(screen.getByText(/Connection lost/)).toBeInTheDocument()
expect(screen.getByText('Rack A01')).toBeInTheDocument()  // stale data still visible
```

Target: **90%+ combined coverage** (backend + frontend) after this phase.

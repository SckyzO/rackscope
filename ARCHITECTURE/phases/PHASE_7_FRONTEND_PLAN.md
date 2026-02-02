# Phase 7: Frontend Rebuild - Action Plan

**Status**: 🟡 Ready to Start (After Phase 6)
**Duration**: 3 weeks
**Stack**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui

## Objectives

1. ✅ Migrate from Svelte to React
2. ✅ Modern design system (Tailwind + shadcn)
3. ✅ Core views (visualization + editors + settings)
4. ✅ Plugin UI integration (dynamic menu)
5. ✅ Dark mode (for NOC environments)

---

## Tech Stack Decision

### Frontend Stack

```
React 18          ← Component framework
Vite 5            ← Build tool (fast HMR)
TypeScript        ← Type safety
Tailwind CSS 3    ← Utility-first styling
shadcn/ui         ← High-quality components (copy/paste, not NPM)
React Router 6    ← Client-side routing
TanStack Query    ← Server state management
Zustand           ← Client state (optional, lightweight)
```

### Why React over Svelte?

✅ **Ecosystem**: Larger, more mature
✅ **shadcn/ui**: Best-in-class components
✅ **Team familiarity**: More developers know React
✅ **Plugin ecosystem**: Easier for community plugins
✅ **Long-term**: Better maintained

---

## Project Setup

### Step 1: Initialize Vite Project

```bash
cd rackscope/
mv frontend frontend-svelte-backup

# Create new Vite + React + TypeScript project
npm create vite@latest frontend -- --template react-ts

cd frontend
npm install

# Install dependencies
npm install -D tailwindcss postcss autoprefixer
npm install react-router-dom @tanstack/react-query
npm install lucide-react class-variance-authority clsx tailwind-merge
npm install recharts  # For charts
```

### Step 2: Setup Tailwind + shadcn

```bash
# Initialize Tailwind
npx tailwindcss init -p

# Initialize shadcn
npx shadcn-ui@latest init

# Choose:
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes
```

**File**: `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Status colors for health states
        'status-ok': '#10b981',      // green-500
        'status-warn': '#f59e0b',    // amber-500
        'status-crit': '#ef4444',    // red-500
        'status-unknown': '#6b7280', // gray-500
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

### Step 3: Install shadcn Components

```bash
# Install base components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add skeleton
```

---

## Phase 7A: Core Layout & Navigation (Week 1)

### Goal
Setup app shell with dynamic plugin menu

### Step 1: App Structure (Day 1-2)

```
frontend/src/
├── components/
│   ├── ui/              ← shadcn components
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── ...
├── pages/
│   ├── Overview.tsx
│   ├── Map.tsx
│   ├── rooms/
│   ├── racks/
│   ├── devices/
│   ├── settings/
│   └── ...
├── hooks/
│   ├── usePlugins.ts
│   ├── useMenu.ts
│   └── ...
├── lib/
│   ├── api.ts           ← API client
│   ├── utils.ts
│   └── ...
├── types/
│   ├── topology.ts
│   ├── plugin.ts
│   └── ...
├── App.tsx
└── main.tsx
```

**File**: `src/components/layout/AppShell.tsx`

```tsx
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Outlet } from 'react-router-dom';

export function AppShell() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

**File**: `src/components/layout/Sidebar.tsx`

```tsx
import { NavLink } from 'react-router-dom';
import { Home, Map, Building, Settings } from 'lucide-react';
import { useMenu } from '@/hooks/useMenu';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { coreMenu, pluginMenu } = useMenu();

  return (
    <aside className="w-64 border-r bg-card">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold">Rackscope</h1>
      </div>

      <nav className="p-4 space-y-2">
        {/* Core menu */}
        <NavSection title="Core">
          {coreMenu.map(item => (
            <NavItem key={item.path} {...item} />
          ))}
        </NavSection>

        {/* Plugin menu sections */}
        {pluginMenu.map(section => (
          <NavSection key={section.id} title={section.label}>
            {section.routes.map(route => (
              <NavItem key={route.path} {...route} />
            ))}
          </NavSection>
        ))}

        {/* Settings at bottom */}
        <NavItem
          path="/settings"
          label="Settings"
          icon={Settings}
        />
      </nav>
    </aside>
  );
}

function NavItem({ path, label, icon: Icon }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) => cn(
        "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "hover:bg-accent"
      )}
    >
      {Icon && <Icon className="h-5 w-5" />}
      <span>{label}</span>
    </NavLink>
  );
}
```

**File**: `src/hooks/useMenu.ts`

```tsx
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useMenu() {
  // Core menu (hardcoded)
  const coreMenu = [
    { path: '/', label: 'Overview', icon: Home },
    { path: '/map', label: 'Map', icon: Map },
    { path: '/infrastructure', label: 'Infrastructure', icon: Building },
  ];

  // Plugin menu (from API)
  const { data: pluginMenu = [] } = useQuery({
    queryKey: ['plugins', 'menu'],
    queryFn: async () => {
      const res = await api.get('/api/plugins/menu');
      return res.data.sections;
    },
  });

  return { coreMenu, pluginMenu };
}
```

### Step 2: API Client (Day 2)

**File**: `src/lib/api.ts`

```tsx
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(config => {
  // Add auth token if exists
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  response => response,
  error => {
    // Handle errors globally
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Step 3: Routing (Day 3)

**File**: `src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { Overview } from './pages/Overview';
import { Map } from './pages/Map';
import { RoomView } from './pages/rooms/RoomView';
import { RackView } from './pages/racks/RackView';
import { DeviceDetail } from './pages/devices/DeviceDetail';
import { Settings } from './pages/settings/Settings';
import { NotFound } from './pages/NotFound';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            {/* Core routes */}
            <Route path="/" element={<Overview />} />
            <Route path="/map" element={<Map />} />
            <Route path="/rooms/:roomId" element={<RoomView />} />
            <Route path="/racks/:rackId" element={<RackView />} />
            <Route path="/devices/:deviceId" element={<DeviceDetail />} />
            <Route path="/settings/*" element={<Settings />} />

            {/* Plugin routes loaded dynamically */}
            {/* TODO: Dynamic plugin routes */}

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

---

## Phase 7B: Core Views (Week 2)

### Goal
Implement read-only visualization pages

### Overview Dashboard (Day 4)

**File**: `src/pages/Overview.tsx`

```tsx
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api';

export function Overview() {
  const { data: stats } = useQuery({
    queryKey: ['stats', 'global'],
    queryFn: async () => {
      const res = await api.get('/api/stats/global');
      return res.data;
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  const { data: alerts } = useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: async () => {
      const res = await api.get('/api/alerts');
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Overview</h1>

      {/* Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={stats?.status === 'OK' ? 'success' : 'destructive'}>
              {stats?.status || 'UNKNOWN'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Racks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_racks || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.crit_count || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-amber-500">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.warn_count || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {alerts?.slice(0, 10).map(alert => (
              <Alert key={alert.id} variant={alert.severity === 'CRIT' ? 'destructive' : 'default'}>
                <AlertDescription>
                  {alert.rack_id}: {alert.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Room View (Day 5-6)

**File**: `src/pages/rooms/RoomView.tsx`

```tsx
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export function RoomView() {
  const { roomId } = useParams();

  const { data: room } = useQuery({
    queryKey: ['rooms', roomId, 'layout'],
    queryFn: async () => {
      const res = await api.get(`/api/rooms/${roomId}/layout`);
      return res.data;
    },
  });

  if (!room) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{room.name}</h1>

      {/* Aisles */}
      {room.aisles?.map(aisle => (
        <div key={aisle.id}>
          <h2 className="text-xl font-semibold mb-4">{aisle.name}</h2>

          {/* Rack Grid */}
          <div className="grid grid-cols-5 md:grid-cols-10 gap-4">
            {aisle.racks.map(rack => (
              <Link key={rack.id} to={`/racks/${rack.id}`}>
                <RackCard rack={rack} />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RackCard({ rack }) {
  const statusColor = {
    'OK': 'bg-status-ok',
    'WARN': 'bg-status-warn',
    'CRIT': 'bg-status-crit',
    'UNKNOWN': 'bg-status-unknown',
  }[rack.health_state] || 'bg-gray-500';

  return (
    <Card className={cn(
      "p-4 cursor-pointer transition-transform hover:scale-105",
      "border-2",
      statusColor
    )}>
      <div className="text-center">
        <div className="text-sm font-semibold">{rack.name}</div>
        <div className="text-xs text-muted-foreground">{rack.health_state}</div>
      </div>
    </Card>
  );
}
```

### Rack View (Day 7)

Visual U-position view of devices in rack

### Device Detail (Day 8)

Metrics, checks, alerts for specific device

---

## Phase 7C: Editors (Week 3)

### Goal
Implement CRUD operations for topology, templates, checks

### Topology Editor (Day 9-11)

**Features**:
- Create/edit sites, rooms, racks
- Add/remove/move devices
- U-position validation
- Drag & drop (optional, nice-to-have)

### Template Editor (Day 12-13)

**Features**:
- Device template CRUD
- Rack template CRUD
- Visual layout editor
- Checks assignment

### Checks Editor (Day 13-14)

**Features**:
- Check definition CRUD
- PromQL editor with syntax highlighting
- Test check against live data

### Settings UI (Day 15)

**Features**:
- App settings
- Telemetry config
- Plugin management (enable/disable)
- User preferences

---

## Design System

### Color Palette

```css
/* Status Colors */
--status-ok: #10b981;      /* Green */
--status-warn: #f59e0b;    /* Amber */
--status-crit: #ef4444;    /* Red */
--status-unknown: #6b7280; /* Gray */

/* Theme Colors (from shadcn) */
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--card: 0 0% 100%;
--card-foreground: 222.2 84% 4.9%;
--primary: 222.2 47.4% 11.2%;
--primary-foreground: 210 40% 98%;
```

### Typography

```css
/* Headings */
h1: text-3xl font-bold
h2: text-2xl font-semibold
h3: text-xl font-semibold

/* Body */
body: text-base

/* Small */
small: text-sm text-muted-foreground
```

### Components

Use shadcn components for consistency:
- **Button**: Primary actions
- **Card**: Content containers
- **Badge**: Status indicators
- **Alert**: Notifications
- **Dialog**: Modals
- **Table**: Data tables

---

## Dark Mode

**Enable dark mode** (important for NOC):

```tsx
// src/components/ThemeProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<Theme>('dark'); // Default dark

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

---

## Testing Strategy

### Unit Tests

```bash
# Install testing libraries
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Test components**:
- RackCard rendering
- Status color logic
- API hooks

### E2E Tests (Optional)

```bash
npm install -D playwright
```

**Test flows**:
- Navigate rooms → racks → devices
- Create rack
- Edit device

---

## Build & Deploy

### Development

```bash
cd frontend
npm run dev  # http://localhost:5173
```

### Production Build

```bash
npm run build
# Output: frontend/dist/
```

### Docker Integration

**Update** `docker-compose.yml`:

```yaml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://backend:8000
```

---

## Success Criteria

- [ ] App loads with plugin-based menu
- [ ] Overview dashboard shows health stats
- [ ] Room view displays racks with colors
- [ ] Rack view shows devices U-position
- [ ] Device detail shows metrics/checks
- [ ] Can create/edit rooms, racks, devices
- [ ] Can create/edit templates
- [ ] Can enable/disable plugins from settings
- [ ] Dark mode works
- [ ] Responsive (desktop + tablet)

---

## Migration Notes

### From Svelte to React

**Component mapping**:
- Svelte stores → React Context / TanStack Query
- `{#if}` → `{condition && <Component />}`
- `{#each}` → `.map()`
- `on:click` → `onClick`

**State management**:
- Server state → TanStack Query
- UI state → useState / Zustand
- Global config → React Context

---

## Next Steps After Phase 7

1. **Polish & UX improvements**
2. **Add plugin UIs** (Slurm dashboards)
3. **Performance optimization**
4. **Documentation**
5. **User testing & feedback**

---

*Plan Version: 1.0*
*Created: 2026-02-01*

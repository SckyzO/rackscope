import { useEffect, type ReactNode } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { CosmosLayout } from './layout/CosmosLayout';
import { CosmosDashboard } from './pages/CosmosDashboard';
import { NotFoundPage } from './pages/NotFoundPage';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

// UI Elements
import { BadgesPage } from './pages/ui/BadgesPage';
import { AlertsPage } from './pages/ui/AlertsPage';
import { LinksPage } from './pages/ui/LinksPage';
import { ListPage } from './pages/ui/ListPage';
import { BreadcrumbPage } from './pages/ui/BreadcrumbPage';
import { ProgressBarPage } from './pages/ui/ProgressBarPage';
import { RibbonsPage } from './pages/ui/RibbonsPage';
import { SpinnersPage } from './pages/ui/SpinnersPage';
import { PaginationPage } from './pages/ui/PaginationPage';
import { ButtonsGroupPage } from './pages/ui/ButtonsGroupPage';
import { CardsPage } from './pages/ui/CardsPage';
import { CarouselPage } from './pages/ui/CarouselPage';
import { DropdownsPage } from './pages/ui/DropdownsPage';
import { ModalsPage } from './pages/ui/ModalsPage';
import { TabsPage } from './pages/ui/TabsPage';
import { TooltipsPage } from './pages/ui/TooltipsPage';
import { PopoversPage } from './pages/ui/PopoversPage';
import { NotificationsPage } from './pages/ui/NotificationsPage';
import { FormElementsPage } from './pages/ui/FormElementsPage';
import { AvatarsPage } from './pages/ui/AvatarsPage';
// New generic UI
import { AccordionPage } from './pages/ui/AccordionPage';
import { StepperPage } from './pages/ui/StepperPage';
import { TimelinePage } from './pages/ui/TimelinePage';
import { SkeletonPage } from './pages/ui/SkeletonPage';
import { EmptyStatePage } from './pages/ui/EmptyStatePage';
import { ToastPage } from './pages/ui/ToastPage';
import { DrawerPage } from './pages/ui/DrawerPage';
import { StatsCardsPage } from './pages/ui/StatsCardsPage';
import { TagInputPage } from './pages/ui/TagInputPage';
import { RangeSliderPage } from './pages/ui/RangeSliderPage';
import { OtpInputPage } from './pages/ui/OtpInputPage';

// Charts
import { ChartsPage } from './pages/charts/ChartsPage';

// Tables
import { DataTablesPage } from './pages/tables/DataTablesPage';

// Auth (standalone — no layout, no protection)
import { SignInPage } from './pages/auth/SignInPage';
import { SignUpPage } from './pages/auth/SignUpPage';

// Pages
import { ProfilePage } from './pages/ProfilePage';
import { CalendarPage } from './pages/CalendarPage';
import { NotificationsFullPage } from './pages/NotificationsFullPage';

// Monitoring Views (connected to real API)
import { CosmosWorldMapPage } from './pages/views/CosmosWorldMapPage';
import { CosmosRoomPage } from './pages/views/CosmosRoomPage';
import { CosmosRoomPageV2 } from './pages/views/CosmosRoomPageV2';
import { CosmosRoomPageV3 } from './pages/views/CosmosRoomPageV3';
import { CosmosRoomPageV4 } from './pages/views/CosmosRoomPageV4';
import { CosmosRoomPageV5 } from './pages/views/CosmosRoomPageV5';
import { CosmosRoomPageV6 } from './pages/views/CosmosRoomPageV6';
import { CosmosRoomPageV7 } from './pages/views/CosmosRoomPageV7';
import { CosmosRoomPageV8 } from './pages/views/CosmosRoomPageV8';
import { CosmosRoomPageV9 } from './pages/views/CosmosRoomPageV9';
import { CosmosRoomPageV10 } from './pages/views/CosmosRoomPageV10';

import { CosmosDevicePage } from './pages/views/CosmosDevicePage';
import { CosmosRackV1 } from './pages/views/CosmosRackV1';
import { CosmosRackV2 } from './pages/views/CosmosRackV2';
import { CosmosRackV3 } from './pages/views/CosmosRackV3';
import { CosmosRackV4 } from './pages/views/CosmosRackV4';

// Rackscope-specific
import { HealthStatusPage } from './pages/rackscope/HealthStatusPage';
import { AlertFeedPage } from './pages/rackscope/AlertFeedPage';
import { MetricsPage } from './pages/rackscope/MetricsPage';
import { InfrastructureNavPage } from './pages/rackscope/InfrastructureNavPage';
import { SlurmPage } from './pages/rackscope/SlurmPage';

// Slurm live views
import { CosmosSlurmOverviewPage } from './pages/slurm/CosmosSlurmOverviewPage';
import { CosmosSlurmNodesPage } from './pages/slurm/CosmosSlurmNodesPage';
import { CosmosSlurmAlertsPage } from './pages/slurm/CosmosSlurmAlertsPage';
import { CosmosSlurmPartitionsPage } from './pages/slurm/CosmosSlurmPartitionsPage';
import { CosmosSlurmWallboardPage } from './pages/slurm/CosmosSlurmWallboardPage';
import { CosmosSlurmWallboardV2Page } from './pages/slurm/CosmosSlurmWallboardV2Page';

// Editors
import { CosmosSettingsPage } from './pages/editors/CosmosSettingsPage';
import { CosmosChecksEditorPage } from './pages/editors/CosmosChecksEditorPage';
import { CosmosTopologyEditorPage } from './pages/editors/CosmosTopologyEditorPage';
import { CosmosTopologyEditorPageV2 } from './pages/editors/CosmosTopologyEditorPageV2';
import { CosmosTopologyEditorPageV3 } from './pages/editors/CosmosTopologyEditorPageV3';
import { CosmosTopologyEditorPageV4 } from './pages/editors/CosmosTopologyEditorPageV4';
import { CosmosTopologyEditorPageV5 } from './pages/editors/CosmosTopologyEditorPageV5';
import { CosmosTemplatesEditorPage } from './pages/editors/CosmosTemplatesEditorPage';
import { CosmosRackEditorPage } from './pages/editors/CosmosRackEditorPage';
import { EmptyPage, TemplatesShowcase } from './pages/templates/EmptyPage';
import { CosmosRackTemplateEditorPage } from './pages/editors/CosmosRackTemplateEditorPage';

// ── ProtectedRoute ────────────────────────────────────────────────────────────

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { authEnabled, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && authEnabled && !user) {
      navigate('/cosmos/auth/signin', { replace: true });
    }
  }, [loading, authEnabled, user, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
      </div>
    );
  }
  if (authEnabled && !user) return null;
  return <>{children}</>;
};

// ── Router ────────────────────────────────────────────────────────────────────

const CosmosRoutes = () => (
  <Routes>
    {/* Auth — no layout, no protection */}
    <Route path="auth/signin" element={<SignInPage />} />
    <Route path="auth/signup" element={<SignUpPage />} />

    <Route
      element={
        <ProtectedRoute>
          <CosmosLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<CosmosDashboard />} />

      {/* UI Elements */}
      <Route path="ui/buttons-group" element={<ButtonsGroupPage />} />
      <Route path="ui/badges" element={<BadgesPage />} />
      <Route path="ui/alerts" element={<AlertsPage />} />
      <Route path="ui/cards" element={<CardsPage />} />
      <Route path="ui/carousel" element={<CarouselPage />} />
      <Route path="ui/dropdowns" element={<DropdownsPage />} />
      <Route path="ui/links" element={<LinksPage />} />
      <Route path="ui/list" element={<ListPage />} />
      <Route path="ui/modals" element={<ModalsPage />} />
      <Route path="ui/notifications" element={<NotificationsPage />} />
      <Route path="ui/pagination" element={<PaginationPage />} />
      <Route path="ui/popovers" element={<PopoversPage />} />
      <Route path="ui/progress-bar" element={<ProgressBarPage />} />
      <Route path="ui/ribbons" element={<RibbonsPage />} />
      <Route path="ui/spinners" element={<SpinnersPage />} />
      <Route path="ui/tabs" element={<TabsPage />} />
      <Route path="ui/tooltips" element={<TooltipsPage />} />
      <Route path="ui/breadcrumb" element={<BreadcrumbPage />} />
      <Route path="ui/form-elements" element={<FormElementsPage />} />
      <Route path="ui/avatars" element={<AvatarsPage />} />
      {/* New generic */}
      <Route path="ui/accordion" element={<AccordionPage />} />
      <Route path="ui/stepper" element={<StepperPage />} />
      <Route path="ui/timeline" element={<TimelinePage />} />
      <Route path="ui/skeleton" element={<SkeletonPage />} />
      <Route path="ui/empty-state" element={<EmptyStatePage />} />
      <Route path="ui/toast" element={<ToastPage />} />
      <Route path="ui/drawer" element={<DrawerPage />} />
      <Route path="ui/stats-cards" element={<StatsCardsPage />} />
      <Route path="ui/tag-input" element={<TagInputPage />} />
      <Route path="ui/range-slider" element={<RangeSliderPage />} />
      <Route path="ui/otp-input" element={<OtpInputPage />} />

      {/* Charts */}
      <Route path="charts" element={<ChartsPage />} />

      {/* Tables */}
      <Route path="tables" element={<DataTablesPage />} />

      {/* Pages */}
      <Route path="profile" element={<ProfilePage />} />
      <Route path="calendar" element={<CalendarPage />} />
      <Route path="notifications" element={<NotificationsFullPage />} />

      {/* ── Monitoring Views (live data) ── */}
      <Route path="views/worldmap" element={<CosmosWorldMapPage />} />
      <Route path="views/room/:roomId" element={<CosmosRoomPage />} />
      <Route path="views/room-v2/:roomId" element={<CosmosRoomPageV2 />} />
      <Route path="views/room-v3/:roomId" element={<CosmosRoomPageV3 />} />
      <Route path="views/room-v4/:roomId" element={<CosmosRoomPageV4 />} />
      <Route path="views/room-v5/:roomId" element={<CosmosRoomPageV5 />} />
      <Route path="views/room-v6/:roomId" element={<CosmosRoomPageV6 />} />
      <Route path="views/room-v7/:roomId" element={<CosmosRoomPageV7 />} />
      <Route path="views/room-v8/:roomId" element={<CosmosRoomPageV8 />} />
      <Route path="views/room-v9/:roomId" element={<CosmosRoomPageV9 />} />
      <Route path="views/room-v10/:roomId" element={<CosmosRoomPageV10 />} />
      <Route path="views/rack/:rackId" element={<CosmosRackV2 />} />
      <Route path="views/rack-v1/:rackId" element={<CosmosRackV1 />} />
      <Route path="views/rack-v2/:rackId" element={<CosmosRackV2 />} />
      <Route path="views/rack-v3/:rackId" element={<CosmosRackV3 />} />
      <Route path="views/rack-v4/:rackId" element={<CosmosRackV4 />} />
      <Route path="views/device/:rackId/:deviceId" element={<CosmosDevicePage />} />

      {/* Rackscope UI Components */}
      <Route path="rackscope/health" element={<HealthStatusPage />} />
      <Route path="rackscope/alerts" element={<AlertFeedPage />} />
      <Route path="rackscope/metrics" element={<MetricsPage />} />
      <Route path="rackscope/infra-nav" element={<InfrastructureNavPage />} />
      <Route path="rackscope/slurm" element={<SlurmPage />} />

      {/* ── Slurm live views ── */}
      <Route path="slurm/overview" element={<CosmosSlurmOverviewPage />} />
      <Route path="slurm/nodes" element={<CosmosSlurmNodesPage />} />
      <Route path="slurm/alerts" element={<CosmosSlurmAlertsPage />} />
      <Route path="slurm/partitions" element={<CosmosSlurmPartitionsPage />} />
      <Route path="slurm/wallboard/:roomId" element={<CosmosSlurmWallboardPage />} />
      <Route path="slurm/wallboard-v2/:roomId" element={<CosmosSlurmWallboardV2Page />} />

      {/* ── Editors ── */}
      <Route path="editors/settings" element={<CosmosSettingsPage />} />
      <Route path="settings" element={<CosmosSettingsPage />} />
      <Route path="editors/checks" element={<CosmosChecksEditorPage />} />
      <Route path="editors/topology" element={<CosmosTopologyEditorPage />} />
      <Route path="editors/topology-v2" element={<CosmosTopologyEditorPageV2 />} />
      <Route path="editors/topology-v3" element={<CosmosTopologyEditorPageV3 />} />
      <Route path="editors/topology-v4" element={<CosmosTopologyEditorPageV4 />} />
      <Route path="editors/topology-v5" element={<CosmosTopologyEditorPageV5 />} />
      <Route path="editors/templates" element={<CosmosTemplatesEditorPage />} />
      <Route path="editors/rack" element={<CosmosRackEditorPage />} />
      <Route path="editors/rack-templates" element={<CosmosRackTemplateEditorPage />} />

      {/* ── Page templates (design system) ── */}
      <Route path="templates/empty" element={<EmptyPage />} />
      <Route path="templates/showcase" element={<TemplatesShowcase />} />

      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

export const CosmosRouter = () => (
  <AuthProvider>
    <CosmosRoutes />
  </AuthProvider>
);

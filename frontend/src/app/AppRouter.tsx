import { useEffect, type ReactNode } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
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
import { ButtonsPage } from './pages/ui/ButtonsPage';
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
import { HUDTooltipPage } from './pages/ui/HUDTooltipPage';

// Charts
import { ChartsPage } from './pages/charts/ChartsPage';

// Tables
import { DataTablesPage } from './pages/tables/DataTablesPage';

// Auth (standalone — no layout, no protection)
import { SignInPage } from './pages/auth/SignInPage';
import { SignUpPage } from './pages/auth/SignUpPage';

// Pages
import { ProfilePage } from './pages/ProfilePage';
import { AboutPage } from './pages/AboutPage';
import { CalendarPage } from './pages/CalendarPage';
import { NotificationsFullPage } from './pages/NotificationsFullPage';

// Monitoring Views (connected to real API)
import { WorldMapPage } from './pages/views/WorldMapPage';
import { RoomPage } from './pages/views/RoomPage';
import { ClusterPage } from './pages/views/ClusterPage';

import { DevicePage } from './pages/views/DevicePage';
import { RackPage } from './pages/views/RackPage';

// Rackscope-specific
import { HealthStatusPage } from './pages/rackscope/HealthStatusPage';
import { AlertFeedPage } from './pages/rackscope/AlertFeedPage';
import { MetricsPage } from './pages/rackscope/MetricsPage';
import { InfrastructureNavPage } from './pages/rackscope/InfrastructureNavPage';
import { SlurmPage } from './pages/rackscope/SlurmPage';

// Slurm live views
import { SlurmOverviewPage } from './pages/slurm/SlurmOverviewPage';
import { SlurmNodesPage } from './pages/slurm/SlurmNodesPage';
import { SlurmAlertsPage } from './pages/slurm/SlurmAlertsPage';
import { SlurmPartitionsPage } from './pages/slurm/SlurmPartitionsPage';
import { SlurmWallboardPage } from './pages/slurm/SlurmWallboardPage';
import { SlurmWallV2Page } from './pages/slurm/SlurmWallV2Page';

// Editors
import { SettingsPage } from './pages/editors/SettingsPage';
import { ChecksEditorPage } from './pages/editors/ChecksEditorPage';
import { MetricsEditorPage } from './pages/editors/MetricsEditorPage';
// TopologyEditorPage is DatacenterEditorPage
import { TemplatesEditorPage } from './pages/editors/TemplatesEditorPage';
import { RackEditorPage } from './pages/editors/RackEditorPage';
import { EmptyPage, TemplatesShowcase, CenteredPage } from './pages/templates/EmptyPage';
import { TemplateDefaultPage } from './pages/templates/TemplateDefaultPage';
import { PlaylistCenterPage } from './pages/PlaylistCenterPage';
import {
  RackViewTemplate,
  DeviceViewTemplate,
  RoomViewTemplate,
} from './pages/templates/MonitoringTemplates';
import { UILibraryPage } from './pages/UILibraryPage';
import { RackTemplateEditorPage } from './pages/editors/RackTemplateEditorPage';
import { DatacenterEditorPage } from './pages/editors/DatacenterEditorPage';

// ── ProtectedRoute ────────────────────────────────────────────────────────────

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { authEnabled, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && authEnabled && !user) {
      navigate('/auth/signin', { replace: true });
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

// ── Router ─────────────────────────────────────────────────────────────────────
// Feature visibility is controlled via the sidebar (AppConfigContext + PluginsMenuContext).
// Routes remain accessible for direct navigation; sidebar hides unavailable entries.

const AppRoutes = () => (
  <Routes>
    {/* Auth — no layout, no protection */}
    <Route path="auth/signin" element={<SignInPage />} />
    <Route path="auth/signup" element={<SignUpPage />} />

    <Route
      element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<DashboardPage />} />
      <Route path="dashboard/:dashboardId" element={<DashboardPage />} />

      {/* UI Elements */}
      <Route path="ui/buttons" element={<ButtonsPage />} />
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
      <Route path="ui/hud-tooltip" element={<HUDTooltipPage />} />

      {/* Charts */}
      <Route path="charts" element={<ChartsPage />} />

      {/* Tables */}
      <Route path="tables" element={<DataTablesPage />} />

      {/* Pages */}
      <Route path="profile" element={<ProfilePage />} />
      <Route path="calendar" element={<CalendarPage />} />
      <Route path="notifications" element={<NotificationsFullPage />} />
      <Route path="about" element={<AboutPage />} />

      {/* ── Monitoring Views (live data) ── */}
      <Route path="views/worldmap" element={<WorldMapPage />} />
      <Route path="views/cluster" element={<ClusterPage />} />
      <Route path="views/room/:roomId" element={<RoomPage />} />
      <Route path="views/rack/:rackId" element={<RackPage />} />
      <Route path="views/device/:rackId/:deviceId" element={<DevicePage />} />

      {/* Rackscope UI Components */}
      <Route path="rackscope/health" element={<HealthStatusPage />} />
      <Route path="rackscope/alerts" element={<AlertFeedPage />} />
      <Route path="rackscope/metrics" element={<MetricsPage />} />
      <Route path="rackscope/infra-nav" element={<InfrastructureNavPage />} />
      <Route path="rackscope/slurm" element={<SlurmPage />} />

      {/* ── Slurm live views ── */}
      <Route path="slurm/overview" element={<SlurmOverviewPage />} />
      <Route path="slurm/nodes" element={<SlurmNodesPage />} />
      <Route path="slurm/alerts" element={<SlurmAlertsPage />} />
      <Route path="slurm/partitions" element={<SlurmPartitionsPage />} />
      <Route path="slurm/wallboard/:roomId" element={<SlurmWallboardPage />} />
      <Route path="slurm/wall" element={<SlurmWallV2Page />} />

      {/* ── Playlist ── */}
      <Route path="playlist" element={<PlaylistCenterPage />} />

      {/* ── Editors ── */}
      <Route path="editors/settings" element={<SettingsPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="editors/checks" element={<ChecksEditorPage />} />
      <Route path="editors/metrics" element={<MetricsEditorPage />} />
      <Route path="editors/topology" element={<DatacenterEditorPage />} />
      <Route path="editors/templates" element={<TemplatesEditorPage />} />
      <Route path="editors/rack" element={<RackEditorPage />} />
      <Route path="editors/rack-templates" element={<RackTemplateEditorPage />} />
      <Route path="editors/datacenter" element={<DatacenterEditorPage />} />

      {/* ── Page templates (design system) ── */}
      <Route path="templates/empty" element={<EmptyPage />} />
      <Route path="templates/default" element={<TemplateDefaultPage />} />
      <Route path="templates/centered" element={<CenteredPage />} />
      <Route path="templates/showcase" element={<TemplatesShowcase />} />
      <Route path="templates/rack" element={<RackViewTemplate />} />
      <Route path="templates/device" element={<DeviceViewTemplate />} />
      <Route path="templates/room" element={<RoomViewTemplate />} />

      {/* UI Library hub */}
      <Route path="ui" element={<UILibraryPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

export const AppRouter = () => (
  <AuthProvider>
    <AppRoutes />
  </AuthProvider>
);

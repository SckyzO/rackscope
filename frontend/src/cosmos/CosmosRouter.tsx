import { Routes, Route } from 'react-router-dom';
import { CosmosLayout } from './layout/CosmosLayout';
import { CosmosAnalytics } from './pages/CosmosAnalytics';
import { NotFoundPage } from './pages/NotFoundPage';

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

// Auth (standalone — no layout)
import { SignInPage } from './pages/auth/SignInPage';
import { SignUpPage } from './pages/auth/SignUpPage';

// Pages
import { ProfilePage } from './pages/ProfilePage';
import { CalendarPage } from './pages/CalendarPage';
import { NotificationsFullPage } from './pages/NotificationsFullPage';

// Rackscope-specific
import { HealthStatusPage } from './pages/rackscope/HealthStatusPage';
import { AlertFeedPage } from './pages/rackscope/AlertFeedPage';
import { MetricsPage } from './pages/rackscope/MetricsPage';
import { InfrastructureNavPage } from './pages/rackscope/InfrastructureNavPage';
import { SlurmPage } from './pages/rackscope/SlurmPage';

export const CosmosRouter = () => (
  <Routes>
    {/* Auth — no layout */}
    <Route path="auth/signin" element={<SignInPage />} />
    <Route path="auth/signup" element={<SignUpPage />} />

    <Route element={<CosmosLayout />}>
      <Route index element={<CosmosAnalytics />} />

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

      {/* Rackscope */}
      <Route path="rackscope/health" element={<HealthStatusPage />} />
      <Route path="rackscope/alerts" element={<AlertFeedPage />} />
      <Route path="rackscope/metrics" element={<MetricsPage />} />
      <Route path="rackscope/infra-nav" element={<InfrastructureNavPage />} />
      <Route path="rackscope/slurm" element={<SlurmPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

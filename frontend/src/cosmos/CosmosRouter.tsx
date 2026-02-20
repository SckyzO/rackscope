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

// Charts
import { ChartsPage } from './pages/charts/ChartsPage';

// Tables
import { DataTablesPage } from './pages/tables/DataTablesPage';

// Auth (standalone — no layout)
import { SignInPage } from './pages/auth/SignInPage';
import { SignUpPage } from './pages/auth/SignUpPage';

// Free template pages
import { ProfilePage } from './pages/ProfilePage';
import { CalendarPage } from './pages/CalendarPage';

export const CosmosRouter = () => (
  <Routes>
    {/* Auth pages bypass layout */}
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

      {/* Charts */}
      <Route path="charts" element={<ChartsPage />} />

      {/* Tables */}
      <Route path="tables" element={<DataTablesPage />} />

      {/* Free template pages */}
      <Route path="profile" element={<ProfilePage />} />
      <Route path="calendar" element={<CalendarPage />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

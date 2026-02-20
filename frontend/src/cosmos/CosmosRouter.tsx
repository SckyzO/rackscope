import { Routes, Route } from 'react-router-dom';
import { CosmosLayout } from './layout/CosmosLayout';
import { CosmosAnalytics } from './pages/CosmosAnalytics';
import { CosmosComingSoon } from './pages/CosmosComingSoon';

export const CosmosRouter = () => (
  <Routes>
    <Route element={<CosmosLayout />}>
      <Route index element={<CosmosAnalytics />} />
      <Route path="ui/buttons-group" element={<CosmosComingSoon />} />
      <Route path="ui/badges" element={<CosmosComingSoon />} />
      <Route path="ui/alerts" element={<CosmosComingSoon />} />
      <Route path="ui/cards" element={<CosmosComingSoon />} />
      <Route path="ui/carousel" element={<CosmosComingSoon />} />
      <Route path="ui/dropdowns" element={<CosmosComingSoon />} />
      <Route path="ui/links" element={<CosmosComingSoon />} />
      <Route path="ui/list" element={<CosmosComingSoon />} />
      <Route path="ui/modals" element={<CosmosComingSoon />} />
      <Route path="ui/notifications" element={<CosmosComingSoon />} />
      <Route path="ui/pagination" element={<CosmosComingSoon />} />
      <Route path="ui/popovers" element={<CosmosComingSoon />} />
      <Route path="ui/progress-bar" element={<CosmosComingSoon />} />
      <Route path="ui/ribbons" element={<CosmosComingSoon />} />
      <Route path="ui/spinners" element={<CosmosComingSoon />} />
      <Route path="ui/tabs" element={<CosmosComingSoon />} />
      <Route path="ui/tooltips" element={<CosmosComingSoon />} />
      <Route path="ui/breadcrumb" element={<CosmosComingSoon />} />
      <Route path="tables" element={<CosmosComingSoon />} />
      <Route path="auth/signin" element={<CosmosComingSoon />} />
      <Route path="auth/signup" element={<CosmosComingSoon />} />
      <Route path="*" element={<CosmosComingSoon />} />
    </Route>
  </Routes>
);

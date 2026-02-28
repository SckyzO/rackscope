import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppRouter } from './app/AppRouter';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/*" element={<AppRouter />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;

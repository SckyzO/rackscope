import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// ── Context ───────────────────────────────────────────────────────────────────

const PageTitleValueContext = createContext<string>('');
const PageTitleSetterContext = createContext<(title: string) => void>(() => {
  /* noop */
});

// ── Provider ──────────────────────────────────────────────────────────────────

export const PageTitleProvider = ({ children }: { children: ReactNode }) => {
  const [title, setTitle] = useState('');
  return (
    <PageTitleSetterContext.Provider value={setTitle}>
      <PageTitleValueContext.Provider value={title}>{children}</PageTitleValueContext.Provider>
    </PageTitleSetterContext.Provider>
  );
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export const usePageTitleValue = () => useContext(PageTitleValueContext);

// Clears the title on unmount so stale titles don't bleed into the next page
// eslint-disable-next-line react-refresh/only-export-components
export const usePageTitle = (title: string) => {
  const setTitle = useContext(PageTitleSetterContext);
  useEffect(() => {
    setTitle(title);
    return () => setTitle('');
  }, [title, setTitle]);
};

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// ── Context ───────────────────────────────────────────────────────────────────

const PageTitleValueContext = createContext<string>('');
const PageTitleSetterContext = createContext<(title: string) => void>(() => {});

// ── Provider (used once in CosmosLayout) ──────────────────────────────────────

export const PageTitleProvider = ({ children }: { children: ReactNode }) => {
  const [title, setTitle] = useState('');
  return (
    <PageTitleSetterContext.Provider value={setTitle}>
      <PageTitleValueContext.Provider value={title}>{children}</PageTitleValueContext.Provider>
    </PageTitleSetterContext.Provider>
  );
};

// ── Consumer hook (used in CosmosHeader) ──────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export const usePageTitleValue = () => useContext(PageTitleValueContext);

// ── Setter hook (used in page components) ─────────────────────────────────────
//
// Usage in any Cosmos page:
//   import { usePageTitle } from '../../contexts/PageTitleContext';
//   usePageTitle('My Page Title');
//
// The title appears in the header immediately and is cleared when the page unmounts.

// eslint-disable-next-line react-refresh/only-export-components
export const usePageTitle = (title: string) => {
  const setTitle = useContext(PageTitleSetterContext);
  useEffect(() => {
    setTitle(title);
    return () => setTitle('');
  }, [title, setTitle]);
};

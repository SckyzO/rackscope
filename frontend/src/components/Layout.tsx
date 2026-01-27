import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="bg-rack-dark flex h-screen overflow-hidden text-gray-100">
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto">
        {/* Background Grid Pattern for industrial look */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  );
};

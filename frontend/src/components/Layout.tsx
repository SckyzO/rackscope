import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex h-screen bg-rack-dark text-gray-100 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        {/* Background Grid Pattern for industrial look */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
};

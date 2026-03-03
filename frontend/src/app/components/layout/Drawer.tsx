/**
 * Drawer — slide-in panel from the right edge.
 *
 * Design reference: Right Drawer style + Form Drawer width (w-96 / 384px).
 * - Overlay: bg-black/50 backdrop-blur-sm
 * - Shadow: shadow-xl
 * - Default width: 384px (w-96)
 * - Slide transition: 300ms ease-out
 *
 * Usage:
 *   <Drawer open={open} onClose={() => setOpen(false)}>
 *     <DrawerHeader title="Settings" onClose={() => setOpen(false)} />
 *     <div className="flex-1 overflow-y-auto p-5">...</div>
 *     <div className="border-t border-gray-200 p-5 dark:border-gray-800">
 *       <PageActionButton variant="primary" onClick={save}>Save</PageActionButton>
 *     </div>
 *   </Drawer>
 */

import type { ReactNode } from 'react';

export const Drawer = ({
  open,
  onClose,
  width = 384,
  zIndex = 50,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  width?: number;
  zIndex?: number;
  children: ReactNode;
}) => (
  <>
    {/* Overlay */}
    {open && onClose && (
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        style={{ zIndex: zIndex - 1 }}
        onClick={onClose}
      />
    )}
    {/* Panel */}
    <div
      className={`fixed top-0 right-0 flex h-full flex-col bg-white shadow-xl transition-transform duration-300 ease-out dark:bg-gray-900 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width, zIndex }}
    >
      {children}
    </div>
  </>
);

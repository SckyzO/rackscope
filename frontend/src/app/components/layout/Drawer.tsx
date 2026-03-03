/**
 * Drawer — slide-in panel from the right edge.
 *
 * Both enter (slide-in) and exit (slide-out) are animated:
 * - Panel: translate-x-full ↔ translate-x-0 (300ms ease-in-out)
 * - Overlay: opacity-0 ↔ opacity-100 (300ms) — always mounted, avoids abrupt disappearance
 *
 * Usage:
 *   <Drawer open={open} onClose={() => setOpen(false)}>
 *     <DrawerHeader title="Settings" onClose={() => setOpen(false)} />
 *     <div className="flex-1 overflow-y-auto p-5">...</div>
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
    {/* Overlay — always mounted, fades in/out to avoid abrupt removal */}
    {onClose && (
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{ zIndex: zIndex - 1 }}
        onClick={onClose}
      />
    )}
    {/* Panel — slides in from the right, slides back out on close */}
    <div
      className={`fixed top-0 right-0 flex h-full flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out dark:bg-gray-900 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width, zIndex }}
    >
      {children}
    </div>
  </>
);

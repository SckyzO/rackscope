import type { ReactNode } from 'react';
import { Backdrop } from './Backdrop';

export const Drawer = ({
  open,
  onClose,
  width = 320,
  zIndex = 40,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  width?: number;
  zIndex?: number;
  children: ReactNode;
}) => (
  <>
    {open && onClose && <Backdrop onClick={onClose} zIndex={zIndex - 1} />}
    <div
      className={`fixed top-0 right-0 flex h-full flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-out dark:border-gray-800 dark:bg-gray-950 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width, zIndex }}
    >
      {children}
    </div>
  </>
);

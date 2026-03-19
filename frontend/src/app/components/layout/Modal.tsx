import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export const Modal = ({
  open,
  onClose,
  children,
  maxWidth = 448,
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  maxWidth?: number;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      {onClose && <div className="absolute inset-0" onClick={onClose} />}
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>
  );
};

export const ModalHeader = ({ title, onClose }: { title: string; onClose?: () => void }) => (
  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
    {onClose && (
      <button
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </div>
);

export const ModalFooter = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
    {children}
  </div>
);

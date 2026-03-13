/**
 * ConfirmationModal — modal for unsaved-changes guard or destructive action confirmation.
 *
 * Layout: warning icon + title + message | Stay / Discard / Save & go
 *
 * Usage (unsaved changes guard):
 *   <ConfirmationModal
 *     open={showGuard}
 *     onStay={() => setShowGuard(false)}
 *     onDiscard={() => { discardChanges(); navigate(pending); }}
 *     onSave={async () => { await save(); navigate(pending); }}
 *     saving={isSaving}
 *   />
 *
 * Usage (simple confirm/cancel):
 *   <ConfirmationModal
 *     open={confirmDelete}
 *     title="Delete rack?"
 *     message="This cannot be undone."
 *     onStay={() => setConfirmDelete(false)}
 *     onDiscard={() => { deleteRack(); setConfirmDelete(false); }}
 *     discardLabel="Delete"
 *     hideSave
 *   />
 */

import { AlertTriangle, Save, Loader2, X } from 'lucide-react';

export const ConfirmationModal = ({
  open,
  title = 'Unsaved changes',
  message = 'You have unsaved changes. What would you like to do?',
  onStay,
  onDiscard,
  onSave,
  saving = false,
  stayLabel = 'Stay',
  discardLabel = 'Discard',
  saveLabel = 'Save & go',
  hideSave = false,
}: {
  open: boolean;
  title?: string;
  message?: string;
  onStay: () => void;
  onDiscard?: () => void;
  onSave?: () => void;
  saving?: boolean;
  stayLabel?: string;
  discardLabel?: string;
  saveLabel?: string;
  /** Hide the Save button (for simple confirm/cancel flows) */
  hideSave?: boolean;
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        {/* Body */}
        <div className="flex items-start gap-4 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-500/10">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          </div>
          <button
            onClick={onStay}
            className="shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Footer */}
        <div className="flex flex-nowrap items-center justify-end gap-2 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            onClick={onStay}
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {stayLabel}
          </button>
          {onDiscard && (
            <button
              onClick={onDiscard}
              className="shrink-0 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-700/40 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              {discardLabel}
            </button>
          )}
          {!hideSave && onSave && (
            <button
              onClick={onSave}
              disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saveLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

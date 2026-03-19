/**
 * UnsavedIndicator — small amber label shown when a form has unsaved changes.
 * Pair with StatefulSaveButton in a header or toolbar.
 *
 * Usage:
 *   <div className="flex items-center gap-2">
 *     <UnsavedIndicator visible={isDirty && !saving} />
 *     <StatefulSaveButton state={state} onClick={save} />
 *   </div>
 */

export const UnsavedIndicator = ({
  visible,
  label = 'Unsaved changes',
  className = '',
}: {
  visible: boolean;
  label?: string;
  className?: string;
}) => {
  if (!visible) return null;
  return (
    <span className={`text-xs font-medium text-amber-500 dark:text-amber-400 ${className}`}>
      {label}
    </span>
  );
};

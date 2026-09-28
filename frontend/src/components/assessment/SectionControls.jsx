import { ArrowLeft, ArrowRight, Pencil } from "lucide-react";

// Shared controls for the intake section cards (Product, Customer, ...).
// `section` is built by the Assessment page and carries the per-section
// edit/navigation state:
//   locked, editing, canEdit, onEdit, onCancel, error,
//   previousTab, nextTab, canGoPrevious, canGoNext, onNavigate

export function SectionStatus({ saved, section = {} }) {
  if (!saved) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
        ✓ Saved
      </span>

      {section.canEdit && !section.editing && (
        <button
          type="button"
          onClick={section.onEdit}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Pencil size={13} />
          Edit
        </button>
      )}
    </div>
  );
}

export function SectionFooter({
  section = {},
  saved,
  saving,
  onSave,
  label,
  readOnly = false,
}) {
  const {
    locked,
    editing,
    onCancel,
    error,
    previousTab,
    nextTab,
    canGoPrevious = true,
    canGoNext = true,
    onNavigate,
  } = section;

  const showSave = !readOnly && !locked;

  return (
    <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {previousTab && (
            <button
              type="button"
              onClick={() => onNavigate?.(previousTab.id)}
              disabled={!canGoPrevious}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft size={16} />
              Previous: {previousTab.label}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {showSave && editing && (
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
          )}

          {showSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : saved
                ? "Save changes"
                : `Save ${label}`}
            </button>
          )}

          {nextTab && (
            <button
              type="button"
              onClick={() => onNavigate?.(nextTab.id)}
              disabled={!canGoNext}
              title={
                canGoNext ? undefined : `Save ${label} to continue`
              }
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next: {nextTab.label}
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { CheckCircle2, XCircle } from "lucide-react";

function ResultDialog({ success, title, message, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 p-6 text-center shadow-xl">
        {success ? (
          <CheckCircle2 size={40} className="mx-auto text-emerald-600 dark:text-emerald-400" />
        ) : (
          <XCircle size={40} className="mx-auto text-red-600 dark:text-red-400" />
        )}

        <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{message}</p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          OK
        </button>
      </div>
    </div>
  );
}

export default ResultDialog;

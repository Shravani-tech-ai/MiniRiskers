import { useEffect, useState } from "react";
import { ArrowRight, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import { EMPTY_ASSESSMENT_FORMS, mapInputsToFormState } from "../../utils/assessmentFormMapping";
import AssessmentPreview from "./AssessmentPreview";

function RequestPreviewModal({ requestId, onClose }) {
  const navigate = useNavigate();
  const [changeRequest, setChangeRequest] = useState(null);
  const [forms, setForms] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [changeRequestResponse, inputsResponse] = await Promise.all([
          api.get(`/change-requests/${requestId}`),
          api.get(`/change-requests/${requestId}/assessment-inputs`),
        ]);

        if (cancelled) {
          return;
        }

        setChangeRequest(changeRequestResponse.data);
        const mapped = mapInputsToFormState(inputsResponse.data.inputs);
        setForms(mapped || { ...EMPTY_ASSESSMENT_FORMS });
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
              "Unable to load this request's assessment inputs."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="flex max-h-full w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {changeRequest?.request_number || "Request preview"}
            </p>
            <h3 className="mt-1 truncate text-lg font-semibold text-slate-900">
              {changeRequest?.title || "Loading…"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Loading request…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && forms && (
            <AssessmentPreview
              productForm={forms.productForm}
              customerForm={forms.customerForm}
              geographyForm={forms.geographyForm}
              transactionForm={forms.transactionForm}
              channelForm={forms.channelForm}
              vendorForm={forms.vendorForm}
              hideActions
            />
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => navigate(`/assessment/${requestId}`)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Open full assessment
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default RequestPreviewModal;

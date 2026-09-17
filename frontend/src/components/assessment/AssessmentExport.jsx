import { Download } from "lucide-react";

import api from "../../services/api";

function AssessmentExport({ changeRequestId, setError }) {
  const download = async (format) => {
    try {
      setError("");

      const response = await api.get(
        `/change-requests/${changeRequestId}/export`,
        {
          params: { format },
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type:
          format === "pdf"
            ? "application/pdf"
            : "application/json",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `assessment-${changeRequestId}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err?.response?.data?.detail || "Export failed."
      );
    }
  };

  return (
    <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => download("json")}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <Download size={15} />
        Export JSON
      </button>
      <button
        type="button"
        onClick={() => download("pdf")}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <Download size={15} />
        Export PDF
      </button>
    </div>
  );
}

export default AssessmentExport;

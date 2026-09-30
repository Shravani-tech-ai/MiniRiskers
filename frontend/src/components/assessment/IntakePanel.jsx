import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";

import api from "../../services/api";
import {
  btnDarkSm,
  btnPrimarySm,
  tabSelected,
  tabUnselected,
} from "../../utils/buttonStyles";

function IntakePanel({
  changeRequestId,
  intakeMode,
  setIntakeMode,
  completenessPercent,
  onExtractionApplied,
  setError,
  readOnly = false,
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [brdUpload, setBrdUpload] = useState(null);
  const [loadingBrdStatus, setLoadingBrdStatus] = useState(false);
  const [removingBrd, setRemovingBrd] = useState(false);

  const canExtract =
    Boolean(brdUpload?.uploaded) &&
    Boolean(brdUpload?.upload?.has_text);

  const refreshBrdStatus = useCallback(async () => {
    try {
      setLoadingBrdStatus(true);

      const response = await api.get(
        `/change-requests/${changeRequestId}/intake/brd-status`
      );

      setBrdUpload(response.data);
    } catch {
      setBrdUpload({ uploaded: false, upload: null });
    } finally {
      setLoadingBrdStatus(false);
    }
  }, [changeRequestId]);

  useEffect(() => {
    if (intakeMode === "brd") {
      refreshBrdStatus();
    }
  }, [intakeMode, refreshBrdStatus]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setUploading(true);
      setError("");
      setExtractionResult(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post(
        `/change-requests/${changeRequestId}/intake/upload-brd`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setBrdUpload({
        uploaded: true,
        upload: {
          filename: response.data.filename,
          size_bytes: file.size,
          character_count: response.data.character_count,
          has_text: (response.data.character_count || 0) > 0,
          uploaded_at: new Date().toISOString(),
          preview: response.data.preview,
        },
      });
    } catch (err) {
      setError(
        err?.response?.data?.detail || "Failed to upload BRD."
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveBrd = async () => {
    try {
      setRemovingBrd(true);
      setError("");

      await api.delete(`/change-requests/${changeRequestId}/intake/brd`);

      setBrdUpload({ uploaded: false, upload: null });
      setExtractionResult(null);
    } catch (err) {
      setError(
        err?.response?.data?.detail || "Failed to remove BRD."
      );
    } finally {
      setRemovingBrd(false);
    }
  };

  const handleExtract = async () => {
    if (!canExtract) {
      setError(
        "Upload a text-based BRD file before extracting fields."
      );
      return;
    }

    try {
      setExtracting(true);
      setError("");

      const response = await api.post(
        `/change-requests/${changeRequestId}/intake/extract-brd`
      );

      setExtractionResult(response.data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
          ? detail.map((item) => item.msg || JSON.stringify(item)).join(" ")
          : "Failed to extract BRD. Try a .txt file or check GEMINI_API_KEY."
      );
    } finally {
      setExtracting(false);
    }
  };

  const handleApplyExtraction = () => {
    if (!extractionResult?.merged_preview) {
      return;
    }

    setError("");
    onExtractionApplied(extractionResult.merged_preview);
    setExtractionResult(null);
  };

  const uploadInfo = brdUpload?.upload;

  return (
    <div className="mb-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      <div className="border-b border-slate-200 dark:border-slate-700 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Intake method
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Upload a BRD or enter values manually. Completeness:{" "}
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {completenessPercent ?? 0}%
              </span>
            </p>
          </div>

          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-1">
            <button
              type="button"
              onClick={() => setIntakeMode("brd")}
              className={[
                "rounded-md px-4 py-2 text-sm font-semibold transition",
                intakeMode === "brd" ? tabSelected : tabUnselected,
              ].join(" ")}
            >
              BRD upload
            </button>
            <button
              type="button"
              onClick={() => setIntakeMode("manual")}
              className={[
                "rounded-md px-4 py-2 text-sm font-semibold transition",
                intakeMode === "manual" ? tabSelected : tabUnselected,
              ].join(" ")}
            >
              Manual entry
            </button>
          </div>
        </div>
      </div>

      {intakeMode === "brd" && (
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={handleUpload}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={readOnly || uploading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileUp size={16} />
              )}
              {uploading ? "Uploading..." : "Upload BRD"}
            </button>

            <button
              type="button"
              onClick={handleExtract}
              disabled={readOnly || extracting || !canExtract}
              title={
                canExtract
                  ? "Extract intake fields from uploaded BRD"
                  : "Upload a BRD with readable text first"
              }
              className={[
                btnPrimarySm,
                !canExtract ? "pointer-events-none" : "",
              ].join(" ")}
            >
              {extracting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              Extract fields
            </button>
          </div>

          {loadingBrdStatus && !uploadInfo && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Checking for uploaded BRD...
            </p>
          )}

          {uploadInfo && (
            <div
              className={[
                "rounded-lg border p-4",
                uploadInfo.has_text
                  ? "border-green-200 bg-green-50 dark:bg-green-950/40"
                  : "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                {uploadInfo.has_text ? (
                  <CheckCircle2
                    size={22}
                    className="mt-0.5 shrink-0 text-green-600"
                  />
                ) : (
                  <FileText
                    size={22}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {uploadInfo.has_text
                      ? "BRD uploaded successfully"
                      : "BRD uploaded but no text detected"}
                  </p>

                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-medium">File:</span>{" "}
                    {uploadInfo.filename}
                  </p>

                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {uploadInfo.character_count?.toLocaleString() || 0}{" "}
                    characters
                    {uploadInfo.size_bytes
                      ? ` · ${(uploadInfo.size_bytes / 1024).toFixed(1)} KB`
                      : ""}
                  </p>

                  {!uploadInfo.has_text && (
                    <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                      Use a .txt/.md file or a PDF with selectable text.
                      Image-only PDFs cannot be parsed.
                    </p>
                  )}

                  {uploadInfo.preview && uploadInfo.has_text && (
                    <p className="mt-3 line-clamp-3 rounded-md border border-green-100 bg-white dark:bg-slate-900/80 p-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
                      {uploadInfo.preview}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleRemoveBrd}
                  disabled={readOnly || removingBrd}
                  title="Remove uploaded BRD"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 disabled:opacity-50"
                >
                  {removingBrd ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Remove
                </button>
              </div>
            </div>
          )}

          {!uploadInfo && !loadingBrdStatus && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No BRD uploaded yet. Upload a file to enable extraction.
            </p>
          )}

          {extractionResult && (
            <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40/40 p-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Review extracted values
              </p>

              {(extractionResult.extraction_method === "rules" ||
                extractionResult.extraction_method === "heuristic") && (
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                  AI was unavailable; rule-based parsing was used. Review
                  fields carefully.
                </p>
              )}

              {extractionResult.extraction_method === "ai+rules" && (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Combined AI extraction and rule-based field mapping.
                </p>
              )}

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {extractionResult.diff_from_saved?.length || 0} fields
                differ from saved data. Apply to populate the forms
                below.
              </p>

              {extractionResult.diff_from_saved?.length > 0 && (
                <div className="mt-4 max-h-48 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Field</th>
                        <th className="px-3 py-2">Extracted</th>
                        <th className="px-3 py-2">Saved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractionResult.diff_from_saved.map(
                        (row) => (
                          <tr
                            key={`${row.section}.${row.field}`}
                            className="border-t border-slate-100 dark:border-slate-800"
                          >
                            <td className="px-3 py-2 font-medium">
                              {row.section}.{row.field}
                            </td>
                            <td className="px-3 py-2">
                              {String(row.current ?? "—")}
                            </td>
                            <td className="px-3 py-2 text-slate-400 dark:text-slate-500">
                              {String(row.baseline ?? "—")}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {(extractionResult.missing_fields?.length || 0) > 0 && (
                <p className="mt-3 text-sm text-amber-800 dark:text-amber-300">
                  {extractionResult.missing_fields.length} required field(s)
                  still missing after extraction. You can apply partial values,
                  then complete the manual forms below.
                </p>
              )}

              <button
                type="button"
                onClick={handleApplyExtraction}
                disabled={readOnly}
                className={`mt-4 ${btnDarkSm}`}
              >
                Apply to forms
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default IntakePanel;

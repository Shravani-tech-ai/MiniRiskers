import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  MessageSquare,
  Sparkles,
} from "lucide-react";

import api from "../../services/api";

function IntakePanel({
  changeRequestId,
  intakeMode,
  setIntakeMode,
  completenessPercent,
  missingFields,
  onExtractionApplied,
  onAgentUpdate,
  setError,
  readOnly = false,
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [brdUpload, setBrdUpload] = useState(null);
  const [loadingBrdStatus, setLoadingBrdStatus] = useState(false);

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

  const handleApplyExtraction = async () => {
    if (!extractionResult?.merged_preview) {
      return;
    }

    try {
      setError("");

      await api.post(
        `/change-requests/${changeRequestId}/intake/apply-extraction`,
        { extracted: extractionResult.merged_preview }
      );

      await onExtractionApplied(extractionResult.merged_preview);
      setExtractionResult(null);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Failed to apply extracted values."
      );
    }
  };

  const handleChat = async (event) => {
    event.preventDefault();

    if (!chatMessage.trim()) {
      return;
    }

    const userText = chatMessage.trim();
    setChatMessage("");

    try {
      setChatLoading(true);
      setError("");

      setChatHistory((previous) => [
        ...previous,
        { role: "user", content: userText },
      ]);

      const response = await api.post(
        `/change-requests/${changeRequestId}/intake/chat`,
        { message: userText }
      );

      setChatHistory((previous) => [
        ...previous,
        {
          role: "assistant",
          content: response.data.assistant_message,
        },
      ]);

      await onAgentUpdate(response.data);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Intake assistant could not respond."
      );
    } finally {
      setChatLoading(false);
    }
  };

  const uploadInfo = brdUpload?.upload;

  return (
    <div className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900">
              Intake method
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Upload a BRD or enter values manually. Completeness:{" "}
              <span className="font-semibold text-indigo-600">
                {completenessPercent ?? 0}%
              </span>
            </p>
          </div>

          <div className="flex rounded-lg border border-slate-200 p-1">
            <button
              type="button"
              onClick={() => setIntakeMode("brd")}
              className={[
                "rounded-md px-4 py-2 text-sm font-semibold transition",
                intakeMode === "brd"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              BRD upload
            </button>
            <button
              type="button"
              onClick={() => setIntakeMode("manual")}
              className={[
                "rounded-md px-4 py-2 text-sm font-semibold transition",
                intakeMode === "manual"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50",
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
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
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
                "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition",
                canExtract
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "cursor-not-allowed bg-slate-300",
                extracting ? "opacity-70" : "",
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
            <p className="text-sm text-slate-500">
              Checking for uploaded BRD...
            </p>
          )}

          {uploadInfo && (
            <div
              className={[
                "rounded-lg border p-4",
                uploadInfo.has_text
                  ? "border-green-200 bg-green-50"
                  : "border-amber-200 bg-amber-50",
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
                  <p className="text-sm font-semibold text-slate-900">
                    {uploadInfo.has_text
                      ? "BRD uploaded successfully"
                      : "BRD uploaded but no text detected"}
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    <span className="font-medium">File:</span>{" "}
                    {uploadInfo.filename}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    {uploadInfo.character_count?.toLocaleString() || 0}{" "}
                    characters
                    {uploadInfo.size_bytes
                      ? ` · ${(uploadInfo.size_bytes / 1024).toFixed(1)} KB`
                      : ""}
                  </p>

                  {!uploadInfo.has_text && (
                    <p className="mt-2 text-xs text-amber-800">
                      Use a .txt/.md file or a PDF with selectable text.
                      Image-only PDFs cannot be parsed.
                    </p>
                  )}

                  {uploadInfo.preview && uploadInfo.has_text && (
                    <p className="mt-3 line-clamp-3 rounded-md border border-green-100 bg-white/80 p-2 text-xs leading-5 text-slate-600">
                      {uploadInfo.preview}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!uploadInfo && !loadingBrdStatus && (
            <p className="text-sm text-slate-500">
              No BRD uploaded yet. Upload a file to enable extraction.
            </p>
          )}

          {extractionResult && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Review extracted values
              </p>

              {(extractionResult.extraction_method === "rules" ||
                extractionResult.extraction_method === "heuristic") && (
                <p className="mt-1 text-xs text-amber-700">
                  AI was unavailable; rule-based parsing was used. Review
                  fields carefully.
                </p>
              )}

              {extractionResult.extraction_method === "ai+rules" && (
                <p className="mt-1 text-xs text-slate-600">
                  Combined AI extraction and rule-based field mapping.
                </p>
              )}

              <p className="mt-1 text-sm text-slate-600">
                {extractionResult.diff_from_saved?.length || 0} fields
                differ from saved data. Apply to populate the forms
                below.
              </p>

              {extractionResult.diff_from_saved?.length > 0 && (
                <div className="mt-4 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500">
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
                            className="border-t border-slate-100"
                          >
                            <td className="px-3 py-2 font-medium">
                              {row.section}.{row.field}
                            </td>
                            <td className="px-3 py-2">
                              {String(row.current ?? "—")}
                            </td>
                            <td className="px-3 py-2 text-slate-400">
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
                <p className="mt-3 text-sm text-amber-700">
                  {extractionResult.missing_fields.length} required field(s)
                  still missing after extraction. You can apply partial values,
                  then use the intake assistant or manual forms to finish.
                </p>
              )}

              <button
                type="button"
                onClick={handleApplyExtraction}
                disabled={readOnly}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Apply to forms
              </button>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-200 p-5">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare size={18} className="text-indigo-600" />
          <h4 className="font-semibold text-slate-900">
            Intake assistant
          </h4>
          <span className="text-xs text-slate-500">
            Asks only for missing required fields
          </span>
        </div>

        {missingFields?.length > 0 && (
          <p className="mb-3 text-sm text-amber-700">
            Still needed:{" "}
            {missingFields.map((field) => field.label).join(", ")}
          </p>
        )}

        <div className="mb-3 max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
          {chatHistory.length === 0 ? (
            <p className="text-sm text-slate-500">
              Ask a question or answer the assistant&apos;s prompts to
              fill gaps (e.g. &quot;Beneficiary country is UAE&quot;).
            </p>
          ) : (
            chatHistory.map((entry, index) => (
              <p
                key={index}
                className={[
                  "text-sm leading-6",
                  entry.role === "user"
                    ? "text-slate-800"
                    : "text-indigo-900",
                ].join(" ")}
              >
                <span className="font-semibold">
                  {entry.role === "user" ? "You: " : "Assistant: "}
                </span>
                {entry.content}
              </p>
            ))
          )}
        </div>

        <form onSubmit={handleChat} className="flex gap-2">
          <input
            type="text"
            value={chatMessage}
            onChange={(event) => setChatMessage(event.target.value)}
            placeholder="Type missing intake details..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={readOnly || chatLoading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default IntakePanel;

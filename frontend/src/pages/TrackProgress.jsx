import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Milestone } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import WorkflowStepper from "../components/assessment/WorkflowStepper";
import CycleTimePanel from "../components/assessment/CycleTimePanel";
import PageContainer from "../components/layout/PageContainer";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  canNavigateToWorkflowStage,
  normalizeWorkflowStage,
} from "../components/assessment/workflowStages";
import { getDisplayStatus, getLockedStages } from "../utils/rolePermissions";

const LAST_REQUEST_KEY = "lastChangeRequestId";

function resolveRequestId(items, ...candidates) {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") {
      continue;
    }

    const match = items.find((item) => String(item.id) === String(candidate));
    if (match) {
      return match.id;
    }
  }

  return items[0]?.id ?? null;
}

function TrackProgress() {
  const { changeRequestId: routeRequestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const lockedStages = getLockedStages(user?.role);

  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [changeRequest, setChangeRequest] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRequests() {
      try {
        setListLoading(true);
        setError("");
        const response = await api.get("/change-requests");
        if (cancelled) {
          return;
        }

        setRequests(response.data || []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.detail || "Unable to load change requests."
          );
        }
      } finally {
        if (!cancelled) {
          setListLoading(false);
        }
      }
    }

    loadRequests();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (listLoading || requests.length === 0) {
      return;
    }

    const storedId = sessionStorage.getItem(LAST_REQUEST_KEY);
    const nextId = resolveRequestId(requests, routeRequestId, storedId);

    if (!nextId) {
      return;
    }

    setSelectedId((current) =>
      String(current) === String(nextId) ? current : nextId
    );

    if (String(routeRequestId) !== String(nextId)) {
      navigate(`/track-progress/${nextId}`, { replace: true });
    }
  }, [listLoading, navigate, requests, routeRequestId]);

  useEffect(() => {
    if (!selectedId) {
      setChangeRequest(null);
      setAuditEvents([]);
      setDetailsLoading(false);
      return undefined;
    }

    let cancelled = false;

    async function loadRequestDetails() {
      try {
        setDetailsLoading(true);
        setError("");
        const [requestResponse, auditResponse] = await Promise.all([
          api.get(`/change-requests/${selectedId}`),
          api.get(`/change-requests/${selectedId}/audit-events`),
        ]);

        if (cancelled) {
          return;
        }

        setChangeRequest(requestResponse.data);

        if (Array.isArray(auditResponse.data)) {
          setAuditEvents(auditResponse.data);
        } else {
          setAuditEvents(auditResponse.data?.events || []);
        }

        sessionStorage.setItem(LAST_REQUEST_KEY, String(selectedId));
      } catch (err) {
        if (!cancelled) {
          setChangeRequest(null);
          setAuditEvents([]);
          setError(
            err?.response?.data?.detail ||
              "Unable to load workflow progress for this request."
          );
        }
      } finally {
        if (!cancelled) {
          setDetailsLoading(false);
        }
      }
    }

    loadRequestDetails();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const handleRequestChange = useCallback(
    (event) => {
      const nextId = Number(event.target.value);
      setSelectedId(nextId);
      navigate(`/track-progress/${nextId}`);
    },
    [navigate]
  );

  const handleStageSelect = useCallback(
    (stage) => {
      if (
        !selectedId ||
        lockedStages.includes(stage) ||
        !canNavigateToWorkflowStage(stage, changeRequest?.current_stage)
      ) {
        return;
      }

      navigate(`/assessment/${selectedId}`, {
        state: { activeView: stage },
      });
    },
    [selectedId, lockedStages, changeRequest?.current_stage, navigate]
  );

  const currentStage = useMemo(
    () => normalizeWorkflowStage(changeRequest?.current_stage),
    [changeRequest?.current_stage]
  );

  const showDetailsLoading =
    !listLoading && requests.length > 0 && selectedId && detailsLoading;
  const showDetails =
    !listLoading && requests.length > 0 && selectedId && changeRequest;

  return (
    <PageContainer>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Milestone size={22} />
            <span className="text-sm font-semibold uppercase tracking-wide">
              Workflow
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Track your Progress
          </h1>
          <p className="mt-2 max-w-2xl text-base text-slate-600 dark:text-slate-400">
            Follow each change request through intake, risk assessment, analyst
            review, and committee decision. Select a request to view its
            workflow timeline.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {listLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading change requests…
          </p>
        </div>
      ) : null}

      {!listLoading && requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-600 dark:bg-slate-900">
          <p className="text-base text-slate-600 dark:text-slate-400">
            No change requests yet. Create a request to track its progress here.
          </p>
          <Link
            to="/dashboard"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Go to Requests
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : null}

      {showDetailsLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading workflow progress…
          </p>
        </div>
      ) : null}

      {showDetails ? (
        <>
          <div className="mb-6 flex flex-wrap items-end gap-4">
            <label className="min-w-[240px] flex-1">
              <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Change request
              </span>
              <select
                value={selectedId ?? ""}
                onChange={handleRequestChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-900/40"
              >
                {requests.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.request_number} — {item.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {getDisplayStatus(changeRequest).label}
              </span>
              <Link
                to={`/assessment/${selectedId}`}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500"
              >
                Open assessment
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <WorkflowStepper
            variant="horizontal"
            title="Track your Progress"
            currentStage={changeRequest.current_stage}
            activeView={currentStage}
            auditEvents={auditEvents}
            onStageSelect={handleStageSelect}
            lockedStages={lockedStages}
          />

          <CycleTimePanel
            changeRequestId={selectedId}
            refreshKey={auditEvents.length}
          />
        </>
      ) : null}
    </PageContainer>
  );
}

export default TrackProgress;

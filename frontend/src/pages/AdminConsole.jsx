import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BrainCircuit,
  FileSearch,
  LayoutDashboard,
  MessageSquareHeart,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";

import api from "../services/api";
import PageContainer from "../components/layout/PageContainer";
import AuditPanel from "../components/admin/AuditPanel";
import ControlLibraryPanel from "../components/admin/ControlLibraryPanel";
import FeedbackPanel from "../components/admin/FeedbackPanel";
import SettingsPanel from "../components/admin/SettingsPanel";
import TrainingPanel from "../components/admin/TrainingPanel";
import UsersPanel from "../components/admin/UsersPanel";
import { Panel, Stat } from "../components/admin/ui";

const TABS = [
  { key: "overview", label: "Overview", Icon: LayoutDashboard },
  { key: "training", label: "Model training", Icon: BrainCircuit },
  { key: "feedback", label: "Feedback", Icon: MessageSquareHeart },
  { key: "controls", label: "Control library", Icon: ShieldCheck },
  { key: "users", label: "Users", Icon: Users },
  { key: "audit", label: "Audit", Icon: FileSearch },
  { key: "settings", label: "Settings", Icon: Settings2 },
];

function Overview({ goTo }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/admin/overview")
      .then((r) => setData(r.data))
      .catch(() => setError("Unable to load the overview."));
  }, []);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>;

  const approvals = data.pending_methodology + data.pending_regulations;
  const run = data.latest_training_run;
  const readyToTrain = data.decided_cases >= data.training_min_cases;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Waiting for your approval"
          value={approvals}
          hint={`${data.pending_methodology} methodology · ${data.pending_regulations} regulation`}
          tone={approvals ? "attention" : "default"}
        />
        <Stat label="Open requests" value={data.open_requests} />
        <Stat
          label="Average feedback"
          value={data.average_feedback_rating != null ? `${data.average_feedback_rating} / 5` : "—"}
          hint={`${data.feedback_responses} responses`}
          onClick={() => goTo("feedback")}
        />
        <Stat
          label="System matches final rating"
          value={data.system_vs_final_agreement != null ? `${data.system_vs_final_agreement}%` : "—"}
          hint={`${data.decided_cases} decided cases`}
          onClick={() => goTo("training")}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Approvals" subtitle="Changes the Risk Committee submitted for your sign-off">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between gap-3">
              <span>Methodology changes pending approval</span>
              <Link to="/methodology" className="font-semibold text-blue-700 hover:underline dark:text-blue-300">
                {data.pending_methodology} · Review
              </Link>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>Regulations uploaded by the Risk Committee</span>
              <Link to="/regulations" className="font-semibold text-blue-700 hover:underline dark:text-blue-300">
                {data.pending_regulations} · Review
              </Link>
            </li>
            {data.failed_regulation_indexing > 0 && (
              <li className="flex items-center justify-between gap-3 text-red-700 dark:text-red-300">
                <span>Regulations whose indexing failed</span>
                <Link to="/regulations" className="font-semibold hover:underline">{data.failed_regulation_indexing} · Fix</Link>
              </li>
            )}
            {data.users_needing_role > 0 && (
              <li className="flex items-center justify-between gap-3 text-amber-700 dark:text-amber-300">
                <span>Users on a retired role (e.g. Auditor) who cannot sign in</span>
                <button type="button" onClick={() => goTo("users")} className="font-semibold hover:underline">
                  {data.users_needing_role} · Assign role
                </button>
              </li>
            )}
          </ul>
        </Panel>

        <Panel title="Model training" subtitle="Learn from how analysts and the committee decided">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {readyToTrain
              ? `${data.decided_cases} decided cases are available; the minimum to train is ${data.training_min_cases}.`
              : `${data.decided_cases} of the ${data.training_min_cases} decided cases needed to train.`}
          </p>
          {run && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Last run #{run.id}: {run.message}
            </p>
          )}
          <button
            type="button"
            onClick={() => goTo("training")}
            className="mt-3 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
          >
            Open model training →
          </button>
        </Panel>
      </div>
    </div>
  );
}

function AdminConsole() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const tab = TABS.some((t) => t.key === requested) ? requested : "overview";
  const goTo = (key) => setSearchParams(key === "overview" ? {} : { tab: key });

  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 lg:text-4xl">Admin console</h1>
        <p className="mt-2 text-base text-slate-600 dark:text-slate-400 lg:text-lg">
          Approvals, audit, model training, feedback, the control library and system settings.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => goTo(key)}
            className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold ${
              tab === key
                ? "border-indigo-600 text-indigo-700 dark:text-indigo-300"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview goTo={goTo} />}
      {tab === "training" && <TrainingPanel />}
      {tab === "feedback" && <FeedbackPanel />}
      {tab === "controls" && <ControlLibraryPanel />}
      {tab === "users" && <UsersPanel />}
      {tab === "audit" && <AuditPanel />}
      {tab === "settings" && <SettingsPanel subtitle="All configurable settings in one place." />}
    </PageContainer>
  );
}

export default AdminConsole;

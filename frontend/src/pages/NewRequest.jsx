import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Layers,
  Loader2,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";
import PageContainer from "../components/layout/PageContainer";
import { useAuth } from "../context/AuthContext";

const STEPS = [
  { id: 1, title: "Change details", subtitle: "Describe the proposed change" },
  { id: 2, title: "Classification", subtitle: "Business and customer context" },
  { id: 3, title: "Review", subtitle: "Confirm and submit for intake" },
];

const CHANGE_TYPES = [
  { value: "NEW_PRODUCT", label: "New product" },
  { value: "PRODUCT_CHANGE", label: "Product change" },
  { value: "PROCESS_CHANGE", label: "Process change" },
  { value: "VENDOR_CHANGE", label: "Vendor change" },
  { value: "GEOGRAPHY_CHANGE", label: "Geography change" },
  { value: "CUSTOMER_SEGMENT_CHANGE", label: "Customer segment" },
];

const BUSINESS_UNITS = [
  "Retail Banking",
  "Commercial Banking",
  "Payments",
  "Wealth Management",
];

const CUSTOMER_SEGMENTS = [
  "Retail Customers",
  "Business Customers",
  "Retail and Business Customers",
  "High Net Worth Customers",
];

function NewRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    change_type: "",
    product_type: "",
    business_unit: "",
    customer_segment: "",
    requested_by: "",
  });

  useEffect(() => {
    if (user?.full_name || user?.username) {
      setFormData((previous) => ({
        ...previous,
        requested_by: user.full_name || user.username,
      }));
    }
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const setChangeType = (value) => {
    setFormData((previous) => ({
      ...previous,
      change_type: value,
    }));
  };

  const validateStep = (currentStep) => {
    if (currentStep === 1) {
      if (!formData.title.trim() || !formData.description.trim()) {
        setError("Title and description are required.");
        return false;
      }
      if (!formData.change_type) {
        setError("Select a change type to continue.");
        return false;
      }
    }

    if (currentStep === 2) {
      if (
        !formData.product_type.trim() ||
        !formData.business_unit ||
        !formData.customer_segment
      ) {
        setError("Complete product type, business unit, and customer segment.");
        return false;
      }
    }

    setError("");
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) {
      return;
    }
    setStep((previous) => Math.min(previous + 1, STEPS.length));
  };

  const goBack = () => {
    setError("");
    setStep((previous) => Math.max(previous - 1, 1));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateStep(3)) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.post("/change-requests", {
        title: formData.title.trim(),
        description: formData.description.trim(),
        change_type: formData.change_type,
        product_type: formData.product_type.trim(),
        business_unit: formData.business_unit,
        customer_segment: formData.customer_segment,
        requested_by: formData.requested_by.trim(),
      });

      const newId = response.data?.id;

      if (!newId) {
        setError("Change request was created but no ID was returned.");
        return;
      }

      navigate(`/assessment/${newId}`);
    } catch (err) {
      console.error("Failed to create change request:", err);

      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Unable to create the change request."
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedChangeLabel =
    CHANGE_TYPES.find((item) => item.value === formData.change_type)
      ?.label ?? "—";

  return (
    <PageContainer className="max-w-6xl">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mb-6 inline-flex items-center gap-2 text-base font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft size={18} />
          Back to change requests
        </button>

        <div className="mb-8 lg:mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
            New change request
          </h1>
          <p className="mt-3 text-base text-slate-600 lg:text-lg">
            Three-step intake for product, process, vendor, geography, or
            customer changes entering the FCRM assessment workflow.
          </p>
        </div>

        <div className="xl:grid xl:grid-cols-12 xl:gap-10">
        <ol className="mb-8 grid grid-cols-3 gap-2 sm:gap-4 xl:col-span-4 xl:mb-0 xl:grid-cols-1 xl:gap-3">
          {STEPS.map((wizardStep) => {
            const isComplete = step > wizardStep.id;
            const isCurrent = step === wizardStep.id;

            return (
              <li
                key={wizardStep.id}
                className={[
                  "rounded-xl border px-3 py-3 sm:px-4",
                  isCurrent
                    ? "border-indigo-200 bg-indigo-50"
                    : isComplete
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      isCurrent
                        ? "bg-indigo-600 text-white"
                        : isComplete
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600",
                    ].join(" ")}
                  >
                    {isComplete ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      wizardStep.id
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-900 sm:text-sm">
                      {wizardStep.title}
                    </p>
                    <p className="hidden truncate text-xs text-slate-500 sm:block">
                      {wizardStep.subtitle}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="xl:col-span-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-base text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {step === 1 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-indigo-50 p-2">
                    <FileText size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Change details
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Capture what is changing and why it needs FCRM review.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-5">
                <div>
                  <label
                    htmlFor="title"
                    className="text-sm font-medium text-slate-700"
                  >
                    Request title *
                  </label>
                  <input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Example: Digital international remittance launch"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3.5 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="text-sm font-medium text-slate-700"
                  >
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Describe the proposed change, channels, jurisdictions, and expected go-live context…"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3.5 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Change type *
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Select the primary classification for this intake.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CHANGE_TYPES.map((type) => {
                      const isSelected =
                        formData.change_type === type.value;

                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setChangeType(type.value)}
                          className={[
                            "rounded-full border px-4 py-2 text-sm font-medium transition",
                            isSelected
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-indigo-50 p-2">
                    <Layers size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Classification
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Map the change to product, business unit, and customer
                      exposure.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="product_type"
                    className="text-sm font-medium text-slate-700"
                  >
                    Product type *
                  </label>
                  <input
                    id="product_type"
                    name="product_type"
                    value={formData.product_type}
                    onChange={handleChange}
                    placeholder="DIGITAL_REMITTANCE"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="business_unit"
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
                  >
                    <Building2 size={15} className="text-slate-400" />
                    Business unit *
                  </label>
                  <select
                    id="business_unit"
                    name="business_unit"
                    value={formData.business_unit}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Select business unit</option>
                    {BUSINESS_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="customer_segment"
                    className="text-sm font-medium text-slate-700"
                  >
                    Customer segment *
                  </label>
                  <select
                    id="customer_segment"
                    name="customer_segment"
                    value={formData.customer_segment}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Select customer segment</option>
                    {CUSTOMER_SEGMENTS.map((segment) => (
                      <option key={segment} value={segment}>
                        {segment}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-indigo-50 p-2">
                      <UserRound size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-900">
                        Requester
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Who is accountable for this change in the business?
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <label
                    htmlFor="requested_by"
                    className="text-sm font-medium text-slate-700"
                  >
                    Requested by *
                  </label>
                  <input
                    id="requested_by"
                    name="requested_by"
                    value={formData.requested_by}
                    readOnly
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3.5 text-base text-slate-700"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Taken from your signed-in account.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-emerald-50 p-2">
                      <Sparkles size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-900">
                        Intake summary
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Submitting creates the request and opens the assessment
                        workbench for BRD intake and risk scoring.
                      </p>
                    </div>
                  </div>
                </div>

                <dl className="divide-y divide-slate-100 p-5 text-sm">
                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-slate-500">Title</dt>
                    <dd className="max-w-[60%] text-right font-medium text-slate-900">
                      {formData.title || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-slate-500">Change type</dt>
                    <dd className="font-medium text-slate-900">
                      {selectedChangeLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-slate-500">Product type</dt>
                    <dd className="font-medium text-slate-900">
                      {formData.product_type || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-slate-500">Business unit</dt>
                    <dd className="font-medium text-slate-900">
                      {formData.business_unit || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-slate-500">Customer segment</dt>
                    <dd className="font-medium text-slate-900">
                      {formData.customer_segment || "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <button
              type="button"
              onClick={() =>
                step === 1 ? navigate("/dashboard") : goBack()
              }
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {step === 1 ? "Cancel" : "Back"}
            </button>

            {step < STEPS.length ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Continue
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    Submit & open assessment
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </form>
        </div>
        </div>
    </PageContainer>
  );
}

export default NewRequest;

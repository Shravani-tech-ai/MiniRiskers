import { useEffect, useState } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Sparkles,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../services/api";

function getRiskClass(rating) {
  switch (rating) {
    case "CRITICAL":
      return "bg-red-100 text-red-700 border-red-200";

    case "HIGH":
      return "bg-orange-100 text-orange-700 border-orange-200";

    case "MEDIUM":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";

    case "LOW":
      return "bg-green-100 text-green-700 border-green-200";

    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getScoreColor(score) {
  if (score >= 76) {
    return "text-red-600";
  }

  if (score >= 51) {
    return "text-orange-600";
  }

  if (score >= 26) {
    return "text-yellow-600";
  }

  return "text-green-600";
}

function RiskCard({ title, score }) {
  const numericScore = Number(score || 0);

  let rating = "LOW";

  if (numericScore >= 76) {
    rating = "CRITICAL";
  } else if (numericScore >= 51) {
    rating = "HIGH";
  } else if (numericScore >= 26) {
    rating = "MEDIUM";
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <div className="mt-3 flex items-end justify-between">

        <span
          className={`text-3xl font-bold ${getScoreColor(
            numericScore
          )}`}
        >
          {numericScore.toFixed(1)}
        </span>

        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getRiskClass(
            rating
          )}`}
        >
          {rating}
        </span>

      </div>

    </div>
  );
}

function Assessment() {
  const { changeRequestId } = useParams();
  const navigate = useNavigate();

  const [changeRequest, setChangeRequest] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [regulatoryEvidence, setRegulatoryEvidence] = useState([]);
  const [aiAssessment, setAiAssessment] = useState(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [runningRiskAssessment, setRunningRiskAssessment] = useState(false);
  const [analystRating, setAnalystRating] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [consequences, setConsequences] = useState("");
  const [analystReviewed, setAnalystReviewed] = useState(false);
  const [committeeDecision, setCommitteeDecision] = useState("");
  const [committeeReason, setCommitteeReason] = useState("");
  const [committeeConditions, setCommitteeConditions] = useState("");
  const [committeeSubmitted, setCommitteeSubmitted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [productSaved, setProductSaved] = useState(false);
  const [customerSaved, setCustomerSaved] = useState(false);

  const [savingProduct, setSavingProduct] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [productForm, setProductForm] = useState({
    product_name: "",
    product_category: "",
    product_description: "",
    digital_channel: true,
    branch_channel: false,
    agent_channel: false,
    cross_border: true,
    cash_involved: false,
    transaction_type: "",
    transaction_limit: "",
    expected_transaction_volume: "",
    expected_transaction_frequency: "",
    currency: "INR",
    countries_supported: "",
    new_product_flag: true,
  });

  const [customerForm, setCustomerForm] = useState({
    customer_type: "INDIVIDUAL",
    customer_segment: "",
    individual_customer: true,
    business_customer: false,
    foreign_customer: false,
    onboarding_method: "",
    kyc_required: true,
    kyc_method: "",
    beneficial_owner_required: false,
    pep_exposure: false,
    high_risk_customer_exposure: false,
    expected_customer_count: "",
    customer_geographic_distribution: "",
  });

  const [geographySaved, setGeographySaved] = useState(false);
  const [transactionSaved, setTransactionSaved] = useState(false);

  const [savingGeography, setSavingGeography] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);

  const [geographyForm, setGeographyForm] = useState({
    country: "",
    country_code: "",
    domestic_or_cross_border: "CROSS_BORDER",
    customer_country: "India",
    transaction_country: "",
    beneficiary_country: "",
    high_risk_jurisdiction_flag: false,
    sanctions_exposure: false,
  });

  const [transactionForm, setTransactionForm] = useState({
    transaction_type: "",
    average_transaction_amount: "",
    maximum_transaction_amount: "",
    expected_daily_volume: "",
    expected_monthly_volume: "",
    expected_frequency: "",
    cash_involved: false,
    cross_border: true,
    number_of_countries: 4,
    transaction_velocity: 8,
    round_amount_risk: false,
    rapid_movement_possible: false,
  });

  const [channelSaved, setChannelSaved] = useState(false);
  const [vendorSaved, setVendorSaved] = useState(false);

  const [savingChannel, setSavingChannel] = useState(false);
  const [savingVendor, setSavingVendor] = useState(false);

  const [channelForm, setChannelForm] = useState({
    channel_type: "DIGITAL",
    mobile_banking: true,
    internet_banking: false,
    branch: false,
    agent: false,
    api: false,
    third_party_channel: false,
    remote_onboarding: true,
  });

  const [vendorForm, setVendorForm] = useState({
    vendor_name: "",
    vendor_type: "",
    country: "India",
    india_based: true,
    service_description: "",
    handles_customer_data: false,
    handles_transactions: false,
    handles_payment_data: false,
    criticality: "MEDIUM",
    outsourcing_type: "",
    due_diligence_completed: false,
    contract_completed: false,
    audit_rights: false,
    business_continuity_plan: false,
    cross_border_processing: false,
  });

  useEffect(() => {
    loadAssessment();
  }, [changeRequestId]);

  const loadAssessment = async () => {
    try {
      setLoading(true);
      setError("");

      const changeRequestResponse = await api.get(
        `/change-requests/${changeRequestId}`
      );

      setChangeRequest(changeRequestResponse.data);

      try {
        const riskAssessmentResponse = await api.get(
          `/change-requests/${changeRequestId}/risk-assessment`
        );

        setRiskAssessment(riskAssessmentResponse.data);
      } catch (riskError) {
        console.log(
          "No risk assessment available yet."
        );

        setRiskAssessment(null);
      }

      try {
        const evidenceResponse = await api.get(
          `/change-requests/${changeRequestId}/regulatory-evidence`
        );

        setRegulatoryEvidence(
          evidenceResponse.data.evidence || []
        );
      } catch (evidenceError) {
        console.log(
          "No regulatory evidence available yet."
        );

        setRegulatoryEvidence([]);
      }

    } catch (error) {
      console.error(
        "Failed to load change request:",
        error
      );

      setError(
        "Unable to load the change request."
      );
    } finally {
      setLoading(false);
    }
  };

  const saveProduct = async () => {
    if (!productForm.product_name.trim()) {
      setError("Please enter the product name.");
      return;
    }

    if (!productForm.transaction_type.trim()) {
      setError("Please enter the transaction type.");
      return;
    }

    try {
      setSavingProduct(true);
      setError("");

      const payload = {
        product_name: productForm.product_name,
        product_category: productForm.product_category,
        product_description: productForm.product_description,

        digital_channel: productForm.digital_channel,
        branch_channel: productForm.branch_channel,
        agent_channel: productForm.agent_channel,

        cross_border: productForm.cross_border,
        cash_involved: productForm.cash_involved,

        transaction_type: productForm.transaction_type,

        transaction_limit:
          productForm.transaction_limit === ""
            ? null
            : Number(productForm.transaction_limit),

        expected_transaction_volume:
          productForm.expected_transaction_volume === ""
            ? null
            : Number(productForm.expected_transaction_volume),

        expected_transaction_frequency:
          productForm.expected_transaction_frequency,

        currency: productForm.currency,

        countries_supported:
          productForm.countries_supported,

        new_product_flag: productForm.new_product_flag,
      };

      await api.post(
        `/change-requests/${changeRequestId}/product`,
        null,
        {
          params: payload,
        }
      );

      setProductSaved(true);

    } catch (error) {
      console.error("Failed to save product:", error);

      setError(
        error.response?.data?.detail ||
        "Unable to save product information."
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const saveCustomerProfile = async () => {
    if (!customerForm.customer_type) {
      setError("Please select the customer type.");
      return;
    }

    if (!customerForm.onboarding_method.trim()) {
      setError("Please enter the onboarding method.");
      return;
    }

    try {
      setSavingCustomer(true);
      setError("");

      const payload = {
        customer_type: customerForm.customer_type,
        customer_segment: customerForm.customer_segment,

        individual_customer:
          customerForm.individual_customer,

        business_customer:
          customerForm.business_customer,

        foreign_customer:
          customerForm.foreign_customer,

        onboarding_method:
          customerForm.onboarding_method,

        kyc_required:
          customerForm.kyc_required,

        kyc_method:
          customerForm.kyc_method,

        beneficial_owner_required:
          customerForm.beneficial_owner_required,

        pep_exposure:
          customerForm.pep_exposure,

        high_risk_customer_exposure:
          customerForm.high_risk_customer_exposure,

        expected_customer_count:
          customerForm.expected_customer_count === ""
            ? null
            : Number(customerForm.expected_customer_count),

        customer_geographic_distribution:
          customerForm.customer_geographic_distribution,
      };

      await api.post(
        `/change-requests/${changeRequestId}/customer-profile`,
        null,
        {
          params: payload,
        }
      );

      setCustomerSaved(true);

    } catch (error) {
      console.error(
        "Failed to save customer profile:",
        error
      );

      setError(
        error.response?.data?.detail ||
        "Unable to save customer profile."
      );
    } finally {
      setSavingCustomer(false);
    }
  };

  const saveChannel = async () => {
    if (!channelForm.channel_type.trim()) {
      setError("Please enter the channel type.");
      return;
    }

    try {
      setSavingChannel(true);
      setError("");

      await api.post(
        `/change-requests/${changeRequestId}/channel`,
        null,
        {
          params: channelForm,
        }
      );

      setChannelSaved(true);

    } catch (error) {
      console.error("Failed to save channel:", error);

      setError(
        error.response?.data?.detail ||
        "Unable to save channel information."
      );
    } finally {
      setSavingChannel(false);
    }
  };


  const saveVendor = async () => {
    if (!vendorForm.vendor_name.trim()) {
      setError("Please enter the vendor name.");
      return;
    }

    if (!vendorForm.vendor_type.trim()) {
      setError("Please enter the vendor type.");
      return;
    }

    try {
      setSavingVendor(true);
      setError("");

      await api.post(
        `/change-requests/${changeRequestId}/vendor`,
        null,
        {
          params: vendorForm,
        }
      );

      setVendorSaved(true);

    } catch (error) {
      console.error("Failed to save vendor:", error);

      setError(
        error.response?.data?.detail ||
        "Unable to save vendor information."
      );
    } finally {
      setSavingVendor(false);
    }
  };

  const saveGeography = async () => {
    if (!geographyForm.country.trim()) {
      setError("Please enter the country.");
      return;
    }

    if (!geographyForm.transaction_country.trim()) {
      setError("Please enter the transaction country.");
      return;
    }

    if (!geographyForm.beneficiary_country.trim()) {
      setError("Please enter the beneficiary country.");
      return;
    }

    try {
      setSavingGeography(true);
      setError("");

      const payload = {
        country: geographyForm.country,
        country_code: geographyForm.country_code,

        domestic_or_cross_border:
          geographyForm.domestic_or_cross_border,

        customer_country:
          geographyForm.customer_country,

        transaction_country:
          geographyForm.transaction_country,

        beneficiary_country:
          geographyForm.beneficiary_country,

        high_risk_jurisdiction_flag:
          geographyForm.high_risk_jurisdiction_flag,

        sanctions_exposure:
          geographyForm.sanctions_exposure,
      };

      await api.post(
        `/change-requests/${changeRequestId}/geography`,
        null,
        {
          params: payload,
        }
      );

      setGeographySaved(true);

    } catch (error) {
      console.error(
        "Failed to save geography:",
        error
      );

      setError(
        error.response?.data?.detail ||
        "Unable to save geography information."
      );
    } finally {
      setSavingGeography(false);
    }
  };

    const saveTransactionProfile = async () => {
    if (!transactionForm.transaction_type.trim()) {
      setError("Please enter the transaction type.");
      return;
    }

    try {
      setSavingTransaction(true);
      setError("");

      const payload = {
        transaction_type:
          transactionForm.transaction_type,

        average_transaction_amount:
          transactionForm.average_transaction_amount === ""
            ? null
            : Number(
                transactionForm.average_transaction_amount
              ),

        maximum_transaction_amount:
          transactionForm.maximum_transaction_amount === ""
            ? null
            : Number(
                transactionForm.maximum_transaction_amount
              ),

        expected_daily_volume:
          transactionForm.expected_daily_volume === ""
            ? null
            : Number(
                transactionForm.expected_daily_volume
              ),

        expected_monthly_volume:
          transactionForm.expected_monthly_volume === ""
            ? null
            : Number(
                transactionForm.expected_monthly_volume
              ),

        expected_frequency:
          transactionForm.expected_frequency,

        cash_involved:
          transactionForm.cash_involved,

        cross_border:
          transactionForm.cross_border,

        number_of_countries:
          transactionForm.number_of_countries === ""
            ? null
            : Number(
                transactionForm.number_of_countries
              ),

        transaction_velocity:
          transactionForm.transaction_velocity === ""
            ? null
            : Number(
                transactionForm.transaction_velocity
              ),

        round_amount_risk:
          transactionForm.round_amount_risk,

        rapid_movement_possible:
          transactionForm.rapid_movement_possible,
      };

      await api.post(
        `/change-requests/${changeRequestId}/transaction-profile`,
        null,
        {
          params: payload,
        }
      );

      setTransactionSaved(true);

    } catch (error) {
      console.error(
        "Failed to save transaction profile:",
        error
      );

      setError(
        error.response?.data?.detail ||
        "Unable to save transaction profile."
      );
    } finally {
      setSavingTransaction(false);
    }
  };

  const runRiskAssessment = async () => {
    try {
      setRunningRiskAssessment(true);
      setError("");

      // Step 1: Generate risk factors
      await api.post(
        `/change-requests/${changeRequestId}/generate-risk-factors`
      );

      // Step 2: Calculate risk
      await api.post(
        `/change-requests/${changeRequestId}/calculate-risk`
      );

      // Step 3: Generate regulatory evidence
      await api.post(
        `/change-requests/${changeRequestId}/generate-regulatory-evidence`
      );

      // Step 4: Reload risk assessment + evidence
      await loadAssessment();

    } catch (error) {
      console.error(
        "Failed to run risk assessment:",
        error
      );

      setError(
        error.response?.data?.detail ||
        "Unable to complete the risk assessment."
      );
    } finally {
      setRunningRiskAssessment(false);
    }
  };

  const generateAIAssessment = async () => {
    try {
      setGeneratingAI(true);
      setError("");

      const response = await api.post(
        `/change-requests/${changeRequestId}/generate-ai-assessment`
      );

      setAiAssessment(response.data);

    } catch (error) {
      console.error("Failed to generate AI assessment:", error);

      setError(
        error.response?.data?.detail ||
        "Unable to generate AI assessment."
      );
    } finally {
      setGeneratingAI(false);
    }
  };

  const submitAnalystReview = () => {
    if (!analystRating) {
      setError("Please select an analyst rating.");
      return;
    }

    if (
      analystRating !== riskAssessment?.residual_rating &&
      !overrideReason.trim()
    ) {
      setError(
        "Please provide a reason when overriding the system rating."
      );
      return;
    }

    setError("");
    setAnalystReviewed(true);

    console.log("Analyst Review:", {
      changeRequestId,
      systemRating: riskAssessment?.residual_rating,
      analystRating,
      overrideReason,
      consequences
    });
  };

  const submitCommitteeDecision = () => {
    if (!committeeDecision) {
      setError("Please select a committee decision.");
      return;
    }

    if (
      committeeDecision === "APPROVE_WITH_CONDITIONS" &&
      !committeeConditions.trim()
    ) {
      setError(
        "Please specify the conditions for approval."
      );
      return;
    }

    if (!committeeReason.trim()) {
      setError(
        "Please provide the rationale for the committee decision."
      );
      return;
    }

    setError("");

    setCommitteeSubmitted(true);

    console.log("Committee Decision:", {
      changeRequestId,
      decision: committeeDecision,
      rationale: committeeReason,
      conditions: committeeConditions
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">

        <div className="mx-auto max-w-7xl">

          <p className="text-sm text-slate-500">
            Loading risk assessment...
          </p>

        </div>

      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">

        <div className="mx-auto max-w-7xl">

          <button
            onClick={() => navigate("/")}
            className="mb-6 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Change Requests
          </button>

          <div className="rounded-xl border border-red-200 bg-red-50 p-6">

            <div className="flex items-center gap-3">

              <AlertTriangle
                size={20}
                className="text-red-600"
              />

              <p className="text-sm text-red-700">
                {error}
              </p>

            </div>

          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ========================================================= */}
      {/* PAGE HEADER */}
      {/* ========================================================= */}

      <div className="border-b border-slate-200 bg-white">

        <div className="mx-auto max-w-7xl px-8 py-6">

          <button
            onClick={() => navigate("/")}
            className="mb-5 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Change Requests
          </button>

          {changeRequest && (
            <>

              <div className="flex items-center gap-3">

                <span className="text-sm font-semibold text-slate-500">
                  {changeRequest.request_number}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {changeRequest.status || "DRAFT"}
                </span>

              </div>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                {changeRequest.title}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                {changeRequest.business_unit}
                {" • "}
                {changeRequest.product_type}
                {" • "}
                {changeRequest.customer_segment}
              </p>

              <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-600">
                {changeRequest.description}
              </p>

            </>
          )}

        </div>

      </div>


      {/* ========================================================= */}
      {/* MAIN CONTENT */}
      {/* ========================================================= */}

      <main className="mx-auto max-w-7xl px-8 py-8">
        {/* ========================================================= */}
{/* ASSESSMENT INPUTS */}
{/* ========================================================= */}

<div className="mb-8">

  <div className="mb-6">

    <h2 className="text-xl font-semibold text-slate-900">
      Assessment Inputs
    </h2>

    <p className="mt-1 text-sm text-slate-500">
      Provide structured information required for the financial
      crime risk assessment.
    </p>

  </div>


  {/* ======================================================= */}
  {/* PRODUCT INFORMATION */}
  {/* ======================================================= */}

  <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

    <div className="border-b border-slate-200 bg-slate-50 p-6">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="font-semibold text-slate-900">
            Product Information
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Define the product characteristics and transaction
            capabilities.
          </p>

        </div>

        {productSaved && (
          <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
            ✓ Saved
          </span>
        )}

      </div>

    </div>


    <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">


      {/* Product Name */}

      <div>

        <label className="text-sm font-medium text-slate-700">
          Product Name *
        </label>

        <input
          type="text"
          value={productForm.product_name}
          onChange={(e) =>
            setProductForm({
              ...productForm,
              product_name: e.target.value,
            })
          }
          placeholder="Digital International Remittance"
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />

      </div>


      {/* Product Category */}

      <div>

        <label className="text-sm font-medium text-slate-700">
          Product Category
        </label>

        <input
          type="text"
          value={productForm.product_category}
          onChange={(e) =>
            setProductForm({
              ...productForm,
              product_category: e.target.value,
            })
          }
          placeholder="Payments / Remittance"
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />

      </div>


      {/* Description */}

      <div className="md:col-span-2">

        <label className="text-sm font-medium text-slate-700">
          Product Description
        </label>

        <textarea
          rows={3}
          value={productForm.product_description}
          onChange={(e) =>
            setProductForm({
              ...productForm,
              product_description: e.target.value,
            })
          }
          placeholder="Describe how the product works..."
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />

      </div>


      {/* Transaction Type */}

      <div>

        <label className="text-sm font-medium text-slate-700">
          Transaction Type *
        </label>

        <input
          type="text"
          value={productForm.transaction_type}
          onChange={(e) =>
            setProductForm({
              ...productForm,
              transaction_type: e.target.value,
            })
          }
          placeholder="International Remittance"
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />

      </div>


      {/* Currency */}

      <div>

        <label className="text-sm font-medium text-slate-700">
          Currency
        </label>

        <input
          type="text"
          value={productForm.currency}
          onChange={(e) =>
            setProductForm({
              ...productForm,
              currency: e.target.value,
            })
          }
          placeholder="INR"
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />

      </div>


      {/* Transaction Limit */}

      <div>

        <label className="text-sm font-medium text-slate-700">
          Transaction Limit
        </label>

        <input
          type="number"
          value={productForm.transaction_limit}
          onChange={(e) =>
            setProductForm({
              ...productForm,
              transaction_limit: e.target.value,
            })
          }
          placeholder="500000"
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />

      </div>


      {/* Expected Volume */}

      <div>

        <label className="text-sm font-medium text-slate-700">
          Expected Transaction Volume
        </label>

        <input
          type="number"
          value={productForm.expected_transaction_volume}
          onChange={(e) =>
            setProductForm({
              ...productForm,
              expected_transaction_volume: e.target.value,
            })
          }
          placeholder="10000"
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />

      </div>


      {/* Frequency */}

      <div>

        <label className="text-sm font-medium text-slate-700">
          Expected Transaction Frequency
        </label>

        <select
          value={productForm.expected_transaction_frequency}
          onChange={(e) =>
            setProductForm({
              ...productForm,
              expected_transaction_frequency: e.target.value,
            })
          }
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >

          <option value="">
            Select frequency
          </option>

          <option value="LOW">
            Low
          </option>

          <option value="MEDIUM">
            Medium
          </option>

          <option value="HIGH">
            High
          </option>

          <option value="VERY_HIGH">
            Very High
          </option>

        </select>

      </div>


      {/* Countries */}

      <div>

        <label className="text-sm font-medium text-slate-700">
          Supported Countries
        </label>

        <input
          type="text"
          value={productForm.countries_supported}
          onChange={(e) =>
            setProductForm({
              ...productForm,
              countries_supported: e.target.value,
            })
          }
          placeholder="UAE, Singapore, UK, USA"
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />

      </div>


      {/* Checkboxes */}

      <div className="md:col-span-2">

        <p className="mb-3 text-sm font-medium text-slate-700">
          Product Characteristics
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

          <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

            <input
              type="checkbox"
              checked={productForm.digital_channel}
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  digital_channel: e.target.checked,
                })
              }
            />

            <span className="text-sm text-slate-700">
              Digital Channel
            </span>

          </label>


          <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

            <input
              type="checkbox"
              checked={productForm.cross_border}
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  cross_border: e.target.checked,
                })
              }
            />

            <span className="text-sm text-slate-700">
              Cross Border
            </span>

          </label>


          <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

            <input
              type="checkbox"
              checked={productForm.cash_involved}
              onChange={(e) =>
                setProductForm({
                  ...productForm,
                  cash_involved: e.target.checked,
                })
              }
            />

            <span className="text-sm text-slate-700">
              Cash Involved
            </span>

          </label>

        </div>

      </div>

    </div>


    {/* Product Footer */}

    <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">

      <button
        onClick={saveProduct}
        disabled={savingProduct}
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {savingProduct
          ? "Saving..."
          : productSaved
          ? "Update Product"
          : "Save Product"}
      </button>

    </div>

  </div>

</div>

{/* ======================================================= */}
{/* CUSTOMER PROFILE */}
{/* ======================================================= */}

<div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">

  {/* Header */}

  <div className="border-b border-slate-200 bg-slate-50 p-6">

    <div className="flex items-center justify-between">

      <div>

        <h3 className="font-semibold text-slate-900">
          Customer Profile
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Define the customer population, onboarding method, and
          financial crime exposure.
        </p>

      </div>

      {customerSaved && (
        <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
          ✓ Saved
        </span>
      )}

    </div>

  </div>


  {/* Form */}

  <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">


    {/* Customer Type */}

    <div>

      <label className="text-sm font-medium text-slate-700">
        Customer Type *
      </label>

      <select
        value={customerForm.customer_type}
        onChange={(e) =>
          setCustomerForm({
            ...customerForm,
            customer_type: e.target.value,
          })
        }
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      >

        <option value="INDIVIDUAL">
          Individual
        </option>

        <option value="BUSINESS">
          Business
        </option>

        <option value="BOTH">
          Individual + Business
        </option>

      </select>

    </div>


    {/* Customer Segment */}

    <div>

      <label className="text-sm font-medium text-slate-700">
        Customer Segment
      </label>

      <input
        type="text"
        value={customerForm.customer_segment}
        onChange={(e) =>
          setCustomerForm({
            ...customerForm,
            customer_segment: e.target.value,
          })
        }
        placeholder="Retail Customers"
        className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />

    </div>


    {/* Onboarding Method */}

    <div>

      <label className="text-sm font-medium text-slate-700">
        Onboarding Method *
      </label>

      <select
        value={customerForm.onboarding_method}
        onChange={(e) =>
          setCustomerForm({
            ...customerForm,
            onboarding_method: e.target.value,
          })
        }
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      >

        <option value="">
          Select onboarding method
        </option>

        <option value="BRANCH">
          Branch
        </option>

        <option value="DIGITAL">
          Digital
        </option>

        <option value="REMOTE">
          Remote / Video KYC
        </option>

        <option value="AGENT">
          Agent Assisted
        </option>

        <option value="MIXED">
          Mixed
        </option>

      </select>

    </div>


    {/* KYC Method */}

    <div>

      <label className="text-sm font-medium text-slate-700">
        KYC Method
      </label>

      <select
        value={customerForm.kyc_method}
        onChange={(e) =>
          setCustomerForm({
            ...customerForm,
            kyc_method: e.target.value,
          })
        }
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      >

        <option value="">
          Select KYC method
        </option>

        <option value="CKYC">
          CKYC
        </option>

        <option value="VIDEO_KYC">
          Video KYC
        </option>

        <option value="DIGITAL_KYC">
          Digital KYC
        </option>

        <option value="BRANCH_KYC">
          Branch KYC
        </option>

        <option value="MIXED">
          Mixed
        </option>

      </select>

    </div>


    {/* Expected Customer Count */}

    <div>

      <label className="text-sm font-medium text-slate-700">
        Expected Customer Count
      </label>

      <input
        type="number"
        value={customerForm.expected_customer_count}
        onChange={(e) =>
          setCustomerForm({
            ...customerForm,
            expected_customer_count: e.target.value,
          })
        }
        placeholder="100000"
        className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />

    </div>


    {/* Geographic Distribution */}

    <div>

      <label className="text-sm font-medium text-slate-700">
        Customer Geographic Distribution
      </label>

      <input
        type="text"
        value={customerForm.customer_geographic_distribution}
        onChange={(e) =>
          setCustomerForm({
            ...customerForm,
            customer_geographic_distribution: e.target.value,
          })
        }
        placeholder="India, UAE, Singapore, UK"
        className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />

    </div>


    {/* Customer Characteristics */}

    <div className="md:col-span-2">

      <p className="mb-3 text-sm font-medium text-slate-700">
        Customer Characteristics
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">


        {/* Foreign Customers */}

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={customerForm.foreign_customer}
            onChange={(e) =>
              setCustomerForm({
                ...customerForm,
                foreign_customer: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Foreign Customer Exposure
          </span>

        </label>


        {/* Beneficial Owner */}

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={customerForm.beneficial_owner_required}
            onChange={(e) =>
              setCustomerForm({
                ...customerForm,
                beneficial_owner_required: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Beneficial Owner Required
          </span>

        </label>


        {/* PEP */}

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={customerForm.pep_exposure}
            onChange={(e) =>
              setCustomerForm({
                ...customerForm,
                pep_exposure: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            PEP Exposure
          </span>

        </label>


        {/* High Risk Customers */}

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={customerForm.high_risk_customer_exposure}
            onChange={(e) =>
              setCustomerForm({
                ...customerForm,
                high_risk_customer_exposure:
                  e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            High-Risk Customer Exposure
          </span>

        </label>


        {/* KYC Required */}

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={customerForm.kyc_required}
            onChange={(e) =>
              setCustomerForm({
                ...customerForm,
                kyc_required: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            KYC Required
          </span>

        </label>


        {/* Individual Customer */}

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={customerForm.individual_customer}
            onChange={(e) =>
              setCustomerForm({
                ...customerForm,
                individual_customer: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Individual Customers
          </span>

        </label>


        {/* Business Customer */}

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={customerForm.business_customer}
            onChange={(e) =>
              setCustomerForm({
                ...customerForm,
                business_customer: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Business Customers
          </span>

        </label>

      </div>

    </div>

  </div>


  {/* Footer */}

  <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">

    <button
      onClick={saveCustomerProfile}
      disabled={savingCustomer}
      className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >

      {savingCustomer
        ? "Saving..."
        : customerSaved
        ? "Update Customer Profile"
        : "Save Customer Profile"}

    </button>

  </div>

</div>

        {/* ========================================================= */}
        {/* GEOGRAPHY */}
        {/* ========================================================= */}

        <div className="mb-8">

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

            {/* Header */}

            <div className="border-b border-slate-200 bg-slate-50 p-6">

              <div className="flex items-center justify-between">

                <div>

                  <h3 className="font-semibold text-slate-900">
                    Geography
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Define the geographic exposure associated with
                    customers, transactions, and beneficiaries.
                  </p>

                </div>

                {geographySaved && (
                  <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
                    ✓ Saved
                  </span>
                )}

              </div>

            </div>


            {/* Form */}

            <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">


              {/* Country */}

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Country *
                </label>

                <input
                  type="text"
                  value={geographyForm.country}
                  onChange={(e) =>
                    setGeographyForm({
                      ...geographyForm,
                      country: e.target.value,
                    })
                  }
                  placeholder="UAE"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

              </div>


              {/* Country Code */}

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Country Code
                </label>

                <input
                  type="text"
                  value={geographyForm.country_code}
                  onChange={(e) =>
                    setGeographyForm({
                      ...geographyForm,
                      country_code:
                        e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="AE"
                  maxLength={3}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

              </div>


              {/* Domestic / Cross Border */}

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Geographic Exposure *
                </label>

                <select
                  value={
                    geographyForm.domestic_or_cross_border
                  }
                  onChange={(e) =>
                    setGeographyForm({
                      ...geographyForm,
                      domestic_or_cross_border:
                        e.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >

                  <option value="DOMESTIC">
                    Domestic
                  </option>

                  <option value="CROSS_BORDER">
                    Cross Border
                  </option>

                </select>

              </div>


              {/* Customer Country */}

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Customer Country
                </label>

                <input
                  type="text"
                  value={geographyForm.customer_country}
                  onChange={(e) =>
                    setGeographyForm({
                      ...geographyForm,
                      customer_country:
                        e.target.value,
                    })
                  }
                  placeholder="India"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

              </div>


              {/* Transaction Country */}

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Transaction Country *
                </label>

                <input
                  type="text"
                  value={
                    geographyForm.transaction_country
                  }
                  onChange={(e) =>
                    setGeographyForm({
                      ...geographyForm,
                      transaction_country:
                        e.target.value,
                    })
                  }
                  placeholder="UAE"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

              </div>


              {/* Beneficiary Country */}

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Beneficiary Country *
                </label>

                <input
                  type="text"
                  value={
                    geographyForm.beneficiary_country
                  }
                  onChange={(e) =>
                    setGeographyForm({
                      ...geographyForm,
                      beneficiary_country:
                        e.target.value,
                    })
                  }
                  placeholder="UAE"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

              </div>


              {/* Risk Flags */}

              <div className="md:col-span-2">

                <p className="mb-3 text-sm font-medium text-slate-700">
                  Geographic Risk Indicators
                </p>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">


                  {/* High Risk Jurisdiction */}

                  <label className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3">

                    <input
                      type="checkbox"
                      checked={
                        geographyForm.high_risk_jurisdiction_flag
                      }
                      onChange={(e) =>
                        setGeographyForm({
                          ...geographyForm,
                          high_risk_jurisdiction_flag:
                            e.target.checked,
                        })
                      }
                    />

                    <span className="text-sm font-medium text-orange-800">
                      High-Risk Jurisdiction Exposure
                    </span>

                  </label>


                  {/* Sanctions */}

                  <label className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3">

                    <input
                      type="checkbox"
                      checked={
                        geographyForm.sanctions_exposure
                      }
                      onChange={(e) =>
                        setGeographyForm({
                          ...geographyForm,
                          sanctions_exposure:
                            e.target.checked,
                        })
                      }
                    />

                    <span className="text-sm font-medium text-red-800">
                      Sanctions Exposure
                    </span>

                  </label>

                </div>

              </div>

            </div>


            {/* Footer */}

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">

              <button
                onClick={saveGeography}
                disabled={savingGeography}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {savingGeography
                  ? "Saving..."
                  : geographySaved
                  ? "Update Geography"
                  : "Save Geography"}

              </button>

            </div>

          </div>

        </div>

                {/* ========================================================= */}
        {/* TRANSACTION PROFILE */}
        {/* ========================================================= */}

        <div className="mb-8">

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

            {/* Header */}

            <div className="border-b border-slate-200 bg-slate-50 p-6">

              <div className="flex items-center justify-between">

                <div>

                  <h3 className="font-semibold text-slate-900">
                    Transaction Profile
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Define transaction amounts, volumes, velocity,
                    and transaction behaviour.
                  </p>

                </div>

                {transactionSaved && (
                  <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
                    ✓ Saved
                  </span>
                )}

              </div>

            </div>


            {/* Form */}

            <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">


              {/* Transaction Type */}

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Transaction Type *
                </label>

                <input
                  type="text"
                  value={
                    transactionForm.transaction_type
                  }
                  onChange={(e) =>
                    setTransactionForm({
                      ...transactionForm,
                      transaction_type:
                        e.target.value,
                    })
                  }
                  placeholder="International Remittance"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

              </div>


              {/* Frequency */}

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Expected Frequency
                </label>

                <select
                  value={
                    transactionForm.expected_frequency
                  }
                  onChange={(e) =>
                    setTransactionForm({
                      ...transactionForm,
                      expected_frequency:
                        e.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >

                  <option value="">
                    Select frequency
                  </option>

                  <option value="LOW">
                    Low
                  </option>

                  <option value="MEDIUM">
                    Medium
                  </option>

                  <option value="HIGH">
                    High
                  </option>

                  <option value="VERY_HIGH">
                    Very High
                  </option>

                </select>

              </div>


              {/* Average Amount */}

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Average Transaction Amount
                </label>

                <input
                  type="number"
                  value={
                    transactionForm.average_transaction_amount
                  }
                  onChange={(e) =>
                    setTransactionForm({
                      ...transactionForm,
                      average_transaction_amount:
                        e.target.value,
                    })
                  }
                  placeholder="50000"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

              </div>


              {/* Maximum Amount */}

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Maximum Transaction Amount
                </label>

                <input
                  type="number"
                  value={
                    transactionForm.maximum_transaction_amount
                  }
                  onChange={(e) =>
                    setTransactionForm({
                      ...transactionForm,
                      maximum_transaction_amount:
                        e.target.value,
                    })
                  }
                  placeholder="500000"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

              </div>


              {/* Daily Volume */}

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Expected Daily Volume
                </label>

                <input
                  type="number"
                  value={
                    transactionForm.expected_daily_volume
                  }
                  onChange={(e) =>
                    setTransactionForm({
                      ...transactionForm,
                      expected_daily_volume:
                        e.target.value,
                    })
                  }
                  placeholder="10000"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

              </div>


              {/* Monthly Volume */}

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Expected Monthly Volume
                </label>

                <input
                  type="number"
                  value={
                    transactionForm.expected_monthly_volume
                  }
                  onChange={(e) =>
                    setTransactionForm({
                      ...transactionForm,
                      expected_monthly_volume:
                        e.target.value,
                    })
                  }
                  placeholder="300000"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

              </div>


              {/* Number of Countries */}

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Number of Countries
                </label>

                <input
                  type="number"
                  value={
                    transactionForm.number_of_countries
                  }
                  onChange={(e) =>
                    setTransactionForm({
                      ...transactionForm,
                      number_of_countries:
                        e.target.value,
                    })
                  }
                  placeholder="4"
                  min="1"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

              </div>


              {/* Transaction Velocity */}

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Transaction Velocity
                </label>

                <input
                  type="number"
                  value={
                    transactionForm.transaction_velocity
                  }
                  onChange={(e) =>
                    setTransactionForm({
                      ...transactionForm,
                      transaction_velocity:
                        e.target.value,
                    })
                  }
                  placeholder="8"
                  min="0"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <p className="mt-1 text-xs text-slate-400">
                  Expected transactions per customer per day.
                </p>

              </div>


              {/* Behavioural Indicators */}

              <div className="md:col-span-2">

                <p className="mb-3 text-sm font-medium text-slate-700">
                  Transaction Risk Indicators
                </p>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">


                  {/* Cash */}

                  <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

                    <input
                      type="checkbox"
                      checked={
                        transactionForm.cash_involved
                      }
                      onChange={(e) =>
                        setTransactionForm({
                          ...transactionForm,
                          cash_involved:
                            e.target.checked,
                        })
                      }
                    />

                    <span className="text-sm text-slate-700">
                      Cash Involved
                    </span>

                  </label>


                  {/* Cross Border */}

                  <label className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">

                    <input
                      type="checkbox"
                      checked={
                        transactionForm.cross_border
                      }
                      onChange={(e) =>
                        setTransactionForm({
                          ...transactionForm,
                          cross_border:
                            e.target.checked,
                        })
                      }
                    />

                    <span className="text-sm font-medium text-blue-800">
                      Cross-Border Transactions
                    </span>

                  </label>


                  {/* Round Amount */}

                  <label className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3">

                    <input
                      type="checkbox"
                      checked={
                        transactionForm.round_amount_risk
                      }
                      onChange={(e) =>
                        setTransactionForm({
                          ...transactionForm,
                          round_amount_risk:
                            e.target.checked,
                        })
                      }
                    />

                    <span className="text-sm font-medium text-orange-800">
                      Round Amount Pattern
                    </span>

                  </label>


                  {/* Rapid Movement */}

                  <label className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3">

                    <input
                      type="checkbox"
                      checked={
                        transactionForm.rapid_movement_possible
                      }
                      onChange={(e) =>
                        setTransactionForm({
                          ...transactionForm,
                          rapid_movement_possible:
                            e.target.checked,
                        })
                      }
                    />

                    <span className="text-sm font-medium text-red-800">
                      Rapid Movement Possible
                    </span>

                  </label>

                </div>

              </div>

            </div>


            {/* Footer */}

            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">

              <button
                onClick={saveTransactionProfile}
                disabled={savingTransaction}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {savingTransaction
                  ? "Saving..."
                  : transactionSaved
                  ? "Update Transaction Profile"
                  : "Save Transaction Profile"}

              </button>

            </div>

          </div>

        </div>

        {/* ======================================================= */}
{/* CHANNEL INFORMATION */}
{/* ======================================================= */}

<div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm">

  <div className="border-b border-slate-200 bg-slate-50 p-6">

    <div className="flex items-center justify-between">

      <div>

        <h3 className="font-semibold text-slate-900">
          Channel Information
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Define the channels through which customers access and use the product.
        </p>

      </div>

      {channelSaved && (
        <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
          ✓ Saved
        </span>
      )}

    </div>

  </div>


  <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

    {/* Channel Type */}

    <div>

      <label className="text-sm font-medium text-slate-700">
        Channel Type *
      </label>

      <select
        value={channelForm.channel_type}
        onChange={(e) =>
          setChannelForm({
            ...channelForm,
            channel_type: e.target.value,
          })
        }
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      >

        <option value="DIGITAL">
          Digital
        </option>

        <option value="BRANCH">
          Branch
        </option>

        <option value="AGENT">
          Agent
        </option>

        <option value="API">
          API
        </option>

        <option value="HYBRID">
          Hybrid
        </option>

      </select>

    </div>


    {/* Channel Characteristics */}

    <div className="md:col-span-2">

      <p className="mb-3 text-sm font-medium text-slate-700">
        Channel Characteristics
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">

        {/* Mobile Banking */}

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={channelForm.mobile_banking}
            onChange={(e) =>
              setChannelForm({
                ...channelForm,
                mobile_banking: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Mobile Banking
          </span>

        </label>


        {/* Internet Banking */}

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={channelForm.internet_banking}
            onChange={(e) =>
              setChannelForm({
                ...channelForm,
                internet_banking: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Internet Banking
          </span>

        </label>


        {/* Branch */}

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={channelForm.branch}
            onChange={(e) =>
              setChannelForm({
                ...channelForm,
                branch: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Branch
          </span>

        </label>


        {/* Agent */}

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={channelForm.agent}
            onChange={(e) =>
              setChannelForm({
                ...channelForm,
                agent: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Agent
          </span>

        </label>


        {/* API */}

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={channelForm.api}
            onChange={(e) =>
              setChannelForm({
                ...channelForm,
                api: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            API
          </span>

        </label>


        {/* Third Party */}

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={channelForm.third_party_channel}
            onChange={(e) =>
              setChannelForm({
                ...channelForm,
                third_party_channel: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Third-Party Channel
          </span>

        </label>


        {/* Remote Onboarding */}

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={channelForm.remote_onboarding}
            onChange={(e) =>
              setChannelForm({
                ...channelForm,
                remote_onboarding: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Remote Onboarding
          </span>

        </label>

      </div>

    </div>

  </div>


  {/* Footer */}

  <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">

    <button
      onClick={saveChannel}
      disabled={savingChannel}
      className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >

      {savingChannel
        ? "Saving..."
        : channelSaved
        ? "Update Channel"
        : "Save Channel"}

    </button>

  </div>

</div>

{/* ======================================================= */}
{/* VENDOR / THIRD-PARTY INFORMATION */}
{/* ======================================================= */}

<div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm">

  <div className="border-b border-slate-200 bg-slate-50 p-6">

    <div className="flex items-center justify-between">

      <div>

        <h3 className="font-semibold text-slate-900">
          Vendor / Third-Party Information
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Capture third-party involvement and outsourcing risk characteristics.
        </p>

      </div>

      {vendorSaved && (
        <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
          ✓ Saved
        </span>
      )}

    </div>

  </div>


  <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

    {/* Vendor Name */}

    <div>

      <label className="text-sm font-medium text-slate-700">
        Vendor Name *
      </label>

      <input
        type="text"
        value={vendorForm.vendor_name}
        onChange={(e) =>
          setVendorForm({
            ...vendorForm,
            vendor_name: e.target.value,
          })
        }
        placeholder="Example: Global Payments Partner"
        className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />

    </div>


    {/* Vendor Type */}

    <div>

      <label className="text-sm font-medium text-slate-700">
        Vendor Type *
      </label>

      <input
        type="text"
        value={vendorForm.vendor_type}
        onChange={(e) =>
          setVendorForm({
            ...vendorForm,
            vendor_type: e.target.value,
          })
        }
        placeholder="Payment Processor / Technology Provider"
        className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />

    </div>


    {/* Country */}

    <div>

      <label className="text-sm font-medium text-slate-700">
        Vendor Country
      </label>

      <input
        type="text"
        value={vendorForm.country}
        onChange={(e) =>
          setVendorForm({
            ...vendorForm,
            country: e.target.value,
          })
        }
        placeholder="India"
        className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />

    </div>


    {/* Criticality */}

    <div>

      <label className="text-sm font-medium text-slate-700">
        Criticality
      </label>

      <select
        value={vendorForm.criticality}
        onChange={(e) =>
          setVendorForm({
            ...vendorForm,
            criticality: e.target.value,
          })
        }
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      >

        <option value="LOW">
          Low
        </option>

        <option value="MEDIUM">
          Medium
        </option>

        <option value="HIGH">
          High
        </option>

        <option value="CRITICAL">
          Critical
        </option>

      </select>

    </div>


    {/* Outsourcing Type */}

    <div>

      <label className="text-sm font-medium text-slate-700">
        Outsourcing Type
      </label>

      <input
        type="text"
        value={vendorForm.outsourcing_type}
        onChange={(e) =>
          setVendorForm({
            ...vendorForm,
            outsourcing_type: e.target.value,
          })
        }
        placeholder="Technology / Payment Processing"
        className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />

    </div>


    {/* Service Description */}

    <div className="md:col-span-2">

      <label className="text-sm font-medium text-slate-700">
        Service Description
      </label>

      <textarea
        rows={3}
        value={vendorForm.service_description}
        onChange={(e) =>
          setVendorForm({
            ...vendorForm,
            service_description: e.target.value,
          })
        }
        placeholder="Describe the services provided by the vendor..."
        className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />

    </div>


    {/* Vendor Risk Characteristics */}

    <div className="md:col-span-2">

      <p className="mb-3 text-sm font-medium text-slate-700">
        Vendor Risk Characteristics
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">


        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={vendorForm.handles_customer_data}
            onChange={(e) =>
              setVendorForm({
                ...vendorForm,
                handles_customer_data: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Handles Customer Data
          </span>

        </label>


        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={vendorForm.handles_transactions}
            onChange={(e) =>
              setVendorForm({
                ...vendorForm,
                handles_transactions: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Handles Transactions
          </span>

        </label>


        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={vendorForm.handles_payment_data}
            onChange={(e) =>
              setVendorForm({
                ...vendorForm,
                handles_payment_data: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Handles Payment Data
          </span>

        </label>


        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={vendorForm.cross_border_processing}
            onChange={(e) =>
              setVendorForm({
                ...vendorForm,
                cross_border_processing: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Cross-Border Processing
          </span>

        </label>

      </div>

    </div>


    {/* Due Diligence / Governance */}

    <div className="md:col-span-2">

      <p className="mb-3 text-sm font-medium text-slate-700">
        Vendor Governance
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">


        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={vendorForm.due_diligence_completed}
            onChange={(e) =>
              setVendorForm({
                ...vendorForm,
                due_diligence_completed: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Due Diligence Completed
          </span>

        </label>


        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={vendorForm.contract_completed}
            onChange={(e) =>
              setVendorForm({
                ...vendorForm,
                contract_completed: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Contract Completed
          </span>

        </label>


        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={vendorForm.audit_rights}
            onChange={(e) =>
              setVendorForm({
                ...vendorForm,
                audit_rights: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Audit Rights
          </span>

        </label>


        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">

          <input
            type="checkbox"
            checked={vendorForm.business_continuity_plan}
            onChange={(e) =>
              setVendorForm({
                ...vendorForm,
                business_continuity_plan: e.target.checked,
              })
            }
          />

          <span className="text-sm text-slate-700">
            Business Continuity Plan
          </span>

        </label>

      </div>

    </div>

  </div>


  {/* Footer */}

  <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">

    <button
      onClick={saveVendor}
      disabled={savingVendor}
      className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >

      {savingVendor
        ? "Saving..."
        : vendorSaved
        ? "Update Vendor"
        : "Save Vendor"}

    </button>

  </div>

</div>

{/* ========================================================= */}
{/* RUN RISK ASSESSMENT */}
{/* ========================================================= */}

<div className="mb-8 rounded-xl border border-indigo-200 bg-indigo-50/40 p-6">
  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

    <div>
      <h3 className="text-lg font-semibold text-slate-900">
        Run Financial Crime Risk Assessment
      </h3>

      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
        Generate risk factors, calculate inherent and residual risk,
        and retrieve relevant regulatory evidence for this change request.
      </p>

      <p className="mt-2 text-xs text-slate-500">
        AI assessment and final FCRM decision are completed separately.
      </p>
    </div>

    <button
      onClick={runRiskAssessment}
      disabled={runningRiskAssessment}
      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {runningRiskAssessment ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
          Running Assessment...
        </>
      ) : (
        <>
          <ShieldAlert size={17} />
          Run Risk Assessment
        </>
      )}
    </button>

  </div>
</div>

        {/* Risk Overview heading */}

        <div className="flex items-center justify-between">

          <div>

            <h2 className="text-xl font-semibold text-slate-900">
              Risk Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Calculated financial crime risk across key assessment dimensions
            </p>

          </div>

          {riskAssessment && (
            <span className="text-xs text-slate-400">
              Risk Model v{riskAssessment.risk_model_version}
            </span>
          )}

        </div>


        {/* ========================================================= */}
        {/* RISK CATEGORY CARDS */}
        {/* ========================================================= */}

        {riskAssessment && (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

            <RiskCard
              title="Customer"
              score={riskAssessment.customer_risk_score}
            />

            <RiskCard
              title="Product"
              score={riskAssessment.product_risk_score}
            />

            <RiskCard
              title="Geography"
              score={riskAssessment.geography_risk_score}
            />

            <RiskCard
              title="Transaction"
              score={riskAssessment.transaction_risk_score}
            />

            <RiskCard
              title="Channel"
              score={riskAssessment.channel_risk_score}
            />

            <RiskCard
              title="Third Party"
              score={riskAssessment.third_party_risk_score}
            />

            <RiskCard
              title="Fraud"
              score={riskAssessment.fraud_risk_score}
            />

          </div>
        )}


        {/* ========================================================= */}
        {/* INHERENT + RESIDUAL RISK */}
        {/* ========================================================= */}

        {riskAssessment && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* INHERENT */}

            <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="rounded-lg bg-red-50 p-2">

                  <ShieldAlert
                    size={22}
                    className="text-red-600"
                  />

                </div>

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Inherent Risk
                  </p>

                  <p className="text-sm text-slate-500">
                    Risk before considering controls
                  </p>

                </div>

              </div>


              <div className="mt-6 flex items-end gap-4">

                <span
                  className={`text-5xl font-bold ${getScoreColor(
                    riskAssessment.inherent_score
                  )}`}
                >
                  {Number(
                    riskAssessment.inherent_score
                  ).toFixed(1)}
                </span>

                <span
                  className={`mb-1 rounded-full border px-3 py-1.5 text-sm font-semibold ${getRiskClass(
                    riskAssessment.inherent_rating
                  )}`}
                >
                  {riskAssessment.inherent_rating}
                </span>

              </div>

            </div>


            {/* RESIDUAL */}

            <div className="rounded-xl border border-orange-200 bg-white p-6 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="rounded-lg bg-orange-50 p-2">

                  <ShieldAlert
                    size={22}
                    className="text-orange-600"
                  />

                </div>

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Residual Risk
                  </p>

                  <p className="text-sm text-slate-500">
                    Risk after considering controls
                  </p>

                </div>

              </div>


              <div className="mt-6 flex items-end gap-4">

                <span
                  className={`text-5xl font-bold ${getScoreColor(
                    riskAssessment.residual_score
                  )}`}
                >
                  {Number(
                    riskAssessment.residual_score
                  ).toFixed(1)}
                </span>

                <span
                  className={`mb-1 rounded-full border px-3 py-1.5 text-sm font-semibold ${getRiskClass(
                    riskAssessment.residual_rating
                  )}`}
                >
                  {riskAssessment.residual_rating}
                </span>

              </div>

            </div>

          </div>
        )}


        {/* ========================================================= */}
        {/* AI RECOMMENDATION */}
        {/* ========================================================= */}

        {riskAssessment && (
          <div className="mt-6 rounded-xl border border-indigo-200 bg-white p-6 shadow-sm">

            <div className="flex items-start gap-4">

              <div className="rounded-lg bg-indigo-50 p-3">

                <Sparkles
                  size={22}
                  className="text-indigo-600"
                />

              </div>

              <div className="flex-1">

                <div className="flex items-center justify-between">

                  <div>

                    <h3 className="font-semibold text-slate-900">
                      AI-Assisted Recommendation
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      AI prepares the assessment; FCRM retains the final decision.
                    </p>

                  </div>

                  <span className="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-semibold text-orange-700">
                    {riskAssessment.ai_recommendation}
                  </span>

                </div>

              </div>

            </div>

          </div>
        )}


        {/* ========================================================= */}
        {/* NEXT SECTIONS PLACEHOLDER */}
        {/* ========================================================= */}

        <div className="mt-8">

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

            {/* Evidence Header */}

            <div className="border-b border-slate-200 p-6">

                <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                    <div className="rounded-lg bg-blue-50 p-2">

                    <FileText
                        size={20}
                        className="text-blue-600"
                    />

                    </div>

                    <div>

                    <h3 className="font-semibold text-slate-900">
                        Regulatory Evidence
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                        Regulatory sources retrieved to support the risk assessment
                    </p>

                    </div>

                </div>


                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">

                    {regulatoryEvidence.length} Evidence Records

                </span>

                </div>

            </div>


            {/* Evidence Records */}

            <div className="divide-y divide-slate-100">

                {regulatoryEvidence.length === 0 ? (

                <div className="p-6">

                    <p className="text-sm text-slate-500">
                    No regulatory evidence available.
                    </p>

                </div>

                ) : (

                regulatoryEvidence.map((evidence, index) => (

                    <div
                    key={evidence.id || index}
                    className="p-6"
                    >

                    {/* Top row */}

                    <div className="flex items-start justify-between gap-4">

                        <div className="flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                            <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {evidence.authority || "Unknown Authority"}
                            </span>

                            {evidence.page_number && (

                            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">

                                Page {evidence.page_number}

                            </span>

                            )}

                        </div>


                        <h4 className="mt-3 font-semibold text-slate-900">

                            {evidence.document_name ||
                            "Regulatory Document"}

                        </h4>

                        </div>


                        {/* Relevance */}

                        {evidence.relevance_score !== null &&
                        evidence.relevance_score !== undefined && (

                        <div className="text-right">

                            <p className="text-xs text-slate-400">
                            Retrieval Score
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                            {Number(
                                evidence.relevance_score
                            ).toFixed(4)}
                            </p>

                        </div>

                        )}

                    </div>


                    {/* Query */}

                    {evidence.query && (

                        <div className="mt-4 rounded-lg bg-slate-50 p-4">

                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Regulatory Query
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-700">
                            {evidence.query}
                        </p>

                        </div>

                    )}


                    {/* Evidence text */}

                    {evidence.evidence_text && (

                        <div className="mt-4">

                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Evidence
                        </p>

                        <p className="mt-2 text-sm leading-7 text-slate-600">
                            {evidence.evidence_text}
                        </p>

                        </div>

                    )}


                    {/* Source reference */}

                    {evidence.source_reference && (

                        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">

                        <FileText size={14} />

                        <span>
                            {evidence.source_reference}
                        </span>

                        </div>

                    )}

                    </div>

                ))

                )}

            </div>

            </div>


          <div className="mt-6 rounded-xl border border-indigo-200 bg-white shadow-sm">

  {/* Header */}
  <div className="border-b border-indigo-100 bg-indigo-50/40 p-6">

    <div className="flex items-start justify-between gap-4">

      <div className="flex items-center gap-3">

        <div className="rounded-lg bg-indigo-100 p-2.5">
          <Sparkles
            size={22}
            className="text-indigo-600"
          />
        </div>

        <div>

          <h3 className="font-semibold text-slate-900">
            AI-Assisted FCRM Assessment
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            AI prepares the assessment using the calculated risk
            and regulatory evidence. FCRM retains the final decision.
          </p>

        </div>

      </div>

      {aiAssessment?.recommendation && (
        <span className="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-semibold text-orange-700">
          {aiAssessment.recommendation}
        </span>
      )}

    </div>

  </div>


  {/* Before AI Assessment is generated */}

  {!aiAssessment && (

    <div className="p-8 text-center">

      <Sparkles
        size={32}
        className="mx-auto text-indigo-400"
      />

      <h4 className="mt-4 font-semibold text-slate-800">
        AI assessment not generated yet
      </h4>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
        Generate an AI-assisted assessment using the calculated
        financial crime risk factors and retrieved regulatory evidence.
      </p>

      <button
        onClick={generateAIAssessment}
        disabled={generatingAI}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >

        <Sparkles size={16} />

        {generatingAI
          ? "Generating Assessment..."
          : "Generate AI Assessment"}

      </button>

    </div>

  )}


  {/* AI Assessment Result */}

  {aiAssessment && (

    <div className="space-y-8 p-6">

      {/* Model + Status */}

      <div className="flex flex-wrap items-center gap-3">

        {aiAssessment.model && (
          <span className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            Model: {aiAssessment.model}
          </span>
        )}

        {aiAssessment.model_version && (
          <span className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            Version: {aiAssessment.model_version}
          </span>
        )}

        {aiAssessment.status && (
          <span className="rounded-md bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
            {aiAssessment.status}
          </span>
        )}

      </div>


      {/* Executive Summary */}

      {aiAssessment.assessment?.executive_summary && (

        <section>

          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Executive Summary
          </h4>

          <p className="mt-3 text-sm leading-7 text-slate-700">
            {aiAssessment.assessment.executive_summary}
          </p>

        </section>

      )}


      {/* Change Description */}

      {aiAssessment.assessment?.change_description && (

        <section>

          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Change Description
          </h4>

          <p className="mt-3 text-sm leading-7 text-slate-700">
            {aiAssessment.assessment.change_description}
          </p>

        </section>

      )}


      {/* Risk Assessment */}

      {aiAssessment.assessment?.risk_assessment && (

        <section>

          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Risk Assessment
          </h4>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

            {Object.entries(
              aiAssessment.assessment.risk_assessment
            ).map(([category, analysis]) => (

              <div
                key={category}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {category.replaceAll("_", " ")}
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {analysis}
                </p>

              </div>

            ))}

          </div>

        </section>

      )}


      {/* Inherent Risk */}

      {aiAssessment.assessment?.inherent_risk && (

        <section>

          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Inherent Risk Analysis
          </h4>

          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-5">

            <div className="flex items-center gap-4">

              <span className="text-3xl font-bold text-red-600">
                {Number(
                  aiAssessment.assessment.inherent_risk.score
                ).toFixed(1)}
              </span>

              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${getRiskClass(
                  aiAssessment.assessment.inherent_risk.rating
                )}`}
              >
                {aiAssessment.assessment.inherent_risk.rating}
              </span>

            </div>

            <p className="mt-4 text-sm leading-7 text-slate-700">
              {aiAssessment.assessment.inherent_risk.analysis}
            </p>

          </div>

        </section>

      )}


      {/* Key Risk Factors */}

      {aiAssessment.assessment?.key_risk_factors?.length > 0 && (

        <section>

          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Key Risk Factors
          </h4>

          <div className="mt-4 space-y-3">

            {aiAssessment.assessment.key_risk_factors.map(
              (factor, index) => (

                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 p-4"
                >

                  <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-500" />

                  <p className="text-sm leading-6 text-slate-700">
                    {factor}
                  </p>

                </div>

              )
            )}

          </div>

        </section>

      )}


      {/* Control Assessment */}

      {aiAssessment.assessment?.control_assessment && (

        <section>

          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Control Assessment
          </h4>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-5">

            <p className="text-sm leading-7 text-slate-700">
              {aiAssessment.assessment.control_assessment}
            </p>

          </div>

        </section>

      )}


      {/* Residual Risk */}

      {aiAssessment.assessment?.residual_risk && (

        <section>

          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Residual Risk Analysis
          </h4>

          <div className="mt-4 rounded-lg border border-orange-100 bg-orange-50 p-5">

            <div className="flex items-center gap-4">

              <span className="text-3xl font-bold text-orange-600">
                {Number(
                  aiAssessment.assessment.residual_risk.score
                ).toFixed(1)}
              </span>

              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${getRiskClass(
                  aiAssessment.assessment.residual_risk.rating
                )}`}
              >
                {aiAssessment.assessment.residual_risk.rating}
              </span>

            </div>

            <p className="mt-4 text-sm leading-7 text-slate-700">
              {aiAssessment.assessment.residual_risk.analysis}
            </p>

          </div>

        </section>

      )}


      {/* Regulatory Considerations */}

      {aiAssessment.assessment?.regulatory_considerations?.length > 0 && (

        <section>

          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Regulatory Considerations
          </h4>

          <div className="mt-4 space-y-3">

            {aiAssessment.assessment.regulatory_considerations.map(
              (item, index) => (

                <div
                  key={index}
                  className="rounded-lg border border-blue-100 bg-blue-50/40 p-4"
                >

                  <div className="flex flex-wrap items-center gap-2">

                    <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {item.authority}
                    </span>

                    {item.page_number && (
                      <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                        Page {item.page_number}
                      </span>
                    )}

                  </div>

                  <p className="mt-3 text-sm font-semibold text-slate-800">
                    {item.document_name}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.requirement_summary}
                  </p>

                </div>

              )
            )}

          </div>

        </section>

      )}


      {/* Regulatory Evidence */}

      {aiAssessment.assessment?.regulatory_evidence?.length > 0 && (

        <section>

          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Regulatory Evidence Used by AI
          </h4>

          <div className="mt-4 space-y-3">

            {aiAssessment.assessment.regulatory_evidence.map(
              (item, index) => (

                <div
                  key={index}
                  className="rounded-lg border border-slate-200 p-4"
                >

                  <div className="flex flex-wrap items-center gap-2">

                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {item.authority}
                    </span>

                    {item.page_number && (
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                        Page {item.page_number}
                      </span>
                    )}

                  </div>

                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {item.document_name}
                  </p>

                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.excerpt}
                  </p>

                </div>

              )
            )}

          </div>

        </section>

      )}


      {/* Analyst Review Questions */}

      {aiAssessment.assessment?.analyst_review_questions?.length > 0 && (

        <section>

          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Analyst Review Questions
          </h4>

          <div className="mt-4 space-y-3">

            {aiAssessment.assessment.analyst_review_questions.map(
              (question, index) => (

                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 p-4"
                >

                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                    {index + 1}
                  </span>

                  <p className="text-sm leading-6 text-slate-700">
                    {question}
                  </p>

                </div>

              )
            )}

          </div>

        </section>

      )}


      {/* Rationale */}

      {aiAssessment.assessment?.rationale && (

        <section>

          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            AI Rationale
          </h4>

          <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 p-5">

            <p className="text-sm leading-7 text-slate-700">
              {aiAssessment.assessment.rationale}
            </p>

          </div>

        </section>

      )}

    </div>

  )}

</div>

<div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">

  {/* Header */}
  <div className="border-b border-slate-200 bg-slate-50 p-6">

    <div className="flex items-start gap-3">

      <div className="rounded-lg bg-slate-200 p-2.5">
        <ShieldAlert
          size={22}
          className="text-slate-700"
        />
      </div>

      <div>

        <h3 className="font-semibold text-slate-900">
          FCRM Analyst Review
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Review the system and AI assessment before making the
          final risk determination.
        </p>

      </div>

    </div>

  </div>


  <div className="space-y-6 p-6">

    {/* Governance Notice */}

    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">

      <p className="text-sm font-medium text-blue-900">
        Human decision checkpoint
      </p>

      <p className="mt-1 text-sm leading-6 text-blue-700">
        The system and AI provide recommendations only. The FCRM
        analyst is responsible for reviewing the evidence and
        recording the final assessment rationale.
      </p>

    </div>


    {/* System Assessment */}

    <div>

      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        System Assessment
      </h4>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">

        <div className="rounded-lg border border-slate-200 p-4">

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Inherent Risk
          </p>

          <div className="mt-2 flex items-center gap-3">

            <span className="text-2xl font-bold text-slate-900">
              {riskAssessment?.inherent_score?.toFixed(1) || "—"}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskClass(
                riskAssessment?.inherent_rating
              )}`}
            >
              {riskAssessment?.inherent_rating || "—"}
            </span>

          </div>

        </div>


        <div className="rounded-lg border border-slate-200 p-4">

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Residual Risk
          </p>

          <div className="mt-2 flex items-center gap-3">

            <span className="text-2xl font-bold text-slate-900">
              {riskAssessment?.residual_score?.toFixed(1) || "—"}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskClass(
                riskAssessment?.residual_rating
              )}`}
            >
              {riskAssessment?.residual_rating || "—"}
            </span>

          </div>

        </div>

      </div>

    </div>


    {/* AI Recommendation */}

    <div>

      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        AI Recommendation
      </h4>

      <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">

        <div className="flex items-center justify-between">

          <span className="text-sm font-medium text-indigo-900">
            AI Recommendation
          </span>

          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
            {aiAssessment?.recommendation ||
              riskAssessment?.ai_recommendation ||
              "Not Generated"}
          </span>

        </div>

        <p className="mt-2 text-sm leading-6 text-indigo-700">
          Review the AI recommendation against the underlying
          risk factors and regulatory evidence before making a
          decision.
        </p>

      </div>

    </div>


    {/* Analyst Rating */}

    <div>

      <label className="text-sm font-semibold text-slate-700">
        Analyst Rating
      </label>

      <p className="mt-1 text-xs text-slate-500">
        Select the rating determined by the FCRM analyst.
      </p>

      <select
        value={analystRating}
        onChange={(e) => {
          setAnalystRating(e.target.value);

          if (
            e.target.value === riskAssessment?.residual_rating
          ) {
            setOverrideReason("");
          }
        }}
        className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 md:w-72"
      >

        <option value="">
          Select rating
        </option>

        <option value="LOW">
          LOW
        </option>

        <option value="MEDIUM">
          MEDIUM
        </option>

        <option value="HIGH">
          HIGH
        </option>

        <option value="CRITICAL">
          CRITICAL
        </option>

      </select>

    </div>


    {/* Override Reason */}

    {analystRating &&
      analystRating !== riskAssessment?.residual_rating && (

        <div>

          <label className="text-sm font-semibold text-slate-700">
            Reason for Override
          </label>

          <p className="mt-1 text-xs text-slate-500">
            Required when the analyst rating differs from the
            system-calculated residual risk.
          </p>

          <textarea
            value={overrideReason}
            onChange={(e) =>
              setOverrideReason(e.target.value)
            }
            rows={4}
            placeholder="Explain why the analyst disagrees with the system rating..."
            className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />

        </div>

      )}


    {/* Consequences / Conditions */}

    <div>

      <label className="text-sm font-semibold text-slate-700">
        Consequences / Conditions
      </label>

      <p className="mt-1 text-xs text-slate-500">
        Record any additional conditions, mitigations, or
        consequences associated with the analyst decision.
      </p>

      <textarea
        value={consequences}
        onChange={(e) =>
          setConsequences(e.target.value)
        }
        rows={4}
        placeholder="Enter additional controls, monitoring conditions, or consequences..."
        className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />

    </div>


    {/* Submit */}

    <div className="flex items-center justify-between border-t border-slate-200 pt-6">

      {analystReviewed ? (

        <div className="flex items-center gap-2 text-sm font-medium text-green-700">

          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
            ✓
          </span>

          Analyst review recorded

        </div>

      ) : (

        <p className="text-xs text-slate-400">
          Final committee decision remains separate from analyst review.
        </p>

      )}


      {!analystReviewed && (

        <button
          onClick={submitAnalystReview}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Submit Analyst Review
        </button>

      )}

    </div>

  </div>

</div>

<div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">

  {/* Header */}
  <div className="border-b border-slate-200 bg-slate-50 p-6">

    <div className="flex items-start gap-3">

      <div className="rounded-lg bg-purple-100 p-2.5">
        <ShieldCheck
          size={22}
          className="text-purple-600"
        />
      </div>

      <div>

        <h3 className="font-semibold text-slate-900">
          Risk Committee Decision
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Final governance checkpoint for the proposed change.
        </p>

      </div>

    </div>

  </div>


  <div className="space-y-6 p-6">

    {/* Governance notice */}

    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">

      <p className="text-sm font-medium text-purple-900">
        Final human decision
      </p>

      <p className="mt-1 text-sm leading-6 text-purple-700">
        The Risk Committee reviews the FCRM assessment, analyst
        review, risk factors, controls, and regulatory evidence
        before making the final decision.
      </p>

    </div>


    {/* Decision context */}

    <div>

      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Decision Context
      </h4>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">

        {/* Residual risk */}

        <div className="rounded-lg border border-slate-200 p-4">

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            System Residual Risk
          </p>

          <div className="mt-2 flex items-center gap-3">

            <span className="text-2xl font-bold text-slate-900">
              {riskAssessment?.residual_score?.toFixed(1) || "—"}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskClass(
                riskAssessment?.residual_rating
              )}`}
            >
              {riskAssessment?.residual_rating || "—"}
            </span>

          </div>

        </div>


        {/* Analyst rating */}

        <div className="rounded-lg border border-slate-200 p-4">

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Analyst Rating
          </p>

          <div className="mt-2">

            <span className="text-2xl font-bold text-slate-900">
              {analystRating || "Not Submitted"}
            </span>

          </div>

        </div>


        {/* AI recommendation */}

        <div className="rounded-lg border border-slate-200 p-4">

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            AI Recommendation
          </p>

          <p className="mt-2 text-sm font-semibold text-slate-900">
            {aiAssessment?.recommendation ||
              riskAssessment?.ai_recommendation ||
              "Not Generated"}
          </p>

        </div>

      </div>

    </div>


    {/* Committee Decision */}

    <div>

      <label className="text-sm font-semibold text-slate-700">
        Committee Decision
      </label>

      <p className="mt-1 text-xs text-slate-500">
        Select the final outcome for this change request.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">

        {/* Approve */}

        <button
          type="button"
          onClick={() => setCommitteeDecision("APPROVE")}
          className={`rounded-lg border p-4 text-left transition ${
            committeeDecision === "APPROVE"
              ? "border-green-500 bg-green-50 ring-2 ring-green-100"
              : "border-slate-200 hover:border-green-300"
          }`}
        >

          <p className="font-semibold text-slate-900">
            Approve
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Approve the proposed change without additional conditions.
          </p>

        </button>


        {/* Approve with conditions */}

        <button
          type="button"
          onClick={() =>
            setCommitteeDecision("APPROVE_WITH_CONDITIONS")
          }
          className={`rounded-lg border p-4 text-left transition ${
            committeeDecision === "APPROVE_WITH_CONDITIONS"
              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
              : "border-slate-200 hover:border-blue-300"
          }`}
        >

          <p className="font-semibold text-slate-900">
            Approve with Conditions
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Approve subject to specified controls or monitoring conditions.
          </p>

        </button>


        {/* Defer */}

        <button
          type="button"
          onClick={() => setCommitteeDecision("DEFER")}
          className={`rounded-lg border p-4 text-left transition ${
            committeeDecision === "DEFER"
              ? "border-amber-500 bg-amber-50 ring-2 ring-amber-100"
              : "border-slate-200 hover:border-amber-300"
          }`}
        >

          <p className="font-semibold text-slate-900">
            Defer
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Additional analysis, evidence, or controls are required.
          </p>

        </button>


        {/* Reject */}

        <button
          type="button"
          onClick={() => setCommitteeDecision("REJECT")}
          className={`rounded-lg border p-4 text-left transition ${
            committeeDecision === "REJECT"
              ? "border-red-500 bg-red-50 ring-2 ring-red-100"
              : "border-slate-200 hover:border-red-300"
          }`}
        >

          <p className="font-semibold text-slate-900">
            Reject
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Do not approve the proposed change.
          </p>

        </button>

      </div>

    </div>


    {/* Conditions */}

    {committeeDecision === "APPROVE_WITH_CONDITIONS" && (

      <div>

        <label className="text-sm font-semibold text-slate-700">
          Approval Conditions
        </label>

        <p className="mt-1 text-xs text-slate-500">
          Specify the conditions that must be satisfied before
          or after implementation.
        </p>

        <textarea
          value={committeeConditions}
          onChange={(e) =>
            setCommitteeConditions(e.target.value)
          }
          rows={4}
          placeholder="Example: Enhanced transaction monitoring must be enabled before go-live..."
          className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
        />

      </div>

    )}


    {/* Committee rationale */}

    <div>

      <label className="text-sm font-semibold text-slate-700">
        Committee Rationale
      </label>

      <p className="mt-1 text-xs text-slate-500">
        Record the reasoning behind the final committee decision.
      </p>

      <textarea
        value={committeeReason}
        onChange={(e) =>
          setCommitteeReason(e.target.value)
        }
        rows={5}
        placeholder="Explain the basis for the committee decision..."
        className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
      />

    </div>


    {/* Submit */}

    <div className="flex items-center justify-between border-t border-slate-200 pt-6">

      {committeeSubmitted ? (

        <div className="flex items-center gap-2 text-sm font-medium text-green-700">

          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
            ✓
          </span>

          Committee decision recorded

        </div>

      ) : (

        <p className="text-xs text-slate-400">
          This decision represents the final governance outcome.
        </p>

      )}


      {!committeeSubmitted && (

        <button
          onClick={submitCommitteeDecision}
          disabled={!committeeDecision}
          className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit Committee Decision
        </button>

      )}

    </div>

  </div>

</div>

        </div>

      </main>

    </div>
  );
}

export default Assessment;
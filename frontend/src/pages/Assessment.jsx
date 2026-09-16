import { useEffect, useState } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  FileText,
  Sparkles,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import AssessmentHeader from "../components/assessment/AssessmentHeader";
import ProductInformation from "../components/assessment/ProductInformation";
import CustomerProfile from "../components/assessment/CustomerProfile";
import Geography from "../components/assessment/Geography";
import TransactionProfile from "../components/assessment/TransactionProfile";
import ChannelInformation from "../components/assessment/ChannelInformation";
import VendorInformation from "../components/assessment/VendorInformation";
import RiskOverview from "../components/assessment/RiskOverview";
import AIAssessment from "../components/assessment/AIAssessment";
import AnalystReview from "../components/assessment/AnalystReview";
import CommitteeDecision from "../components/assessment/CommitteeDecision";

import api from "../services/api";

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
  const [auditEvents, setAuditEvents] = useState([]);

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

      // 1. Change Request
      const changeRequestResponse = await api.get(
        `/change-requests/${changeRequestId}`
      );

      setChangeRequest(changeRequestResponse.data);

      // 2. Risk Assessment
      try {
        const riskAssessmentResponse = await api.get(
          `/change-requests/${changeRequestId}/risk-assessment`
        );

        setRiskAssessment(riskAssessmentResponse.data);
      } catch (riskError) {
        console.log("No risk assessment available yet.");
        setRiskAssessment(null);
      }

      // 3. Regulatory Evidence
      try {
        const evidenceResponse = await api.get(
          `/change-requests/${changeRequestId}/regulatory-evidence`
        );

        setRegulatoryEvidence(
          evidenceResponse.data.evidence || []
        );
      } catch (evidenceError) {
        console.log("No regulatory evidence available yet.");
        setRegulatoryEvidence([]);
      }

      // 4. Analyst Review
      try {
        const analystReviewResponse = await api.get(
          `/change-requests/${changeRequestId}/analyst-review`
        );

        if (analystReviewResponse.data.reviewed) {
          const review = analystReviewResponse.data.review;

          setAnalystReviewed(true);

          setAnalystRating(review.analyst_rating || "");
          setOverrideReason(review.override_reason || "");
          setConsequences(review.consequences || "");
        } else {
          setAnalystReviewed(false);
        }
      } catch (error) {
        console.error(
          "Failed to load analyst review:",
          error
        );
      }

      // 5. Committee Decision
      try {
        const committeeResponse = await api.get(
          `/change-requests/${changeRequestId}/committee-decision`
        );

        if (committeeResponse.data.decided) {
          const decision = committeeResponse.data.decision;

          setCommitteeSubmitted(true);

          setCommitteeDecision(
            decision.decision || ""
          );

          setCommitteeReason(
            decision.rationale || ""
          );

          setCommitteeConditions(
            decision.conditions || ""
          );
        } else {
          setCommitteeSubmitted(false);
          setCommitteeDecision("");
          setCommitteeReason("");
          setCommitteeConditions("");
        }
      } catch (error) {
        console.error(
          "Failed to load committee decision:",
          error
        );
      }

      // 6. Audit Trail
      try {
        const auditResponse = await api.get(
          `/change-requests/${changeRequestId}/audit-events`
        );

        // If backend returns an array
        if (Array.isArray(auditResponse.data)) {
          setAuditEvents(auditResponse.data);
        }
        // If backend returns { events: [...] }
        else {
          setAuditEvents(
            auditResponse.data.events || []
          );
        }
      } catch (error) {
        console.error(
          "Failed to load audit events:",
          error
        );

        // Audit failure should NOT stop the Assessment page
        setAuditEvents([]);
      }

    } catch (error) {
      console.error(
        "Failed to load change request:",
        error
      );

      setError(
        error.response?.data?.detail ||
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

  const submitAnalystReview = async () => {
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

    try {
      setError("");

      await api.post(
        `/change-requests/${changeRequestId}/analyst-review`,
        null,
        {
          params: {
            analyst_rating: analystRating,
            override_reason: overrideReason,
            consequences: consequences,
          },
        }
      );

      setAnalystReviewed(true);

    } catch (error) {
      console.error("Failed to submit analyst review:", error);

      setError(
        error.response?.data?.detail ||
        "Unable to submit analyst review."
      );
    }
  };

  const submitCommitteeDecision = async () => {
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

    try {
      setError("");

      await api.post(
        `/change-requests/${changeRequestId}/committee-decision`,
        null,
        {
          params: {
            decision: committeeDecision,
            rationale: committeeReason,
            conditions: committeeConditions,
          },
        }
      );

      setCommitteeSubmitted(true);

    } catch (error) {
      console.error(
        "Failed to submit committee decision:",
        error
      );

      setError(
        error.response?.data?.detail ||
        "Unable to submit committee decision."
      );
    }
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

      <AssessmentHeader
        changeRequest={changeRequest}
        navigate={navigate}
      />

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

  <ProductInformation
    productForm={productForm}
    setProductForm={setProductForm}
    productSaved={productSaved}
    savingProduct={savingProduct}
    saveProduct={saveProduct}
  />

</div>

{/* ======================================================= */}
{/* CUSTOMER PROFILE */}
{/* ======================================================= */}

  <CustomerProfile
    customerForm={customerForm}
    setCustomerForm={setCustomerForm}
    customerSaved={customerSaved}
    savingCustomer={savingCustomer}
    saveCustomerProfile={saveCustomerProfile}
  />

        {/* ========================================================= */}
        {/* GEOGRAPHY */}
        {/* ========================================================= */}

        <Geography
          geographyForm={geographyForm}
          setGeographyForm={setGeographyForm}
          geographySaved={geographySaved}
          savingGeography={savingGeography}
          saveGeography={saveGeography}
        />

                {/* ========================================================= */}
        {/* TRANSACTION PROFILE */}
        {/* ========================================================= */}

        <TransactionProfile
          transactionForm={transactionForm}
          setTransactionForm={setTransactionForm}
          transactionSaved={transactionSaved}
          savingTransaction={savingTransaction}
          saveTransactionProfile={saveTransactionProfile}
        />

        {/* ======================================================= */}
{/* CHANNEL INFORMATION */}
{/* ======================================================= */}

<ChannelInformation
  channelForm={channelForm}
  setChannelForm={setChannelForm}
  channelSaved={channelSaved}
  savingChannel={savingChannel}
  saveChannel={saveChannel}
/>

{/* ======================================================= */}
{/* VENDOR / THIRD-PARTY INFORMATION */}
{/* ======================================================= */}

<VendorInformation
  vendorForm={vendorForm}
  setVendorForm={setVendorForm}
  vendorSaved={vendorSaved}
  savingVendor={savingVendor}
  saveVendor={saveVendor}
/>

{/* ========================================================= */}
{/* RUN RISK ASSESSMENT */}
{/* ========================================================= */}

{/* ========================================================= */}
{/* RISK OVERVIEW */}
{/* ========================================================= */}

<RiskOverview
  riskAssessment={riskAssessment}
  runningRiskAssessment={runningRiskAssessment}
  runRiskAssessment={runRiskAssessment}
/>

<AIAssessment
  aiAssessment={aiAssessment}
  generatingAI={generatingAI}
  generateAIAssessment={generateAIAssessment}
/>

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

<AnalystReview
  riskAssessment={riskAssessment}
  aiAssessment={aiAssessment}
  analystRating={analystRating}
  setAnalystRating={setAnalystRating}
  overrideReason={overrideReason}
  setOverrideReason={setOverrideReason}
  consequences={consequences}
  setConsequences={setConsequences}
  analystReviewed={analystReviewed}
  submitAnalystReview={submitAnalystReview}
 />


<CommitteeDecision
  riskAssessment={riskAssessment}
  analystRating={analystRating}
  aiAssessment={aiAssessment}
  committeeDecision={committeeDecision}
  setCommitteeDecision={setCommitteeDecision}
  committeeConditions={committeeConditions}
  setCommitteeConditions={setCommitteeConditions}
  committeeReason={committeeReason}
  setCommitteeReason={setCommitteeReason}
  committeeSubmitted={committeeSubmitted}
  submitCommitteeDecision={submitCommitteeDecision}
 />



    {/* Audit Trail */}
<div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mt-6">
  <div className="flex items-center justify-between mb-5">
    <div>
      <h2 className="text-lg font-semibold text-slate-900">
        Audit Trail
      </h2>
      <p className="text-sm text-slate-500 mt-1">
        Immutable record of key assessment and decision activities
      </p>
    </div>

    <div className="text-sm text-slate-500">
      {auditEvents.length} event{auditEvents.length !== 1 ? "s" : ""}
    </div>
  </div>

  {auditEvents.length === 0 ? (
    <div className="text-sm text-slate-500 py-6 text-center">
      No audit events recorded yet.
    </div>
  ) : (
    <div className="space-y-4">
      {auditEvents.map((event, index) => (
        <div
          key={event.id || index}
          className="flex gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200"
        >
          {/* Timeline dot */}
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-slate-700 mt-1" />

            {index !== auditEvents.length - 1 && (
              <div className="w-px bg-slate-300 flex-1 mt-2" />
            )}
          </div>

          {/* Event details */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900">
                  {event.action}
                </p>

                <p className="text-sm text-slate-600 mt-1">
                  Actor: {event.actor || "System"}
                </p>
              </div>

              <span className="text-xs text-slate-500 whitespace-nowrap">
                {event.created_at
                  ? new Date(`${event.created_at}Z`).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })
                  : ""}
              </span>
            </div>

            {event.entity_type && (
              <p className="text-xs text-slate-500 mt-2">
                Entity: {event.entity_type}
                {event.entity_id ? ` #${event.entity_id}` : ""}
              </p>
            )}

            {event.old_value && (
              <p className="text-sm text-slate-700 mt-2">
                <span className="font-medium">Previous:</span>{" "}
                {event.old_value}
              </p>
            )}

            {event.new_value && (
              <p className="text-sm text-slate-700 mt-1">
                <span className="font-medium">New:</span>{" "}
                {event.new_value}
              </p>
            )}

            {event.reason && (
              <p className="text-sm text-slate-600 mt-2">
                <span className="font-medium">Reason:</span>{" "}
                {event.reason}
              </p>
            )}

            {event.evidence && (
              <p className="text-sm text-slate-600 mt-1">
                <span className="font-medium">Evidence:</span>{" "}
                {event.evidence}
              </p>
            )}

            {event.model_version && (
              <p className="text-xs text-slate-500 mt-2">
                Model: {event.model_version}
              </p>
            )}

            {event.policy_version && (
              <p className="text-xs text-slate-500 mt-1">
                Policy: {event.policy_version}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )}
</div>

        </div>

      </main>

    </div>
  );
}

export default Assessment;
import { useEffect, useState } from "react";
import { ArrowLeft, AlertTriangle } from "lucide-react";
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
import IntakePanel from "../components/assessment/IntakePanel";
import WorkflowStepper from "../components/assessment/WorkflowStepper";
import RegulatoryEvidence from "../components/assessment/RegulatoryEvidence";
import RequestInputTabs from "../components/assessment/RequestInputTabs";
import AssessmentStageFooter from "../components/assessment/AssessmentStageFooter";
import CompletedStageSummary from "../components/assessment/CompletedStageSummary";
import {
  mapInputsToFormState,
  formsToAssessmentInputs,
} from "../utils/assessmentFormMapping";
import {
  canNavigateToWorkflowStage,
  normalizeWorkflowStage,
} from "../components/assessment/workflowStages";
import PageContainer from "../components/layout/PageContainer";

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

  const [intakeMode, setIntakeMode] = useState("brd");
  const [completenessPercent, setCompletenessPercent] = useState(0);
  const [missingFields, setMissingFields] = useState([]);
  const [activeView, setActiveView] = useState("REQUEST_CREATED");
  const [inputTab, setInputTab] = useState("product");
  const [advancingStage, setAdvancingStage] = useState(false);

  const applyMappedForms = (mapped) => {
    if (!mapped) {
      return;
    }

    setProductForm(mapped.productForm);
    setCustomerForm(mapped.customerForm);
    setGeographyForm(mapped.geographyForm);
    setTransactionForm(mapped.transactionForm);
    setChannelForm(mapped.channelForm);
    setVendorForm(mapped.vendorForm);
    setProductSaved(true);
    setCustomerSaved(true);
    setGeographySaved(true);
    setTransactionSaved(true);
    setChannelSaved(true);
    setVendorSaved(true);
  };

  const refreshCompleteness = async () => {
    try {
      const response = await api.get(
        `/change-requests/${changeRequestId}/intake/completeness`
      );
      setCompletenessPercent(response.data.completeness_percent ?? 0);
      setMissingFields(response.data.missing_fields ?? []);
    } catch {
      setCompletenessPercent(0);
      setMissingFields([]);
    }
  };

  const hydrateAssessmentInputs = async () => {
    try {
      const response = await api.get(
        `/change-requests/${changeRequestId}/assessment-inputs`
      );
      const mapped = mapInputsToFormState(response.data.inputs);
      if (mapped) {
        applyMappedForms(mapped);
      }
      setCompletenessPercent(response.data.completeness_percent ?? 0);
      setMissingFields(response.data.missing_fields ?? []);
    } catch (inputsError) {
      console.log("No assessment inputs yet.", inputsError);
      await refreshCompleteness();
    }
  };

  const handleExtractionApplied = async (mergedPreview) => {
    const mapped = mapInputsToFormState(mergedPreview);
    applyMappedForms(mapped);
    await hydrateAssessmentInputs();
  };

  const handleIntakeAgentUpdate = async (agentResponse) => {
    if (agentResponse?.inputs) {
      const mapped = mapInputsToFormState(agentResponse.inputs);
      applyMappedForms(mapped);
    }
    await hydrateAssessmentInputs();
  };

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
      const stage = normalizeWorkflowStage(
        changeRequestResponse.data.current_stage
      );
      setActiveView(stage);

      await hydrateAssessmentInputs();

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

      try {
        const aiResponse = await api.get(
          `/change-requests/${changeRequestId}/ai-assessment`
        );
        setAiAssessment(aiResponse.data);
      } catch {
        setAiAssessment(null);
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

      const syncResponse = await api.post(
        `/change-requests/${changeRequestId}/assessment-inputs/sync`,
        {
          inputs: formsToAssessmentInputs({
            productForm,
            customerForm,
            geographyForm,
            transactionForm,
            channelForm,
            vendorForm,
          }),
        }
      );
      setCompletenessPercent(syncResponse.data.completeness_percent ?? 0);
      setMissingFields(syncResponse.data.missing_fields ?? []);
      if ((syncResponse.data.missing_fields || []).length > 0) {
        setError(
          `Complete required intake fields before risk calculation (${syncResponse.data.missing_fields.length} missing).`
        );
        setRunningRiskAssessment(false);
        return false;
      }

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
      return true;

    } catch (error) {
      console.error(
        "Failed to run risk assessment:",
        error
      );

      setError(
        error.response?.data?.detail ||
        "Unable to complete the risk assessment."
      );
      return false;
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
      return true;

    } catch (error) {
      console.error("Failed to generate AI assessment:", error);

      setError(
        error.response?.data?.detail ||
        "Unable to generate AI assessment."
      );
      return false;
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
      await loadAssessment();
      setActiveView("COMMITTEE_REVIEW");

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
      await loadAssessment();
      setActiveView("COMPLETED");

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

  const handleStageSelect = (stage) => {
    if (
      canNavigateToWorkflowStage(
        stage,
        changeRequest?.current_stage
      )
    ) {
      setActiveView(stage);
    }
  };

  const completeRequestStage = async () => {
    try {
      setAdvancingStage(true);
      const ok = await runRiskAssessment();
      if (ok) {
        setActiveView("RISK_ASSESSMENT");
      }
    } finally {
      setAdvancingStage(false);
    }
  };

  const advanceToAnalystStage = async () => {
    try {
      setAdvancingStage(true);

      if (!aiAssessment) {
        const generated = await generateAIAssessment();
        if (!generated) {
          return;
        }
      }

      await loadAssessment();
      setActiveView("ANALYST_REVIEW");
    } finally {
      setAdvancingStage(false);
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
    <div className="w-full">
      <AssessmentHeader
        changeRequest={changeRequest}
        navigate={navigate}
      />

      <PageContainer className="pb-12">
        <WorkflowStepper
          currentStage={changeRequest?.current_stage}
          activeView={activeView}
          auditEvents={auditEvents}
          onStageSelect={handleStageSelect}
        />

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {activeView === "REQUEST_CREATED" && (
          <>
        <div className="space-y-8 xl:grid xl:grid-cols-12 xl:items-start xl:gap-10 xl:space-y-0">
          <div className="space-y-6 xl:col-span-5">
        <IntakePanel
          changeRequestId={changeRequestId}
          intakeMode={intakeMode}
          setIntakeMode={setIntakeMode}
          completenessPercent={completenessPercent}
          missingFields={missingFields}
          onExtractionApplied={handleExtractionApplied}
          onAgentUpdate={handleIntakeAgentUpdate}
          setError={setError}
        />

        {missingFields.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-base text-amber-900">
            Missing required fields: {missingFields.join(", ")}
          </div>
        )}
          </div>

          <div className="xl:col-span-7">
        <RequestInputTabs
          activeTab={inputTab}
          onTabChange={setInputTab}
        >
          {inputTab === "product" && (
            <ProductInformation
              productForm={productForm}
              setProductForm={setProductForm}
              productSaved={productSaved}
              savingProduct={savingProduct}
              saveProduct={saveProduct}
            />
          )}
          {inputTab === "customer" && (
            <CustomerProfile
              customerForm={customerForm}
              setCustomerForm={setCustomerForm}
              customerSaved={customerSaved}
              savingCustomer={savingCustomer}
              saveCustomerProfile={saveCustomerProfile}
            />
          )}
          {inputTab === "geography" && (
            <Geography
              geographyForm={geographyForm}
              setGeographyForm={setGeographyForm}
              geographySaved={geographySaved}
              savingGeography={savingGeography}
              saveGeography={saveGeography}
            />
          )}
          {inputTab === "transaction" && (
            <TransactionProfile
              transactionForm={transactionForm}
              setTransactionForm={setTransactionForm}
              transactionSaved={transactionSaved}
              savingTransaction={savingTransaction}
              saveTransactionProfile={saveTransactionProfile}
            />
          )}
          {inputTab === "channel" && (
            <ChannelInformation
              channelForm={channelForm}
              setChannelForm={setChannelForm}
              channelSaved={channelSaved}
              savingChannel={savingChannel}
              saveChannel={saveChannel}
            />
          )}
          {inputTab === "vendor" && (
            <VendorInformation
              vendorForm={vendorForm}
              setVendorForm={setVendorForm}
              vendorSaved={vendorSaved}
              savingVendor={savingVendor}
              saveVendor={saveVendor}
            />
          )}
        </RequestInputTabs>
          </div>
        </div>

        <AssessmentStageFooter
          hint="Syncs intake, generates risk factors, calculates scores, and retrieves regulatory evidence."
        >
          <button
            type="button"
            onClick={() => setActiveView("RISK_ASSESSMENT")}
            disabled={
              !canNavigateToWorkflowStage(
                "RISK_ASSESSMENT",
                changeRequest?.current_stage
              )
            }
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            View risk step
          </button>
          <button
            type="button"
            onClick={completeRequestStage}
            disabled={advancingStage || runningRiskAssessment}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {advancingStage || runningRiskAssessment
              ? "Calculating risk..."
              : "Complete inputs & calculate risk →"}
          </button>
        </AssessmentStageFooter>
          </>
        )}

        {activeView === "RISK_ASSESSMENT" && (
          <>
        <div className="space-y-8 xl:grid xl:grid-cols-12 xl:items-start xl:gap-10 xl:space-y-0">
          <div className="space-y-8 xl:col-span-7">
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
          </div>
          <div className="xl:col-span-5">
            <RegulatoryEvidence regulatoryEvidence={regulatoryEvidence} />
          </div>
        </div>

        <AssessmentStageFooter
          hint="Generate AI assessment to unlock analyst review (required by workflow)."
        >
          <button
            type="button"
            onClick={runRiskAssessment}
            disabled={runningRiskAssessment}
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Recalculate risk
          </button>
          <button
            type="button"
            onClick={advanceToAnalystStage}
            disabled={advancingStage || generatingAI || !riskAssessment}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {advancingStage || generatingAI
              ? "Preparing analyst step..."
              : "Continue to analyst review →"}
          </button>
        </AssessmentStageFooter>
          </>
        )}

        {activeView === "ANALYST_REVIEW" && (
          <>

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

          </>
        )}

        {activeView === "COMMITTEE_REVIEW" && (
          <>

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

          </>
        )}

        {activeView === "COMPLETED" && (
          <>
            <CompletedStageSummary
              changeRequest={changeRequest}
              riskAssessment={riskAssessment}
              committeeSubmitted={committeeSubmitted}
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
          </>
        )}

      </PageContainer>
    </div>
  );
}

export default Assessment;